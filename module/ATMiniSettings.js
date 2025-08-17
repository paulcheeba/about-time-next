// module/ATMiniSettings.js
// v13.0.6.2 — Client settings for the AT Mini Time Panel (non-destructive)

import { MODULE_ID } from "./settings.js";

/**
 * Register client settings for the mini panel.
 * Kept separate to avoid touching the existing settings.js.
 */
export function registerMiniSettings() {
  const scope = "client";
  const config = true;

  game.settings.register(MODULE_ID, "enableMiniPanel", {
    name: "Enable AT Time Manager",
    hint: "Show the small About Time manager panel when Foundry loads (per-user). GMs see control buttons; players see time only.",
    scope, config,
    type: Boolean, default: false
  });

  // Five button duration strings; /at-style tokens like 10s, 1m, 1h5m3s
  game.settings.register(MODULE_ID, "miniRWD1", {
    name: "RWD1 duration", scope, config, type: String, default: "1m"
  });
  game.settings.register(MODULE_ID, "miniRWD2", {
    name: "RWD2 duration", scope, config, type: String, default: "10s"
  });
  game.settings.register(MODULE_ID, "miniFFWD1", {
    name: "FFWD1 duration", scope, config, type: String, default: "10s"
  });
  game.settings.register(MODULE_ID, "miniFFWD2", {
    name: "FFWD2 duration", scope, config, type: String, default: "1m"
  });
  game.settings.register(MODULE_ID, "miniFFWD3", {
    name: "FFWD3 duration", scope, config, type: String, default: "1h"
  });
}
