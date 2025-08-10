import { intervalATtoSC } from "./DateTime.js";
import { DTCalc } from "./DTCalc.js";

export class DTMod {
  constructor({ years = 0, months = 0, days = 0, hours = 0, minutes = 0, seconds = 0 } = {}) {
    this._interval = intervalATtoSC({ years, months, days, hours, minutes, seconds });
    console.warn(`about-time | DTMod is deprecated. Prefer SC-style intervals: { year, month, day, hour, minute, second }`);
    return this;
  }

  get interval() { return this._interval; }
  set interval(interval) { this._interval = intervalATtoSC(interval); }

  static create({ years = 0, months = 0, days = 0, hours = 0, minutes = 0, seconds = 0 } = {}) {
    return new DTMod({ years, months, days, minutes, hours, seconds });
  }

  add(increment) {
    console.warn("about-time | DTMod.add() is deprecated — do the calc directly with SC intervals.");
    const a = this.interval;
    const b = increment?.interval ?? {};
    const year    = Math.floor((a.year    ?? 0) + (b.year    ?? 0));
    const month   = Math.floor((a.month   ?? 0) + (b.month   ?? 0));
    const day     = Math.floor((a.day     ?? 0) + (b.day     ?? 0));
    const hour    = Math.floor((a.hour    ?? 0) + (b.hour    ?? 0));
    const minute  = Math.floor((a.minute  ?? 0) + (b.minute  ?? 0));
    const second  = Math.floor((a.second  ?? 0) + (b.second  ?? 0));
    const result = new DTMod({});
    result.interval = { year, month, day, hour, minute, second };
    return result;
  }

  toSeconds() {
    console.warn(`about-time | DTMod.toSeconds() is deprecated.`);
    const api = globalThis.SimpleCalendar?.api;
    if (!api) return 0;
    const now = game.time.worldTime;
    const later = api.timestampPlusInterval(now, this.interval);
    return (later ?? now) - now;
  }

  static timeString(timeInSeconds) {
    const dmhs = this.fromSeconds(timeInSeconds);
    const pad = DTCalc.padNumber;
    return `${pad(dmhs.interval.hour)}:${pad(dmhs.interval.minute)}:${pad(dmhs.interval.second)}`;
  }

  static fromSeconds(seconds) {
    const api = globalThis.SimpleCalendar?.api;
    if (!api) {
      const s = Math.max(0, Number(seconds) || 0);
      const hour = Math.floor((s / 3600) % 24);
      const minute = Math.floor((s / 60) % 60);
      const second = Math.floor(s % 60);
      return new DTMod({ years: 0, months: 0, days: 0, hours: hour, minutes: minute, seconds: second });
    }
    const iv = api.secondsToInterval(seconds);
    return new DTMod({
      years: 0,
      months: 0,
      days: 0,
      hours: iv.hour ?? 0,
      minutes: iv.minute ?? 0,
      seconds: iv.second ?? 0
    });
  }
}
