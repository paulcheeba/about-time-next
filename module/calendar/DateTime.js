import { MODULE_ID } from "../settings.js";

const warn = (...args) => console.warn(`${MODULE_ID} |`, ...args);

function isSCActive() {
  const useSC = game.settings?.get?.(MODULE_ID, "use-simple-calendar") ?? true;
  if (!useSC) return false;
  const sc = game.modules.get("foundryvtt-simple-calendar") ?? game.modules.get("simple-calendar");
  return !!(sc && sc.active && globalThis.SimpleCalendar?.api);
}

let compatShim = true;

export function clockStatus() {
  if (!isSCActive()) return { started: false, paused: true };
  return globalThis.SimpleCalendar.api.clockStatus();
}

export function secondsToInterval(seconds) {
  if (!isSCActive()) {
    const s = Math.max(0, Number(seconds) || 0);
    const year = 0, month = 0, day = 0;
    const hour = Math.floor((s / 3600) % 24);
    const minute = Math.floor((s / 60) % 60);
    const second = Math.floor(s % 60);
    return intervalSCtoAT({ year, month, day, hour, minute, second });
  }
  const iv = globalThis.SimpleCalendar.api.secondsToInterval(seconds);
  return intervalSCtoAT(iv);
}

export function currentWorldTime() { return game.time.worldTime; }

export function timestamp() {
  return isSCActive()
    ? (globalThis.SimpleCalendar.api.timestamp?.() ?? currentWorldTime())
    : currentWorldTime();
}

export function dateToTimestamp(date) {
  if (!isSCActive()) {
    warn("Simple Calendar API not available; dateToTimestamp falling back to worldTime.");
    return currentWorldTime();
  }
  const scDate = intervalATtoSC(date);
  return globalThis.SimpleCalendar.api.dateToTimestamp(scDate);
}

export function intervalATtoSC(interval) {
  const newInterval = {};
  if (interval?.years !== undefined || interval?.months !== undefined || interval?.days !== undefined || interval?.hours !== undefined || interval?.minutes !== undefined || interval?.seconds !== undefined) {
    warn("DT Mod notation changed: prefer .year/.month/.day/.hour/.minute/.second");
  }
  newInterval.year   = interval?.year   ?? interval?.years   ?? 0;
  newInterval.month  = interval?.month  ?? interval?.months  ?? 0;
  newInterval.day    = interval?.day    ?? interval?.days    ?? 0;
  newInterval.hour   = interval?.hour   ?? interval?.hours   ?? 0;
  newInterval.minute = interval?.minute ?? interval?.minutes ?? 0;
  newInterval.second = interval?.second ?? interval?.seconds ?? 0;
  return newInterval;
}

export function intervalSCtoAT(interval) {
  if (!compatShim) return { ...interval };
  return {
    years:   interval?.year   ?? interval?.years   ?? 0,
    months:  interval?.month  ?? interval?.months  ?? 0,
    days:    interval?.day    ?? interval?.days    ?? 0,
    hours:   interval?.hour   ?? interval?.hours   ?? 0,
    minutes: interval?.minute ?? interval?.minutes ?? 0,
    seconds: interval?.second ?? interval?.seconds ?? 0
  };
}

export function padNumber(n, digits = 2) { return `${n}`.padStart(digits, "0"); }
