// module/ATMiniSettings.js
// v13.0.6.7-hotfix.2 — Register mini panel + realtime settings (client/world) on init.

import { MODULE_ID } from "./settings.js";

/**
 * Helper to trigger mini panel to refresh behavior (dim/disable state etc.)
 * We reuse a single hook name so listeners don't need to change.
 */
function pingMiniBehavior(key, value) {
  try { Hooks.callAll("about-time.miniBehaviorChanged", key, value); } catch {}
}

Hooks.once("init", () => {
  // ---------- CLIENT (per-user) ----------
  game.settings.register(MODULE_ID, "miniEnableClient", {
    name: "Enable AT Time Manager (this user)",
    hint: "Show the mini panel for this user. GM sees controls; players see time only.",
    scope: "client", config: true, type: Boolean, default: true,
    onChange: () => ui.notifications?.info?.("Reload to apply the panel visibility.")
  });

  game.settings.register(MODULE_ID, "miniDimOnBlur", {
    name: "Dim panel when unfocused",
    scope: "client", config: true, type: Boolean, default: true,
    onChange: v => pingMiniBehavior("miniDimOnBlur", v)
  });

  // Step buttons (use /at durations like 10s, 1m, 1h5m3s)
  game.settings.register(MODULE_ID, "miniRWD1", { name: "RWD1 duration", scope: "client", config: true, type: String, default: "1m", onChange: v => pingMiniBehavior("miniRWD1", v) });
  game.settings.register(MODULE_ID, "miniRWD2", { name: "RWD2 duration", scope: "client", config: true, type: String, default: "10s", onChange: v => pingMiniBehavior("miniRWD2", v) });
  game.settings.register(MODULE_ID, "miniFFWD1", { name: "FFWD1 duration", scope: "client", config: true, type: String, default: "10s", onChange: v => pingMiniBehavior("miniFFWD1", v) });
  game.settings.register(MODULE_ID, "miniFFWD2", { name: "FFWD2 duration", scope: "client", config: true, type: String, default: "1m", onChange: v => pingMiniBehavior("miniFFWD2", v) });
  game.settings.register(MODULE_ID, "miniFFWD3", { name: "FFWD3 duration", scope: "client", config: true, type: String, default: "1h", onChange: v => pingMiniBehavior("miniFFWD3", v) });

  // Time of day
  game.settings.register(MODULE_ID, "miniDawnTime", {
    name: "Dawn time (HH:MM)",
    hint: "Used by the Dawn button and /at tod dawn.",
    scope: "client", config: true, type: String, default: "06:00",
    onChange: v => pingMiniBehavior("miniDawnTime", v)
  });
  game.settings.register(MODULE_ID, "miniDuskTime", {
    name: "Dusk time (HH:MM)",
    hint: "Used by the Dusk button and /at tod dusk.",
    scope: "client", config: true, type: String, default: "18:00",
    onChange: v => pingMiniBehavior("miniDuskTime", v)
  });

  // Optional behavior locks
  game.settings.register(MODULE_ID, "miniRespectPause", {
    name: "Respect game pause (disable step buttons when paused)",
    scope: "client", config: true, type: Boolean, default: false,
    onChange: v => pingMiniBehavior("miniRespectPause", v)
  });
  game.settings.register(MODULE_ID, "miniDisableInCombat", {
    name: "Disable step buttons during combat",
    scope: "client", config: true, type: Boolean, default: false,
    onChange: v => pingMiniBehavior("miniDisableInCombat", v)
  });
  game.settings.register(MODULE_ID, "miniSafetyLock", {
    name: "Safety lock (force-disable step buttons when paused or in combat)",
    scope: "client", config: true, type: Boolean, default: false,
    onChange: v => pingMiniBehavior("miniSafetyLock", v)
  });

  // ---------- WORLD (per-world) ----------
  game.settings.register(MODULE_ID, "enableTimeManagerToolbar", {
    name: "Toolbar: About Time — Time Manager",
    hint: "Show the Time Manager tool (GM-only) under Journal/Notes. Changing this will prompt a reload.",
    scope: "world", config: true, type: Boolean, default: true,
    onChange: () => {
      try { ui.controls?.initialize?.(); } catch {}
      ui.notifications?.info?.("Reload to apply toolbar visibility.");
    }
  });

  game.settings.register(MODULE_ID, "rtRate", {
    name: "Real-time rate (game seconds per real second)",
    scope: "world", config: true, type: Number, default: 1.0,
    range: { min: 0.25, max: 60, step: 0.25 },
    onChange: v => Hooks.callAll("about-time.rtSettingsChanged", "rtRate", v)
  });

  game.settings.register(MODULE_ID, "rtTickHz", {
    name: "Advance frequency (Hz)",
    hint: "How often to apply accumulated real-time (1 Hz recommended).",
    scope: "world", config: true, type: Number, default: 1,
    range: { min: 1, max: 20, step: 1 },
    onChange: v => Hooks.callAll("about-time.rtSettingsChanged", "rtTickHz", v)
  });

  game.settings.register(MODULE_ID, "rtLinkPause", {
    name: "Link Play/Pause with game pause",
    hint: "Play unpauses the world; Pause pauses the world; Spacebar toggles the real-time runner.",
    scope: "world", config: true, type: Boolean, default: true,
    onChange: v => pingMiniBehavior("rtLinkPause", v)
  });

  game.settings.register(MODULE_ID, "rtAutoPauseCombat", {
    name: "Auto-pause during combat",
    hint: "Pause the world and stop the real-time runner when combat starts; resume when the last combat ends.",
    scope: "world", config: true, type: Boolean, default: true,
    onChange: v => pingMiniBehavior("rtAutoPauseCombat", v)
  });
});
