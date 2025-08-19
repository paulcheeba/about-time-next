// about-time.js
// v13.0.6.7 — Wires real-time Play/Pause to pauseGame and combat lifecycle; exposes tiny realtime helpers.

import { registerSettings, MODULE_ID } from './module/settings.js';
import { preloadTemplates } from './module/preloadTemplates.js';
import { ElapsedTime } from './module/ElapsedTime.js';
import { PseudoClock } from './module/PseudoClock.js';
import { DTMod } from './module/calendar/DTMod.js';
import { DTCalc } from './module/calendar/DTCalc.js';

import { registerMiniSettings } from './module/ATMiniSettings.js';
import { showMiniPanel, hideMiniPanel, toggleMiniPanel } from './module/ATMiniPanel.js';
import { startRealtime, stopRealtime, isRealtimeRunning, setRealtimeRate } from './module/ATRealtimeClock.js';

// Primary /at commands (legacy)
import './module/ATChat.js';
// Optional legacy toolbar (if present)
try { import('./module/ATToolbar.js'); } catch (e) { /* optional */ }
// If you have ATChatAdvance in your tree, it will continue to work with client Dawn/Dusk settings.
// try { import('./module/ATChatAdvance.js'); } catch (e) { /* optional */ }

// Legacy helper, used by macros
export function DTNow() { return game.time.worldTime; }

Hooks.once('init', () => {
  console.log(`${MODULE_ID} | Initializing v13.0.6.5-RT`);
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

Hooks.once('ready', () => {
  // Initialize core pieces
  PseudoClock.init();
  ElapsedTime.init();

  // Keep AT’s internal scheduler in sync with Foundry’s pause (if linked)
  Hooks.on("pauseGame", (paused) => {
    try {
      const link = !!game.settings.get(MODULE_ID, "rtLinkPause");
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
    const on = !!game.settings.get(MODULE_ID, "rtAutoPauseCombat");
    if (!on) return;
    // Only act when the first combat appears (collection 0 -> 1)
    const count = (game.combats?.size ?? 0);
    if (count !== 1) return;

    _rtWasRunning = isRealtimeRunning();
    _pausedByAT = true;

    // Stop our runner; pause world if linked
    try { stopRealtime(); } catch {}
    try {
      if (game.settings.get(MODULE_ID, "rtLinkPause") && !game.paused) {
        await game.togglePause(true);
      }
    } catch {}
  }

  async function handleCombatEnd() {
    const on = !!game.settings.get(MODULE_ID, "rtAutoPauseCombat");
    if (!on) return;
    // Only act when we just removed the last combat (collection 1 -> 0)
    const count = (game.combats?.size ?? 0);
    if (count !== 0) return;

    if (_pausedByAT) {
      _pausedByAT = false;
      try {
        if (game.settings.get(MODULE_ID, "rtLinkPause") && game.paused) {
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

  // Show mini panel if enabled
  try {
    if (game.settings.get(MODULE_ID, "enableMiniPanel")) {
      showMiniPanel();
    }
  } catch (e) {
    console.warn(`${MODULE_ID} | enableMiniPanel failed`, e);
  }
});
