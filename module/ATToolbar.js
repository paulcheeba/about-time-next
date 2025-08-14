// module/ATToolbar.js
// About-Time v13.0.5 — Toolbar tool to open the Event Manager (DialogV2)
// NOTE: v13 getSceneControlButtons passes controls: Record<string, SceneControl>,
// and SceneControl.tools is Record<string, SceneControlTool>.
// We support that shape, and gracefully fallback if another module still provides arrays.

const MOD = "about-time-v13";

/** Normalize control bag to an object record keyed by control name. */
function normalizeControls(controlsArg) {
  // v13 shape: Record<string, SceneControl>
  if (controlsArg && !Array.isArray(controlsArg)) return controlsArg;

  // Some older modules may still pass arrays: convert to record
  if (Array.isArray(controlsArg)) {
    const rec = {};
    for (const c of controlsArg) if (c?.name) rec[c.name] = c;
    return rec;
  }

  // Last resort: try ui.controls.controls (varies; best-effort)
  const maybe = ui?.controls?.controls;
  if (Array.isArray(maybe)) {
    const rec = {};
    for (const c of maybe) if (c?.name) rec[c.name] = c;
    return rec;
  }
  return {};
}

/** Ensure tools is a Record<string, SceneControlTool>; convert array → record if needed. */
function normalizeTools(control) {
  if (!control) return;
  if (!control.tools) control.tools = {};
  // If some system provided an array, convert to record one time.
  if (Array.isArray(control.tools)) {
    const rec = {};
    for (const t of control.tools) if (t?.name) rec[t.name] = t;
    control.tools = rec;
  }
}

/** Insert tool only once. */
function addToolRecord(control, tool) {
  normalizeTools(control);
  if (!control || !tool?.name) return;
  if (!control.tools[tool.name]) control.tools[tool.name] = tool;
}

/* ---------------- Scene Controls: add tool under Journal/Notes ---------------- */
Hooks.on("getSceneControlButtons", (controlsArg) => {
  if (!game.user?.isGM) return; // GM-only

  const controls = normalizeControls(controlsArg);
  // Prefer "journal" but support "notes" if that’s what the system uses
  const ctl = controls["journal"] ?? controls["notes"];
  if (!ctl) return;

  addToolRecord(ctl, {
    name: "about-time-manager",
    title: "About Time Event Manager",
    icon: "fas fa-clock",
    button: true,
    visible: true,
    // v13 tool schema uses onChange for toggle tools; for a button we use onClick
    onClick: () => openATEventManager(),
    order: Number.isFinite(ctl.order) ? ctl.order + 1 : 999
  });
});

