// About Time v13.0.5 — macro globals (legacy convenience)

Hooks.once("ready", () => {
  const api = game.abouttime ?? game.Gametime ?? null;
  if (!api) { console.warn("about-time | vars.js: abouttime API not found; globals not set."); return; }

  try {
    globalThis.DMf = api.DMf;
    globalThis.DTM = api.DTM;
    globalThis.DTC = api.DTC;
    globalThis.DTNow = globalThis.DTNow ?? api.DTNow ?? (() => game.time.worldTime);

    if (!("DTf" in globalThis)) {
      // @ts-ignore
      globalThis.DTf = (...args) => {
        console.warn("about-time | DTf is not defined in v13; use DMf (DTMod.create) instead.", args);
        return api.DMf?.(...args);
      };
    }
  } catch (err) {
    console.error("about-time | vars.js: failed to set convenience globals", err);
  }
});
