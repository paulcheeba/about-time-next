// About Time v13.5.0.0 — preload templates
const MODULE_ID = "about-time-next";

export const preloadTemplates = async function () {
  const templatePaths = [
    `modules/${MODULE_ID}/templates/countDown.html`,
    `modules/${MODULE_ID}/templates/calendarSelection.hbs`
  ];
  return foundry.applications.handlebars.loadTemplates(templatePaths);
};
