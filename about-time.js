// about-time.js — Entry point
+// v13.1.1.0  (Add: Mini Time Manager settings, panel API, toolbar tool; keep 13.0.6.1 helpers)

import { registerSettings, MODULE_ID } from './module/settings.js';
import { preloadTemplates } from './module/preloadTemplates.js';
import { ElapsedTime } from './module/ElapsedTime.js';
import { PseudoClock } from './module/PseudoClock.js';
import { DTMod } from './module/calendar/DTMod.js';
import { DTCalc } from './module/calendar/DTCalc.js';

// New (modular, non-destructive)
import { registerMiniSettings } from './module/ATMiniSettings.js';
import { showMiniPanel, hideMiniPanel, toggleMiniPanel } from './module/ATMiniPanel.js';
import { startRealtime, stopRealtime, isRealtimeRunning, setRealtimeRate } from './module/ATRealtimeClock.js';
import './module/ATMiniToolbar.js'; // only adds tool when enabled & GM

// Side-effect imports (existing)
import './module/ATChat.js'; // /at chat command

// --- Safe settings helpers (merged for v13.0.7) ---
function hasSettingKey(key) {
  try { return game?.settings?.settings?.has?.(`${MODULE_ID}.${key}`) ?? false; }
  catch { return false; }
}
function getSettingSafe(key, fallback) {
  try {
    if (!hasSettingKey(key)) return fallback;
    return game.settings.get(MODULE_ID, key);
  } catch {
    return fallback;
  }
}
/** Mini panel enabled? Prefer new key, fall back to legacy alias. Default: true */
function isMiniEnabledForThisUser() {
  const v = getSettingSafe('miniEnableClient', undefined);
  if (typeof v === 'boolean') return v;
  return !!getSettingSafe('enableMiniPanel', true); // legacy alias (hidden) provided by ATMiniSettings
}


try { import('./module/ATToolbar.js'); } catch (e) { /* optional */ }

// Legacy helper, used by macros
export function DTNow() { return game.time.worldTime; }

Hooks.once('init', () => {
  console.log(`${MODULE_ID} | Initializing`);
  registerSettings();
  registerMiniSettings(); // <- new mini settings

  // Optionally preload (only real template path is loaded)
  preloadTemplates().catch(() => { /* ignore */ });
});

let operations;
export const calendars = {};

Hooks.once('setup', () => {
  operations = {
    // status / control
    isMaster: () => PseudoClock.isMaster,
    isRunning: PseudoClock.isRunning,

    // schedule API
    doAt: ElapsedTime.doAt,
    doIn: ElapsedTime.doIn,
    doEvery: ElapsedTime.doEvery,
    doAtEvery: ElapsedTime.doAtEvery,

    // reminders
    reminderAt: ElapsedTime.reminderAt,
    reminderIn: ElapsedTime.reminderIn,
    reminderEvery: ElapsedTime.reminderEvery,
    reminderAtEvery: ElapsedTime.reminderAtEvery,

    // notifications (hooks)
    notifyAt: ElapsedTime.notifyAt,
    notifyIn: ElapsedTime.notifyIn,
    notifyEvery: ElapsedTime.notifyEvery,
    notifyAtEvery: ElapsedTime.notifyAtEvery,

    // queue admin
    clearTimeout: ElapsedTime.gclearTimeout,
    getTimeString: ElapsedTime.currentTimeString,
    getTime: ElapsedTime.currentTimeString,
    queue: ElapsedTime.showQueue,
    chatQueue: ElapsedTime.chatQueue,

    // exposed classes + legacy
    ElapsedTime,
    DTM: DTMod,
    DTC: DTCalc,
    DMf: DTMod.create,
    calendars,
    DTNow,

    // internals
    _notifyEvent: PseudoClock.notifyEvent,
    startRunning: () => globalThis.SimpleCalendar?.api?.startClock?.(),
    stopRunning: () => globalThis.SimpleCalendar?.api?.stopClock?.(),
    mutiny: PseudoClock.mutiny,
    advanceClock: ElapsedTime.advanceClock,
    advanceTime: ElapsedTime.advanceTime,
    setClock: PseudoClock.setClock,
    setTime: ElapsedTime.setTime,
    setAbsolute: ElapsedTime.setAbsolute,
    setDateTime: ElapsedTime.setDateTime,
    flushQueue: ElapsedTime._flushQueue,
    reset: ElapsedTime._initialize,
    resetCombats: () => console.error(`${MODULE_ID} | not supported`),
    status: ElapsedTime.status,
    pc: PseudoClock,
    showClock: () => globalThis.SimpleCalendar?.api?.showCalendar?.(null, true),
    showCalendar: () => globalThis.SimpleCalendar?.api?.showCalendar?.(),

    // New: Mini Time Panel controls
    showMiniPanel,
    hideMiniPanel,
    toggleMiniPanel
  };

  // Legacy/global shims
  // @ts-ignore
  game.abouttime = operations;

  const warnProxy = {
    get(target, prop, receiver) {
      console.warn(`${MODULE_ID} | Gametime.${String(prop)} is deprecated.\nUse game.abouttime.${String(prop)}.`);
      return Reflect.get(target, prop, receiver);
    }
  };

  // @ts-ignore
  game.Gametime = new Proxy(operations, warnProxy);
  // @ts-ignore
  globalThis.abouttime = operations;
  // @ts-ignore
  globalThis.Gametime = new Proxy(operations, warnProxy);
});

