// module/ATMiniPanel.js
// v13.0.7.2 — Compact header (Play | Time | tiny toggles), no pill,
// tiny toggles wired to rtLinkPause / rtAutoPauseCombat, small a11y polish.

import { MODULE_ID } from "./settings.js";
import { startRealtime, stopRealtime } from "./ATRealtimeClock.js";

const PANEL_ID = "at-mini-time-panel";
const POS_KEY  = `${MODULE_ID}:miniPanelPos`;

let _visible = false;
let _closer  = null;

// ---------- Safe settings getter ----------
function hasSetting(key) {
  try { return game?.settings?.settings?.has?.(`${MODULE_ID}.${key}`) ?? false; } catch { return false; }
}
function getSetting(key, fallback) {
  try {
    if (!hasSetting(key)) return fallback;
    return game.settings.get(MODULE_ID, key);
  } catch { return fallback; }
}

// ---------- Utils ----------
function parseDuration(input) {
  if (!input || typeof input !== "string") return 0;
  const s = input.trim().toLowerCase();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  let total = 0, m;
  const re = /(\d+)\s*([dhms])/g;
  while ((m = re.exec(s))) {
    const n = parseInt(m[1], 10);
    switch (m[2]) {
      case "d": total += n * 86400; break;
      case "h": total += n * 3600; break;
      case "m": total += n * 60; break;
      case "s": total += n; break;
    }
  }
  return total;
}
function fmtDHMS(seconds) {
  const api = (game.abouttime ?? game.Gametime);
  if (api?.fmtDHMS) return api.fmtDHMS(seconds);
  const s = Math.trunc(Number(seconds) || 0), sign = s < 0 ? "-" : "", abs = Math.abs(s);
  const dd = Math.floor(abs / 86400), hh = Math.floor((abs % 86400) / 3600),
        mm = Math.floor((abs % 3600) / 60), ss = abs % 60;
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
    rwd1: String(getSetting("miniRWD1", "1m") || "1m"),
    rwd2: String(getSetting("miniRWD2", "10s") || "10s"),
    fwd1: String(getSetting("miniFFWD1", "10s") || "10s"),
    fwd2: String(getSetting("miniFFWD2", "1m") || "1m"),
    fwd3: String(getSetting("miniFFWD3", "1h") || "1h"),
  };
}
function readTimeOfDay() {
  const dawn = String(getSetting("miniDawnTime", "06:00") || "06:00");
  const dusk = String(getSetting("miniDuskTime", "18:00") || "18:00");
  return { dawn, dusk };
}
function hhmmToSecs(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm).trim());
  if (!m) return null;
  const h = Math.max(0, Math.min(23, parseInt(m[1], 10)));
  const min = Math.max(0, Math.min(59, parseInt(m[2], 10)));
  return h * 3600 + min * 60;
}
function secondsToNextBoundary(targetSOD) {
  const now = game.time.worldTime ?? 0;
  const sod = ((now % 86400) + 86400) % 86400;
  let target = targetSOD;
  if (target <= sod) target += 86400;
  return target - sod;
}
function isPaused() { return !!game.paused; }
function isCombatActive() {
  const active = game.combats?.active ?? game.combat ?? null;
  return !!active;
}
function getBehavior() {
  return {
    dimOnBlur: !!getSetting("miniDimOnBlur", true),
    respectPause: !!getSetting("miniRespectPause", false),
    disableInCombat: !!getSetting("miniDisableInCombat", false),
    safety: !!getSetting("miniSafetyLock", false),
    linkPause: !!getSetting("rtLinkPause", true)
  };
}
function buttonsShouldDisable() {
  const { safety, respectPause, disableInCombat } = getBehavior();
  const paused = isPaused(), inCombat = isCombatActive();
  if (safety && (paused || inCombat)) return true;
  if (respectPause && paused) return true;
  if (disableInCombat && inCombat) return true;
  return false;
}
function loadPos() { try { return JSON.parse(localStorage.getItem(POS_KEY) || "null") ?? { top: 80, left: 120 }; } catch { return { top: 80, left: 120 }; } }
function savePos(pos) { try { localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch {} }

// ---------- Styles ----------
function ensureStyles() {
  const tagId = `${PANEL_ID}-styles`;
  if (document.getElementById(tagId)) return;
  const style = document.createElement("style"); style.id = tagId;
  style.textContent = `
#${PANEL_ID} { position: fixed; z-index: 99999; display: inline-block;
  background: var(--color-bg, rgba(20,20,20,0.92)); color: var(--color-text, #eee);
  border-radius: 10px; box-shadow: 0 8px 18px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06);
  padding: 8px 10px 8px 12px; user-select: none; transition: opacity .12s ease, filter .12s ease; }
#${PANEL_ID}.dimmed { opacity: .72; filter: saturate(.9); }
#${PANEL_ID} .atmp-inner { position: relative; border: 1px solid var(--color-border-light-2, rgba(255,255,255,0.12));
  border-radius: 8px; background: var(--color-bg-alt, rgba(255,255,255,0.05)); padding: 8px 10px; }
#${PANEL_ID} .atmp-close { position: absolute; top: -6px; right: -6px; width: 18px; height: 18px;
  border-radius: 50%; background: rgba(0,0,0,0.55); color: #fff; border: 1px solid rgba(255,255,255,0.25);
  font-size: 11px; line-height: 16px; text-align: center; cursor: pointer; transition: transform .06s ease; }
#${PANEL_ID} .atmp-close:hover { transform: scale(1.06); }
#${PANEL_ID} .atmp-grip { position: absolute; top: 0; left: 0; right: 24px; height: 6px; cursor: move; }

#${PANEL_ID} .atmp-ctl-row {
  display: grid; grid-auto-flow: column; grid-auto-columns: max-content; gap: 8px;
  align-items: center; justify-content: center; margin-bottom: 6px;
}
#${PANEL_ID} .atmp-title { font-size: 8px; font-weight: 600; opacity: .9; margin: 0 0 2px 0; text-align: center; }
#${PANEL_ID} .atmp-time { font-size: 12px; font-weight: 700; text-align: center; white-space: nowrap; min-width: 140px; }

#${PANEL_ID} .atmp-ctl-btn { padding: 4px 8px; border-radius: 6px;
  background: var(--color-background, rgba(255,255,255,0.06));
  border: 1px solid var(--color-border-light-1, rgba(255,255,255,0.18)); cursor: pointer; }
#${PANEL_ID} .atmp-ctl-btn[disabled] { opacity: .5; cursor: not-allowed; }

#${PANEL_ID} .atmp-icon-col { display: inline-flex; gap: 6px; align-items: center; }
#${PANEL_ID} .atmp-tiny {
  width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center;
  border-radius: 6px; background: var(--color-background, rgba(255,255,255,0.05));
  border: 1px solid var(--color-border-light-1, rgba(255,255,255,0.18)); cursor: pointer;
  font-size: 11px; line-height: 1;
}
#${PANEL_ID} .atmp-tiny.off { opacity: .5; }
#${PANEL_ID} .atmp-tiny:focus { outline: 1px solid rgba(255,255,255,0.35); outline-offset: 1px; }

#${PANEL_ID} .atmp-buttons, #${PANEL_ID} .atmp-buttons-td {
  display: grid; grid-auto-flow: column; grid-auto-columns: max-content; gap: 6px; justify-content: center; align-items: stretch; margin-top: 6px; }
#${PANEL_ID} .atmp-btn { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding: 4px 8px;
  border-radius: 6px; background: var(--color-background, rgba(255,255,255,0.05)); border: 1px solid var(--color-border-light-1, rgba(255,255,255,0.18));
  cursor: pointer; white-space: nowrap; }
#${PANEL_ID} .atmp-btn:hover { background: var(--color-hover-bg, rgba(255,255,255,0.12)); }
#${PANEL_ID} .atmp-btn.is-disabled { opacity: .5; pointer-events: none; }
#${PANEL_ID} .atmp-label { font-size: 11px; font-weight: 700; line-height: 1; }
#${PANEL_ID} .atmp-icon { font-size: 10px; opacity: .85; line-height: 1; }

#${PANEL_ID}.readonly .atmp-buttons, #${PANEL_ID}.readonly .atmp-buttons-td, #${PANEL_ID}.readonly .atmp-ctl-row { display: none; } /* players see time only */
`;
  document.head.appendChild(style);
}

// ---------- Build ----------
function mkStepBtn(id, label, icon, tip) {
  const btn = document.createElement("div"); btn.className = "atmp-btn"; btn.dataset.id = id; btn.title = tip;
  btn.setAttribute("role", "button"); btn.setAttribute("tabindex", "0");
  const lbl = document.createElement("div"); lbl.className = "atmp-label"; lbl.textContent = label;
  const ico = document.createElement("i"); ico.className = `fas ${icon} atmp-icon`; ico.setAttribute("aria-hidden", "true");
  btn.append(lbl, ico); return btn;
}
function mkTodBtn(id, label, icon, tip) {
  const btn = document.createElement("div"); btn.className = "atmp-btn"; btn.dataset.tod = id; btn.title = tip;
  btn.setAttribute("role", "button"); btn.setAttribute("tabindex", "0");
  const lbl = document.createElement("div"); lbl.className = "atmp-label"; lbl.textContent = label;
  const ico = document.createElement("i"); ico.className = `fas ${icon} atmp-icon`; ico.setAttribute("aria-hidden", "true");
  btn.append(lbl, ico); return btn;
}

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

  // Title + compact control row (Play | Time | tiny toggles)
  const title = document.createElement("div"); title.className = "atmp-title"; title.textContent = "Current time";
  const time = document.createElement("div"); time.className = "atmp-time"; time.id = `${PANEL_ID}-time`; time.textContent = currentTimeLabel();

  const ctlRow = document.createElement("div"); ctlRow.className = "atmp-ctl-row";

  const playPause = document.createElement("button");
  playPause.type = "button";
  playPause.className = "atmp-ctl-btn";
  playPause.textContent = (game.paused ? "Play" : "Pause");
  playPause.title = "Toggle real-time & world pause (if linked)";

  const iconCol = document.createElement("div");
  iconCol.className = "atmp-icon-col";

  // Tiny toggles (pause link, combat auto-pause)
  const tinyLink = document.createElement("div"); tinyLink.className = "atmp-tiny"; tinyLink.textContent = "⏯";
  tinyLink.setAttribute("role","switch"); tinyLink.setAttribute("tabindex","0");
  tinyLink.title = "Link realtime to world pause";
  const tinyCombat = document.createElement("div"); tinyCombat.className = "atmp-tiny"; tinyCombat.textContent = "⚔";
  tinyCombat.setAttribute("role","switch"); tinyCombat.setAttribute("tabindex","0");
  tinyCombat.title = "Auto-pause during combat";

  // Initialize visual state for tiny toggles
  if (!getSetting("rtLinkPause", true)) tinyLink.classList.add("off");
  if (!getSetting("rtAutoPauseCombat", true)) tinyCombat.classList.add("off");

  iconCol.append(tinyLink, tinyCombat);
  ctlRow.append(playPause, time, iconCol);

  // Buttons rows
  const steps = document.createElement("div"); steps.className = "atmp-buttons";
  addStepButtons(steps);

  const tod = document.createElement("div"); tod.className = "atmp-buttons-td";
  addTimeOfDayButtons(tod);

  inner.append(title, ctlRow, steps, tod);
  root.append(grip, closeBtn, inner);
  document.body.appendChild(root);
  return { root, steps, tod, timeEl: time, playPauseBtn: playPause, tinyLink, tinyCombat };
}

