# About Time (v13.0.7.x)

**About Time** is a timekeeping and event scheduling utility for Foundry VTT v13+.  
It works with **Simple Calendar** (if installed) or falls back to Foundry’s core time system.

---

## 📦 Installation

1. Download and install via Foundry’s module browser  
   **OR** add the manifest URL:  
   ```text
   https://github.com/paulcheeba/about-time-v13/releases/latest/download/module.json
   ```
2. Enable the module in your world.
3. (Optional) Install [Simple Calendar](https://foundryvtt.com/packages/foundryvtt-simple-calendar) for advanced date formatting.

---

## ⚙ Settings

### Use Simple Calendar (if installed) *Note - When SC is available for FVTT v13 I will reconfirm the original functionality. If there are only minor hook changes, about-time-v13 MAY already be compatible with the v13 SC, it's unlikely though...*
- **Default:** On  
- When enabled, About Time uses SC’s date/time formatting and intervals.  
- When disabled (or if SC is not present), it falls back to Foundry core world time.

### Debug Mode
- Logs additional info (queue status, SC conversions) to the console.  
- Useful for troubleshooting.

---

## 🗂 Toolbar Buttons

Two buttons appear on the Foundry **Scene Controls** toolbar:

- **Time Manager**: opens the floating panel.  
- **Event Manager**: opens the queue view to manage scheduled events.  

Visibility is limited to GMs.

<img width="281" height="200" alt="image" src="https://github.com/user-attachments/assets/8f3c06f8-d511-4e0c-9528-9c2b67d1c8a3" />


---

## 🕓 Time Manager

A floating **Time Manager panel** provides quick controls for world time.  
- Play/Pause button: toggles real-time clock advancement.  
- Current time display.  
- Mini toggle buttons (settings, advancement options, etc.)  
- Drag to reposition, persists across sessions.

<img width="299" height="168" alt="image" src="https://github.com/user-attachments/assets/45bca378-3ae8-4cf2-8504-f79a46755352" />


---

## 📅 Event Manager

The Event Manager window lets you view and manage the event queue:

- See upcoming one-shot and repeating events.  
- Delete specific events by ID.  
- Queue is automatically saved and restored across reloads.  

<img width="849" height="800" alt="image" src="https://github.com/user-attachments/assets/de0dca06-41cf-4670-b6ef-fcefe03ae4d2" />


---

## 💬 Chat Commands

About Time supports both the Foundry command registry and `/chat` fallback.

### Event Scheduling
- `/at in 30s Hello!` – run once in 30 seconds.  
- `/at every 10m Hello again!` – repeat every 10 minutes.  
- `/at 20:00 Torch burns out` – schedule for specific time of day.  

### Queue Management
- `/at queue` – list scheduled events (GM-only whisper).  
- `/at clear` – clear all events.  

### Notes
- Repeating events now remain in the queue and reschedule correctly.  
- Queue outputs are whispered to GMs by default (per workflow).  
- Times respect Simple Calendar if active.

---

## 🚧 Known Limitations

- About Time does not override combat round/initiative time.  
- Complex SC calendars (non-365-day years, custom months) use SC conversion but may behave conservatively for raw seconds math.  
- Only GMs can create and view scheduled events.  

---

## 📝 Credits

Originally created by **Tim Posney**, updated and maintained for Foundry VTT v13 by **Paulcheeba** with community input and ChatGPT-assisted refactoring.
