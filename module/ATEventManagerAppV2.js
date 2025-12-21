// File: modules/about-time-next/module/ATEventManagerAppV2.js
// v13.3.4.0 — Refactored to use CalendarAdapter for timestamp formatting

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api; // v12+
import { ElapsedTime } from "./ElapsedTime.js";
import { CalendarAdapter } from "./calendar/CalendarAdapter.js";
import { PseudoClock } from "./PseudoClock.js";
import { MODULE_ID } from "./settings.js";
import { formatEventChatCard } from "./FastPriorityQueue.js";
import { isTimekeeper } from "./permissions.js";
// Minimal helper for GM whisper used inside scheduled handlers (no private fields)
const gmWhisper = (html) => {
  try {
    const ids = ChatMessage.getWhisperRecipients("GM").filter((u) => u.active).map((u) => u.id);
    return ChatMessage.create({ content: html, whisper: ids });
  } catch (e) {
    console.warn("[about-time] gmWhisper failed", e);
    return ChatMessage.create({ content: html });
  }
};

const emDebugEnabled = () => {
  try { return !!game.settings.get(MODULE_ID, "debug"); } catch { return false; }
};

const emDebugLog = (...args) => {
  if (!emDebugEnabled()) return;
  try { console.log(`${MODULE_ID} | [EventManager]`, ...args); } catch { /* ignore */ }
};

export class ATEventManagerAppV2 extends HandlebarsApplicationMixin(ApplicationV2) {
  // v13.1.3.0 — Macro datalist + refresh
  #macroListId() { return `atn-em-macro-list`; } // single-instance app; stable id
  #rebuildMacroDatalist() {
    try {
      const list  = this.element?.querySelector?.(`#${this.#macroListId()}`);
      const input = this.element?.querySelector?.(`input[name="macroName"]`);
      if (!list || !input) return;
      // Permission filter (Observer for non-GM)
      const canSee = (m) => game.user?.isGM || m?.testUserPermission?.(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER);
      const macros = Array.from(game.macros ?? []).filter(canSee);
      macros.sort((a,b) => {
        const an = (a.name||'').toLocaleLowerCase(); const bn = (b.name||'').toLocaleLowerCase();
        if (an < bn) return -1; if (an > bn) return 1;
        const af = a.folder?.name||''; const bf = b.folder?.name||'';
        return af.localeCompare(bf);
      });
      list.innerHTML = macros.map(m => {
        const folder = m.folder?.name || '—';
        const type   = (m.type ?? 'Macro');
        const id     = m.id ?? '';
        const title  = `${folder} • ${type} • ${id}`;
        const safeValue = foundry.utils.escapeHTML(m.name ?? '');
        const safeTitle = foundry.utils.escapeHTML(title);
        return `<option value="${safeValue}" title="${safeTitle}"></option>`;
      }).join('');
      input.setAttribute('list', this.#macroListId());
    } catch (e) {
      console.warn('[about-time-next] rebuildMacroDatalist failed', e);
    }
  }
  static DEFAULT_OPTIONS = {
    id: "at-em-v2",
    classes: ["about-time", "at-emv2", "at-dracula"],
    tag: "form",
    window: { title: "About Time — Event Manager V2", icon: "fas fa-clock", resizable: true },
    position: { width: 920, height: "auto" },
    actions: {
      create(ev, el)      { return this.onCreate(ev); },
      list(ev, el)        { return this.onList(ev); },
      flush(ev, el)       { return this.onFlush(ev); },
      "flush-rem"(ev, el) { return this.onFlushRem(ev); },
      "stop-by-name"(ev)  { return this.onStopByName(ev); },
      "stop-by-uid"(ev)   { return this.onStopByUID(ev); },
      "row-toggle-pause"(ev, el) { return this.onRowTogglePause(ev, el); },
      "row-stop"(ev, el)  { return this.onRowStop(ev, el); },
      "copy-uid"(ev, el)  { return this.onCopyUID(ev, el); }
    }
  };

    static PARTS = { body: { template: "modules/about-time-next/templates/ATEventManagerAppV2.hbs" } };

  #ticker = null;
  #queueSig = ""; // tracks UID:time signature so we know when to refresh

