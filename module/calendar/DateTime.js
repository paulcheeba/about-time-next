// About Time v13 — DateTime helpers (v13.0.7.3+)
// Accept plural/singular/short interval keys; provide seconds conversion
// and keep SC integration intact.

import { ElapsedTime } from "../ElapsedTime.js";
const warn = (...a) => ElapsedTime.debug && console.warn("about-time |", ...a);

export function clockStatus() {
  const api = globalThis.SimpleCalendar?.api;
  if (!api) return { started: false, paused: true };
  return api.clockStatus();
}

export function secondsToInterval(seconds) {
  const api = globalThis.SimpleCalendar?.api;
  if (!api) return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds };
  return intervalSCtoAT(api.secondsToInterval(seconds));
}

export function currentWorldTime() { return game.time.worldTime; }
export function timestamp() { return globalThis.SimpleCalendar?.api?.timestamp?.() ?? currentWorldTime(); }

export function dateToTimestamp(date) {
  const api = globalThis.SimpleCalendar?.api;
  if (!api) {
    warn("Simple Calendar API not available; dateToTimestamp fallback.");
    return currentWorldTime();
  }
  const scDate = intervalATtoSC(date);
  return api.dateToTimestamp(scDate);
}

/** Normalize AT-style interval objects to singular keys SC expects. */
export function normalizeATInterval(raw) {
  if (raw == null) return {};
  if (typeof raw === "number") return { second: raw };  // already seconds
  const map = {
    years: "year", year: "year", yr: "year",
    months: "month", month: "month", mo: "month",
    days: "day", day: "day", d: "day",
    hours: "hour", hour: "hour", h: "hour",
    minutes: "minute", minute: "minute", min: "minute", m: "minute",
    seconds: "second", second: "second", sec: "second", s: "second",
  };
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = map[k] || k;
    const num = Number(v) || 0;
    if (!num) continue;
    out[key] = (out[key] || 0) + num;
  }
  return out;
}

/** Convert a (possibly plural) interval object to seconds (conservative month/year). */
export function secondsFromATInterval(raw) {
  const iv = normalizeATInterval(raw);
  const toSec = (n) => Math.trunc(Number(n) || 0);
  let s = 0;
  s += toSec(iv.year)   * 365 * 24 * 3600;   // conservative; SC calendars may vary
  s += toSec(iv.month)  * 30  * 24 * 3600;   // conservative
  s += toSec(iv.day)    * 24 * 3600;
  s += toSec(iv.hour)   * 3600;
  s += toSec(iv.minute) * 60;
  s += toSec(iv.second);
  return s;
}

/**
 * Convert an About Time interval to the Simple Calendar shape.
 * (Now tolerant of plural keys; no warning needed.)
 */
export function intervalATtoSC(interval) {
  return normalizeATInterval(interval);
}

export function intervalSCtoAT(interval) {
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
