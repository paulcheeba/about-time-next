// module/ATMiniToolbar.js
// v13.0.6.2 — Conditional toolbar tool: "AT Time Manager"

import { MODULE_ID } from "./settings.js";

Hooks.on("getSceneControlButtons", (controls) => {
  try {
    if (!game.user?.isGM) return; // GM-only tool
    if (!game.settings.get(MODULE_ID, "enableMiniPanel")) return;

    // v13 controls can be a record; fall back to array form just in case
    const token = controls?.["token"] ?? controls?.find?.(c => c?.name === "token");
    const tools = token?.tools;
    if (!tools) return;

    // Duplicate guard
    const exists = Array.isArray(tools)
      ? tools.some(t => t?.name === "abouttime-mini")
      : Boolean(tools["abouttime-mini"]);
    if (exists) return;

    const tool = {
      name: "abouttime-mini",
      title: "AT Time Manager",
      icon: "fas fa-clock-rotate-left", // different from the event manager icon
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
