// module/ATMiniToolbar.js
// v13.0.6.3 — Toolbar tool under Journal/Notes: “About Time - Time Manager” (GM-only)

import { MODULE_ID } from "./settings.js";

Hooks.on("getSceneControlButtons", (controls) => {
  try {
    if (!game.user?.isGM) return; // GM-only tool
    if (!game.settings.get(MODULE_ID, "enableMiniPanel")) return;

    // v13: controls is commonly a record; fall back to array find for resilience.
    const journalCtl =
      controls?.["journal"] ??
      controls?.["notes"] ??
      controls?.find?.((c) => c?.name === "journal") ??
      controls?.find?.((c) => c?.name === "notes");

    const tools = journalCtl?.tools;
    if (!tools) return;

    // Duplicate guard
    const exists = Array.isArray(tools)
      ? tools.some((t) => t?.name === "abouttime-mini")
      : Boolean(tools["abouttime-mini"]);
    if (exists) return;

    const tool = {
      name: "abouttime-mini",
      title: "About Time - Time Manager",
      icon: "fas fa-clock-rotate-left", // distinct from Event Manager icon
      visible: true,
      button: true,
      onClick: () => {
        const api = (game.abouttime ?? game.Gametime);
        if (api?.toggleMiniPanel) return api.toggleMiniPanel();
        console.warn("[About Time] toggleMiniPanel API not available yet.");
      }
    };

    if (Array.isArray(tools)) tools.push(tool);
    else tools["abouttime-mini"] = tool;
  } catch (err) {
    console.error("[About Time] ATMiniToolbar injection failed:", err);
  }
});
