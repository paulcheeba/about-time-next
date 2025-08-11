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
export function DTNow() {
  return game.time.worldTime;
}

Hooks.once('init', async () => {
  console.log(`${MODULE_ID} | Initializing`);
  registerSettings();
  // await preloadTemplates(); // enable if/when you use templates in UI
});

let operations;
export const calendars = {};

Hooks.once('setup', () => {
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

    ElapsedTime,
    DTM: DTMod,
    DTC: DTCalc,
    DMf: DTMod.create,
    calendars,
    DTNow,

    _notifyEvent: PseudoClock.notifyEvent,

    startRunning: () => { const api = globalThis.SimpleCalendar?.api; if (api?.startClock) api.startClock(); else console.warn('SC API not available'); },
    stopRunning:  () => { const api = globalThis.SimpleCalendar?.api; if (api?.stopClock)  api.stopClock();  else console.warn('SC API not available'); },

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

    showClock: () => { const api = globalThis.SimpleCalendar?.api; if (api?.showCalendar) api.showCalendar(null, true); else console.warn('SC API not available'); },
    showCalendar: () => { const api = globalThis.SimpleCalendar?.api; if (api?.showCalendar) api.showCalendar(); else console.warn('SC API not available'); },

    async deleteUuid(uuid) {
      const thing = foundry?.utils?.fromUuidSync?.(uuid) ?? globalThis.fromUuidSync?.(uuid);
      if (!thing) return console.warn(`${MODULE_ID} | deleteUuid: could not resolve uuid ${uuid}`);
      if (typeof thing.delete === 'function') await thing.delete();
      else console.warn(`${MODULE_ID} | deleteUuid: resolved object has no delete()`, thing);
    },

    _save: ElapsedTime._save,
    _load: ElapsedTime._load,
  };

  game.abouttime = operations;
  const GametimeHandler = {
    get(target, prop, receiver) {
      console.warn(`${MODULE_ID} | Gametime.${String(prop)} is deprecated. Use abouttime.${String(prop)}.`);
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

// /at chat command: "/at queue", "/at in <seconds> <message>", "/at every <seconds> <message>"
Hooks.on('chatMessage', (log, message, chatData) => {
  if (!message?.trim()?.toLowerCase().startsWith('/at')) return;
  const parts = message.trim().split(/\s+/);
  // /at queue
  if (parts[1] === 'queue') {
    game.abouttime.chatQueue({ showArgs: true, showUid: true, showDate: true, gmOnly: false });
    return false;
  }
  // /at in 5 Hello world
  if (parts[1] === 'in' && !isNaN(Number(parts[2]))) {
    const secs = Number(parts[2]);
    const text = parts.slice(3).join(' ') || `Reminder in ${secs}s`;
    game.abouttime.reminderIn({ seconds: secs }, text);
    ui.notifications?.info?.(`[About Time] scheduled in ${secs}s: ${text}`);
    return false;
  }
  // /at every 10 Ping!
  if (parts[1] === 'every' && !isNaN(Number(parts[2]))) {
    const secs = Number(parts[2]));
    const text = parts.slice(3).join(' ') || `Repeating every ${secs}s`;
    game.abouttime.reminderEvery({ seconds: secs }, text);
    ui.notifications?.info?.(`[About Time] repeating every ${secs}s: ${text}`);
    return false;
  }
  ui.notifications?.warn?.('Usage: /at queue | /at in <seconds> <message> | /at every <seconds> <message>');
  return false;
});

Hooks.once('ready', () => {
  if (!isSCActive()) console.warn(`${MODULE_ID} | Simple Calendar not loaded (optional)`);
  PseudoClock.init();
  ElapsedTime.init();
});
