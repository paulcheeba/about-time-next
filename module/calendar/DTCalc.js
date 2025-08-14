// About Time v13.0.5 — DTCalc

import { ElapsedTime } from "../ElapsedTime.js";

const warn = (...a) => ElapsedTime.debug && console.warn("about-time |", ...a);

export class DTCalc {
  static numLeapYears() { console.error("about-time | numLeapYears not supported."); return -1; }
  static setFirstDay()  { console.error("about-time | setFirstDay not supported."); }
  static padNumber(n, digits = 2) { return `${n}`.padStart(digits, "0"); }
  static padYear(n, digits = 2) { return `${n}`.padStart(digits, " "); }
  static isLeapYear() { console.error("about-time | isLeapYear not supported."); return undefined; }
  static daysInYear() { warn("about-time | daysInYear deprecated."); return undefined; }

  static get spd() {
    const api = globalThis.SimpleCalendar?.api;
    if (!api) return 86400;
    return api.timestampPlusInterval(0, { day: 1 });
  }

  static timeToSeconds({ days = 0, hours = 0, minutes = 0, seconds = 0 } = {}) {
    console.error("about-time | timeToSeconds deprecated.");
    const api = globalThis.SimpleCalendar?.api;
    if (api) {
      const now = game.time.worldTime;
      const later = api.timestampPlusInterval(now, { day: days, hour: hours, minute: minutes, second: seconds });
      return (later ?? now) - now;
    }
    return days*86400 + hours*3600 + minutes*60 + seconds;
  }
}
DTCalc.sum = (...args) => args.reduce((a, v) => a + v, 0);
