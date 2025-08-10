import { MODULE_ID } from "./settings.js";

function isSCActive() {
  const useSC = game.settings?.get?.(MODULE_ID, "use-simple-calendar") ?? true;
  if (!useSC) return false;
  const sc = game.modules.get("foundryvtt-simple-calendar") ?? game.modules.get("simple-calendar");
  return !!(sc && sc.active && globalThis.SimpleCalendar?.api);
}

export const preloadTemplates = async function () {
  const rawPaths = [
    `modules/${MODULE_ID}/templates/countDown.html`,
  ];
  if (isSCActive()) {
    rawPaths.push(
      `modules/${MODULE_ID}/templates/simpleCalendarDisplay.html`,
      `modules/${MODULE_ID}/templates/simpleClockDisplay.html`,
      `modules/${MODULE_ID}/templates/calendarEditor.html`
    );
  }
  const templatePaths = rawPaths.map(p => foundry?.utils?.getRoute ? foundry.utils.getRoute(p) : p);
  return loadTemplates(templatePaths);
};
