# About Time (v13.0.6.4)

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
3. (Optional) Install [Simple Calendar](https://foundryvtt.com/packages/foundryvtt-simple-calendar) for advanced date formatting.
4. (Optional) Install [Smalltime](https://foundryvtt.com/packages/smalltime) to advance time with a UI. Otherwise, macros or About Time’s **AT Time Manager** panel can be used to advance time.

---

## 🆕 What’s new in v13.0.6.4

- **AT Time Manager mini panel** (GM-only controls; players see time-only):  
  - Windowless, draggable panel with **Pause** / **Play** flanking the time.  
  - Five configurable step buttons: **RWD1**, **RWD2**, **FFWD1**, **FFWD2**, **FFWD3**.  
  - New “time-of-day” buttons: **Dawn**, **Noon**, **Dusk**, **Midnight**.  
  - Time display ticks once per second and updates immediately on changes.  
  - Uses **Simple Calendar** formatting when SC is active; else shows `DD:HH:MM:SS`.
- **Toolbar tool** under **Journal/Notes**: **About Time - Time Manager** (GM-only) to toggle the mini panel.
- **Behavior toggles** (see Settings):  
  - *Safety Lock* (master switch)  
  - *Disable while paused*  
  - *Disable during combat*  
  - *Auto-pause on combat start/resume on last end*
- Per-user **position persistence** and live updates when you change step/dawn/dusk settings.

> ✅ Non-destructive: all existing About Time features and APIs remain intact.

---

## ⚙ Settings

### Use Simple Calendar (if installed)
- **Default:** On  
- When on and SC is active, About Time uses SC’s date/time formatting and intervals.  
- When off or SC is missing, About Time uses Foundry’s core time (`t+seconds`).

### AT Time Manager (Mini Panel)

**Client (per-user) settings**
- **Enable AT Time Manager** — Show the mini panel on load for this user. GMs see controls; players see time-only.  
- **RWD1 / RWD2 / FFWD1 / FFWD2 / FFWD3 durations** — Set each button’s duration using `/at`-style tokens: `10s`, `1m`, `1h5m3s`, etc.  
- **Dawn time (HH:MM)** — default `06:00`  
- **Dusk time (HH:MM)** — default `18:00`

**World (per-world) settings**
- **Safety Lock: never advance while paused or during combat** — Master safety. When enabled, About Time will not change game time while the game is paused or during active combat. The two options below are effectively disabled.  
- **Disable step buttons while paused** — default Off. When On, step buttons are disabled if the world is paused. When Off, the GM can still advance time while paused.  
- **Disable step buttons during active combat** — default Off. When On, step buttons are disabled whenever a combat is active.  
- **Auto-pause on combat start (resume when last ends)** — default On. If enabled, starting the first combat pauses the game; ending the last combat resumes. The panel shows a small pill indicating “Combat controls time”.

> Turning **Enable AT Time Manager** on/off prompts a reload so the toolbar & panel reflect your changes immediately.

---

## 🪟 AT Time Manager Panel

- **GM view**: Pause/Play, five step buttons, and four time-of-day buttons (Dawn/Noon/Dusk/Midnight).  
- **Player view**: time-only (no buttons).
- **Behavior**:  
  - Buttons advance or rewind using **core FVTT v13** `game.time.advance(...)`.  
  - Dawn/Dusk/Noon/Midnight jump **forward** to the next occurrence (today or tomorrow).  
  - Optional disables when paused or during combat (see Settings), plus a master **Safety Lock**.  
  - 1-second heartbeat for a clock-like display; also listens to world time updates for instant refresh.  
- **Toolbar toggle**: **About Time - Time Manager** under **Journal/Notes** (GM-only).  
- **Position**: draggable; last position is saved per user.

---

## 🛠 API

The API is exposed as:

```js
game.abouttime    // Preferred
game.Gametime     // Deprecated, kept for backwards compatibility
```

### Key Methods
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
| `fmtDHMS(seconds)`                          | Format seconds as `DD:HH:MM:SS`.              |
| `showMiniPanel()` / `hideMiniPanel()`       | Show/hide the AT Time Manager panel.          |
| `toggleMiniPanel()`                         | Toggle the panel (used by the toolbar).       |

**Legacy macros (still defined for compatibility):**
- `DMf` → `DTMod.create`  
- `DTM` → `DTMod` class  
- `DTC` → `DTCalc` class  
- `DTNow` → current world time (seconds)  
- `DTf` → soft alias to `DMf` (deprecated)

---

## 🗣 /at Chat Command

- `/at help` — list available commands  
- `/at queue` or `/at list` — show the queue  
- `/at clear` — clear the entire queue  
- `/at stop <uid>` — cancel a specific event by its UID  
- `/at in <duration> <message>` — schedule one-time reminder  
- `/at every <duration> <message>` — schedule repeating reminder

**Duration shorthand:** supports mixed units — `1h30m`, `2d 4h`, `45m10s`, or plain seconds.

**Examples**
- `/at help`  
- `/at in 10m Check the stew`  
- `/at every 1h Random Encounter`  
- `/at stop abc123(uid)`  
- `/at clear`  
- `/at in 10 Time for a coffee break!`

> Tip: You can also control time via the **AT Time Manager** panel (GM-only), which uses core `game.time.advance(...)` under the hood.

---

## ⏱ Macro Examples

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

## 🧪 Testing Without Simple Calendar

If Simple Calendar is not installed or disabled:
- Times in output appear as `DD:HH:MM:SS` or `t+<seconds>`.
- All scheduling functions still work the same.
- The mini panel still works; time-of-day buttons compute forward boundaries by seconds-of-day.

---

## 📝 License

MIT — see LICENSE file.
