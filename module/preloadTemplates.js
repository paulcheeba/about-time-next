// About Time v13.0.5 — preload templates (kept minimal)
const MODULE_ID = "about-time-v13";

export const preloadTemplates = async function () {
  const raw = [
    `modules/${MODULE_ID}/templates/countDown.html`
  ];
  const paths = raw.map(p => foundry?.utils?.getRoute ? foundry.utils.getRoute(p) : p);
  return loadTemplates(paths);
};
