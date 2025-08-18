# About Time (v13.0.6.3)

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
4. (Optional) Install [Smalltime](https://foundryvtt.com/packages/smalltime) To advance time with a UI. Otherwise gametime macros will be required to advance time.

---

## ⚙ Settings

### Use Simple Calendar (if installed)
- **Default:** On  
- When on and SC is active, About Time uses SC’s date/time formatting and intervals.  
- When off or SC is missing, About Time uses Foundry’s core time (`t+seconds`).

---

## 🛠 API

The API is exposed as:

```js
game.abouttime    // Preferred
game.Gametime     // Deprecated, kept for backwards compatibility
```
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

---

## 🗣 /at Chat Command
Available in chat:

- `/at help` — list available commands  
- `/at queue` or `/at list` — show the queue  
- `/at clear` — clear the entire queue  
- `/at stop <uid>` — cancel a specific event by its UID  
- `/at in <duration> <message>` — schedule one-time reminder  
- `/at every <duration> <message>` — schedule repeating reminder  

**Duration shorthand:** supports mixed units — `1h30m`, `2d 4h`, `45m10s`, or plain seconds.

/at Examples:
- `/at help`
- `/at in 10m Check the stew`
- `/at every 1h Random Encounter`
- `/at stop abc123(uid)`
- `/at clear`
- `/at in 10 Time for a coffee break!`

---

## ⏱ Macro Examples
These examples work with or without Simple Calendar.

Schedule a Macro to Run in 5 Minutes:
```js
game.abouttime.doIn({ minutes: 5 }, () => {
  ui.notifications.info("Five minutes have passed!");
});
```
Schedule a Reminder at a Specific Game Time:
```js
game.abouttime.reminderAt(
  { hour: 12, minute: 0, second: 0 },
  "It is high noon!"
);
```
Repeat Every Round (6 seconds):
```js
game.abouttime.doEvery({ seconds: 6 }, () => {
  console.log("New combat round started!");
});
```
Trigger a Custom Hook in 30 Seconds:
```js
game.abouttime.notifyIn({ seconds: 30 }, "myCustomEvent", "arg1", "arg2");
```

---

## 📜 Legacy Macro Globals
For old macros, these globals are still defined:

- DMf → DTMod.create  
- DTM → DTMod class  
- DTC → DTCalc class  
- DTNow → Get current world time (seconds)  
- DTf → Soft alias to DMf (deprecated)

---

## 🧪 Testing Without Simple Calendar
If Simple Calendar is not installed or disabled:

- Times in output appear as t+<seconds>
- All scheduling functions still work the same

---

## 📝 License
MIT — see LICENSE file.
