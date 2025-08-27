// ============================================================================
// File: modules/about-time-v13/module/ATEventManagerAppV2.js
// v13.0.8.0.6 — Minimal patch: min-width + functional actions for row buttons
// Base: v13.0.8.0.2
// ============================================================================

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api; // v12+
import { ElapsedTime } from "./ElapsedTime.js";
import { MODULE_ID } from "./settings.js";

export class ATEventManagerAppV2 extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "at-em-v2",
    classes: ["about-time", "at-emv2", "at-dracula"],
    tag: "form",
    window: { title: "About Time — Event Manager V2", icon: "fas fa-clock", resizable: true },
    position: { width: 760, height: "auto" }, // keep original width; enforce min-width after render
    // CHANGE: functions instead of strings; pass (ev, el) for row actions
    actions: {
      create(ev, el)      { return this.onCreate(ev); },
      list(ev, el)        { return this.onList(ev); },
      flush(ev, el)       { return this.onFlush(ev); },
      "flush-rem"(ev, el) { return this.onFlushRem(ev); },
      "stop-by-name"(ev)  { return this.onStopByName(ev); },
      "stop-by-uid"(ev)   { return this.onStopByUID(ev); },
      "row-stop"(ev, el)  { return this.onRowStop(ev, el); },
      "copy-uid"(ev, el)  { return this.onCopyUID(ev, el); }
    }
  };

  static PARTS = { body: { template: "modules/about-time-v13/templates/ATEventManagerAppV2.hbs" } };

  #ticker = null;

  // CHANGE: enforce min-width after render; keep ticker behavior
  async render(force, options = {}) {
    const out = await super.render(force, options);
    this.element?.style && (this.element.style.minWidth = "920px");
    if (!this.#ticker) this.#startTicker();
    return out;
  }

  async close(options) { this.#stopTicker(); return super.close(options); }

  async _prepareContext() {
    const now = game.time.worldTime;
    const q = ElapsedTime?._eventQueue;
    const entries = [];

    if (q?.array && Number.isInteger(q.size)) {
      for (let i = 0; i < q.size; i++) {
        const e = q.array[i];
        if (!e) continue;
        const meta = e?._args?.[0] ?? {};
        const name = String(meta.__atName ?? "");
        const msg  = String(meta.__atMsg  ?? "");
        const inc  = Number(e?._increment || 0);
        const time = Number(e._time || 0);
        entries.push({
          uid: e._uid,
          name,
          msg,
          time,
          startTxt: this.#fmtTimestamp(time),
          remainingTxt: this.#fmtDHMS(Math.max(0, Math.floor(time - now))),
          recurring: !!e?._recurring,
          incTxt: inc ? this.#fmtDHMS(inc) : ""
        });
      }
    }

    return { isGM: !!game.user?.isGM, entries };
  }

  // ---- Actions (same as 0.2) ---------------------------------------------
  async onCreate(event) {
    if (!game.user?.isGM) return ui.notifications?.warn?.("GM only");
    const fd = new FormData(this.form);
    const name      = String(fd.get("eventName") || "").trim();
    const durStr    = String(fd.get("duration")  || "").trim();
    const message   = String(fd.get("message")   || "");
    const repeat    = fd.get("repeat")    === "on";
    const runMacro  = fd.get("runMacro")  === "on";
    const macroName = String(fd.get("macroName") || "").trim();

    const seconds = this.#parseMixedDuration(durStr);
    if (!seconds || seconds <= 0) return this.#gmWhisper(`<p>[${MODULE_ID}] Enter a valid duration.</p>`);

    const meta = { __atName: name || (runMacro ? macroName : "(unnamed)"), __atMsg: message };

    const handler = async (metaArg) => {
      try {
        if (runMacro && macroName) {
          const macro = game.macros.getName?.(macroName) ?? game.macros.find?.(m => m.name === macroName);
          if (macro) {
            if (isNewerVersion(game.version, "11.0")) await macro.execute({ args: [metaArg] });
            else {
              const body = `return (async () => { ${macro.command} })()`;
              const fn = Function("{speaker, actor, token, character, item, args}={}", body);
              await fn.call(this, { speaker: {}, args: [metaArg] });
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

    await this.#gmWhisper(`<p>[${MODULE_ID}] Created <strong>${repeat ? "repeating" : "one-time"}</strong> event: <code>${foundry.utils.escapeHTML(uid)}</code> — ${this.#fmtDHMS(seconds)} — “${foundry.utils.escapeHTML(meta.__atName)}”</p>`);
    this.render(true);
  }

  async onStopByName(event) {
    if (!game.user?.isGM) return;
    const fd = new FormData(this.form);
    const key = String(fd.get("stopKey") || "").trim();
    if (!key) return this.#gmWhisper(`<p>[${MODULE_ID}] Enter an Event Name to stop.</p>`);

    const AT = game.abouttime ?? game.Gametime;
    const q = ElapsedTime?._eventQueue;
    let count = 0;
    if (q?.array && Number.isInteger(q.size)) {
      for (let i = 0; i < q.size; i++) {
        const e = q.array[i];
        if ((e?._args?.[0]?.__atName || "").toLowerCase() === key.toLowerCase()) {
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
      await this.#gmWhisper(`<p>[${MODULE_ID}] Stopped ${count} event(s) named <strong>${foundry.utils.escapeHTML(key)}</strong>.</p>`);
    } else {
      await this.#gmWhisper(`<p>[${MODULE_ID}] No events found named <strong>${foundry.utils.escapeHTML(key)}</strong>.</p>`);
    }
    this.render();
  }

  async onStopByUID(event) {
    if (!game.user?.isGM) return;
    const fd = new FormData(this.form);
    const uid = String(fd.get("stopKey") || "").trim();
    if (!uid) return this.#gmWhisper(`<p>[${MODULE_ID}] Enter a UID to stop.</p>`);
    const ok = (game.abouttime ?? game.Gametime).clearTimeout(uid);
    if (ok) await this.#gmWhisper(`<p>[${MODULE_ID}] Stopped event <code>${foundry.utils.escapeHTML(uid)}</code>.</p>`);
    else await this.#gmWhisper(`<p>[${MODULE_ID}] No event found for UID <code>${foundry.utils.escapeHTML(uid)}</code>.</p>`);
    this.render();
  }

  async onList() {
    (game.abouttime ?? game.Gametime).chatQueue({ showArgs: false, showUid: true, showDate: true, gmOnly: true });
    await this.#gmWhisper(`<p>[${MODULE_ID}] Queue listed to GM chat.</p>`);
  }

  async onFlush() {
    const AT = game.abouttime ?? game.Gametime;
    const q = ElapsedTime?._eventQueue; const count = q?.size ?? 0;
    AT.flushQueue?.();
    await this.#gmWhisper(`<p>[${MODULE_ID}] Flushed ${count} event(s).</p>`);
    this.render();
  }

  async onFlushRem() {
    const AT = game.abouttime ?? game.Gametime;
    const q = ElapsedTime?._eventQueue; const count = q?.size ?? 0;
    AT.flushQueue?.();
    AT.reminderIn?.({ seconds: 3600 }, `[${MODULE_ID}] Queue was flushed an hour ago.`);
    await this.#gmWhisper(`<p>[${MODULE_ID}] Flushed ${count} event(s) and scheduled 1h reminder.</p>`);
    this.render();
  }

  // CHANGE: accept (event, el) and prefer el.dataset.uid
  async onRowStop(event, el) {
    if (!game.user?.isGM) return;
    const uid = el?.dataset?.uid || event?.currentTarget?.dataset?.uid;
    if (!uid) return;
    const ok = (game.abouttime ?? game.Gametime).clearTimeout(uid);
    if (ok) await this.#gmWhisper(`<p>[${MODULE_ID}] Stopped event <code>${foundry.utils.escapeHTML(uid)}</code>.</p>`);
    this.render();
  }

  async onCopyUID(event, el) {
    const uid = el?.dataset?.uid || event?.currentTarget?.dataset?.uid;
    if (!uid) return;
    try { await navigator.clipboard?.writeText?.(uid); ui.notifications?.info?.("UID copied to clipboard"); }
    catch { ui.notifications?.warn?.("Clipboard unavailable"); }
  }

  // ---- Helpers ------------------------------------------------------------
  #gmWhisper(html) {
    const ids = ChatMessage.getWhisperRecipients("GM").filter((u) => u.active).map((u) => u.id);
    return ChatMessage.create({ content: html, whisper: ids });
  }

  #parseMixedDuration(input) {
    if (!input || typeof input !== "string") return 0;
    let total = 0; const re = /(\d+)\s*(d|day|days|h|hr|hrs|hour|hours|m|min|mins|minute|minutes|s|sec|secs|second|seconds)?/gi;
    let m; while ((m = re.exec(input))) {
      const v = Number(m[1]); const u = (m[2] || "s").toLowerCase();
      total += ["d","day","days"].includes(u) ? v*86400 : ["h","hr","hrs","hour","hours"].includes(u) ? v*3600 : ["m","min","mins","minute","minutes"].includes(u) ? v*60 : v;
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
      for (const el of this.element?.querySelectorAll?.("[data-remaining][data-time]") ?? []) {
        const time = Number(el.dataset.time || 0);
        el.textContent = this.#fmtDHMS(Math.max(0, Math.floor(time - now)));
      }
    }, 1000);
  }

  #stopTicker() { if (this.#ticker) { clearInterval(this.#ticker); this.#ticker = null; } }
}

export function openATEventManagerV2(options = {}) { return new ATEventManagerAppV2(options).render(true); }
```

---

## modules/about-time-v13/templates/ATEventManagerAppV2.hbs

```html
<!-- v13.0.8.0.6 — Minimal patch: only add min-width rule; contents unchanged -->
<section class="at-emv2 at-dracula">
  <style>
    :root { --atd-bg:#282a36; --atd-panel:#1e1f29; --atd-surface:#2b2e3b; --atd-fg:#f8f8f2; --atd-muted:#bd93f9;
            --atd-accent:#6272a4; --atd-green:#50fa7b; --atd-red:#ff5555; --atd-orange:#ffb86c; --atd-yellow:#f1fa8c; --atd-cyan:#8be9fd; --atd-pink:#ff79c6; }
    .at-dracula { color: var(--atd-fg); }
    .at-dracula input, .at-dracula select, .at-dracula textarea { background: var(--atd-surface); color: var(--atd-fg); border: 1px solid var(--atd-accent); }
    /* CHANGE: enforce only the app min-width; no other layout tweaks */
    .at-emv2 { min-width: 920px; }
    .at-emv2 .row{display:flex;gap:.5rem;align-items:center;margin:.25rem 0}
    .at-emv2 label{min-width:120px;color:var(--atd-fg)}
    .at-emv2 input[type="text"], .at-emv2 input[type="search"]{width:100%}
    .at-emv2 table{width:100%;border-collapse:collapse;background:var(--atd-panel)}
    .at-emv2 th, .at-emv2 td{padding:.45rem;border-bottom:1px solid var(--atd-accent)}
    .at-emv2 th{color:var(--atd-yellow)}
    .at-emv2 .muted{opacity:.9;color:var(--atd-muted);font-size:.9em}
    .at-emv2 hr{border:none;border-top:1px solid var(--atd-accent);margin:.5rem 0}
    .at-btn{display:inline-block;padding:.35rem .6rem;border-radius:.5rem;border:1px solid var(--atd-accent);background:var(--atd-surface);
            color:var(--atd-fg);line-height:1;white-space:nowrap}
    .at-btn:hover{filter:brightness(1.1)}
    .at-btn.primary{border-color:var(--atd-green);box-shadow:0 0 0 1px var(--atd-green) inset}
    .at-btn.warn{border-color:var(--atd-orange);box-shadow:0 0 0 1px var(--atd-orange) inset}
    .at-btn.danger{border-color:var(--atd-red);box-shadow:0 0 0 1px var(--atd-red) inset}
  </style>

  <div class="controls">
    <div class="row">
      <label>Event Name</label>
      <input type="text" name="eventName" placeholder="Short name (used for stop-by-name)" />
    </div>
    <div class="row">
      <label>Duration</label>
      <input type="text" name="duration" placeholder="e.g. 1h30m, 45s, 2d 4h" />
      <span class="muted">Format accepts d/h/m/s in any order.</span>
    </div>
    <div class="row">
      <label>Message</label>
      <input type="text" name="message" placeholder="GM whisper or macro arg" />
    </div>
    <div class="row">
      <label>Options</label>
      <label><input type="checkbox" name="repeat" /> Repeat</label>
      <label><input type="checkbox" name="runMacro" /> Run Macro</label>
      <input type="text" name="macroName" placeholder="Macro Name" />
    </div>
    <div class="row buttons">
      {{#if isGM}}
      <button type="button" class="at-btn primary" data-action="create">Create</button>
      <input type="text" name="stopKey" placeholder="Stop → enter Name or UID" />
      <button type="button" class="at-btn warn" data-action="stop-by-name">Stop by Name</button>
      <button type="button" class="at-btn warn" data-action="stop-by-uid">Stop by UID</button>
      <button type="button" class="at-btn" data-action="list">Send Queue to Chat</button>
      <button type="button" class="at-btn danger" data-action="flush">Stop all Events</button>
      <button type="button" class="at-btn danger" data-action="flush-rem">Stop all + 1h reminder</button>
      {{else}}
      <span class="muted">Players can view the queue only.</span>
      {{/if}}
    </div>
  </div>

  <hr />

  <div class="queue">
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Starts</th>
          <th>Remaining</th>
          <th>Repeat</th>
          <th>Message</th>
          <th>UID</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {{#if entries.length}}
          {{#each entries as |e|}}
          <tr data-uid="{{e.uid}}">
            <td class="name">{{e.name}}</td>
            <td class="start">{{e.startTxt}}</td>
            <td class="remain"><span data-remaining data-time="{{e.time}}">{{e.remainingTxt}}</span></td>
            <td class="repeat">{{#if e.recurring}}Yes ({{e.incTxt}}){{else}}—{{/if}}</td>
            <td class="msg">{{e.msg}}</td>
            <td class="uid"><code>{{e.uid}}</code></td>
            <td class="actions">
              {{#if ../isGM}}<button type="button" class="at-btn warn" data-action="row-stop" data-uid="{{e.uid}}">Stop</button>{{/if}}
              <button type="button" class="at-btn" data-action="copy-uid" data-uid="{{e.uid}}">Copy UID</button>
            </td>
          </tr>
          {{/each}}
        {{else}}
          <tr><td colspan="7" class="muted">- (empty queue) -</td></tr>
        {{/if}}
      </tbody>
    </table>
  </div>
</section>
