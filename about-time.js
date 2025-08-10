/**
 * about-time.ts — Main entry point for the About Time module (v13 compatible)
 *
 * Updates for Foundry VTT v13:
 * - Prefer `foundry.utils.fromUuidSync` over global `fromUuidSync` to avoid deprecation warnings.
 * - Guard access to `SimpleCalendar` and other globals so module doesn’t throw if dependencies aren’t loaded.
 * - Added async-safe `deleteUuid` wrapper since Document.delete() is asynchronous.
 * - Left legacy global shims (window.abouttime, window.Gametime, game.Gametime) for backwards compatibility
 *   but note: these should be updated in consuming code.
 */

import { registerSettings } from './module/settings';
import { preloadTemplates } from './module/preloadTemplates';
import { ElapsedTime } from './module/ElapsedTime';
import { PseudoClock } from './module/PseudoClock';
import { DTMod } from './module/calendar/DTMod';
import { DTCalc } from './module/calendar/DTCalc';

// This is likely provided by Simple Calendar or Luxon; leaving as-is.
export var simpleCalendar;

/**
 * Returns the current in-game DateTime object.
 * NOTE: If Simple Calendar is not active, this may throw.
 */
export function DTNow() {
  // @ts-ignore - DateTime likely provided by Simple Calendar or Luxon
  return DateTime.createFromSeconds(game.time.worldTime);
}

/* ------------------------------------ */
/* Initialize module                    */
/* ------------------------------------ */
Hooks.once('init', async function () {
  console.log('about-time | Initializing about-time');

  // Register module settings
  registerSettings();

  // Optionally preload Handlebars templates
  // await preloadTemplates();
});

let operations;
export var calendars = {};

/* ------------------------------------ */
/* Setup module                         */
/* ------------------------------------ */
Hooks.once('setup', function () {
  operations = {
    isMaster: () => PseudoClock.isMaster,
    isRunning: PseudoClock.isRunning,
    doAt: ElapsedTime.doAt,
    doIn: ElapsedTime.doIn,
    doEvery: ElapsedTime.doEvery,
    doAtEvery: ElapsedTime.doAtEvery,
    reminderAt: ElapsedTime.reminderAt,
    reminderIn: ElapsedTime.reminderIn,
    reminderEvery: ElapsedTime.reminderEvery,
    reminderAtEvery: ElapsedTime.reminderAtEvery,
    notifyAt: ElapsedTime.notifyAt,
    notifyIn: ElapsedTime.notifyIn,
    notifyEvery: ElapsedTime.notifyEvery,
    notifyAtEvery: ElapsedTime.notifyAtEvery,
    clearTimeout: ElapsedTime.gclearTimeout,
    getTimeString: ElapsedTime.currentTimeString,
    getTime: ElapsedTime.currentTimeString,
    queue: ElapsedTime.showQueue,
    chatQueue: ElapsedTime.chatQueue,
    ElapsedTime: ElapsedTime,
    DTM: DTMod,
    DTC: DTCalc,
    DMf: DTMod.create,
    calendars: calendars,
	DTNow, // expose the helper so macros and vars.js can read it directly
    _notifyEvent: PseudoClock.notifyEvent,
    startRunning: () => {
      if (ElapsedTime.debug) console.error("about-time | startRunning deprecated, use SimpleCalendar.api.startClock()");
      // Safer access: avoid exception if Simple Calendar isn't loaded
      (globalThis.SimpleCalendar?.api?.startClock) ? globalThis.SimpleCalendar.api.startClock() : console.warn("Simple Calendar API not available");
    },
    stopRunning: () => {
      if (ElapsedTime.debug) console.error("about-time | stopRunning not supported, use SimpleCalendar.api.stopClock()");
      (globalThis.SimpleCalendar?.api?.stopClock) ? globalThis.SimpleCalendar.api.stopClock() : console.warn("Simple Calendar API not available");
    },
    mutiny: PseudoClock.mutiny,
    advanceClock: ElapsedTime.advanceClock,
    advanceTime: ElapsedTime.advanceTime,
    setClock: PseudoClock.setClock,
    setTime: ElapsedTime.setTime,
    setAbsolute: ElapsedTime.setAbsolute,
    setDateTime: ElapsedTime.setDateTime,
    flushQueue: ElapsedTime._flushQueue,
    reset: ElapsedTime._initialize,
    resetCombats: () => console.error("about-time | not supported"),
    status: ElapsedTime.status,
    pc: PseudoClock,
    showClock: () => {
      // Safer global access — avoid exception if SC not loaded
      globalThis.SimpleCalendar?.api?.showCalendar?.(null, true) ?? console.warn("Simple Calendar API not available");
    },
    showCalendar: () => {
      globalThis.SimpleCalendar?.api?.showCalendar?.() ?? console.warn("Simple Calendar API not available");
    },
    CountDown: () => console.error("about-time | not currently supported"),
    RealTimeCountDown: () => console.error("about-time | not currently supported"),

    /**
     * Delete a Document by UUID.
     * v13-compatible: prefer foundry.utils.fromUuidSync, guard for missing delete method, make async.
     */
    deleteUuid: async (uuid: string) => {
      // Try v13 preferred method first
      // @ts-ignore
      const thing = foundry?.utils?.fromUuidSync?.(uuid) ?? (globalThis as any).fromUuidSync?.(uuid);
      if (!thing) {
        console.warn(`about-time | deleteUuid: could not resolve uuid ${uuid}`);
        return;
      }
      if (typeof thing.delete === 'function') {
        await thing.delete();
      } else {
        console.warn("about-time | deleteUuid: resolved object has no delete() method", thing);
      }
    },

    _save: ElapsedTime._save,
    _load: ElapsedTime._load,
  };

  // Attach to game.* for backwards compatibility
  // These proxies are deprecated — keep for now to avoid breaking other modules/macros
  // but emit warnings to encourage migration to game.abouttime.*
  // @ts-ignore
  game.abouttime = operations;
  const GametimeHandler = {
    get(target, prop, receiver) {
      console.warn(`about-time | Gametime.${String(prop)} has been renamed to abouttime.${String(prop)} and will be removed in a future version. Please update your code.`);
      return Reflect.get(target, prop, receiver);
    }
  };
  // @ts-ignore
  game.Gametime = new Proxy(operations, GametimeHandler);
  // @ts-ignore
  window.abouttime = operations;
  // @ts-ignore
  window.Gametime = new Proxy(operations, GametimeHandler);
});

/* ------------------------------------ */
/* When ready                           */
/* ------------------------------------ */
Hooks.once('ready', function () {
  // Warn if Simple Calendar not loaded
  if (!game.modules.get("foundryvtt-simple-calendar")?.active) {
    console.warn("about-time | Simple Calendar not loaded");
  }

  // Initialize clocks
  PseudoClock.init();
  ElapsedTime.init();
});