function addStepButtons(container) {
  container.replaceChildren();
  const d = readDurations();
  container.append(
    mkStepBtn("rwd1", d.rwd1, "fa-angles-left",  `Rewind ${d.rwd1}`),
    mkStepBtn("rwd2", d.rwd2, "fa-angles-left",  `Rewind ${d.rwd2}`),
    mkStepBtn("fwd1", d.fwd1, "fa-angles-right", `Advance ${d.fwd1}`),
    mkStepBtn("fwd2", d.fwd2, "fa-angles-right", `Advance ${d.fwd2}`),
    mkStepBtn("fwd3", d.fwd3, "fa-angles-right", `Advance ${d.fwd3}`),
  );
}
function addTimeOfDayButtons(container) {
  container.replaceChildren();
  const { dawn, dusk } = readTimeOfDay();
  container.append(
    mkTodBtn("dawn",     "Dawn",     "fa-cloud-sun",  `Advance to Dawn \u2014 ${dawn}`),
    mkTodBtn("noon",     "Noon",     "fa-sun",        "Advance to Noon \u2014 12:00"),
    mkTodBtn("dusk",     "Dusk",     "fa-cloud-moon", `Advance to Dusk \u2014 ${dusk}`),
    mkTodBtn("midnight", "Midnight", "fa-moon",       "Advance to Midnight \u2014 00:00"),
  );
}

