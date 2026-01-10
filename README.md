<!-- Latest release (semantic version) -->
![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/paulcheeba/about-time-next?sort=semver) <!-- Total downloads across all releases -->![Downloads](https://img.shields.io/github/downloads/paulcheeba/about-time-next/total) <!-- Downloads of latest release only -->![Downloads (latest)](https://img.shields.io/github/downloads/paulcheeba/about-time-next/latest/total)

<img width="512" height="512" alt="ATN Logo" src="https://github.com/paulcheeba/about-time-next/blob/v13.2.1.0/assets/images/about-time-next_cartoon_logo_w-ATN.png?raw=true" />


# About Time Next

**About Time Next** is a timekeeping and event scheduling utility for Foundry VTT v13+. It is a spiritual successor to about-time by Tim Posney and is built on top of the original code in an attempt to keep legacy functions. 
It supports **D&D 5e v5.2+ native calendar**, **Seasons & Stars**, **Simple Calendar Reborn**, or falls back to Foundry's core time system.

---

## Installation

1. Download and install via Foundry’s module browser  

   **OR** add the manifest URL:
   ```
   https://github.com/paulcheeba/about-time-next/releases/latest/download/module.json
   ```

2. Enable the module in your world.
3. (Optional) Configure calendar system in settings: Auto-detect (default), D&D 5e Calendar, Simple Calendar Reborn, Seasons & Stars, or None.

> Compatibility: Designed for FVTT v13 (min 13, max 13.x).  
> **Calendar Support:** D&D 5e v5.2+ native calendar, Seasons & Stars, Simple Calendar Reborn, and core time fallback.  
> Settings dropdown dynamically shows only available calendar systems. Detection display shows all systems with status.

---

## Calendar Integration

About Time Next uses a **calendar adapter system** to integrate with multiple calendar systems. The module automatically detects available calendars and provides formatted time displays.

**Supported Calendars:**
- **D&D 5e Calendar (v5.2+)**: Native Foundry v13 calendar system with Harptos, Greyhawk, Gregorian, and Khorvaire calendars.
- **Seasons & Stars**: Full integration with formatted date/time display.
- **Simple Calendar Reborn**: Full integration with time authority model. Simple Calendar has been reborn as Simple Calendar Reborn (maintained by Arctis Fireblight for Foundry v13+), and we have integrated it with complete time management support.

**Auto-Detection (Default):**
When set to "Auto-detect", the module checks in priority order:
1. Seasons & Stars (if module active with API)
2. Simple Calendar Reborn (if module active with API)
3. D&D 5e Calendar (if system v5.2+ with calendar configured)
4. Falls back to "None" (Foundry core time)
5. Additional calendars to be added in future updates.

**Calendar Integration Settings:**
- Dropdown shows **only detected** calendars (plus "Auto-detect" and "None")
- Detection info panel shows **all calendars** with ✓/✗ status
- If your selected calendar becomes unavailable, module falls back automatically

---

## Quick Start

- **Event Manager (applicationV2):** Open from the **Journal/Notes** toolbar sub-button **“Event Manager”** (Timekeeper-only; GMs always allowed).  
  Use it to create one-shots or repeating events, stop items by name/UID, view the queue, or flush all.

- **Mini Time Manager (optional):** Enable in **Configure Settings → About-Time** to show a compact panel with **Play/Pause**, current time, and tiny toggles for realtime behavior (GM sees controls; players see time).

- **Chat commands:** Use **`/at** commands for fast scheduling (GM-only output).  
  Examples: **`/at in 10m Torch check** · **`/at every 1h Camp bell**

---

### Toolbar Buttons

<img width="281" height="200" alt="image" src="https://github.com/user-attachments/assets/8f3c06f8-d511-4e0c-9528-9c2b67d1c8a3" />

### Event Manager (ApplicationV2)

<img width="929" height="463" alt="image" src="https://github.com/user-attachments/assets/67abca89-4e33-447b-baf6-1ca11ef4bd3f" />

Opened via the **Journal/Notes** toolbar sub-button (GM-only).

- **Create Event**: One-shot or repeating (DD:HH:MM:SS).  
- **Stop by Name**: Stops all events matching a given “friendly” name.  
- **Stop by UID**: Stops a specific event by unique ID.  
- **Pause/Resume**: Temporarily freeze an event’s countdown and resume later.
- **Send Queue to Chat**: Posts a GM-whisper summary with name, UID, next fire time.  
- **Stop all Events**: Flush the queue.  
- **Stop all + 1h reminder**: Flush and schedule a “Resume in 1h” reminder.

The Event Manager auto-updates countdowns and refreshes itself if an event fires or is rescheduled, keeping “Remaining” correct for repeating items.

### Mini Time Manager (optional, client setting)
Enable **“Enable AT Time Manager”** to show a compact panel:

<img width="300" height="151" alt="image" src="https://github.com/user-attachments/assets/8e631dd5-a7b5-4037-9bc5-28e7bebf7c7e" />

- **Play/Pause world time** (GM)  
- Live **clock display** (calendar-formatted when available)  
- Small toggles for realtime behavior (GM):  
  - **Link Pause** (pause realtime if the game is paused)  
  - **Auto-Pause on Combat** (pause/resume around combats)  
- Per-user visibility (players only see time)

---

## Realtime & Clock

About-Time provides a simple **realtime worldTime runner** (GM-only, single-owner) with:
- **Rate** (default 1.0×) and **Tick Hz** settings (safe minimums enforced)
- Best-effort **single owner via socket hinting** (handoff if another GM starts)
- Respects **pause** and your **link/auto-pause** toggles

---

## Chat Commands (GM-only output)

All commands are handled by `/at` (see `module/ATChat.js`).  
Durations accept mixed units: days (**d**), hours (**h**), minutes (**m**), seconds (**s**).  
Examples: `1h30m`, `2d 4h`, `45m10s`, or `5400` (seconds).

- `/at queue`  _or_  `/at list`  
  Show the current queue (GM-whisper; includes UID, args, and next fire time).

- `/at clear`  
  Clear the entire queue. Prompts for confirm/cancel and updates the same chat card.

- `/at stop <uid>`  
  Stop a specific event by UID. Prompts for confirm/cancel and updates the same chat card.  
  > Tip: In EM V2 you can copy a row’s UID, then run **`/at stop UID**.

- `/at pause <uid>`  
  Pause a specific event by UID (freezes remaining time).

- `/at resume <uid>`  
  Resume a paused event by UID.

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

## Event Manager (details)

The Event Manager lists every queued item with:

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

> Time formatting uses the active calendar adapter (D&D 5e, Seasons & Stars, or Simple Calendar Reborn when available). Falls back to Foundry core time if no calendar system is configured.

### Event Notification Cards
When events trigger, they display standardized notification cards with detailed information:

<img width="294" height="451" alt="image" src="https://github.com/user-attachments/assets/d651e84e-f414-47e0-8d83-f0cf2ec37358" />

- **Consistent Format**: All Event Manager events use the same card layout
- **Persistence**: Format maintained through Foundry reloads
- **Macro Integration**: Events with macros show the event card *and* executes the macro
- **Sound Support**: `[about-time-next]` prefix ensures notification sounds trigger correctly

_Note: `/at in` and `/at every` reminders currently use legacy output formatting. Standardization planned for a future release._

---

## Macros

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

## Example Scenarios

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

## Settings (high-level)

- **Enable AT Time Manager (client)** — Shows the mini panel for this user.  
- **Minimum role required to be a timekeeper (world)** — Delegates event queue management to non-GM users (GMs always allowed).  
- **Time Format (world)** — Choose 12-hour (AM/PM) or 24-hour time display for consistent formatting across the module.  
- **Realtime Rate / Tick Hz (world)** — Controls the realtime runner (GM-only; safe ranges enforced).  
- **Link Pause / Auto-Pause Combat (client)** — How the mini panel reacts to world/game state.

### Event Notification Sounds (client, v13.2.0.0)

Configure audible alerts when events trigger (GM-only feature):

- **Enable Event Notification Sound** — Toggle notification sounds on/off
- **Sound Source** — Choose between built-in sound or custom audio file
- **Custom Sound Path** — File picker to select your own audio (defaults to module's sounds folder)
- **Notification Volume** — Adjust volume from 0-100% (affects only ATN notifications)
- **Test Sound** — Preview button to hear current selection before saving

Event notifications play automatically when scheduled events fire, helping GMs track timers without constantly watching the Event Manager. Settings apply immediately after saving, so you can adjust volume mid-session without reloading. Included are 3 royalty free notification sounds.
- Supported file types:
  - MP3 (.mp3) - Most widely supported, best compatibility
  - OGG (.ogg) - Good compression, well-supported
  - WAV (.wav) - Uncompressed, larger files
  - WebM (.webm) - Modern format with good compression
  - M4A (.m4a) - AAC audio, good quality
Best practice: MP3 is the safest choice for maximum browser compatibility across all platforms (which is why we used it for the notification sounds in v13.2.0.0+).

> Date/time formatting uses the active calendar adapter (D&D 5e, Seasons & Stars, Simple Calendar Reborn when available), otherwise it falls back to Foundry core time.

---

## Notes & Limitations

- The module **does not** override combat round/initiative time.  
- Complex calendar rules are supported through the active calendar system when present; core-time fallback uses raw seconds math.  
- Event queue management is **Timekeeper-only** (configurable role threshold; GMs always allowed).  
- Realtime runner is **single-owner (GM)**; if another GM starts it, ownership is handed off gracefully.

---

## Dependencies
- This module is part of the **OverEngineeredVTT Suite** and Requires the installation of the lightweight OEV Suite Monitor, a master module that tracks OEV module versions for you and lets you know when updates or new modules are available.

## Additional links
- Join our [Discord](https://discord.gg/VNZwZTCB5U) server.
- Support me on [Patreon](https://www.patreon.com/cw/u45257624)


## Credits

About Time was originally created and maintained by the great **Tim Posney**, About time Next is updated and maintained for FVTT v13+ by **paulcheeba** with community input and AI-assisted refactoring.

**Event notification sound effects** by [Notification_Message](https://pixabay.com/users/notification_message-47259947/) from [Pixabay](https://pixabay.com/sound-effects/).

## License

MIT — see LICENSE file.
