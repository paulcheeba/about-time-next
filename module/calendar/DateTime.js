// calendar/DateTime.js (v13-ready)

import { ElapsedTime } from "../ElapsedTime.js";

let warn = (...args) => {
  if (ElapsedTime.debug) console.warn("about-time | ", ...args);
};
let log = (...args) => {
  console.log("about-time | ", ...args);
};

// Keep the shim so older About Time macros using years/months/... still work.
// Newer SC API uses singular keys: year, month, day, hour, minute, second.
let compatShim = true;

/** Simple Calendar clock status (guarded). */
export function clockStatus() {
  const api = globalThis.SimpleCalendar?.api;
  if (!api) return { started: false, paused: true };
  return api.clockStatus();
}

/** Convert seconds to an interval, then adapt to About Time's legacy shape if compatShim. */
export function secondsToInterval(seconds) {
  const api = globalThis.SimpleCalendar?.api;
  if (!api) return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds };
  // SC returns {year, month, day, hour, minute, second}
  const interval = api.secondsToInterval(seconds);
  return intervalSCtoAT(interval);
}

/** Foundry world time in seconds (authoritative). */
export function currentWorldTime() {
  return game.time.worldTime;
}

/** SC “now” timestamp (guarded). Falls back to Foundry world time. */
export function timestamp() {
  const api = globalThis.SimpleCalendar?.api;
  return api?.timestamp() ?? currentWorldTime();
}

/** Convert an SC/AT-like date object to a timestamp via SC, with shimming. */
export function dateToTimestamp(date) {
  const api = globalThis.SimpleCalendar?.api;
  if (!api) {
    warn("Simple Calendar API not available; dateToTimestamp falling back to worldTime.");
    return currentWorldTime();
  }
  const scDate = intervalATtoSC(date);
  return api.dateToTimestamp(scDate);
}

/**
 * Convert an About Time interval (years/months/... or year/month/...) to
 * Simple Calendar interval shape {year, month, day, hour, minute, second}.
 */
export function intervalATtoSC(interval) {
  const newInterval = {};
  // If user passed plural keys, nudge them and map to singular.
  if (
    interval?.years !== undefined ||
    interval?.months !== undefined ||
    interval?.days !== undefined ||
    interval?.hours !== undefined ||
    interval?.minutes !== undefined ||
    interval?.seconds !== undefined
  ) {
    warn("About Time | DT Mod notation has changed: prefer .year/.month/.day/.hour/.minute/.second");
    warn("About Time | DT Mod is deprecated — prefer SimpleCalendar.api helpers.");
  }

  newInterval.year   = interval?.year   ?? interval?.years   ?? 0;
  newInterval.month  = interval?.month  ?? interval?.months  ?? 0;
  newInterval.day    = interval?.day    ?? interval?.days    ?? 0;
  newInterval.hour   = interval?.hour   ?? interval?.hours   ?? 0;
  newInterval.minute = interval?.minute ?? interval?.minutes ?? 0;
  // SC uses singular 'second'
  newInterval.second = interval?.second ?? interval?.seconds ?? 0;

  return newInterval;
}

/**
 * Convert a Simple Calendar interval {year, month, day, hour, minute, second}
 * to the legacy About Time interval {years, months, days, hours, minutes, seconds}
 * when compatShim is true.
 */
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

/** Pad with leading zeros (utility). */
export function padNumber(n, digits = 2) {
  return `${n}`.padStart(digits, "0");
}
