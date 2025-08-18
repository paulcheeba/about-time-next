// module/ATMiniSettings.js
// v13.0.6.3 — Client settings for the AT Mini Time Panel (reload prompt on enable; live label updates)

import { MODULE_ID } from "./settings.js";

/** Register client settings for the mini panel. */
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
}
