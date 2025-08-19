// module/ATMiniSettings.js
// v13.0.6.7 — Adds real-time settings (rtRate, rtTickHz, rtLinkPause, rtAutoPauseCombat)
//                 Ensures Dawn/Dusk client settings exist for TOD buttons.

import { MODULE_ID } from "./settings.js";

export function registerMiniSettings() {
  /* ---------- Visibility (client) ---------- */
  game.settings.register(MODULE_ID, "enableMiniPanel", {
    name: "Enable AT Time Manager",
    hint: "Show the small About Time manager panel when Foundry loads (per-user). GMs see control buttons; players see time only.",
    scope: "client", config: true, type: Boolean, default: false,
    onChange: () => {
      Dialog.confirm({
        title: "About Time",
        content: "<p>Changing Time Manager visibility requires a reload. Reload now?</p>",
        yes: () => window.location.reload(),
        no: () => ui.notifications?.info?.("Reload later to apply Time Manager visibility."),
        defaultYes: true
      });
    }
  });

  /* ---------- Client: Dawn/Dusk times (per-user) ---------- */
  const todChanged = (key) => () => Hooks.callAll("about-time.miniTimeOfDayChanged", key);

  game.settings.register(MODULE_ID, "miniDawnTime", {
    name: "Dawn time (HH:MM, 24h)",
    hint: "Used by the Time-of-Day buttons and /at tod dawn.",
    scope: "client", config: true, type: String, default: "06:00",
    onChange: todChanged("miniDawnTime")
  });

  game.settings.register(MODULE_ID, "miniDuskTime", {
    name: "Dusk time (HH:MM, 24h)",
    hint: "Used by the Time-of-Day buttons and /at tod dusk.",
    scope: "client", config: true, type: String, default: "18:00",
    onChange: todChanged("miniDuskTime")
  });

  /* ---------- Client UX nicety ---------- */
  game.settings.register(MODULE_ID, "miniDimOnBlur", {
    name: "Dim panel when unfocused",
    hint: "When enabled, the AT Time Manager panel dims slightly when not focused, and brightens on hover/focus.",
    scope: "client", config: true, type: Boolean, default: true,
    onChange: () => Hooks.callAll("about-time.miniBehaviorChanged", "miniDimOnBlur")
  });

  /* ---------- World: real-time control ---------- */
  game.settings.register(MODULE_ID, "rtRate", {
    name: "Real-time Rate (game sec per real sec)",
    hint: "1.0 = one game-second per real second. Allowed range ~0.25–60.",
    scope: "world", config: true, type: Number, default: 1.0,
  });

  game.settings.register(MODULE_ID, "rtTickHz", {
    name: "Advance Frequency (Hz)",
    hint: "How many times per second the runner applies accumulated time. 1 Hz keeps hook spam low.",
    scope: "world", config: true, type: Number, default: 1,
  });

  game.settings.register(MODULE_ID, "rtLinkPause", {
    name: "Link Pause ↔ Real-time Play",
    hint: "When on: Play also unpauses; Pause also pauses; external (Spacebar) pause starts/stops the runner.",
    scope: "world", config: true, type: Boolean, default: true,
  });

  game.settings.register(MODULE_ID, "rtAutoPauseCombat", {
    name: "Auto-pause during combat (Play resumes after last combat ends)",
    hint: "When on: starting the first combat pauses/stops real-time; ending the last combat restores prior state.",
    scope: "world", config: true, type: Boolean, default: true,
  });

  /* ---------- Existing step-duration settings (if your build has them) ---------- */
  const durationChanged = (key) => () => Hooks.callAll("about-time.miniDurationsChanged", key);

  game.settings.register(MODULE_ID, "miniRWD1", { name: "RWD1 duration", scope: "client", config: true, type: String, default: "1m",  onChange: durationChanged("miniRWD1") });
  game.settings.register(MODULE_ID, "miniRWD2", { name: "RWD2 duration", scope: "client", config: true, type: String, default: "10s", onChange: durationChanged("miniRWD2") });
  game.settings.register(MODULE_ID, "miniFFWD1",{ name: "FFWD1 duration",scope: "client", config: true, type: String, default: "10s", onChange: durationChanged("miniFFWD1") });
  game.settings.register(MODULE_ID, "miniFFWD2",{ name: "FFWD2 duration",scope: "client", config: true, type: String, default: "1m",  onChange: durationChanged("miniFFWD2") });
  game.settings.register(MODULE_ID, "miniFFWD3",{ name: "FFWD3 duration",scope: "client", config: true, type: String, default: "1h",  onChange: durationChanged("miniFFWD3") });
}
