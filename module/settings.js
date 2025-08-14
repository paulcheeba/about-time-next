// About Time v13.0.5 — settings

const MODULE_ID = "about-time-v13";
export { MODULE_ID }; // safe to export (not imported by cyclic deps that import ElapsedTime/PseudoClock)

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
    default: false
  });

  // SC optional toggle
  game.settings.register(MODULE_ID, "use-simple-calendar", {
    name: "Use Simple Calendar (if installed)",
    hint: "When on and SC is available, About Time will use SC date/format helpers.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
};
