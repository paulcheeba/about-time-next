// About Time v13.0.5 — main entry (v13+ safe, SC optional)

import { registerSettings } from "./module/settings.js";
import { ElapsedTime } from "./module/ElapsedTime.js";
import { PseudoClock } from "./module/PseudoClock.js";
import { DTMod } from "./module/calendar/DTMod.js";
import { DTCalc } from "./module/calendar/DTCalc.js";
import "./module/ATChat.js";

const MODULE_ID = "about-time-v13";

// Helper for legacy DTNow()
export function DTNow() {
  return game.time.worldTime;
}

Hooks.once("init", async () => {
  console.log(`${MODULE_ID} | Initializing`);
  registerSettings();
});

let operations;
export let calendars = {}; // legacy stub

Hooks.once("setup", () => {
  operations = {
    // state
    isMaster: () => PseudoClock.isMaster,
    isRunning: PseudoClock.isRunning,

    // scheduling
    doAt: ElapsedTime.doAt,
    doIn: ElapsedTime.doIn,
    doEvery: ElapsedTime.doEvery,
    doAtEvery: ElapsedTime.doAtEvery,

    // convenience
    reminderAt: ElapsedTime.reminderAt,
    reminderIn: ElapsedTime.reminderIn,
    reminderEvery: ElapsedTime.reminderEvery,
    reminderAtEvery: ElapsedTime.reminderAtEvery,

    // hooks
    notifyAt: ElapsedTime.notifyAt,
    notifyIn: ElapsedTime.notifyIn,
    notifyEvery: ElapsedTime.notifyEvery,
    notifyAtEvery: ElapsedTime.notifyAtEvery,

    // utils
    clearTimeout: ElapsedTime.gclearTimeout,
    getTimeString: ElapsedTime.currentTimeString,
    getTime: ElapsedTime.currentTimeString,
    queue: ElapsedTime.showQueue,
    chatQueue: ElapsedTime.chatQueue,

    // classes
    ElapsedTime,
    DTM: DTMod,
    DTC: DTCalc,
    DMf: DTMod.create,
    calendars,
    DTNow,

    // deprecated passthroughs (soft)
    _notifyEvent: PseudoClock.notifyEvent,
    advanceClock: ElapsedTime.advanceClock,
    advanceTime: ElapsedTime.advanceTime,
    setTime: ElapsedTime.setTime,
    setAbsolute: ElapsedTime.setAbsolute,
    setDateTime: ElapsedTime.setDateTime,

    // persistence
    _save: ElapsedTime._save,
    _load: ElapsedTime._load
  };

  // Back-compat shims
  // Preferred:
  //   game.abouttime
  // Deprecated but kept:
  //   game.Gametime, window.Gametime, window.abouttime
  // Add warning proxy for Gametime refs.
  const warnProxy = {
    get(t, p, r) {
      console.warn(`${MODULE_ID} | game.Gametime.${String(p)} is deprecated. Use game.abouttime.${String(p)}.`);
      return Reflect.get(t, p, r);
    }
  };

  // @ts-ignore
  game.abouttime = operations;
  // @ts-ignore
  game.Gametime = new Proxy(operations, warnProxy);
  // @ts-ignore
  window.abouttime = operations;
  // @ts-ignore
  window.Gametime = new Proxy(operations, warnProxy);
});

Hooks.once("ready", () => {
  if (!game.user) return;
  if (!game.modules.get("foundryvtt-simple-calendar")?.active && game.settings.get(MODULE_ID, "use-simple-calendar")) {
    console.warn(`${MODULE_ID} | Simple Calendar setting is ON but module is not active.`);
  }
  PseudoClock.init();
  ElapsedTime.init();
});
