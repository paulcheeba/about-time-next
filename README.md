<!-- Latest release (semantic version) -->
![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/paulcheeba/about-time-next?sort=semver) <!-- Total downloads across all releases -->![Downloads](https://img.shields.io/github/downloads/paulcheeba/about-time-next/total) <!-- Downloads of latest release only -->![Downloads (latest)](https://img.shields.io/github/downloads/paulcheeba/about-time-next/latest/total)


# About Time Next (v13.1.3.2)

**About Time Next** is a timekeeping and event scheduling utility for Foundry VTT v13+. It is a spiritual successor to about-time by Tim Posney and is built on top of the original code in an attempt to keep legacy functions. 
It works with **Simple Calendar** (*see installation note 3*) or falls back to Foundry’s core time system.

---

## 📦 Installation

1. Download and install via Foundry’s module browser  

   **OR** add the manifest URL:
   ```
   https://github.com/paulcheeba/about-time-next/releases/latest/download/module.json
   ```

2. Enable the module in your world.
3. (Optional) Install **Simple Calendar** for advanced date formatting.
*Note - When SC is available for FVTT v13 I will reconfirm the original functionality. If there are only minor hook changes, about-time-v13 MAY already be compatible with the v13 SC, it's unlikely though...*

> Compatibility: Designed for FVTT v13 (min 13, max 13.x).  
> With SC enabled, About-Time uses SC’s format/interval helpers where available.
> Works with smalltime and Season and Stars (using foundry's core time system, not Seasons and Stars') but also has it's own Time Management app built in (which can be disabled in settings).

---

## 🚀 Quick Start

- **EM (Event Manager V2):** Open from the **Journal/Notes** toolbar sub-button **“Event Manager”** (GM-only).  
  Use it to create one-shots or repeating events, stop items by name/UID, view the queue, or flush all.

- **Mini Time Manager (optional):** Enable in **Configure Settings → About-Time** to show a compact panel with **Play/Pause**, current time, and tiny toggles for realtime behavior (GM sees controls; players see time).

- **Chat commands:** Use **`/at** commands for fast scheduling (GM-only output).  
  Examples: **`/at in 10m Torch check** · **`/at every 1h Camp bell**

---

## 🧰 Toolbars

<img width="281" height="200" alt="image" src="https://github.com/user-attachments/assets/8f3c06f8-d511-4e0c-9528-9c2b67d1c8a3" />

### Event Manager (V2, ApplicationV2)

<img width="923" height="437" alt="image" src="https://github.com/user-attachments/assets/6e72b4b3-477a-417e-bb5b-789698696a46" />

Opened via the **Journal/Notes** toolbar sub-button (GM-only).

- **Create Event**: One-shot or repeating (DD:HH:MM:SS).  
- **Stop by Name**: Stops all events matching a given “friendly” name.  
- **Stop by UID**: Stops a specific event by unique ID.  
- **Send Queue to Chat**: Posts a GM-whisper summary with name, UID, next fire time.  
- **Stop all Events**: Flush the queue.  
- **Stop all + 1h reminder**: Flush and schedule a “Resume in 1h” reminder.

The V2 view auto-updates countdowns and refreshes itself if an event fires or is rescheduled, keeping “Remaining” correct for repeating items.

### Mini Time Manager (optional, client setting)
Enable **“Enable AT Time Manager”** to show a compact panel:

<img width="299" height="168" alt="image" src="https://github.com/user-attachments/assets/45bca378-3ae8-4cf2-8504-f79a46755352" />

- **Play/Pause world time** (GM)  
- Live **clock display** (SC-formatted if SC is present)  
- Small toggles for realtime behavior (GM):  
  - **Link Pause** (pause realtime if the game is paused)  
  - **Auto-Pause on Combat** (pause/resume around combats)  
- Per-user visibility (players only see time)

---

## ⌛ Realtime & Clock

About-Time provides a simple **realtime worldTime runner** (GM-only, single-owner) with:
- **Rate** (default 1.0×) and **Tick Hz** settings (safe minimums enforced)
- Best-effort **single owner via socket hinting** (handoff if another GM starts)
- Respects **pause** and your **link/auto-pause** toggles

---

## 💬 Chat Commands (GM-only output)

All commands are handled by `/at` (see `module/ATChat.js`).  
Durations accept mixed units: days (**d**), hours (**h**), minutes (**m**), seconds (**s**).  
Examples: `1h30m`, `2d 4h`, `45m10s`, or `5400` (seconds).

- `/at queue`  _or_  `/at list`  
  Show the current queue (GM-whisper; includes UID, args, and next fire time).

- `/at clear`  
  Clear the entire queue.

- `/at stop <uid>`  
  Stop a specific event by UID.  
  > Tip: In EM V2 you can copy a row’s UID, then run **`/at stop UID**.

- `/at in <duration> <message>`  
  Schedule a one-time reminder.  
  Returns a UID so you can stop it later.

- `/at every <duration> <message>`  
  Schedule a repeating reminder (interval = duration).  
  Returns a UID for the anchor event; the repeating instance uses the same “friendly name”.

**Duration grammar:**  
- Mixed units accepted in any order (e.g., `1d 2h 30m 5s`).  
- **Integers** are treated as seconds (e.g., `300 = 5m`).  
- Whitespace is ignored between number and unit (e.g., `10 m` is valid).

---

## 🗓 Event Manager (details)

The EM V2 lists every queued item with:

- **Name** (friendly name you provided when scheduling)
- **UID** (unique identifier; safe to copy)
- **Remaining** (countdown, auto-updates)
- **Interval** (if repeating) and **Next in …** hint
- **Stop** button per row (GM-only)

Actions (top buttons):

- **Create Event**  
  - **Duration**: DD:HH:MM:SS  
  - **Interval (optional)**: DD:HH:MM:SS for repeating events  
- **Stop by Name / Stop by UID**  
- **Send Queue to Chat** (GM-whisper)  
- **Stop all Events** / **Stop all + 1h reminder**

> With **Simple Calendar** installed, About-Time uses SC’s formatting/conversion where appropriate. Without SC, it falls back to core Foundry world time.

---

## 🧩 Macros

**Advance by 30 seconds (core FVTT v13):**
```js
await game.time.advance(30);
```

**Schedule a Macro to Run in 5 Minutes (About Time):**
```js
game.abouttime.doIn({ minutes: 5 }, () => {
  ui.notifications.info("Five minutes have passed!");
});
```

**Schedule a Reminder at a Specific Game Time:**
```js
game.abouttime.reminderAt(
  { hour: 12, minute: 0, second: 0 },
  "It is high noon!"
);
```

**Repeat Every Round (6 seconds):**
```js
game.abouttime.doEvery({ seconds: 6 }, () => {
  console.log("New combat round started!");
});
```

**Trigger a Custom Hook in 30 Seconds:**
```js
game.abouttime.notifyIn({ seconds: 30 }, "myCustomEvent", "arg1", "arg2");
```

---

## 🧪 Example Scenarios

- **Short Rest timer (one-shot):**  
  “Wake the party in 1 hour.”  
  **Chat:** `/at in 1h Wake the party  
  **Result:** GM gets a whisper in 1h with the message; EM shows the countdown.

- **Camp reminder (repeating):**  
  “Every hour, ring the bell for watch rotation.”  
  **Chat:** `/at every 1h Watch rotation bell  
  **Result:** A repeating event appears in EM V2 with **Interval = 01:00:00**, and **Remaining** auto-resets each hour.

- **Spell/Effect duration:**  
  “Bless ends in 1 minute.”  
  **Chat:** `/at in 60s Bless ends  
  **Result:** One-shot reminder fires in 60 seconds.

---

## ⚙ Settings (high-level)

- **Enable AT Time Manager (client)** — Shows the mini panel for this user.  
- **Realtime Rate / Tick Hz (world)** — Controls the realtime runner (GM-only; safe ranges enforced).  
- **Link Pause / Auto-Pause Combat (client)** — How the mini panel reacts to world/game state.

> Where SC is present, date/time formatting in the mini panel and EM uses SC helpers.

---

## ❗ Notes & Limitations

- The module **does not** override combat round/initiative time.  
- Complex SC calendars (non-365-day years, custom months) are supported via SC’s own conversions, while raw seconds math remains conservative in fallback mode.  
- Only GMs can create, manage, and view scheduled events.  
- Realtime runner is **single-owner (GM)**; if another GM starts it, ownership is handed off gracefully.

---

## 📝 Credits

Originally created by **Tim Posney**, updated and maintained for FVTT v13+ by **paulcheeba** with community input and ChatGPT-assisted refactoring.

## 📝 License

MIT — see LICENSE file.