// ---------- Behavior ----------
function makeDraggable(el) {
  let dragging = false, sx = 0, sy = 0, baseL = 0, baseT = 0;
  function down(ev) {
    dragging = true; const e = ev.touches?.[0] ?? ev;
    sx = e.clientX; sy = e.clientY; const r = el.getBoundingClientRect(); baseL = r.left; baseT = r.top; ev.preventDefault();
  }
  function move(ev) {
    if (!dragging) return; const e = ev.touches?.[0] ?? ev;
    el.style.left = `${Math.max(0, baseL + (e.clientX - sx))}px`;
    el.style.top  = `${Math.max(0, baseT + (e.clientY - sy))}px`;
  }
  function up() {
    if (!dragging) return; dragging = false;
    savePos({ left: parseInt(el.style.left || "0", 10), top: parseInt(el.style.top || "0", 10) });
  }
  el.addEventListener("pointerdown", down);
  el.querySelector(".atmp-grip")?.addEventListener("pointerdown", down);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  return () => {
    el.removeEventListener("pointerdown", down);
    el.querySelector(".atmp-grip")?.removeEventListener("pointerdown", down);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  };
}

function setButtonsEnabled(root, enabled) {
  root.querySelectorAll(".atmp-btn").forEach((b) => {
    if (enabled) b.classList.remove("is-disabled");
    else b.classList.add("is-disabled");
  });
}
function updateDisableState(root) {
  const disabled = buttonsShouldDisable();
  setButtonsEnabled(root, !disabled);
}

