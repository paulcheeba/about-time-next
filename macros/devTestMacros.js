// Macro (Script) to open the new AppV2 window (dev-only)
(async () => {
  const modPath = "/modules/about-time-v13/module/ATEventManagerAppV2.js";
  const { ATEventManagerAppV2 } = await import(modPath);
  new ATEventManagerAppV2().render(true);
})();

//
