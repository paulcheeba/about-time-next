// module/ATToolbar.js
// About Time — Toolbar & Event Manager dialog (v13.0.6-candidate)
// Why: add a Notes/Journal sub-tool (clock) that opens a Dracula-styled manager with a table status board.

const MODULE_ID = "about-time-v13";
const AT = () => (game.abouttime ?? game.Gametime); // legacy-safe

/* ----------------------- Toolbar hook (v13 API) ----------------------- */
// Why: v13 passes a Record<string, SceneControl> not an array.
Hooks.on("getSceneControlButtons", (controls) => {
  try {
    const notes = controls["notes"] ?? controls["journal"];
    if (!notes) return;

    // Ensure tools record exists.
    notes.tools ||= {};

    // Add our button only once.
    if (!notes.tools["abouttime"]) {
      notes.tools["abouttime"] = {
        name: "abouttime",
        title: "About Time — Event Manager",
        icon: "fas fa-clock",
        order: 95,
        button: true,       // Why: not a toggle; fire-on-click
        visible: game.user.isGM, // Why: GM-only tool
        onChange: (_ev, _active) => openEventManager() // v13 button callback
      };
    }
  } catch (err) {
    console.error(`${MODULE_ID} | getSceneControlButtons failed`, err);
  }
});

/* ----------------------- Dialog helpers ----------------------- */

const hasV2 = !!foundry?.applications?.api?.DialogV2;
const isSCActive = () => !!(game.modules.get("foundryvtt-simple-calendar")?.active && globalThis.SimpleCalendar?.api);

// Why: players must not see AT messages.
function gmWhisper(html) {
  const gm = ChatMessage.getWhisperRecipients("GM").filter(u => u.active).map(u => u.id);
  return ChatMessage.create({ content: html, whisper: gm, type: CONST.CHAT_MESSAGE_TYPES.OTHER });
}

function parseDuration(input) {
  if (!input) return 0;
  const s = String(input).trim();
  if (/^\d+$/.test(s)) return Number(s);
  const re = /(\d+)\s*(d|day|days|h|hr|hrs|hour|hours|m|min|mins|minute|minutes|s|sec|secs|second|seconds)/gi;
  let total = 0, m;
  while ((m = re.exec(s))) {
    const val = Number(m[1]);
    const unit = m[2].toLowerCase();
    if (["d","day","days"].includes(unit)) total += val * 86400;
    else if (["h","hr","hrs","hour","hours"].includes(unit)) total += val * 3600;
    else if (["m","min","mins","minute","minutes"].includes(unit)) total += val * 60;
    else total += val;
  }
  return total;
}