async function requestPause(desired) {
  try {
    if (typeof game.togglePause === "function") {
      await game.togglePause(desired);
    } else if (desired !== undefined) {
      if (game.paused !== desired) await game.togglePause?.();
    } else {
      await game.togglePause?.();
    }
  } catch (e) {
    console.warn("[About Time] Unable to toggle pause:", e);
  }
}

function wireBehavior(ctx) {
  const { root, steps, tod, timeEl, playPauseBtn, tinyLink, tinyCombat } = ctx;
  const cleanup = [];

  const close = () => { cleanup.forEach((fn) => { try { fn(); } catch {} }); document.getElementById(PANEL_ID)?.remove(); _visible = false; };
  root.querySelector(".atmp-close")?.addEventListener("click", close);

  const updateTime = () => { if (timeEl?.isConnected) timeEl.textContent = currentTimeLabel(); };
  const hookWT = Hooks.on("updateWorldTime", updateTime); cleanup.push(() => Hooks.off("updateWorldTime", hookWT));
  const tick = setInterval(updateTime, 1000); cleanup.push(() => clearInterval(tick));

  const updateState = () => updateDisableState(root);
  const hookBeh = Hooks.on("about-time.miniBehaviorChanged", updateState); cleanup.push(() => Hooks.off("about-time.miniBehaviorChanged", hookBeh));
  const onPause = () => { updateState(); refreshPlayPause(); }; Hooks.on("pauseGame", onPause); cleanup.push(() => Hooks.off("pauseGame", onPause));
  const hookUC = Hooks.on("updateCombat", () => updateState()); cleanup.push(() => Hooks.off("updateCombat", hookUC));

  // Dim on blur
  let hover = false;
  function applyDim() {
    const dimOnBlur = !!getSetting("miniDimOnBlur", true);
    if (dimOnBlur && !hover) root.classList.add("dimmed"); else root.classList.remove("dimmed");
  }
  const enter = () => { hover = true; applyDim(); };
  const leave = () => { hover = false; setTimeout(applyDim, 200); };
  root.addEventListener("pointerenter", enter); root.addEventListener("pointerleave", leave);
  cleanup.push(() => { root.removeEventListener("pointerenter", enter); root.removeEventListener("pointerleave", leave); });
  const hookDim = Hooks.on("about-time.miniBehaviorChanged", (k) => { if (k === "miniDimOnBlur") applyDim(); });
  cleanup.push(() => Hooks.off("about-time.miniBehaviorChanged", hookDim));

  // Step buttons (GM only)
  if (game.user.isGM) {
    const onStep = async (ev) => {
      if (buttonsShouldDisable()) return;
      const id = ev.currentTarget?.dataset?.id;
      const d = readDurations();
      const s = parseDuration(d[id] || "0");
      if (!s) return;
      const sign = id?.startsWith("rwd") ? -1 : +1;
      await game.time.advance(sign * s);
    };
    steps.querySelectorAll(".atmp-btn").forEach((b) => {
      b.addEventListener("click", onStep);
      b.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onStep(ev); } });
    });
  }

  // Time-of-day buttons (GM only)
  if (game.user.isGM) {
    const onTod = async (ev) => {
      if (buttonsShouldDisable()) return;
      const id = ev.currentTarget?.dataset?.tod;
      const { dawn, dusk } = readTimeOfDay();
      let targetSOD = null;
      if (id === "dawn") targetSOD = hhmmToSecs(dawn);
      else if (id === "noon") targetSOD = 12 * 3600;
      else if (id === "dusk") targetSOD = hhmmToSecs(dusk);
      else if (id === "midnight") targetSOD = 0;
      if (targetSOD == null) return;
      const delta = secondsToNextBoundary(targetSOD);
      if (delta > 0) await game.time.advance(delta);
    };
    tod.querySelectorAll(".atmp-btn").forEach((b) => {
      b.addEventListener("click", onTod);
      b.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onTod(ev); } });
    });
  }

  function refreshPlayPause() {
    playPauseBtn.textContent = game.paused ? "Play" : "Pause";
  }
  refreshPlayPause();

  playPauseBtn.addEventListener("click", async () => {
    const link = !!getSetting("rtLinkPause", true);
    if (game.paused) {
      startRealtime();
      if (link) await requestPause(false);
    } else {
      stopRealtime();
      if (link) await requestPause(true);
    }
    refreshPlayPause();
  });

  // --- Tiny toggles (flip world settings; GM-only makes most sense, but leave clickable for clarity) ---
  const applyTinyState = () => {
    if (getSetting("rtLinkPause", true)) tinyLink.classList.remove("off"); else tinyLink.classList.add("off");
    if (getSetting("rtAutoPauseCombat", true)) tinyCombat.classList.remove("off"); else tinyCombat.classList.add("off");
  };
  async function toggleSetting(key, fallbackBool) {
    const current = !!getSetting(key, fallbackBool);
    try {
      await game.settings.set(MODULE_ID, key, !current);
      Hooks.call("about-time.miniBehaviorChanged", key);
    } catch (e) { console.warn("[About Time] Failed to set", key, e); }
    applyTinyState();
  }
  const onTinyLink   = () => toggleSetting("rtLinkPause", true);
  const onTinyCombat = () => toggleSetting("rtAutoPauseCombat", true);
  tinyLink.addEventListener("click", onTinyLink);
  tinyCombat.addEventListener("click", onTinyCombat);
  tinyLink.addEventListener("keydown",   (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onTinyLink(); } });
  tinyCombat.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onTinyCombat(); } });
  const hookTiny = Hooks.on("about-time.miniBehaviorChanged", (k) => {
    if (k === "rtLinkPause" || k === "rtAutoPauseCombat") applyTinyState();
  });
  cleanup.push(() => Hooks.off("about-time.miniBehaviorChanged", hookTiny));
  applyTinyState();

  // Draggable + initial paint
  cleanup.push(makeDraggable(root));
  function initialPaint() {
    // respect dim-on-blur initial state
    const dimOnBlur = !!getSetting("miniDimOnBlur", true);
    if (dimOnBlur) root.classList.add("dimmed"); // will undim on hover
    updateTime();
    updateState();
  }
  initialPaint();

  return close;
}

// ---------- Public API ----------
export function showMiniPanel() {
  if (_visible) return;
  const ctx = buildPanel();
  _closer = wireBehavior(ctx);
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
