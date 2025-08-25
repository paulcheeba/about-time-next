// About Time v13.0.5 — DateTime helpers

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

export function intervalATtoSC(interval) {
  const out = {};
  if (
    interval?.years !== undefined || interval?.months !== undefined ||
    interval?.days  !== undefined || interval?.hours  !== undefined ||
    interval?.minutes !== undefined || interval?.seconds !== undefined
  ) {
    warn("About Time | Prefer singular keys: year/month/day/hour/minute/second");
  }
  out.year   = interval?.year   ?? interval?.years   ?? 0;
  out.month  = interval?.month  ?? interval?.months  ?? 0;
  out.day    = interval?.day    ?? interval?.days    ?? 0;
  out.hour   = interval?.hour   ?? interval?.hours   ?? 0;
  out.minute = interval?.minute ?? interval?.minutes ?? 0;
  out.second = interval?.second ?? interval?.seconds ?? 0;
  return out;
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