  async render(force, options = {}) {
    const out = await super.render(force, options);
    // v13.1.3.0 — build macro datalist and attach refresh
    this.#rebuildMacroDatalist?.();
    const btn = this.element?.querySelector?.('.at-emv2-macro-refresh');
    if (btn && !btn._atnBound) {
      btn.addEventListener('click', () => {
        this.#rebuildMacroDatalist?.();
      }, { passive: true });
      btn._atnBound = true;
    }
    this.#queueSig = this.#computeQueueSignature();
    emDebugLog("render()", { queueSigLen: this.#queueSig?.length ?? 0 });
    if (!this.#ticker) this.#startTicker();
    return out;
  }

  async close(options) {
    this.#stopTicker();
    return super.close(options);
  }

  async _prepareContext() {
    const now = game.time.worldTime;
    const entries = [];

    let stored = null;
    try {
      stored = game.settings.get(MODULE_ID, "store") || null;
    } catch {
      stored = null;
    }

    const storedQueue = stored?._eventQueue ?? null;
    const storedArray = Array.isArray(storedQueue?.array) ? storedQueue.array : null;
    const storedSize = Number.isInteger(storedQueue?.size) ? storedQueue.size : null;

    const liveQueue = ElapsedTime?._eventQueue;
    const liveArray = (liveQueue && Array.isArray(liveQueue.array)) ? liveQueue.array : null;
    const liveSize = (liveQueue && Number.isInteger(liveQueue.size)) ? liveQueue.size : null;

    const srcArray = storedArray ?? liveArray;
    const srcSize = storedSize ?? liveSize ?? 0;

    emDebugLog("_prepareContext()", {
      storedSize,
      liveSize,
      source: storedArray ? "store" : (liveArray ? "live" : "none"),
      srcSize
    });

    let calendarTooltip = "";
    try {
      const adapter = CalendarAdapter.getActive();
      const systemName = CalendarAdapter.getSystemName(adapter?.systemId);
      calendarTooltip = systemName ? `${systemName} in use` : "";
    } catch (_) {
      calendarTooltip = "";
    }

    if (srcArray && Number.isInteger(srcSize)) {
      for (let i = 0; i < srcSize; i++) {
        const e = srcArray[i];
        if (!e) continue;
        const meta = e?.args?.[0] ?? e?._args?.[0] ?? {};
        const name = String(meta.__atName ?? "");
        const msg  = String(meta.__atMsg  ?? "");
        const inc  = Number(e?.increment ?? e?._increment ?? 0);
        const time = Number(e?.time ?? e?._time ?? 0);

        const paused = !!meta?.__atPaused;
        const pausedRemaining = Math.max(0, Math.floor(Number(meta?.__atPausedRemaining) || 0));
        const pausedNextTime = Number(meta?.__atPausedNextTime);
        const displayTime = (paused && Number.isFinite(pausedNextTime)) ? pausedNextTime : time;

        const originalTime = Number(meta?.__atOriginalTime);
        const startedOnBaseTime = Number.isFinite(originalTime) ? originalTime : displayTime;
        const originalTxt = this.#stripHtml(this.#fmtAbsoluteTimestamp(startedOnBaseTime));
        const calTip = String(calendarTooltip || "");
        const startTooltip = [calTip, originalTxt ? `Started On: ${originalTxt}` : ""].filter(Boolean).join("\n");

        entries.push({
          uid: e?.uid ?? e?._uid,
          name,
          msg,
          time,
          startTxt: paused ? this.#fmtAbsoluteTimestamp(displayTime) : this.#fmtTimestamp(time),
          startTooltip,
          remainingTxt: paused ? this.#fmtDHMS(pausedRemaining) : this.#fmtDHMS(Math.max(0, Math.floor(time - now))),
          recurring: !!(e?.recurring ?? e?._recurring),
          paused,
          pauseBtnTxt: paused ? "Resume" : "Pause",
          macroName: String(meta.__macroName || ""),
          macroUuid: String(meta.__macroUuid || ""),
          incTxt: inc ? this.#fmtDHMS(inc) : ""
        });
      }
    }

    return { isGM: !!game.user?.isGM, canManage: isTimekeeper(game.user), entries, calendarTooltip };
  }

  // ---- Actions -------------------------------------------------------------
  async onCreate(event) {
    if (!isTimekeeper(game.user)) return ui.notifications?.warn?.("Timekeeper only");
    const fd = new FormData(this.form);
    const name      = String(fd.get("eventName") || "").trim();
    const durStr    = String(fd.get("duration")  || "").trim();
    const message   = String(fd.get("message")   || "");
    const repeat    = fd.get("repeat")    === "on";
    const runMacro  = fd.get("runMacro")  === "on";
    const macroName = String(fd.get("macroName") || "").trim();

    const seconds = this.#parseMixedDuration(durStr);
    if (!seconds || seconds <= 0) return gmWhisper(`<p>[${MODULE_ID}] Enter a valid duration.</p>`);

    const meta = { 
      __atName: name || (runMacro ? macroName : "(unnamed)"), 
      __atMsg: message,
      __duration: seconds  // Store for card display
    };

    // Persist macro identity for reload: store both name and uuid when available
    let macroUuid = "";
    if (runMacro && macroName) {
      try {
        const m = game.macros?.getName?.(macroName) ?? game.macros?.find?.(mm => mm.name === macroName);
        if (m?.uuid) { macroUuid = m.uuid; }
      } catch(_) {}
      meta.__macroName = macroName;
      if (macroUuid) meta.__macroUuid = macroUuid;
    }

    const handler = async (metaArg) => {
      try {
        // Always show standardized event card first
        // Use __uid from metadata which gets set by doIn/doEvery
        const cardHtml = formatEventChatCard(metaArg, metaArg?.__uid, repeat, seconds);
        await gmWhisper(cardHtml);
        
        // Then execute macro if configured
        if (runMacro && macroName) {
          let macro = null;
          try {
            const uu = metaArg?.__macroUuid || macroUuid;
            if (uu && typeof fromUuid === "function") macro = await fromUuid(uu);
          } catch(_) {}
          if (!macro) macro = game.macros.getName?.(macroName) ?? game.macros.find?.(m => m.name === macroName);
  
          if (macro) {
            if (foundry.utils.isNewerVersion(game.version, "11.0")) await macro.execute({ args: [metaArg] });
            else {
              const body = `return (async () => { ${macro.command} })()`;
              const fn = Function("{speaker, actor, token, character, item, args}={}", body);
              await fn.call(this, { speaker: {}, args: [metaArg] });
            }
          } else ui.notifications?.warn?.(`[${MODULE_ID}] Macro not found: ${macroName}`);
        }
      } catch (err) {
        console.error(`${MODULE_ID} | handler failed`, err);
        await gmWhisper(`<p>[${MODULE_ID}] Handler error: ${foundry.utils.escapeHTML(err?.message || err)}</p>`);
      }
    };
    
    // Mark this handler so the queue knows to serialize as a GM whisper handler
    handler._atHandlerType = "gmWhisper";

    const AT = game.abouttime ?? game.Gametime;
    const uid = repeat ? AT.doEvery({ seconds }, handler, meta) : AT.doIn({ seconds }, handler, meta);
    
    // Store UID in metadata for handler to use
    meta.__uid = uid;
    if (name) await game.user.setFlag(MODULE_ID, name, uid);

    await gmWhisper(
      `<p>[${MODULE_ID}] Created <strong>${repeat ? "repeating" : "one-time"}</strong> event:
        <code>${foundry.utils.escapeHTML(uid)}</code> — ${this.#fmtDHMS(seconds)} — “${foundry.utils.escapeHTML(meta.__atName)}”</p>`
    );
    this.render(true);
  }

  async onStopByName(event) {
    if (!isTimekeeper(game.user)) return;
    const fd = new FormData(this.form);
    const key = String(fd.get("stopKey") || "").trim();
    if (!key) return this.#gmWhisper(`<p>[${MODULE_ID}] Enter an Event Name to stop.</p>`);

    const AT = game.abouttime ?? game.Gametime;
    const q = ElapsedTime?._eventQueue;
    let count = 0;
    if (q?.array && Number.isInteger(q.size)) {
      const target = key.toLowerCase();
      for (let i = 0; i < q.size; i++) {
        const e = q.array[i];
        if ((e?._args?.[0]?.__atName || "").toLowerCase() === target) {
          if (AT.clearTimeout(e._uid)) count++;
        }
      }
    }

    if (count) {
      const flags = (await game.user.getFlag(MODULE_ID)) || {};
      for (const k of Object.keys(flags)) if (flags[k] && typeof flags[k] === "string") {
        let exists = false;
        if (q?.array && Number.isInteger(q.size)) {
          for (let i = 0; i < q.size; i++) if (q.array[i]?._uid === flags[k]) { exists = true; break; }
        }
        if (!exists) await game.user.unsetFlag(MODULE_ID, k);
      }
      await gmWhisper(`<p>[${MODULE_ID}] Stopped ${count} event(s) named <strong>${foundry.utils.escapeHTML(key)}</strong>.</p>`);
      // Force persistence so stopped events don't resurrect after reload
      ElapsedTime._save(true);      
    } else {
      await gmWhisper(`<p>[${MODULE_ID}] No events found named <strong>${foundry.utils.escapeHTML(key)}</strong>.</p>`);
    }
    this.render();
  }

  async onStopByUID(event) {
    if (!isTimekeeper(game.user)) return;
    const fd = new FormData(this.form);
    const uid = String(fd.get("stopKey") || "").trim();
    if (!uid) return this.#gmWhisper(`<p>[${MODULE_ID}] Enter a UID to stop.</p>`);
    const ok = (game.abouttime ?? game.Gametime).clearTimeout(uid);
    if (ok) { await gmWhisper(`<p>[${MODULE_ID}] Stopped event <code>${foundry.utils.escapeHTML(uid)}</code>.</p>`); ElapsedTime._save(true); }
    else    await gmWhisper(`<p>[${MODULE_ID}] No event found for UID <code>${foundry.utils.escapeHTML(uid)}</code>.</p>`);
    this.render();
  }

  async onList() {
    (game.abouttime ?? game.Gametime).chatQueue({ showArgs: false, showUid: true, showDate: true, gmOnly: true });
    await gmWhisper(`<p>[${MODULE_ID}] Queue listed to GM chat.</p>`);
  }

  async onFlush() {
    if (!isTimekeeper(game.user)) return;
    const AT = game.abouttime ?? game.Gametime;
    const q = ElapsedTime?._eventQueue; const count = q?.size ?? 0;
    AT.flushQueue?.();
    await gmWhisper(`<p>[${MODULE_ID}] Flushed ${count} event(s).</p>`);
    this.render();
  }

  async onFlushRem() {
    if (!isTimekeeper(game.user)) return;
    const AT = game.abouttime ?? game.Gametime;
    const q = ElapsedTime?._eventQueue; const count = q?.size ?? 0;
    AT.flushQueue?.();
    AT.reminderIn?.({ seconds: 3600 }, `[${MODULE_ID}] Queue was flushed an hour ago.`);
    await gmWhisper(`<p>[${MODULE_ID}] Flushed ${count} event(s) and scheduled 1h reminder.</p>`);
    this.render();
  }

  async onRowStop(event, el) {
    if (!isTimekeeper(game.user)) return;
    const uid = el?.dataset?.uid || event?.currentTarget?.dataset?.uid;
    if (!uid) return;
    const ok = (game.abouttime ?? game.Gametime).clearTimeout(uid);
    if (ok) { await gmWhisper(`<p>[${MODULE_ID}] Stopped event <code>${foundry.utils.escapeHTML(uid)}</code>.</p>`); ElapsedTime._save(true); }
    this.render();
  }

  async onRowTogglePause(event, el) {
    if (!isTimekeeper(game.user)) return;
    const uid = el?.dataset?.uid || event?.currentTarget?.dataset?.uid;
    if (!uid) return;

    // Determine current state from queue entry metadata
    const q = ElapsedTime?._eventQueue;
    let paused = false;
    try {
      if (q?.array && Number.isInteger(q.size)) {
        for (let i = 0; i < q.size; i++) {
          const e = q.array[i];
          if (e?._uid === uid) {
            paused = !!(e?._args?.[0]?.__atPaused);
            break;
          }
        }
      }
    } catch {
      paused = false;
    }

    const res = paused ? ElapsedTime.resumeEvent(uid) : ElapsedTime.pauseEvent(uid);
    if (!res?.ok) {
      await gmWhisper(`<p>[${MODULE_ID}] ${paused ? "Resume" : "Pause"} failed for <code>${foundry.utils.escapeHTML(uid)}</code>.</p>`);
    } else {
      await gmWhisper(`<p>[${MODULE_ID}] ${paused ? "Resumed" : "Paused"} event <code>${foundry.utils.escapeHTML(uid)}</code>.</p>`);
    }
    this.render(true);
  }

  async onCopyUID(event, el) {
    const uid = el?.dataset?.uid || event?.currentTarget?.dataset?.uid;
    if (!uid) return;
    try {
      await navigator.clipboard?.writeText?.(uid);
      ui.notifications?.info?.("UID copied to clipboard");
    } catch {
      ui.notifications?.warn?.("Clipboard unavailable");
    }
  }

  // ---- Helpers -------------------------------------------------------------
    // Build a lightweight signature of the current queue (order-stable)
  #computeQueueSignature() {
    // Prefer the persisted queue (authoritative) to avoid stale in-memory views.
    try {
      const stored = game.settings.get(MODULE_ID, "store") || null;
      const sq = stored?._eventQueue ?? null;
      const arr = Array.isArray(sq?.array) ? sq.array : null;
      const size = Number.isInteger(sq?.size) ? sq.size : 0;
      if (arr && Number.isInteger(size)) {
        let sig = "";
        for (let i = 0; i < size; i++) {
          const e = arr[i];
          if (!e) continue;
          sig += `${e.uid}:${Number(e.time || 0)}|`;
        }
        return sig;
      }
    } catch {
      // ignore
    }

    const q = ElapsedTime?._eventQueue;
    if (!q?.array || !Number.isInteger(q.size)) return "";
    let sig = "";
    for (let i = 0; i < q.size; i++) {
      const e = q.array[i];
      if (!e) continue;
      sig += `${e._uid}:${Number(e._time || 0)}|`;
    }
    return sig;
  }

  #gmWhisper(html) {
    const ids = ChatMessage.getWhisperRecipients("GM").filter((u) => u.active).map((u) => u.id);
    return ChatMessage.create({ content: html, whisper: ids });
  }

  #parseMixedDuration(input) {
    if (!input || typeof input !== "string") return 0;
    let total = 0; const re = /(\d+)\s*(d|day|days|h|hr|hrs|hour|hours|m|min|mins|minute|minutes|s|sec|secs|second|seconds)?/gi;
    let m; while ((m = re.exec(input))) {
      const v = Number(m[1]); const u = (m[2] || "s").toLowerCase();
      total += ["d","day","days"].includes(u) ? v*86400
             : ["h","hr","hrs","hour","hours"].includes(u) ? v*3600
             : ["m","min","mins","minute","minutes"].includes(u) ? v*60
             : v;
    }
    return Math.floor(total);
  }

