// about-time.js
// About Time v13.0.1 entrypoint (SC optional, FVTT v13+)

import { registerSettings, MODULE_ID } from './module/settings.js';
import { preloadTemplates } from './module/preloadTemplates.js';
import { ElapsedTime } from './module/ElapsedTime.js';
import { PseudoClock } from './module/PseudoClock.js';
import { DTMod } from './module/calendar/DTMod.js';
import { DTCalc } from './module/calendar/DTCalc.js';

function isSCActive() {
  const useSC = game.settings?.get?.(MODULE_ID, 'use-simple-calendar') ?? true;
  if (!useSC) return false;
  const sc = game.modules.get('foundryvtt-simple-calendar') ?? game.modules.get('simple-calendar');
  return !!(sc && sc.active && globalThis.SimpleCalendar?.api);
}

export let simpleCalendar;

/** Authoritative world time (seconds). */
export function DTNow() {
  return game.time.worldTime;
}

/* ------------------------------------ */
/* Init                                 */
/* ------------------------------------ */
Hooks.once('init', async () => {
  console.log(`${MODULE_ID} | Initializing`);
  registerSettings();
  // await preloadTemplates(); // enable when UI needs templates
});

let operations;
export const calendars = {};

/* ------------------------------------ */
/* Setup                                */
/* ------------------------------------ */
Hooks.once('setup', () => {
  operations = {
    // State
    isMaster: () => PseudoClock.isMaster,
    isRunning: PseudoClock.isRunning,

    // Scheduling
    doAt: ElapsedTime.doAt,
    doIn: ElapsedTime.doIn,
    doEvery: ElapsedTime.doEvery,
    doAtEvery: ElapsedTime.doAtEvery,

    // Reminders
    reminderAt: ElapsedTime.reminderAt,
    reminderIn: ElapsedTime.reminderIn,
    reminderEvery: ElapsedTime.reminderEvery,
    reminderAtEvery: ElapsedTime.reminderAtEvery,

    // Notifications (hooks)
    notifyAt: ElapsedTime.notifyAt,
    notifyIn: ElapsedTime.notifyIn,
    notifyEvery: ElapsedTime.notifyEvery,
    notifyAtEvery: ElapsedTime.notifyAtEvery,

    // Queue management
    clearTimeout: ElapsedTime.gclearTimeout,
    getTimeString: ElapsedTime.currentTimeString,
    getTime: ElapsedTime.currentTimeString,
    queue: ElapsedTime.showQueue,
    chatQueue: ElapsedTime.chatQueue,
    flushQueue: ElapsedTime._flushQueue,
    reset: ElapsedTime._initialize,
    status: ElapsedTime.status,

    // Classes
    ElapsedTime,
    DTM: DTMod,
    DTC: DTCalc,
    DMf: DTMod.create,
    calendars,
    DTNow,

    // Internals
    _notifyEvent: PseudoClock.notifyEvent,
    mutiny: PseudoClock.mutiny,
    advanceClock: ElapsedTime.advanceClock, // deprecated
    advanceTime: ElapsedTime.advanceTime,   // deprecated
    setClock: PseudoClock.setClock,         // deprecated
    setTime: ElapsedTime.setTime,           // deprecated
    setAbsolute: ElapsedTime.setAbsolute,   // deprecated
    setDateTime: ElapsedTime.setDateTime,   // deprecated
    _save: ElapsedTime._save,
    _load: ElapsedTime._load,

    // SC helpers (soft integration)
    startRunning: () => {
      const api = globalThis.SimpleCalendar?.api;
      if (api?.startClock) api.startClock();
      else console.warn(`${MODULE_ID} | Simple Calendar API not available`);
    },
    stopRunning: () => {
      const api = globalThis.SimpleCalendar?.api;
      if (api?.stopClock) api.stopClock();
      else console.warn(`${MODULE_ID} | Simple Calendar API not available`);
    },
    showClock: () => {
      const api = globalThis.SimpleCalendar?.api;
      if (api?.showCalendar) api.showCalendar(null, true);
      else console.warn(`${MODULE_ID} | Simple Calendar API not available`);
    },
    showCalendar: () => {
      const api = globalThis.SimpleCalendar?.api;
      if (api?.showCalendar) api.showCalendar();
      else console.warn(`${MODULE_ID} | Simple Calendar API not available`);
    },

    /** Delete by UUID (v13-safe). */
    async deleteUuid(uuid) {
      const thing = foundry?.utils?.fromUuidSync?.(uuid) ?? globalThis.fromUuidSync?.(uuid);
      if (!thing) return console.warn(`${MODULE_ID} | deleteUuid: could not resolve uuid ${uuid}`);
      if (typeof thing.delete === 'function') await thing.delete();
      else console.warn(`${MODULE_ID} | deleteUuid: resolved object has no delete()`, thing);
    }
  };

  game.abouttime = operations;

  // Legacy proxies with warning
  const GametimeHandler = {
    get(target, prop, receiver) {
      console.warn(`${MODULE_ID} | game.Gametime.${String(prop)} is deprecated. Use game.abouttime.${String(prop)}.`);
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
/* /at chat command                     */
/* ------------------------------------ */

/** Parse mixed durations: "1h30m", "2d 4h 10m", "45m10s", or plain "90". */
function parseMixedDuration(input) {
  if (!input || typeof input !== 'string') return 0;
  const cleaned = input.trim();
  if (/^\d+$/.test(cleaned)) return Number(cleaned);
  const regex = /(\d+)\s*(d|h|m|s)?/gi;
  let total = 0, m;
  while ((m = regex.exec(cleaned)) !== null) {
    const val = Number(m[1]);
    const unit = (m[2] || 's').toLowerCase();
    switch (unit) {
      case 'd': total += val * 86400; break;
      case 'h': total += val * 3600; break;
      case 'm': total += val * 60; break;
      case 's': default: total += val; break;
    }
  }
  return total;
}

Hooks.on('chatMessage', (log, message /*, chatData */) => {
  if (!message?.trim()?.toLowerCase().startsWith('/at')) return;
  const parts = message.trim().split(/\s+/);
  const sub = (parts[1] || '').toLowerCase();

  // /at queue
  if (sub === 'queue' || sub === 'list') {
    game.abouttime.chatQueue({ showArgs: true, showUid: true, showDate: true, gmOnly: false });
    return false;
  }

  // /at clear
  if (sub === 'clear') {
    game.abouttime.flushQueue();
    ui.notifications?.info?.('[About Time] queue cleared');
    return false;
  }

  // /at stop <uid>
  if (sub === 'stop' && parts[2]) {
    const uid = parts[2];
    const removed = game.abouttime.clearTimeout(uid);
    if (removed) {
      ui.notifications?.info?.(`[About Time] cancelled ${uid}`);
      ChatMessage.create({ content: `[About Time] Cancelled event ${uid}` });
    } else {
      ui.notifications?.warn?.(`[About Time] no event with uid ${uid}`);
    }
    return false;
  }

  // /at in <duration> <message>
  if (sub === 'in' && parts[2]) {
    const seconds = parseMixedDuration(parts[2]);
    const text = parts.slice(3).join(' ') || `Reminder in ${seconds}s`;
    if (!seconds || seconds < 0) {
      ui.notifications?.warn?.('Usage: /at in <duration> <message>. Example: /at in 1h30m Take a break');
      return false;
    }
    game.abouttime.reminderIn({ seconds }, text);
    ui.notifications?.info?.(`[About Time] scheduled in ${seconds}s: ${text}`);
    return false;
  }

  // /at every <duration> <message>
  if (sub === 'every' && parts[2]) {
    const seconds = parseMixedDuration(parts[2]);
    const text = parts.slice(3).join(' ') || `Repeating every ${seconds}s`;
    if (!seconds || seconds < 0) {
      ui.notifications?.warn?.('Usage: /at every <duration> <message>. Example: /at every 30s Heartbeat');
      return false;
    }
    game.abouttime.reminderEvery({ seconds }, text);
    ui.notifications?.info?.(`[About Time] repeating every ${seconds}s: ${text}`);
    return false;
  }

  ui.notifications?.warn?.(
    'Usage: /at queue | /at clear | /at stop <uid> | /at in <duration> <message> | /at every <duration> <message>\n' +
    'Examples: /at in 10m Check the stew | /at every 1h Random Encounter | /at stop abc123'
  );
  return false;
});

/* ------------------------------------ */
/* Ready                                */
/* ------------------------------------ */
Hooks.once('ready', () => {
  if (!isSCActive()) console.warn(`${MODULE_ID} | Simple Calendar not loaded (optional)`);
  PseudoClock.init();
  ElapsedTime.init();
});
