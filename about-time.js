// about-time.js
// v13.0.6.7-hotfix.4 — settings registration hardening + safe reads + toolbar gating + mini panel enable
// Non-destructive: preserves public API, legacy globals, hooks, and behaviors.

import { registerSettings, MODULE_ID } from './module/settings.js';
import { preloadTemplates } from './module/preloadTemplates.js';
import { ElapsedTime } from './module/ElapsedTime.js';
import { PseudoClock } from './module/PseudoClock.js';
import { DTMod } from './module/calendar/DTMod.js';
import { DTCalc } from './module/calendar/DTCalc.js';

// Mini panel + realtime
import { registerMiniSettings } from './module/ATMiniSettings.js';
import { showMiniPanel, hideMiniPanel, toggleMiniPanel } from './module/ATMiniPanel.js';
import { startRealtime, stopRealtime, isRealtimeRunning, setRealtimeRate } from './module/ATRealtimeClock.js';

// Primary /at commands (legacy)
import './module/ATChat.js';
// Optional legacy toolbar (if present)
try { import('./module/ATToolbar.js'); } catch (e) { /* optional */ }

// ---------------- Utilities ----------------
/** Legacy helper, used by macros */
export function DTNow() { return game.time.worldTime; }

/** Robust setting existence check */
function hasSettingKey(key) {
  try { return game?.settings?.settings?.has?.(`${MODULE_ID}.${key}`) ?? false; }
  catch { return false; }
}

/** Safe getter that never throws; falls back if key is missing */
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

/** Should we show the Time Manager toolbar? World setting, default true */
function isTimeManagerToolbarEnabled() {
  return !!getSettingSafe('enableTimeManagerToolbar', true);
}

// ---------------- Lifecycle ----------------
Hooks.once('init', () => {
  console.log(`${MODULE_ID} | Initializing v13.0.6.7-hotfix.4`);
  // Register core and mini settings at init so any later reads won't crash
  registerSettings();
  registerMiniSettings();
  preloadTemplates().catch(() => { /* ignore */ });
});

let operations;
export const calendars = {};

Hooks.once('setup', () => {
  operations = {
    // status / control
    isMaster: () => PseudoClock.isMaster,
    isRunning: () => PseudoClock.isRunning,

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

    // Mini panel controls
    showMiniPanel, hideMiniPanel, toggleMiniPanel,

    // Realtime helpers (optional for macro authors)
    isRealtimeRunning, startRealtime, stopRealtime, setRealtimeRate
  };

  // Public API + legacy/proxy
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

// Scene controls: add "About Time — Time Manager" tool under Journal/Notes (GM-only)
Hooks.on('getSceneControlButtons', (controls) => {
  try {
    if (!isTimeManagerToolbarEnabled()) return;

    // Prefer journal palette; fall back to notes
    const journal = controls.find(c => c.name === 'journal') || controls.find(c => c.name === 'notes');
    if (!journal) return;

    journal.tools ??= [];
    const exists = journal.tools.some(t => t?.name === 'about-time-manager');
    if (exists) return;

    journal.tools.push({
      name: 'about-time-manager',
      title: 'About Time — Time Manager',
      icon: 'fas fa-clock-rotate-left', // distinct from Event Manager icon
      visible: game.user.isGM,
      onClick: () => toggleMiniPanel(),
      button: true
    });
  } catch (e) {
    console.warn(`${MODULE_ID} | toolbar setup failed`, e);
  }
});

Hooks.once('ready', () => {
  // Initialize core pieces
  PseudoClock.init();
  ElapsedTime.init();

  // Keep AT’s internal runner in sync with Foundry’s pause (if linked)
  Hooks.on("pauseGame", (paused) => {
    try {
      const link = !!getSettingSafe("rtLinkPause", true);
      if (!link) return;
      if (paused) stopRealtime(); else startRealtime();
    } catch (e) {
      console.warn(`${MODULE_ID} | pause sync failed`, e);
    }
  });

  // Combat coupling: auto-pause during combat if enabled
  let _pausedByAT = false;
  let _rtWasRunning = false;

  async function handleCombatStart() {
    const on = !!getSettingSafe("rtAutoPauseCombat", true);
    if (!on) return;
    // Only act when the first combat appears (collection 0 -> 1)
    const count = (game.combats?.size ?? 0);
    if (count !== 1) return;

    _rtWasRunning = isRealtimeRunning();
    _pausedByAT = true;

    // Stop our runner; pause world if linked
    try { stopRealtime(); } catch {}
    try {
      if (getSettingSafe("rtLinkPause", true) && !game.paused) {
        await game.togglePause(true);
      }
    } catch {}
  }

  async function handleCombatEnd() {
    const on = !!getSettingSafe("rtAutoPauseCombat", true);
    if (!on) return;
    // Only act when we just removed the last combat (collection 1 -> 0)
    const count = (game.combats?.size ?? 0);
    if (count !== 0) return;

    if (_pausedByAT) {
      _pausedByAT = false;
      try {
        if (getSettingSafe("rtLinkPause", true) && game.paused) {
          await game.togglePause(false);
        }
      } catch {}
      if (_rtWasRunning) {
        try { startRealtime(); } catch {}
      }
    }
  }

  Hooks.on("createCombat", handleCombatStart);
  Hooks.on("deleteCombat", handleCombatEnd);

  // Show mini panel if enabled (safe read)
  try {
    if (isMiniEnabledForThisUser()) {
      showMiniPanel();
    }
  } catch (e) {
    console.warn(`${MODULE_ID} | enableMiniPanel failed`, e);
  }
});