  #fmtDHMS(totalSeconds) {
    const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return `${String(d).padStart(2, "0")}:${pad(h)}:${pad(m)}:${pad(sec)}`;
  }

  // If a calendar system is present, show its formatted date/time.
  // Otherwise, show a friendly relative start: "in DD:HH:MM:SS".
  #fmtTimestamp(ts) {
    try {
      const adapter = CalendarAdapter.getActive();
      if (adapter && adapter.systemId !== "none") {
        const f = adapter.formatDateTime(ts);
        const date = f?.date || "";
        const time = f?.time || "";
        const sep = (date && time) ? ", " : (date ? "" : "");
        return `${date}${sep}${time}`.trim();
      }
    } catch (err) {
      // Silently fall back to relative time on error
    }
    const now = game.time.worldTime ?? 0;
    const diff = Math.max(0, Math.floor(ts - now));
    return `in ${this.#fmtDHMS(diff)}`;
  }

  // Always returns a stable representation for an absolute timestamp.
  #fmtAbsoluteTimestamp(ts) {
    try {
      const adapter = CalendarAdapter.getActive();
      if (adapter && adapter.systemId !== "none") {
        const f = adapter.formatDateTime(ts);
        const date = f?.date || "";
        const time = f?.time || "";
        const sep = (date && time) ? ", " : (date ? "" : "");
        return `${date}${sep}${time}`.trim();
      }
    } catch (_) {
      // ignore
    }
    return `t+${Math.round(Number(ts) || 0)}s`;
  }

  #stripHtml(s) {
    return String(s || "")
      .replace(/<sup>(.*?)<\/sup>/gi, "$1")
      .replace(/<[^>]*>/g, "");
  }

    #startTicker() {
    this.#stopTicker();
    this.#ticker = setInterval(() => {
      const now = game.time.worldTime;
      for (const el of this.element?.querySelectorAll?.("[data-remaining][data-time]") ?? []) {
        const time = Number(el.dataset.time || 0);
        el.textContent = this.#fmtDHMS(Math.max(0, Math.floor(time - now)));
      }
      // If queue changed (event fired/removed/rescheduled), re-render to refresh rows & data-time
      const nextSig = this.#computeQueueSignature();
      if (nextSig !== this.#queueSig) {
        emDebugLog("queue signature changed", {
          prevLen: this.#queueSig?.length ?? 0,
          nextLen: nextSig?.length ?? 0
        });
        this.#queueSig = nextSig;
        this.render();
      }
    }, 1000);
  }

  #stopTicker() { if (this.#ticker) { clearInterval(this.#ticker); this.#ticker = null; } }
}

// Convenience export for macro users
// v13.1.3.0 — Return the instance (not the render Promise) so callers can manage it.
export function openATEventManagerV2(options = {}) {
  const app = new ATEventManagerAppV2(options);
  // Fire and forget; callers can still await app.render(true) if they want.
  app.render(true);
  return app;
}
