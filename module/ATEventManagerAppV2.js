// ============================================================================
// File: modules/about-time-v13/module/ATEventManagerAppV2.js
// v13.0.8-dev — Standalone Event Manager (AppV2) — additive, macro-opened only
// ============================================================================

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api; // v12+ API
import { ElapsedTime } from "./ElapsedTime.js";
import { MODULE_ID } from "./settings.js";

export class ATEventManagerAppV2 extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "at-em-v2",
    classes: ["about-time", "at-emv2"],
    tag: "form",
    window: { title: "About Time — Event Manager V2", icon: "fas fa-clock", resizable: true },
    position: { width: 760, height: "auto" },
    actions: {
      create:      (ev, el) => el.closest?.("form") && this._onCreate.call(this, ev),
      list:        () => this._onList(),
      flush:       () => this._onFlush(false),
      "flush-rem": () => this._onFlush(true),
      "stop-by-name": () => this._onStopByName(),
      "stop-by-uid":  () => this._onStopByUID(),
      "row-stop":   (ev, el) => this._onRowStop(el.dataset.uid),
      "copy-uid":   (ev, el) => this._onCopyUID(el.dataset.uid)
    }
  };

  static PARTS = {
    body: { template: "modules/about-time-v13/templates/ATEventManagerAppV2.hbs" }
  };

  // ---- Lifecycle -----------------------------------------------------------
  #ticker = null;

  async _prepareContext() {
    const q = ElapsedTime._eventQueue;
    const now = game.time.worldTime;
    const entries = [];

    if (q && Array.isArray(q.array)) {
      for (let i = 0; i < q.size; i++) {
        const e = q.array[i];
        const meta = e?._args?.[0] ?? {};
        const name = String(meta.__atName ?? "");
        const msg  = String(meta.__atMsg  ?? "");
        const inc  = Number(e?._increment || 0);
        entries.push({
          uid: e._uid,
          name,
          msg,
          time: Number(e._time || 0),
          startTxt: this.#fmtTimestamp(e._time),
          remainingTxt: this.#fmtDHMS(Math.max(0, Math.floor(e._time - now))),
          recurring: !!e?._recurring,
          increment: inc,
          incTxt: inc ? this.#fmtDHMS(inc) : "",
          handler: typeof e?._handler === "string" ? e._handler : "[function]"
        });
      }
    }

    return {
      isGM: !!game.user?.isGM,
      now,
      usingSC: !!(globalThis.SimpleCalendar?.api),
      entries,
      modId: MODULE_ID
    };
  }

  async _onFirstRender() { this.#startTicker(); }
  _onClose() { this.#stopTicker(); }

  // ---- Actions -------------------------------------------------------------
  static async _onCreate() {
    if (!game.user?.isGM) return ui.notifications?.warn?.("GM only");
    const form = this.form; if (!form) return;

    const fd = new FormData(form);
    const name      = String(fd.get("eventName") || "").trim();
    const durStr    = String(fd.get("duration")  || "").trim();
    const message   = String(fd.get("message")   || "");
    const repeat    = fd.get("repeat")    === "on";
    const runMacro  = fd.get("runMacro")  === "on";
    const macroName = String(fd.get("macroName") || "").trim();

    const seconds = this.#parseMixedDuration(durStr);
    if (!seconds) return this.#gmWhisper(`<p>[${MODULE_ID}] Enter a valid duration.</p>`);

    const meta = { __atName: name || (runMacro ? macroName : "(unnamed)"), __atMsg: message };

    const handler = async (metaArg) => {
      try {
        if (runMacro && macroName) {
          const macro = game.macros.get(macroName) || game.macros.getName?.(macroName);
          if (macro) {
            if (isNewerVersion(game.version, "11.0")) await macro.execute({ args: [metaArg] });
            else {
              // Legacy execute shim (why: keep compatibility if on v10/early v11)
              const body = `return (async () => { ${macro.command} })()`;
              const fn = Function("{speaker, actor, token, character, item, args}={}", body);
              await fn.call(this, { speaker: {}, actor: undefined, token: undefined, character: null, args: [metaArg] });
            }
          } else ui.notifications?.warn?.(`[${MODULE_ID}] Macro not found: ${macroName}`);
        } else {
          await this.#gmWhisper(`<p>[${MODULE_ID}] ${foundry.utils.escapeHTML(metaArg.__atMsg || metaArg.__atName || "(event)")}</p>`);
        }
      } catch (err) {
        console.error(`${MODULE_ID} | handler failed`, err);
        await this.#gmWhisper(`<p>[${MODULE_ID}] Handler error: ${foundry.utils.escapeHTML(err?.message || err)}</p>`);
      }
    };

    const AT = game.abouttime ?? game.Gametime;
    const uid = repeat ? AT.doEvery({ seconds }, handler, meta) : AT.doIn({ seconds }, handler, meta);
    if (name) await game.user.setFlag(MODULE_ID, name, uid);

    await this.#gmWhisper(
      `<p>[${MODULE_ID}] Created <strong>${repeat ? "repeating" : "one-time"}</strong> event:
        <code>${foundry.utils.escapeHTML(uid)}</code> — ${this.#fmtDHMS(seconds)} — “${foundry.utils.escapeHTML(meta.__atName)}”</p>`
    );
    this.render(true);
  }

  async _onStopByName() {
    if (!game.user?.isGM) return;
    const fd = new FormData(this.form);
    const key = String(fd.get("stopKey") || "").trim();
    if (!key) return this.#gmWhisper(`<p>[${MODULE_ID}] Enter an Event Name to stop.</p>`);

    const q = ElapsedTime._eventQueue;
    if (!q?.array) return this.#gmWhisper(`<p>[${MODULE_ID}] Queue not available.</p>`);
    const target = key.toLowerCase();
    const removed = q.removeMany((e) => (e?._args?.[0]?.__atName || "").toLowerCase() === target);

    if (removed?.length) {
      const flags = (await game.user.getFlag(MODULE_ID)) || {};
      for (const k of Object.keys(flags)) if (removed.some((r) => r._uid === flags[k])) await game.user.unsetFlag(MODULE_ID, k);
      (game.abouttime ?? game.Gametime)._save?.(true);
      await this.#gmWhisper(`<p>[${MODULE_ID}] Stopped ${removed.length} event(s) named <strong>${foundry.utils.escapeHTML(key)}</strong>.</p>`);
    } else {
      await this.#gmWhisper(`<p>[${MODULE_ID}] No events found named <strong>${foundry.utils.escapeHTML(key)}</strong>.</p>`);
    }
    this.render();
  }

  async _onStopByUID() {
    if (!game.user?.isGM) return;
    const fd = new FormData(this.form);
    const uid = String(fd.get("stopKey") || "").trim();
    if (!uid) return this.#gmWhisper(`<p>[${MODULE_ID}] Enter a UID to stop.</p>`);
    const removed = (game.abouttime ?? game.Gametime).clearTimeout(uid);
    if (removed) {
      const flags = (await game.user.getFlag(MODULE_ID)) || {};
      for (const k of Object.keys(flags)) if (flags[k] === uid) await game.user.unsetFlag(MODULE_ID, k);
      await this.#gmWhisper(`<p>[${MODULE_ID}] Stopped event <code>${foundry.utils.escapeHTML(uid)}</code>.</p>`);
    } else {
      await this.#gmWhisper(`<p>[${MODULE_ID}] No event found for UID <code>${foundry.utils.escapeHTML(uid)}</code>.</p>`);
    }
    this.render();
  }

  async _onList() {
    (game.abouttime ?? game.Gametime).chatQueue({ showArgs: false, showUid: true, showDate: true, gmOnly: true });
    await this.#gmWhisper(`<p>[${MODULE_ID}] Queue listed to GM chat.</p>`);
  }

  async _onFlush(withReminder) {
    const AT = game.abouttime ?? game.Gametime;
    const q = ElapsedTime._eventQueue; const count = q?.size ?? 0;
    AT.flushQueue?.();
    if (withReminder) AT.reminderIn({ seconds: 3600 }, `[${MODULE_ID}] Queue was flushed an hour ago.`);
    await this.#gmWhisper(`<p>[${MODULE_ID}] Flushed ${count} event(s)${withReminder ? " and scheduled 1h reminder" : ""}.</p>`);
    this.render();
  }

  async _onRowStop(uid) {
    if (!game.user?.isGM || !uid) return;
    const ok = (game.abouttime ?? game.Gametime).clearTimeout(uid);
    if (ok) await this.#gmWhisper(`<p>[${MODULE_ID}] Stopped event <code>${foundry.utils.escapeHTML(uid)}</code>.</p>`);
    this.render();
  }

  async _onCopyUID(uid) {
    try {
      await navigator.clipboard?.writeText?.(uid);
      ui.notifications?.info?.("UID copied to clipboard");
    } catch {
      ui.notifications?.warn?.("Clipboard unavailable");
    }
  }

  // ---- Helpers -------------------------------------------------------------
  #gmWhisper(html) {
    const ids = ChatMessage.getWhisperRecipients("GM").filter((u) => u.active).map((u) => u.id);
    return ChatMessage.create({ content: html, whisper: ids, type: CONST.CHAT_MESSAGE_STYLES.OTHER });
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

  #fmtTimestamp(ts) {
    const api = globalThis.SimpleCalendar?.api;
    if (api?.timestampToDate && api?.formatDateTime) {
      const dt = api.timestampToDate(ts);
      const f = api.formatDateTime(dt) ?? { date: "", time: `t+${ts}` };
      return `${f.date ? f.date + " " : ""}${f.time}`;
    }
    return `t+${ts}`;
  }

  #startTicker() {
    this.#stopTicker();
    this.#ticker = setInterval(() => {
      const now = game.time.worldTime;
      for (const el of this.element.querySelectorAll?.("[data-remaining][data-time]")) {
        const time = Number(el.dataset.time || 0);
        el.textContent = this.#fmtDHMS(Math.max(0, Math.floor(time - now)));
      }
    }, 1000);
  }

  #stopTicker() { if (this.#ticker) { clearInterval(this.#ticker); this.#ticker = null; } }
}

// Convenience export if you prefer importing a function
export function openATEventManagerV2(options = {}) {
  return new ATEventManagerAppV2(options).render(true);
}
