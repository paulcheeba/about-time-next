# About Time (v13.0.6.7)

**About Time** is a timekeeping and event scheduling utility for Foundry VTT.  
It works with **Simple Calendar** (if installed) or falls back to Foundry’s core time system.

---

## 📦 Installation

1. Download and install via Foundry’s module browser  
   **OR** add the manifest URL:

```
https://github.com/paulcheeba/about-time-v13/releases/latest/download/module.json
```

2. Enable the module in your world.  
3. (Optional) Install Simple Calendar for advanced date formatting.  
4. (Optional) Install Smalltime to advance time with a UI. Otherwise, use macros or the **AT Time Manager** panel.

---

## 🆕 What’s new in v13.0.6.7

**Native real-time Play/Pause (+ combat coupling)**  
- **Play** advances **world time** in real time at a configurable rate (e.g., 1.0×, 10×).  
- **Pause** stops the real-time runner.  
- **Link Pause ↔ World Time** (default **ON**): Play also unpauses the world; Pause also pauses the world; pressing **Spacebar** (Foundry pause) starts/stops the real-time runner to match.  
- **Auto-pause during combat** (default **ON**): Starting the first combat pauses the world and halts the runner; after the last combat ends, the previous state resumes.

**AT Time Manager mini panel**  
- Single **Play/Pause** button (stateful).  
- **Five step buttons** (RWD1/RWD2/FFWD1/FFWD2/FFWD3) with per-user durations (e.g., 10s, 1m, 1h5m3s).  
- **Time-of-day buttons**: **Dawn**, **Noon**, **Dusk**, **Midnight** (jumps forward to the next occurrence). Dawn/Dusk times are user-configurable (HH:MM).  
- **1-second ticking display**, uses SC formatting when available; otherwise DD:HH:MM:SS.  
- **Dim on blur** (client): panel gently dims when unfocused.

**GM chat commands**  
- `/at advance <duration>` — advance core game time (GM).  
- `/at rewind <duration>` — rewind core game time (GM).  
- `/at tod <dawn|noon|dusk|midnight>` — jump forward to the next boundary (GM).  
- `/at help` updated to include these.

> Non-destructive: existing About Time APIs and legacy globals remain.

---

## ⚙ Settings

### Simple Calendar (if installed)
- **Default:** On  
- When on and SC is active, About Time uses SC’s date/time formatting and intervals.  
- When off or SC is missing, About Time uses Foundry’s core time (t+seconds).

### AT Time Manager — Client (per-user)
- **Enable AT Time Manager** — Show the mini panel on load for this user (GM sees controls; players see time-only).  
- **Dim panel when unfocused** — default **On**.  
- **Step durations** — RWD1, RWD2, FFWD1, FFWD2, FFWD3 as `/at`-style tokens (e.g., 10s, 1m, 1h5m3s).  
- **Dawn time (HH:MM)** — default `06:00`  
- **Dusk time (HH:MM)** — default `18:00`

### AT Time Manager — World (per-world)
- **Real-time Rate** (`rtRate`) — default **1.0** (game-sec per real-sec). Range ~0.25–60.  
- **Advance Frequency** (`rtTickHz`) — default **1** (applies accumulated time once per second to limit hook spam).  
- **Link Pause ↔ Real-time Play** (`rtLinkPause`) — default **On**.  
- **Auto-pause during combat** (`rtAutoPauseCombat`) — default **On** (pause on first combat; resume after last).

> Toggling **Enable AT Time Manager** prompts a reload so the toolbar/panel reflect changes immediately.

---

## 🪟 AT Time Manager Panel

- **GM view**: Play/Pause, five step buttons, four time-of-day buttons (Dawn/Noon/Dusk/Midnight).  
- **Player view**: time-only (no buttons).  
- **Behavior**:  
  - Real-time Play advances via **core FVTT v13** `game.time.advance(...)`.  
  - TOD buttons jump **forward** to the next occurrence (today or tomorrow).  
  - Optional coupling to **Foundry pause** and **combat** per settings above.  
  - 1-second heartbeat plus live refresh when world time changes.  
- **Toolbar**: **About Time — Time Manager** tool under **Journal/Notes** (GM-only).  
- **Position**: draggable; last position saved per user.

---

## 🗣 /at Chat Command

- `/at help` — list available commands  
- `/at queue` or `/at list` — show the queue  
- `/at clear` — clear the entire queue  
- `/at stop <uid>` — cancel a specific event by its UID  
- `/at in <duration> <message>` — schedule one-time reminder  
- `/at every <duration> <message>` — schedule repeating reminder  
- `/at advance <duration>` — advance world time (GM)  
- `/at rewind <duration>` — rewind world time (GM)  
- `/at tod <dawn|noon|dusk|midnight>` — jump to next time-of-day (GM)

**Duration shorthand:** supports mixed units — `1h30m`, `2d 4h`, `45m10s`, or plain seconds.

Examples:

    /at help
    /at in 10m Check the stew
    /at every 1h Random Encounter
    /at stop abc123
    /at clear
    /at advance 2h5m
    /at rewind 30s
    /at tod dawn

---

## 🧩 API

The API is exposed as:

    game.abouttime    // Preferred
    game.Gametime     // Deprecated, kept for backwards compatibility

Key Methods

| Method                                      | Description                                   |
| ------------------------------------------- | --------------------------------------------- |
| `doAt(when, handler, ...args)`              | Run a function/macro at a specific game time. |
| `doIn(interval, handler, ...args)`          | Run after an interval from now.               |
| `doEvery(interval, handler, ...args)`       | Repeat at a given interval.                   |
| `reminderAt(when, message)`                 | Send a chat message at a specific time.       |
| `reminderIn(interval, message)`             | Send a chat message after an interval.        |
| `reminderEvery(interval, message)`          | Send a chat message repeatedly.               |
| `notifyAt(when, eventName, ...args)`        | Trigger a Foundry hook at a specific time.    |
| `notifyIn(interval, eventName, ...args)`    | Trigger a Foundry hook after an interval.     |
| `notifyEvery(interval, eventName, ...args)` | Trigger a Foundry hook repeatedly.            |
| `chatQueue(options)`                        | Print the event queue to chat.                |
| `gclearTimeout(uid)`                        | Cancel a scheduled event.                     |
| `DTNow()`                                   | Get current world time (seconds).             |

Macro Examples

Schedule a Macro to Run in 5 Minutes:

    game.abouttime.doIn({ minutes: 5 }, () => {
      ui.notifications.info("Five minutes have passed!");
    });

Schedule a Reminder at a Specific Game Time:

    game.abouttime.reminderAt(
      { hour: 12, minute: 0, second: 0 },
      "It is high noon!"
    );

Trigger a Custom Hook in 30 Seconds:

    game.abouttime.notifyIn({ seconds: 30 }, "myCustomEvent", "arg1", "arg2");

---

## 🧪 Testing Without Simple Calendar

If Simple Calendar is not installed or disabled:
- Times in output appear as `DD:HH:MM:SS` (seconds-based).  
- All scheduling functions still work the same.

---

## 🔧 Troubleshooting & Compatibility

- About Time advances **Foundry worldTime**; visual time UIs from other modules (e.g., Smalltime, Simple Calendar) will reflect changes automatically.  
- If time appears to “double-advance,” make sure only one module’s real-time clock is active (About Time’s Play/Pause is explicit).  
- If the AT panel doesn’t appear after toggling its setting, reload the browser to apply.

---

## 📝 License

MIT — see LICENSE file.
