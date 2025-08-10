import { MODULE_ID } from "./module/settings.js";

Hooks.once("ready", () => {
  const api = game.abouttime ?? game.Gametime ?? null;
  if (!api) {
    console.warn(`${MODULE_ID} | vars.js: abouttime API not found; globals not set.`);
    return;
  }

  console.log(`${MODULE_ID} | vars.js: setting convenience globals for macros`);

  try {
    globalThis.DMf = api.DMf;
    globalThis.DTM = api.DTM;
    globalThis.DTC = api.DTC;

    globalThis.DTNow = globalThis.DTNow ?? api.DTNow ?? (() => game.time.worldTime);

    if (!("DTf" in globalThis)) {
      globalThis.DTf = (...args) => {
        console.warn(`${MODULE_ID} | DTf is not defined in v13; use DMf (DTMod.create) instead.`, args);
        return api.DMf?.(...args);
      };
    }
  } catch (err) {
    console.error(`${MODULE_ID} | vars.js: failed to set convenience globals`, err);
  }
});
