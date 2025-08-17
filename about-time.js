// about-time.js — Entry point
// v13.0.6.1  (Additive: exposes api.fmtDHMS and a minimal '/at list' alias. No other behavior changed.)

import { registerSettings, MODULE_ID } from './module/settings.js';
import { preloadTemplates } from './module/preloadTemplates.js';
import { ElapsedTime } from './module/ElapsedTime.js';
import { PseudoClock } from './module/PseudoClock.js';
import { DTMod } from './module/calendar/DTMod.js';
import { DTCalc } from './module/calendar/DTCalc.js';

// Side-effect imports (hooks)
import './module/ATChat.js'; // /at chat command
try {
  // Optional toolbar UI (subtool under Journal/Notes via DialogV2 manager)
  import('./module/ATToolbar.js');
} catch (e) {
  /* optional */
}

// Legacy helper, used by macros
export function DTNow() { return game.time.worldTime; }

Hooks.once('init', () => {
  console.log(`${MODULE_ID} | Initializing`);
  registerSettings();

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
    deleteUuid: async (uuid) => {
      const thing = foundry?.utils?.fromUuidSync?.(uuid) ?? globalThis.fromUuidSync?.(uuid);
      if (thing && typeof thing.delete === 'function') await thing.delete();
    },
    _save: ElapsedTime._save,
    _load: ElapsedTime._load
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
});

/* ------------------------------------------------------------------ */
/* v13.0.6.1 additive helpers (non-destructive)
   - Expose api.fmtDHMS(seconds)  → "DD:HH:MM:SS" with zero padding.
   - Provide a minimal '/at list' chat alias that delegates to chatQueue()
     and only consumes that exact message. No other '/at' handling changed.
   - GM-only output behavior remains governed by your existing chatQueue().
--------------------------------------------------------------------- */
Hooks.once('ready', () => {
  try {
    const api = (game.abouttime ?? game.Gametime);
    if (!api) return;

    // Canonical duration formatter: seconds -> DD:HH:MM:SS
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

    // Minimal '/at list' alias → delegates to existing queue printer
    Hooks.on("chatMessage", (_log, content) => {
      try {
        if (typeof content !== "string") return false;
        const msg = content.trim();
        if (!/^\/at\s+list\b/i.test(msg)) return false;

        if (typeof api.chatQueue === "function") {
          api.chatQueue({});   // rely on module's GM-whisper behavior
          return true;         // consume only this message
        }
        return false;
      } catch (e) {
        console.error("[About Time] '/at list' alias failed:", e);
        return false;
      }
    });
  } catch (err) {
    console.error("[About Time] v13.0.6.1 helpers failed to initialize:", err);
  }
});
