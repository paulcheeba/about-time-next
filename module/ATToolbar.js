// v13.0.6
// ATToolbar.js — Toolbar integration for About Time v13

/**
 * Adds the About Time toolbar button to the scene controls.
 * Integrates with Foundry VTT v13 SceneControl API.
 */
Hooks.once("getSceneControlButtons", controls => {
  if (!game.user.isGM) return;

  const tokenControls = controls["token"];
  if (!tokenControls?.tools) return;

  tokenControls.tools.push({
    name: "abouttime",
    title: "About Time Event Manager",
    icon: "far fa-clock",
    visible: game.user.isGM,
    button: true,
    onClick: () => {
      if (!game.abouttime) {
        ui.notifications?.warn("About Time module is not initialized.");
        return;
      }
      openATEventManager();
    }
  });
});


// Optionally, set up `game.abouttime.renderDialog` binding fallback
Hooks.once("ready", () => {
  if (!game.abouttime?.renderDialog) {
    console.warn("[About Time] Missing renderDialog method on game.abouttime");
  }
});

// Renders the About Time Event Manager dialog using DialogV2
function openATEventManager() {
  const events = game.abouttime?.getEvents?.() || [];
  const formatDuration = d => game.abouttime.formatTime(d);

  const tableRows = events.map((evt, idx) => {
    const startTime = game.abouttime?.formatTimestamp?.(evt.timestamp) ?? evt.timestamp;
    return `
      <tr>
        <td>${idx + 1})</td>
        <td>${evt.name}</td>
        <td>${evt.uid}</td>
        <td>${evt.repeat ? "Y" : "N"}</td>
        <td>${startTime}</td>
        <td>${formatDuration(evt.duration)}</td>
        <td>${evt.message || ""}</td>
      </tr>
    `;
  }).join("");

  const style = `
    <style>
      .at-dark {
        background-color: #2e3440;
        color: #eceff4;
        padding: 1em;
        font-family: sans-serif;
      }
      .at-dark h3, .at-dark label { color: #88c0d0; }
      .at-dark .section { border-top: 1px solid #4c566a; margin-top: 1em; padding-top: 1em; }
      .at-dark input, .at-dark textarea {
        background-color: #3b4252;
        color: #eceff4;
        border: 1px solid #4c566a;
        padding: 4px;
      }
      .at-dark .at-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 0.5em;
      }
      .at-dark .at-table th, .at-dark .at-table td {
        border: 1px solid #4c566a;
        padding: 4px;
        font-size: 0.85em;
      }
      .at-dark .at-table thead { background-color: #434c5e; }
      .at-dark .at-scroll {
        max-height: 200px;
        overflow-y: auto;
      }
    </style>
  `;

  const content = `
    ${style}
    <div class="at-dark">
      <div>
        <h3>Event Status Board</h3>
        <p>Currently scheduled reminders and timers:</p>
        <div class="at-scroll">
          <table class="at-table">
            <thead>
              <tr><th>#</th><th>Event Name</th><th>UID</th><th>Repeating?</th><th>Time Started</th><th>Duration</th><th>Message</th></tr>
            </thead>
            <tbody>${tableRows || `<tr><td colspan="7">No active events</td></tr>`}</tbody>
          </table>
        </div>
      </div>

      <div class="section">
        <h3>Create Custom Reminder</h3>
        <div class="form-group">
          <label>Event Name</label>
          <input type="text" id="at-name" placeholder="optional key to store UID"/>
        </div>
        <div class="form-group">
          <label>Duration</label>
          <input type="text" id="at-dur" placeholder="e.g. 1h30m, 45s, 2d 4h"/>
          <small>Duration accepts mixed units: 1h30m, 45m10s, 1d, 10s</small>
        </div>
        <div class="form-group">
          <label>Message</label>
          <input type="text" id="at-msg" placeholder="What should appear in chat?"/>
        </div>
        <div class="form-group">
          <label><input type="checkbox" id="at-rep"/> Repeat at the given interval</label>
        </div>
        <div class="form-group">
          <label><input type="checkbox" id="at-mac"/> Run Macro?</label>
          <input type="text" id="at-macname" placeholder="Enter macro name to run on event"/>
        </div>
      </div>

      <div class="section">
        <h3>Stop Event Reminder</h3>
        <div class="form-group">
          <label>Event Name/UID</label>
          <input type="text" id="at-stop" placeholder="Paste a Name or UID from the status board"/>
          <small>("Stop by Name" matches the Event Name you entered when creating.)</small>
        </div>
      </div>
    </div>
  `;

  const buttons = {
    create: {
      label: "Create Event",
      callback: html => game.abouttime.createReminder(html)
    },
    stopName: {
      label: "Stop by Name",
      callback: html => game.abouttime.stopReminder(html, true)
    },
    stopUid: {
      label: "Stop by UID",
      callback: html => game.abouttime.stopReminder(html, false)
    },
    queue: {
      label: "Send Queue to Chat",
      callback: () => game.abouttime.chatQueue()
    },
    stopAll: {
      label: "Stop all Events",
      callback: () => game.abouttime.clearTimeout()
    },
    stopHour: {
      label: "Stop all + 1h reminder",
      callback: () => game.abouttime.clearTimeout(true)
    }
  };

  new DialogV2({
    title: "About Time — Event Manager (GM)",
    content,
    buttons,
    default: "create",
    close: () => {}
  }).render(true);
}