/* ---------------- Event Manager (DialogV2) ---------------- */
function openATEventManager() {
  if (!game.user.isGM) {
    ChatMessage.create({
      whisper: ChatMessage.getWhisperRecipients("GM"),
      content: `[${MOD}] This tool is GM-only.`
    });
    return;
  }

  const AT = game.abouttime ?? game.Gametime;
  const D2 = foundry?.applications?.api?.DialogV2;
  if (!D2) {
    ChatMessage.create({
      whisper: ChatMessage.getWhisperRecipients("GM"),
      content: `[${MOD}] DialogV2 API not found (FVTT v13+ required).`
    });
    return;
  }

  // ---------- helpers ----------
  const gmWhisper = (html) => ChatMessage.create({ whisper: ChatMessage.getWhisperRecipients("GM"), content: html });
  const esc = (s) => foundry.utils.escapeHTML(String(s ?? ""));

  function parseMixedDuration(input) {
    if (!input || typeof input !== "string") return 0;
    const cleaned = input.trim();
    if (/^\d+$/.test(cleaned)) return Number(cleaned);
    const re = /(\d+)\s*(d|h|m|s)?/gi;
    let total = 0, m;
    while ((m = re.exec(cleaned)) !== null) {
      const v = Number(m[1]); const u = (m[2] || "s").toLowerCase();
      total += u === "d" ? v*86400 : u === "h" ? v*3600 : u === "m" ? v*60 : v;
    }
    return total;
  }

  function fmtDHMS(totalSeconds) {
    const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad2 = (n) => String(n).padStart(2, "0");
    return `${String(d).padStart(2, "0")}:${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
  }

  function fmtTimestamp(ts) {
    const api = globalThis.SimpleCalendar?.api;
    if (api?.timestampToDate && api?.formatDateTime) {
      const d = api.timestampToDate(ts);
      const f = api.formatDateTime(d);
      return `${f.date} ${f.time}`;
    }
    return `t+${Math.round(ts)}s`;
  }

  function secondsFromIncrement(inc) {
    if (!inc) return 0;
    if (typeof inc === "number") return Math.max(0, inc);
    const day = Number(inc.day ?? inc.days ?? 0);
    const hour = Number(inc.hour ?? inc.hours ?? 0);
    const minute = Number(inc.minute ?? inc.minutes ?? 0);
    const second = Number(inc.second ?? inc.seconds ?? 0);
    return day*86400 + hour*3600 + minute*60 + second;
  }

  function describeEntry(e) {
    const now = game.time.worldTime;
    const nameFromArgs = e?._args?.[0]?.__atName ?? null;
    const msgFromArgs  = e?._args?.[0]?.__atMsg ?? (typeof e?._args?.[0] === "string" ? e._args[0] : "");
    const eventName = nameFromArgs ?? (typeof e?._handler === "string" ? e._handler : "[fn]");
    const start = fmtTimestamp(e?._time ?? now);
    const remaining = fmtDHMS(Math.max(0, (e?._time ?? now) - now));
    const repeatSec = e?._recurring ? secondsFromIncrement(e._increment) : 0;
    const repeatTxt = repeatSec ? `, every ${fmtDHMS(repeatSec)}` : "";
    return { uid: e?._uid ?? "?", eventName, start, duration: remaining, message: msgFromArgs ?? "", repeatTxt };
  }

  function renderStatus() {
    const q = AT?.ElapsedTime?._eventQueue;
    if (!q || !Array.isArray(q.array) || q.size === 0) return `<textarea class="status-ta" readonly>- (empty queue) -</textarea>`;
    const lines = [];
    for (let i = 0; i < q.size; i++) {
      const d = describeEntry(q.array[i]);
      lines.push(`- ${d.eventName}, ${d.start},  ${d.duration}${d.repeatTxt}, ${d.message}`);
    }
    return `<textarea class="status-ta" readonly>${esc(lines.join("\n"))}</textarea>`;
  }

  function contentTemplate(msg = "Ready.") {
    return `
    <style>
      .dialog-buttons { flex-direction: column; align-items: center; gap: 6px; }
      .dialog-buttons button[data-action="create"]     { background-color:#bcf879; border:2px groove; }
      .dialog-buttons button[data-action="stop-name"]  { background-color:#ff9752; border:2px groove; }
      .dialog-buttons button[data-action="stop-uid"]   { background-color:#ff9752; border:2px groove; }
      .dialog-buttons button[data-action="list"]       { border:2px groove; }
      .dialog-buttons button[data-action="flush"]      { background-color:#ff5252; border:2px groove; }
      .dialog-buttons button[data-action="flush-rem"]  { background-color:#ffc452; border:2px groove; }

      #tam-at .section { border:1px solid #9994; border-radius:6px; padding:8px; margin:8px 0; }
      #tam-at label { min-width:140px; display:inline-block; }
      #tam-at input[type="text"] { width:100%; }
      #tam-at .row { display:flex; gap:8px; align-items:center; margin:6px 0; }
      #tam-at .muted { opacity:.8; font-size:.9em; }
      .status-ta { width:100%; height:140px; resize:vertical; background:#00000022; border:1px solid #9994; border-radius:6px; padding:6px; color: var(--color-text-light-1); font-family: var(--font-primary); }
    </style>

    <div id="tam-at">
      <div class="row" style="justify-content:center;"><div class="muted">Choose an option below, then close the window when finished.</div></div>
      <div class="section"><div><strong>Event Status Board</strong></div>${renderStatus()}</div>

      <div class="section">
        <div><strong>Create Custom Reminder</strong></div>
        <div class="row"><label for="eventName">Event Name</label><input name="eventName" id="eventName" type="text" placeholder="optional key to store UID" /></div>
        <div class="row"><label for="duration">Duration</label><input name="duration" id="duration" type="text" placeholder="e.g. 1h30m, 45s, 2d 4h" /></div>
        <div class="row muted"><span>Duration accepts mixed units: <code>1h30m</code>, <code>45m10s</code>, <code>1d</code>, <code>10s</code></span></div>
        <div class="row"><label for="message">Message</label><input name="message" id="message" type="text" placeholder="What should appear in chat?" /></div>
        <div class="row"><label for="repeat">Repeating?</label><input name="repeat" id="repeat" type="checkbox" /><span class="muted">(Repeat at the given interval)</span></div>
        <div class="row"><label for="runMacro">Run Macro?</label><input name="runMacro" id="runMacro" type="checkbox" /><input name="macroName" id="macroName" type="text" placeholder="Enter macro name to run on event" /></div>
      </div>

      <div class="section">
        <div><strong>Stop Event Reminder</strong></div>
        <div class="row"><label for="stopKey">Event Name/UID</label><input name="stopKey" id="stopKey" type="text" placeholder="Paste a Name or UID from the status board" /></div>
        <div class="muted">(“Stop by Name” matches the Event Name you entered when creating.)</div>
      </div>
      <div class="muted">${esc(msg)}</div>
    </div>`;
  }

  function refresh(dlg, msg) { dlg.content = contentTemplate(msg); dlg.render({ force: true }); }

  async function actCreate(_ev, btn, dlg) {
    const f = btn.form.elements;
    const name     = f.eventName?.value?.toString()?.trim() || "";
    const durStr   = f.duration?.value?.toString() ?? "";
    const msg      = f.message?.value?.toString() ?? "";
    const repeat   = !!f.repeat?.checked;
    const useMacro = !!f.runMacro?.checked;
    const macroNm  = f.macroName?.value?.toString()?.trim() || "";

    const seconds = parseMixedDuration(durStr);
    if (!seconds) { gmWhisper(`<p>[${MOD}] Enter a valid duration (e.g. <code>1h30m</code>, <code>45s</code>, <code>2d</code>).</p>`); return refresh(dlg, "Invalid duration."); }

    const meta = { __atName: name || (useMacro ? macroNm : "(unnamed)"), __atMsg: msg };

    const handler = async (metaArg) => {
      try {
        if (useMacro && macroNm) {
          const macro = game.macros.get(macroNm) || game.macros.getName?.(macroNm);
          if (macro) {
            if (isNewerVersion(game.version, "11.0")) {
              await macro.execute({ args: [metaArg] });
            } else {
              const body = `return (async () => { ${macro.command} })()`;
              const fn = Function("{speaker, actor, token, character, item, args}={}", body);
              await fn.call(this, { speaker: {}, actor: undefined, token: undefined, character: null, args: [metaArg] });
            }
            await ChatMessage.create({
              whisper: ChatMessage.getWhisperRecipients("GM"),
              content: `The macro <strong>${foundry.utils.escapeHTML(macroNm)}</strong> has run on schedule.`
            });
          } else {
            await ChatMessage.create({
              whisper: ChatMessage.getWhisperRecipients("GM"),
              content: `[${MOD}] Macro not found: <code>${foundry.utils.escapeHTML(macroNm)}</code>`
            });
          }
        } else {
          await ChatMessage.create({
            whisper: ChatMessage.getWhisperRecipients("GM"),
            content: `<strong>${foundry.utils.escapeHTML(metaArg.__atName)}</strong>: ${foundry.utils.escapeHTML(metaArg.__atMsg || "(no message)")}`
          });
        }
      } catch (err) {
        await ChatMessage.create({
          whisper: ChatMessage.getWhisperRecipients("GM"),
          content: `[${MOD}] Handler error: ${foundry.utils.escapeHTML(err?.message || err)}`
        });
      }
    };

    const uid = repeat ? AT.doEvery({ seconds }, handler, meta) : AT.doIn({ seconds }, handler, meta);
    if (name) await game.user.setFlag(MOD, name, uid);

    gmWhisper(`<p>[${MOD}] Created <strong>${repeat ? "repeating" : "one-time"}</strong> event:
      <code>${esc(uid)}</code> — ${fmtDHMS(seconds)} — “${esc(meta.__atName)}”</p>`);
    return refresh(dlg, "Event created.");
  }

  async function actStopByName(_ev, btn, dlg) {
    const key = btn.form.elements.stopKey?.value?.toString()?.trim();
    if (!key) { gmWhisper(`<p>[${MOD}] Enter an Event Name to stop.</p>`); return refresh(dlg, "Name required."); }
    const q = AT?.ElapsedTime?._eventQueue;
    if (!q || !Array.isArray(q.array)) { gmWhisper(`<p>[${MOD}] Queue not available.</p>`); return refresh(dlg, "Queue missing."); }
    const target = key.toLowerCase();
    const removed = q.removeMany(e => (e?._args?.[0]?.__atName || "").toLowerCase() === target);
    if (removed?.length) {
      const flags = game.user.getFlag(MOD) || {};
      for (const k of Object.keys(flags)) if (removed.some(r => r._uid === flags[k])) await game.user.unsetFlag(MOD, k);
      AT._save?.(true);
      gmWhisper(`<p>[${MOD}] Stopped ${removed.length} event(s) named <strong>${foundry.utils.escapeHTML(key)}</strong>.</p>`);
    } else {
      gmWhisper(`<p>[${MOD}] No events found named <strong>${foundry.utils.escapeHTML(key)}</strong>.</p>`);
    }
    return refresh(dlg, "Name processed.");
  }

  async function actStopByUID(_ev, btn, dlg) {
    const uid = btn.form.elements.stopKey?.value?.toString()?.trim();
    if (!uid) { gmWhisper(`<p>[${MOD}] Enter a UID to stop.</p>`); return refresh(dlg, "UID required."); }
    const removed = AT.clearTimeout(uid);
    if (removed) {
      const flags = game.user.getFlag(MOD) || {};
      for (const k of Object.keys(flags)) if (flags[k] === uid) await game.user.unsetFlag(MOD, k);
      gmWhisper(`<p>[${MOD}] Stopped event <code>${foundry.utils.escapeHTML(uid)}</code>.</p>`);
    } else {
      gmWhisper(`<p>[${MOD}] No event found for UID <code>${foundry.utils.escapeHTML(uid)}</code>.</p>`);
    }
    return refresh(dlg, "UID processed.");
  }

  async function actList(_ev, _btn, dlg) {
    AT.chatQueue({ showArgs: false, showUid: true, showDate: true, gmOnly: true });
    gmWhisper(`<p>[${MOD}] Queue listed to GM chat.</p>`);
    return refresh(dlg, "Queue listed.");
  }

  async function actFlush(_ev, _btn, dlg) {
    AT.flushQueue();
    gmWhisper(`<p>[${MOD}] All About-Time events purged.</p>`);
    return refresh(dlg, "All events purged.");
  }

  async function actFlushRem(_ev, _btn, dlg) {
    AT.flushQueue();
    AT.doEvery({ hour: 1 }, "1 Hour Reminder");
    gmWhisper(`<p>[${MOD}] All events purged. Hourly reminder queued.</p>`);
    return refresh(dlg, "All events purged; reminder set.");
  }

  new D2({
    window: { title: "About Time — Event Manager (GM)" },
    content: contentTemplate("Ready."),
    buttons: [
      { action: "create",    label: "Create Event",           default: true, callback: actCreate },
      { action: "stop-name", label: "Stop by Name",                            callback: actStopByName },
      { action: "stop-uid",  label: "Stop by UID",                             callback: actStopByUID },
      { action: "list",      label: "Send Queue to Chat",                       callback: actList },
      { action: "flush",     label: "Stop all Events",                          callback: actFlush },
      { action: "flush-rem", label: "Stop all + 1h reminder",                   callback: actFlushRem },
      { action: "close",     label: "Close" }
    ],
    submit: async () => {}
  }).render({ force: true });
}
