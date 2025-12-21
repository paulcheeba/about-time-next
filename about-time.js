// about-time.js — Entry point
// v13.4.0.0 — D&D 5e Calendar integration (native calendar support for D&D 5e v5.2+)

import { registerSettings, MODULE_ID } from './module/settings.js';
import { preloadTemplates } from './module/preloadTemplates.js';
import { ElapsedTime } from './module/ElapsedTime.js';
import { PseudoClock } from './module/PseudoClock.js';
import { DTMod } from './module/calendar/DTMod.js';
import { DTCalc } from './module/calendar/DTCalc.js';

// Calendar Adapter System (v13.3.1.0 - Phase 1)
import { CalendarAdapter } from './module/calendar/CalendarAdapter.js';
import './module/calendar/Dnd5eAdapter.js'; // Self-registers (v13.3.5.0)
import './module/calendar/SimpleCalendarAdapter.js'; // Self-registers
import './module/calendar/SandSAdapter.js'; // Self-registers

// New (modular, non-destructive)
import { registerMiniSettings } from './module/ATMiniSettings.js';
import { showMiniPanel, hideMiniPanel, toggleMiniPanel } from './module/ATMiniPanel.js';
import { startRealtime, stopRealtime, isRealtimeRunning, setRealtimeRate } from './module/ATRealtimeClock.js';
import './module/ATMiniToolbar.js'; // only adds tool when enabled & GM
import { ATNotificationSound } from './module/ATNotificationSound.js'; // v13.2.0.0 - event notifications

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
  registerSettings();
  registerMiniSettings(); // <- new mini settings

  // Always-on basic status line.
  try {
    const version = game.modules.get(MODULE_ID)?.version ?? "unknown";
    console.info(`${MODULE_ID} | Loaded v${version}`);
  } catch {
    // ignore
  }

  const debug = (() => {
    try { return !!game.settings.get(MODULE_ID, "debug"); } catch { return false; }
  })();

  // Expose CalendarAdapter to global namespace for macros and testing
  if (!window.AboutTimeNext) window.AboutTimeNext = {};
  window.AboutTimeNext.CalendarAdapter = CalendarAdapter;
  if (debug) console.log(`${MODULE_ID} | CalendarAdapter available at window.AboutTimeNext.CalendarAdapter`);

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
    pauseEvent: ElapsedTime.pauseEvent,
    resumeEvent: ElapsedTime.resumeEvent,
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
    toggleMiniPanel,

    // Calendar Adapter System (v13.3.1.0)
    CalendarAdapter
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

Hooks.once('ready', async () => {
  // ============================================================================
  // CALENDAR SETTINGS MIGRATION (v13.3.2.0 - Phase 2)
  // ============================================================================
  // Migrate from old use-simple-calendar boolean to new calendar-system string
  if (game.user.isGM) {
    try {
      const currentSystem = game.settings.get(MODULE_ID, "calendar-system");
      const legacySetting = game.settings.get(MODULE_ID, "use-simple-calendar");

      const debug = (() => {
        try { return !!game.settings.get(MODULE_ID, "debug"); } catch { return false; }
      })();

      if (debug) {
        console.log(`${MODULE_ID} | [Migration] Current calendar-system: "${currentSystem}"`);
        console.log(`${MODULE_ID} | [Migration] Legacy use-simple-calendar: ${legacySetting}`);
      }
      
      // Only migrate if still on default "auto" setting (first time setup or upgrade)
      if (currentSystem === "auto") {
        const detected = CalendarAdapter.detectAvailableAsObject();
        if (debug) console.log(`${MODULE_ID} | [Migration] Detected calendars:`, detected);
        
        let newSystem = "auto"; // Keep auto as default
        
        // If user had explicitly disabled SC, respect that
        if (legacySetting === false) {
          newSystem = "none";
          if (debug) console.log(`${MODULE_ID} | [Migration] User had disabled SC → setting to "none"`);
        }
        // If user had SC enabled and it's still available, use it explicitly
        else if (legacySetting === true && detected.simpleCalendar) {
          newSystem = "simple-calendar";
          if (debug) console.log(`${MODULE_ID} | [Migration] SC was enabled and is available → setting to "simple-calendar"`);
        }
        // If SC was enabled but no longer available, check for S&S
        else if (legacySetting === true && !detected.simpleCalendar && detected.seasonsStars) {
          newSystem = "seasons-and-stars";
          if (debug) console.log(`${MODULE_ID} | [Migration] SC unavailable but S&S detected → setting to "seasons-and-stars"`);
        }
        
        // Save migrated setting
        if (newSystem !== "auto") {
          game.settings.set(MODULE_ID, "calendar-system", newSystem);
          if (debug) console.log(`${MODULE_ID} | [Migration] ✓ Migrated calendar-system to: "${newSystem}"`);
          
          // Show one-time notice to GM
          ui.notifications.info(
            `About Time Next: Calendar settings migrated. Now using: ${newSystem.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
            { permanent: false }
          );
        } else {
          if (debug) console.log(`${MODULE_ID} | [Migration] Keeping auto-detect mode`);
        }
      } else {
        const debug = (() => {
          try { return !!game.settings.get(MODULE_ID, "debug"); } catch { return false; }
        })();
        if (debug) console.log(`${MODULE_ID} | [Migration] Already configured, skipping migration`);
      }
    } catch (err) {
      console.error(`${MODULE_ID} | [Migration] Failed:`, err);
    }
  }
  
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  try {
    if (game.settings.get(MODULE_ID, "debug")) {
      if (!game.modules.get("foundryvtt-simple-calendar")?.active) {
        console.warn(`${MODULE_ID} | Simple Calendar not active (optional).`);
      }
    }
  } catch {
    // ignore
  }
  PseudoClock.init();
  ElapsedTime.init();

  // Initialize event notification sound system (v13.2.0.0)
  ATNotificationSound.init();

  // Check for calendar changes (v13.4.0.0)
  // This detects when modules are enabled/disabled and prompts GM to switch calendars
  if (game.user.isGM) {
    try {
      await CalendarAdapter.checkForCalendarChanges();
    } catch (e) {
      console.warn(`${MODULE_ID} | Calendar change check failed (non-fatal)`, e);
    }
  }

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
      if (paused) {
        stopRealtime();
      } else {
        const hasActiveCombat = !!game.combat;
        if (!hasActiveCombat) startRealtime();
      }
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

  /**
   * Reconcile runner state whenever a Combat document updates.
   * This catches start/stop transitions that don't create/delete the doc,
   * and scene switches that change the active combat.
   */
  Hooks.on("updateCombat", (_combat, _changes, _opts, _userId) => {
    try {
      const link = !!getSettingSafe("rtLinkPause", true);
      const hasActiveCombat = !!game.combat;
      if (hasActiveCombat) {
        // Never allow realtime during active combat
        stopRealtime?.();
        return;
      }
      // No active combat: if game is unpaused and link is on, allow realtime
      if (!game.paused && link) {
        startRealtime?.();
      }
    } catch (e) {
      console.warn(`${MODULE_ID} | updateCombat reconcile failed`, e);
    }
  });

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