function formatDHMS(total) {
  total = Math.max(0, Math.floor(Number(total) || 0));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${String(d).padStart(2, "0")}:${pad(h)}:${pad(m)}:${pad(s)}`;
}

function fmtTimeStarted(ts) {
  if (isSCActive()) {
    const dt = SimpleCalendar.api.timestampToDate(ts);
    const pad = (n) => String(n).padStart(2, "0");
    const M = (dt.month ?? 0) + 1;
    const D = dt.day ?? 0;
    return `${M}/${D} ${pad(dt.hour)}:${pad(dt.minute)}:${pad(dt.second)}`;
  }
  const date = new Date(ts * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getMonth()+1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// Snapshot -> rows for status board
function readQueueRows() {
  const api = AT();
  const q = api?.ElapsedTime?._eventQueue;
  if (!q || !Array.isArray(q.array)) return [];
  const arr = q.array.slice(0, q.size);
  return arr.map((qe, i) => {
    const name = typeof qe._handler === "string" ? qe._handler : "[function]";
    const uid = qe._uid ?? "";
    const repeating = qe._recurring ? "Y" : "N";
    const timeStarted = fmtTimeStarted(qe._time);

    let secs = 0;
    if (qe._recurring) {
      if (isSCActive() && qe._increment) {
        const zero = SimpleCalendar.api.timestampPlusInterval(0, qe._increment);
        secs = Math.max(0, zero ?? 0);
      } else {
        const inc = qe._increment || {};
        secs =
          (inc.second ?? inc.seconds ?? 0) +
          (inc.minute ?? 0) * 60 +
          (inc.hour ?? 0) * 3600 +
          (inc.day ?? 0) * 86400;
      }
    } else {
      secs = Math.max(0, qe._time - game.time.worldTime);
    }
    const duration = formatDHMS(secs);
    const message = Array.isArray(qe._args) && qe._args.length ? String(qe._args.join(" ")) : "";

    return { idx: i+1, name, uid, repeating, timeStarted, duration, message };
  });
}

function statusTableHTML() {
  const rows = readQueueRows();
  if (!rows.length) return `<div class="at-empty">No events scheduled.</div>`;
  return rows.map(r => `
    <div class="at-row" data-uid="${foundry.utils.escapeHTML(r.uid)}">
      <div class="at-col name"  title="${foundry.utils.escapeHTML(r.name)}">${r.idx}) ${foundry.utils.escapeHTML(r.name)}</div>
      <div class="at-col uid">${foundry.utils.escapeHTML(r.uid)}</div>
      <div class="at-col rep">${r.repeating}</div>
      <div class="at-col start">${r.timeStarted}</div>
      <div class="at-col dur">${r.duration}</div>
      <div class="at-col msg">${foundry.utils.escapeHTML(r.message || "")}</div>
    </div>
  `).join("");
}

/* ----------------------- Dracula CSS + layout ----------------------- */
const CSS = `
<style>
  .at-wrap { color:#f8f8f2; }
  .at-wrap .window-content { background:#1e1f29 !important; }

  .at-note { color:#9aa0b4; margin:.35rem 0 .75rem; }
  .at-sect { margin-top:1.0rem; }

  .at-box {
    border:1px solid #3c4054; border-radius:6px; background:#232530; padding:.5rem .6rem;
  }
  .at-hdr {
    font-weight:700; margin-bottom:.5rem; color:#f8f8f2;
  }

  .at-grid-hdr, .at-row { display:grid; grid-template-columns: 1.3fr 1.2fr .6fr 1.1fr .9fr 2.0fr; gap:.6rem; }
  .at-grid-hdr {
    background:#2a2c37; padding:.45rem .6rem; border:1px solid #3c4054; border-radius:6px; font-weight:600;
  }
  .at-board {
    height:200px; overflow:auto; margin-top:.4rem; border:1px solid #3c4054; border-radius:6px; background:#232530;
  }
  .at-row { padding:.35rem .6rem; border-bottom:1px solid #2f3347; align-items:start; }
  .at-row:last-child { border-bottom:none; }
  .at-col.msg { white-space: normal; word-break: break-word; }
  .at-empty { color:#9aa0b4; padding:.4rem; }

  .at-label { color:#f8f8f2; font-weight:600; margin-top:.6rem; margin-bottom:.25rem; display:block; }
  .at-input {
    width:100%; background:#2a2c37; color:#f8f8f2; border:1px solid #3c4054; border-radius:6px; padding:.5rem .65rem;
  }
  .at-hint { color:#9aa0b4; font-size:.85em; margin-top:.25rem; }

  .at-check { display:flex; align-items:center; gap:.5rem; margin:.35rem 0; color:#f8f8f2; }
  .at-check input[type="checkbox"] { transform: scale(1.1); }

  .at-btns { display:flex; flex-wrap:wrap; gap:.6rem; margin-top:.9rem; }
  .at-btn { background:#2a2c37; color:#f8f8f2; border:1px solid #3c4054; border-radius:8px; padding:.6rem 1rem; }
  .at-btn.ok      { background:#50fa7b; border-color:#50fa7b; color:#1b1b1f; }
  .at-btn.warn    { background:#ffb86c; border-color:#ffb86c; color:#1b1b1f; }
  .at-btn.danger  { background:#ff5555; border-color:#ff5555; }
</style>
`;

/* ----------------------- Dialog content ----------------------- */
function buildContent(msg = "Ready.") {
  return `
  ${CSS}
  <div class="at-wrap">
    <div class="at-note">Choose an option below, then close the window when finished.</div>

    <div class="at-box">
      <div class="at-hdr">Event Status Board</div>
      <div class="at-grid-hdr">
        <div>Event Name</div><div>UID</div><div>Repeating?</div><div>Time Started</div><div>Duration</div><div>Message</div>
      </div>
      <div class="at-board">${statusTableHTML()}</div>
    </div>

    <div class="at-sect">
      <div class="at-hdr">Create Custom Reminder</div>
      <label class="at-label" for="at-name">Event Name</label>
      <input id="at-name" class="at-input" placeholder="optional key to store UID"/>

      <label class="at-label" for="at-duration">Duration</label>
      <input id="at-duration" class="at-input" placeholder="e.g. 1h30m, 45s, 2d 4h"/>
      <div class="at-hint">Duration accepts mixed units: <code>1h30m</code>, <code>45m10s</code>, <code>1d</code>, <code>10s</code></div>

      <label class="at-label" for="at-message">Message</label>
      <input id="at-message" class="at-input" placeholder="What should appear in chat?"/>

      <div class="at-check"><input id="at-repeat" type="checkbox"/> <label for="at-repeat">Repeating? (Repeat at the given interval)</label></div>
      <div class="at-check"><input id="at-runmacro" type="checkbox"/> <label for="at-runmacro">Run Macro?</label></div>
      <input id="at-macroname" class="at-input" placeholder="Enter macro name to run on event"/>
    </div>

    <div class="at-sect">
      <div class="at-hdr">Stop Event Reminder</div>
      <label class="at-label" for="at-stop">Event Name/UID</label>
      <input id="at-stop" class="at-input" placeholder="Paste a Name or UID from the status board"/>
      <div class="at-hint">“Stop by Name” matches the Event Name you entered when creating.</div>
    </div>

    <div class="at-btns">
      <button type="button" class="at-btn ok"      data-at="create">Create Event</button>
      <button type="button" class="at-btn warn"    data-at="stop-name">Stop by Name</button>
      <button type="button" class="at-btn warn"    data-at="stop-uid">Stop by UID</button>
      <button type="button" class="at-btn"         data-at="queue">Send Queue to Chat</button>
      <button type="button" class="at-btn danger"  data-at="stop-all">Stop all Events</button>
      <button type="button" class="at-btn danger"  data-at="stop-all-rem">Stop all + 1h reminder</button>
      <button type="button" class="at-btn"         data-at="close">Close</button>
    </div>

    <div class="at-hint" style="margin-top:.6rem;">${foundry.utils.escapeHTML(msg)}</div>
  </div>`;
}

/* ----------------------- Actions (refresh after each) ----------------------- */
async function handleClick(dialog, action) {
  const api = AT();
  const $el = dialog.element || $(dialog.form);

  const name = $el.find("#at-name").val()?.toString().trim();
  const durStr = $el.find("#at-duration").val()?.toString().trim();
  const msg = $el.find("#at-message").val()?.toString().trim();
  const repeating = !!$el.find("#at-repeat").prop("checked");
  const runMacro = !!$el.find("#at-runmacro").prop("checked");
  const macroName = $el.find("#at-macroname").val()?.toString().trim();
  const stopVal = $el.find("#at-stop").val()?.toString().trim();

  const rerender = (m) => dialog.render(true, { content: buildContent(m) });

  switch (action) {
    case "create": {
      const seconds = parseDuration(durStr);
      if (!seconds || seconds <= 0) {
        await gmWhisper(`<p>[${MODULE_ID}] Please enter a valid duration.</p>`);
        return rerender("Invalid duration.");
      }
      let uid;
      if (runMacro && macroName) {
        uid = repeating ? api.doEvery({ seconds }, macroName) : api.doIn({ seconds }, macroName);
        await gmWhisper(`<p>[${MODULE_ID}] Scheduled macro <b>${foundry.utils.escapeHTML(macroName)}</b> ${repeating ? "every" : "in"} ${formatDHMS(seconds)}.</p>`);
      } else {
        uid = repeating ? api.reminderEvery({ seconds }, msg || "(no message)") : api.reminderIn({ seconds }, msg || "(no message)");
        await gmWhisper(`<p>[${MODULE_ID}] Scheduled reminder ${repeating ? "every" : "in"} ${formatDHMS(seconds)}: ${foundry.utils.escapeHTML(msg || "(no message)")}.</p>`);
      }
      if (name) await game.user.setFlag(MODULE_ID, `uid:${name}`, uid);
      return rerender("Event created.");
    }
    case "stop-name": {
      if (!stopVal) { await gmWhisper(`<p>[${MODULE_ID}] Enter a Name to stop.</p>`); return rerender("Enter a Name."); }
      const q = api.ElapsedTime?._eventQueue;
      let count = 0;
      if (q && Array.isArray(q.array)) {
        for (let i = 0; i < q.size; i++) {
          const qe = q.array[i];
          const handlerName = typeof qe._handler === "string" ? qe._handler : "[function]";
          if (handlerName === stopVal && qe._uid) {
            (api.gclearTimeout?.(qe._uid) ?? api.clearTimeout?.(qe._uid));
            count++;
          }
        }
      }
      await gmWhisper(`<p>[${MODULE_ID}] Stopped ${count} event(s) by name: <b>${foundry.utils.escapeHTML(stopVal)}</b>.</p>`);
      return rerender("Stopped by name.");
    }
    case "stop-uid": {
      if (!stopVal) { await gmWhisper(`<p>[${MODULE_ID}] Enter a UID to stop.</p>`); return rerender("Enter a UID."); }
      const ok = api.gclearTimeout?.(stopVal) ?? api.clearTimeout?.(stopVal);
      await gmWhisper(`<p>[${MODULE_ID}] Stop by UID <code>${foundry.utils.escapeHTML(stopVal)}</code> ${ok ? "succeeded" : "failed"}.</p>`);
      return rerender("Stopped by UID.");
    }
    case "queue": {
      api.chatQueue?.({ showArgs: true, showUid: true, showDate: true, gmOnly: true });
      return rerender("Queue sent to chat (GM).");
    }
    case "stop-all": {
      api.flushQueue?.();
      await gmWhisper(`<p>[${MODULE_ID}] All About-Time events purged.</p>`);
      return rerender("All events purged.");
    }
    case "stop-all-rem": {
      api.flushQueue?.();
      api.reminderEvery?.({ hour: 1 }, "Reminder: Re-enable About-Time events");
      await gmWhisper(`<p>[${MODULE_ID}] All events purged; hourly reminder set.</p>`);
      return rerender("All events purged; reminder set.");
    }
    case "close": {
      dialog.close();
      return;
    }
  }
}

/* ----------------------- Open dialog ----------------------- */
function openEventManager() {
  try {
    if (hasV2) {
      const d = new foundry.applications.api.DialogV2({
        content: buildContent(),
        buttons: [], // Why: we render our own in-content buttons
        modal: false,
        submit: async (_res, dialog) => { /* unused */ }
      });
      d.render(true);
      const root = d.element || $(d.form);
      root.on("click", "[data-at]", async (ev) => {
        const action = ev.currentTarget.dataset.at;
        await handleClick(d, action);
      });
    } else {
      const dlg = new Dialog({
        title: "About Time — Event Manager (GM)",
        content: buildContent(),
        buttons: {}, // Why: we render our own in-content buttons
        render: (html) => {
          html.on("click", "[data-at]", async (ev) => {
            const action = ev.currentTarget.dataset.at;
            await handleClick(dlg, action);
          });
        }
      }, { id: "about-time-event-manager" });
      dlg.render(true);
    }
  } catch (err) {
    console.error(`${MODULE_ID} | openEventManager failed`, err);
  }
}
