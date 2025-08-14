// About Time v13.0.5 — DTMod

import { intervalATtoSC } from "./DateTime.js";
import { DTCalc } from "./DTCalc.js";

export class DTMod {
  constructor({ years = 0, months = 0, days = 0, hours = 0, minutes = 0, seconds = 0 } = {}) {
    this._interval = intervalATtoSC({ years, months, days, hours, minutes, seconds });
    console.warn(`about-time | DTMod is deprecated. Prefer SimpleCalendar.api intervals.`);
    return this;
  }

  get interval() { return this._interval; }
  set interval(interval) { this._interval = intervalATtoSC(interval); }

  static create({ years = 0, months = 0, days = 0, hours = 0, minutes = 0, seconds = 0 } = {}) {
    return new DTMod({ years, months, days, minutes, hours, seconds });
  }

  add(incr) {
    console.warn("about-time | DTMod.add() deprecated.");
    const a = this.interval, b = incr?.interval ?? {};
    const r = new DTMod({});
    r.interval = {
      year:   (a.year   ?? 0) + (b.year   ?? 0),
      month:  (a.month  ?? 0) + (b.month  ?? 0),
      day:    (a.day    ?? 0) + (b.day    ?? 0),
      hour:   (a.hour   ?? 0) + (b.hour   ?? 0),
      minute: (a.minute ?? 0) + (b.minute ?? 0),
      second: (a.second ?? 0) + (b.second ?? 0)
    };
    return r;
  }

  toSeconds() {
    console.warn("about-time | DTMod.toSeconds() deprecated.");
    const api = globalThis.SimpleCalendar?.api;
    if (!api) return 0;
    const now = game.time.worldTime;
    const later = api.timestampPlusInterval(now, this.interval);
    return (later ?? now) - now;
  }

  static timeString(timeInSeconds) {
    console.warn("about-time | DTMod.timeString() deprecated.");
    const dmhs = this.fromSeconds(timeInSeconds);
    const pad = DTCalc.padNumber;
    return `${pad(dmhs.interval.hour)}:${pad(dmhs.interval.minute)}:${pad(dmhs.interval.second)}`;
    }

  static fromSeconds(seconds) {
    console.warn("about-time | DTMod.fromSeconds() deprecated.");
    const api = globalThis.SimpleCalendar?.api;
    if (!api) {
      const s = Math.max(0, Number(seconds) || 0);
      const hour = Math.floor((s / 3600) % 24);
      const minute = Math.floor((s / 60) % 60);
      const second = Math.floor(s % 60);
      return new DTMod({ hours: hour, minutes: minute, seconds: second });
    }
    const iv = api.secondsToInterval(seconds);
    return new DTMod({ hours: iv.hour ?? 0, minutes: iv.minute ?? 0, seconds: iv.second ?? 0 });
  }
}
