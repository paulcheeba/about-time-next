// module/ATMiniSettings.js
// v13.1.1.1 — Client settings for the AT Mini Time Panel (reload prompt on enable; live label updates; active-combat reconcile)


import { MODULE_ID } from "./settings.js";

/** Register client settings for the mini panel. */
function hasSetting(key) { try { return game.settings.settings.has(`${MODULE_ID}.${key}`); } catch { return false; } }

export function registerMiniSettings() {
  const scope = "client";
  const config = true;

  game.settings.register(MODULE_ID, "enableMiniPanel", {
    name: "Enable AT Time Manager",
    hint: "Show the small About Time manager panel when Foundry loads (per-user). GMs see control buttons; players see time only.",
    scope, config, type: Boolean, default: false,
    onChange: () => {
      // Prompt to reload so toolbar appears/disappears immediately.
      Dialog.confirm({
        title: "About Time",
        content: "<p>Changing Time Manager visibility requires a reload. Reload now?</p>",
        yes: () => window.location.reload(),
        no: () => ui.notifications?.info?.("Reload later to apply Time Manager visibility."),
        defaultYes: true
      });
    }
  });

  const durationOnChange = (key) => () => {
    // Let the panel (if open) rebuild labels without a reload.
    Hooks.callAll("about-time.miniDurationsChanged", key);
  };

  // Five button duration strings; /at-style tokens like 10s, 1m, 1h5m3s
  game.settings.register(MODULE_ID, "miniRWD1", {
    name: "RWD1 duration", scope, config, type: String, default: "1m",
    onChange: durationOnChange("miniRWD1")
  });
  game.settings.register(MODULE_ID, "miniRWD2", {
    name: "RWD2 duration", scope, config, type: String, default: "10s",
    onChange: durationOnChange("miniRWD2")
  });
  game.settings.register(MODULE_ID, "miniFFWD1", {
    name: "FFWD1 duration", scope, config, type: String, default: "10s",
    onChange: durationOnChange("miniFFWD1")
  });
  game.settings.register(MODULE_ID, "miniFFWD2", {
    name: "FFWD2 duration", scope, config, type: String, default: "1m",
    onChange: durationOnChange("miniFFWD2")
  });
  game.settings.register(MODULE_ID, "miniFFWD3", {
    name: "FFWD3 duration", scope, config, type: String, default: "1h",
    onChange: durationOnChange("miniFFWD3")
  });

  // --- v13.0.7: Additional settings required by Mini Panel & Realtime ---
  if (!hasSetting("miniDawnTime")) game.settings.register(MODULE_ID, "miniDawnTime", {
    name: "Dawn time (HH:MM)", scope: "client", config: true, type: String, default: "06:00"
  });
  if (!hasSetting("miniDuskTime")) game.settings.register(MODULE_ID, "miniDuskTime", {
    name: "Dusk time (HH:MM)", scope: "client", config: true, type: String, default: "18:00"
  });
  if (!hasSetting("miniDimOnBlur")) game.settings.register(MODULE_ID, "miniDimOnBlur", {
    name: "Dim panel on blur", scope: "client", config: true, type: Boolean, default: true
  });
  if (!hasSetting("miniDisableInCombat")) game.settings.register(MODULE_ID, "miniDisableInCombat", {
    name: "Hide controls during combat", scope: "client", config: true, type: Boolean, default: false
  });
  if (!hasSetting("miniRespectPause")) game.settings.register(MODULE_ID, "miniRespectPause", {
    name: "Respect world pause", scope: "client", config: true, type: Boolean, default: true
  });
  if (!hasSetting("miniSafetyLock")) game.settings.register(MODULE_ID, "miniSafetyLock", {
    name: "Safety lock (confirm big jumps)", scope: "client", config: true, type: Boolean, default: false
  });
  if (!hasSetting("rtAutoPauseCombat")) game.settings.register(MODULE_ID, "rtAutoPauseCombat", {
    name: "Auto Pause at Combat Start/End",
    hint: "When enabled, the game UI is automatically paused when combat begins and when combat ends.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
  if (!hasSetting("rtLinkPause")) game.settings.register(MODULE_ID, "rtLinkPause", {
    name: "Link realtime to pause", scope: "world", config: true, type: Boolean, default: true,
    onChange: (value) => {
      try {
        const hasActiveCombat = !!game.combat;
        if (game.paused || hasActiveCombat) {
          game.abouttime?.stopRealtime?.();
        } else if (value) {
          game.abouttime?.startRealtime?.();
        }
      } catch (e) {
        console.warn(`${MODULE_ID} | rtLinkPause onChange failed`, e);
      }
    }
  });

}
