// settings.js (v13-ready)

import { ElapsedTime } from "./ElapsedTime.js";

const MODULE_ID = "about-time-v13";

export const registerSettings = function () {
  // Persistent queue store (world scope, hidden from config UI)
  game.settings.register(MODULE_ID, "store", {
    name: "Elapsed Time event queue",
    hint: "Internal storage for About Time. Do not edit.",
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });

  // Debug toggle (client scope, visible)
  game.settings.register(MODULE_ID, "debug", {
    name: "Debug output",
    hint: "Enable verbose logging for About Time.",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    // Bind to ensure correct 'this' (not strictly needed here, but safe)
    onChange: (...args) => ElapsedTime._fetchParams(...args)
  });

  // Calendar-weather compatibility value (kept for backward compatibility)
  game.settings.register(MODULE_ID, "election-timeout", {
    name: "For calendar-weather",
    hint: "Internal timing for master timekeeper election. Do not edit.",
    scope: "world",
    config: false,
    type: Number,
    default: 5
  });
};