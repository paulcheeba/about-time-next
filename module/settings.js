import { ElapsedTime } from "./ElapsedTime.js";

export const MODULE_ID = "about-time-v13";

export const registerSettings = function () {
  game.settings.register(MODULE_ID, "store", {
    name: "Elapsed Time event queue",
    hint: "Internal storage for About Time. Do not edit.",
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });

  game.settings.register(MODULE_ID, "debug", {
    name: "Debug output",
    hint: "Enable verbose logging for About Time.",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: (...args) => ElapsedTime._fetchParams(...args)
  });

  game.settings.register(MODULE_ID, "use-simple-calendar", {
    name: "Use Simple Calendar (if installed)",
    hint: "Disable to ignore Simple Calendar and always use Foundry core time/formatting.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "election-timeout", {
    name: "For calendar-weather",
    hint: "Internal timing for master timekeeper election. Do not edit.",
    scope: "world",
    config: false,
    type: Number,
    default: 5
  });
};
