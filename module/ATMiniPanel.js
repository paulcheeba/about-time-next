// module/ATMiniPanel.js
// v13.0.6.3 — Windowless, draggable mini time panel (GM = controls; players = time-only)
// - Adds 1s heartbeat so the time line visibly ticks.
// - Listens for "about-time.miniDurationsChanged" to update labels live.

import { MODULE_ID } from "./settings.js";

const PANEL_ID = "at-mini-time-panel";
const POS_KEY  = `${MODULE_ID}:miniPanelPos`;

let _visible = false;
let _closer  = null;

// ---------- Utils ----------
function parseDuration(input) {
  if (!input || typeof input !== "string") return 0;
  const s = input.trim().toLowerCase();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  let total = 0; const re = /(\d+)\s*([dhms])/g; let m;
  while ((m = re.exec(s))) {
    const n = parseInt(m[1], 10);
    switch (m[2]) { case "d": total += n * 86400; break; case "h": total += n * 3600; break; case "m": total += n * 60; break; case "s": total += n; break; }
  }
  return total;
}
function fmtDHMS(seconds) {
  const api = (game.abouttime ?? game.Gametime);
  if (api?.fmtDHMS) return api.fmtDHMS(seconds);
  const s = Math.trunc(Number(seconds) || 0), sign = s < 0 ? "-" : "", abs = Math.abs(s);
  const dd = Math.floor(abs / 86400), hh = Math.floor((abs % 86400) / 3600), mm = Math.floor((abs % 3600) / 60), ss = abs % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${sign}${pad(dd)}:${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}
function scFormat(worldTime) {
  const sc = game.modules.get("foundryvtt-simple-calendar")?.active ? globalThis.SimpleCalendar?.api : null;
  if (!sc) return null;
  try {
    const dt = sc.timestampToDate?.(worldTime);
    const out = sc.formatDateTime?.(dt);
    const date = out?.date ?? "", time = out?.time ?? "", sep = (date && time) ? " " : "";
    const str = `${date}${sep}${time}`.trim();
    return str || null;
  } catch { return null; }
}
function currentTimeLabel() {
  const wt = game.time?.worldTime ?? 0;
  return scFormat(wt) ?? fmtDHMS(wt);
}
function readDurations() {
  return {
    rwd1: game.settings.get(MODULE_ID, "miniRWD1"),
    rwd2: game.settings.get(MODULE_ID, "miniRWD2"),
    fwd1: game.settings.get(MODULE_ID, "miniFFWD1"),
    fwd2: game.settings.get(MODULE_ID, "miniFFWD2"),
    fwd3: game.settings.get(MODULE_ID, "miniFFWD3")
  };
}
function loadPos() { try { return JSON.parse(localStorage.getItem(POS_KEY) || "null") ?? { top: 80, left: 120 }; } catch { return { top: 80, left: 120 }; } }
function savePos(pos) { try { localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch {} }

function ensureStyles() {
  const tagId = `${PANEL_ID}-styles`;
  if (document.getElementById(tagId)) return;
  const style = document.createElement("style");
  style.id = tagId;
  style.textContent = `
#${PANEL_ID} { position: fixed; z-index: 99999; display: inline-block;
  background: var(--color-bg, rgba(20,20,20,0.92)); color: var(--color-text, #eee);
  border-radius: 10px; box-shadow: 0 8px 18px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06);
  padding: 8px 10px 8px 12px; user-select: none; }
#${PANEL_ID} .atmp-inner { border: 1px solid var(--color-border-light-2, rgba(255,255,255,0.12));
  border-radius: 8px; background: var(--color-bg-alt, rgba(255,255,255,0.05)); padding: 8px 10px 6px; }
#${PANEL_ID} .atmp-close { position: absolute; top: -6px; right: -6px; width: 18px; height: 18px;
  border-radius: 50%; background: rgba(0,0,0,0.55); color: #fff; border: 1px solid rgba(255,255,255,0.25);
  font-size: 11px; line-height: 16px; text-align: center; cursor: pointer; transition: transform .06s ease; }
#${PANEL_ID} .atmp-close:hover { transform: scale(1.06); }
#${PANEL_ID} .atmp-grip { position: absolute; top: 0; left: 0; right: 24px; height: 6px; cursor: move; }
#${PANEL_ID} .atmp-title { font-size: 8px; font-weight: 600; opacity: .9; margin: 0 0 4px 0; text-align: center; }
#${PANEL_ID} .atmp-time { font-size: 12px; font-weight: 700; text-align: center; margin: 0 0 8px 0; white-space: nowrap; }
#${PANEL_ID} .atmp-buttons { display: grid; grid-auto-flow: column; grid-auto-columns: max-content; gap: 6px; justify-content: center; align-items: stretch; }
#${PANEL_ID} .atmp-btn { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding: 4px 8px;
  border-radius: 6px; background: var(--color-background, rgba(255,255,255,0.05)); border: 1px solid var(--color-border-light-1, rgba(255,255,255,0.18));
  cursor: pointer; white-space: nowrap; }
#${PANEL_ID} .atmp-btn:hover { background: var(--color-hover-bg, rgba(255,255,255,0.12)); }
#${PANEL_ID} .atmp-label { font-size: 11px; font-weight: 700; line-height: 1; }
#${PANEL_ID} .atmp-icon { font-size: 10px; opacity: .85; line-height: 1; }
#${PANEL_ID}.readonly .atmp-buttons { display: none; } /* players see time only */
`;
  document.head.appendChild(style);
}

// ---------- Build ----------
function buildPanel() {
  document.getElementById(PANEL_ID)?.remove();
  ensureStyles();

  const pos = loadPos();
  const root = document.createElement("div");
  root.id = PANEL_ID;
  root.style.top = `${pos.top}px`;
  root.style.left = `${pos.left}px`;
  if (!game.user.isGM) root.classList.add("readonly");

  const grip = document.createElement("div"); grip.className = "atmp-grip"; grip.title = "Drag";
  const closeBtn = document.createElement("div"); closeBtn.className = "atmp-close"; closeBtn.title = "Close"; closeBtn.textContent = "✕";

  const inner = document.createElement("div"); inner.className = "atmp-inner";
  const title = document.createElement("div"); title.className = "atmp-title"; title.textContent = "Current time";
  const time = document.createElement("div"); time.className = "atmp-time"; time.id = `${PANEL_ID}-time`; time.textContent = currentTimeLabel();

  const buttons = document.createElement("div"); buttons.className = "atmp-buttons";
  addButtons(buttons);

  inner.append(title, time, buttons);
  root.append(grip, closeBtn, inner);
  document.body.appendChild(root);
  return root;
}

function mkBtn(id, label, icon, tip) {
  const btn = document.createElement("div"); btn.className = "atmp-btn"; btn.dataset.id = id; btn.title = tip;
  const lbl = document.createElement("div"); lbl.className = "atmp-label"; lbl.textContent = label;
  const ico = document.createElement("i"); ico.className = `fas ${icon} atmp-icon`; ico.setAttribute("aria-hidden", "true");
  btn.append(lbl, ico);
  return btn;
}
function addButtons(container) {
  container.replaceChildren(); // clear any existing
  const d = readDurations();
  container.append(
    mkBtn("rwd1", d.rwd1, "fa-angles-left",  `Rewind ${d.rwd1}`),
    mkBtn("rwd2", d.rwd2, "fa-angles-left",  `Rewind ${d.rwd2}`),
    mkBtn("fwd1", d.fwd1, "fa-angles-right", `Advance ${d.fwd1}`),
    mkBtn("fwd2", d.fwd2, "fa-angles-right", `Advance ${d.fwd2}`),
    mkBtn("fwd3", d.fwd3, "fa-angles-right", `Advance ${d.fwd3}`),
  );
}

// ---------- Behavior ----------
function makeDraggable(el) {
  let dragging = false, sx = 0, sy = 0, baseL = 0, baseT = 0;
  function down(ev) { dragging = true; const e = ev.touches?.[0] ?? ev;
    sx = e.clientX; sy = e.clientY; const r = el.getBoundingClientRect(); baseL = r.left; baseT = r.top; ev.preventDefault(); }
  function move(ev) { if (!dragging) return; const e = ev.touches?.[0] ?? ev;
    el.style.left = `${Math.max(0, baseL + (e.clientX - sx))}px`; el.style.top = `${Math.max(0, baseT + (e.clientY - sy))}px`; }
  function up() { if (!dragging) return; dragging = false; savePos({ left: parseInt(el.style.left || "0", 10), top: parseInt(el.style.top || "0", 10) }); }
  el.addEventListener("pointerdown", down);
  el.querySelector(".atmp-grip")?.addEventListener("pointerdown", down);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  return () => { el.removeEventListener("pointerdown", down); el.querySelector(".atmp-grip")?.removeEventListener("pointerdown", down);
    window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
}

function wireBehavior(root) {
  const cleanup = [];

  // Close
  const close = () => { cleanup.forEach((fn) => { try { fn(); } catch {} }); document.getElementById(PANEL_ID)?.remove(); _visible = false; };
  root.querySelector(".atmp-close")?.addEventListener("click", close);

  // Time refresh on world time updates
  const update = () => {
    const el = document.getElementById(`${PANEL_ID}-time`);
    if (el?.isConnected) el.textContent = currentTimeLabel();
  };
  const hookId = Hooks.on("updateWorldTime", update);
  cleanup.push(() => Hooks.off("updateWorldTime", hookId));

  // 1s heartbeat tick (visible clock)
  const interval = setInterval(update, 1000);
  cleanup.push(() => clearInterval(interval));

  // Buttons (GM only)
  if (game.user.isGM) {
    const handler = (ev) => {
      const id = ev.currentTarget?.dataset?.id;
      const map = readDurations();
      const s = parseDuration(map[id] || "0");
      const sign = id?.startsWith("rwd") ? -1 : +1;
      const delta = sign * s;
      if (!delta) return;
      game.time.advance(delta); // core v13 API
    };
    root.querySelectorAll(".atmp-btn").forEach((b) => b.addEventListener("click", handler));
  }

  // Dragging
  cleanup.push(makeDraggable(root));

  // Live duration label updates
  const durationHook = Hooks.on("about-time.miniDurationsChanged", () => {
    const container = root.querySelector(".atmp-buttons");
    if (container) addButtons(container);
  });
  cleanup.push(() => Hooks.off("about-time.miniDurationsChanged", durationHook));

  return close;
}

// ---------- Public API ----------
export function showMiniPanel() {
  if (_visible) return;
  const root = buildPanel();
  _closer = wireBehavior(root);
  _visible = true;
}
export function hideMiniPanel() {
  if (!_visible) return;
  _closer?.();
  _closer = null;
  _visible = false;
}
export function toggleMiniPanel() {
  _visible ? hideMiniPanel() : showMiniPanel();
}
