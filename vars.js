// vars.js (v13-ready)
// Purpose: expose a few convenience globals for macros (legacy behavior)

Hooks.once("ready", () => {
  // Prefer the canonical API on game.abouttime; fall back to legacy proxies if needed.
  const api =
    game.abouttime ??
    // legacy shim kept for backwards compat
    game.Gametime ??
    null;

  if (!api) {
    console.warn("about-time | vars.js: abouttime API not found; globals not set.");
    return;
  }

  console.log("about-time | vars.js: setting convenience globals for macros");

  // Common helpers used by older macros/snippets
  // DTNow was exported from your main file; surface it here too if desired.
  try {
    // Constructors/helpers from calendar module
    // These exist on game.abouttime per about-time.ts setup:
    //   DMf (DTMod.create), DTM (DTMod), DTC (DTCalc)
    // Also surface DTNow if your entry file exported it.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    globalThis.DMf = api.DMf;
    // @ts-ignore
    globalThis.DTM = api.DTM;
    // @ts-ignore
    globalThis.DTC = api.DTC;

    // DTNow may be exported in your entry (about-time.ts). If not present, provide a safe shim.
    // @ts-ignore
    globalThis.DTNow = globalThis.DTNow ?? api.DTNow ?? (() => game.time.worldTime);

    // Some older code referenced DTf; keep a soft alias if available.
    // There is no DTf in your current API, so provide a warning shim.
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
