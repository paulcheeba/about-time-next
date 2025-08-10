// preloadTemplates.js (v13-ready)

/**
 * Prefer getRoute() so template paths resolve correctly
 * with local or remote asset backends (S3, CDN, etc.).
 * If you rename your templates to .hbs later, just update the list.
 */
const MODULE_ID = "about-time-v13";

export const preloadTemplates = async function () {
  // TIP: consider renaming these to .hbs eventually (recommended in modern FVTT),
  // but .html still works with loadTemplates().
  const rawPaths = [
    `modules/${MODULE_ID}/templates/simpleCalendarDisplay.html`,
    `modules/${MODULE_ID}/templates/simpleClockDisplay.html`,
    `modules/${MODULE_ID}/templates/countDown.html`,
    `modules/${MODULE_ID}/templates/calendarEditor.html`,
  ];

  // v13-safe: normalize each path via foundry's router
  const templatePaths = rawPaths.map(p =>
    // getRoute handles deployments where the /modules path isn't a plain filesystem path
    foundry?.utils?.getRoute ? foundry.utils.getRoute(p) : p
  );

  return loadTemplates(templatePaths);
};