Hooks.once('ready', () => {
  if (!game.modules.get("foundryvtt-simple-calendar")?.active) {
    console.warn(`${MODULE_ID} | Simple Calendar not active (optional).`);
  }
  PseudoClock.init();
  ElapsedTime.init();

  // Auto-open the mini panel per user setting
  try {
    if (game.settings.get(MODULE_ID, "enableMiniPanel")) {
      showMiniPanel();
    }
  } catch (e) {
    console.warn(`${MODULE_ID} | enableMiniPanel read failed`, e);
  }
});

/* ------------------------------------------------------------------ */
/* v13.0.6.1 additive helpers (non-destructive) — kept from previous
   - api.fmtDHMS(seconds) → "DD:HH:MM:SS"
   - minimal '/at list' alias → delegates to chatQueue()
--------------------------------------------------------------------- */
Hooks.once('ready', () => {
  try {
    const api = (game.abouttime ?? game.Gametime);
    if (!api) return;

    if (typeof api.fmtDHMS !== "function") {
      api.fmtDHMS = function fmtDHMS(seconds) {
        const s = Math.trunc(Number(seconds) || 0);
        const sign = s < 0 ? "-" : "";
        const abs = Math.abs(s);
        const dd = Math.floor(abs / 86400);
        const hh = Math.floor((abs % 86400) / 3600);
        const mm = Math.floor((abs % 3600) / 60);
        const ss = abs % 60;
        const pad = (n) => String(n).padStart(2, "0");
        return `${sign}${pad(dd)}:${pad(hh)}:${pad(mm)}:${pad(ss)}`;
      };
    }
// Removed in v13.0.8-dev: redundant "/at list" alias lived here and was breaking normal chat.
  } catch (err) {
    console.error("[About Time] v13.0.6.1 helpers failed to initialize:", err);
  }
});

// --- Pause/Combat coupling (merged from 13.0.6.7.4) ---
Hooks.once('ready', () => {
  // Keep AT’s internal runner in sync with Foundry’s pause (if linked)
  Hooks.on("pauseGame", (paused) => {
    try {
      const link = !!getSettingSafe("rtLinkPause", true);
      if (!link) return;
      if (paused) stopRealtime(); else { const hasCombat = (game.combats?.size ?? 0) > 0; if (!hasCombat) startRealtime(); }
    } catch (e) {
      console.warn(`${MODULE_ID} | pause sync failed`, e);
    }
  });

  // Combat coupling: auto-pause during combat if enabled
  let _pausedByAT = false;
  let _rtWasRunning = false;

  async function handleCombatStart() {
    // Only act when the first combat appears (collection 0 -> 1)
    const count = (game.combats?.size ?? 0);
    if (count !== 1) return;

    // Always stop realtime during combat
    try { stopRealtime?.(); } catch {}

    // Optionally auto-pause the game UI at combat start
    const on = !!getSettingSafe("rtAutoPauseCombat", true);
    if (on) {
      try { if (!game.paused) { await game.togglePause(true); } } catch {}
    }

    // Flags kept for compatibility (no auto-resume at end)
    _rtWasRunning = isRealtimeRunning?.() ?? false;
    _pausedByAT = !!on;
  }

  async function handleCombatEnd() {
    // Only act when we just removed the last combat (collection 1 -> 0)
    const count = (game.combats?.size ?? 0);
    if (count !== 0) return;

    // Optionally auto-pause the game UI at combat end
    const on = !!getSettingSafe("rtAutoPauseCombat", true);
    if (on) {
      try { if (!game.paused) { await game.togglePause(true); } } catch {}
    }

    // Do not auto-start realtime or unpause UI here
    _pausedByAT = false;
    _rtWasRunning = false;
  }

  Hooks.on("createCombat", handleCombatStart);
  Hooks.on("deleteCombat", handleCombatEnd);

  // Show mini panel if enabled
  try {
    if (isMiniEnabledForThisUser()) {
      showMiniPanel();
    }
  } catch (e) {
    console.warn(`${MODULE_ID} | enableMiniPanel failed`, e);
  }
});

