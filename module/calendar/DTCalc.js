// calendar/DTCalc.js (v13-ready)

import { ElapsedTime } from "../ElapsedTime.js";

let warn = (...args) => {
  if (ElapsedTime.debug) console.warn("about-time | ", ...args);
};
let log = (...args) => {
  console.log("about-time | ", ...args);
};

export class DTCalc {
  /**
   * @deprecated Not supported in About Time v13 port.
   */
  static numLeapYears(year) {
    console.error("about-time | numLeapYears not supported (no replacement in About Time; use your calendar system’s API).");
    return -1;
  }

  /**
   * @deprecated Use Simple Calendar UI instead
   */
  static setFirstDay(day) {
    console.error("about-time | setFirstDay not supported — use Simple Calendar UI.");
  }

  static padNumber(n, digits = 2) {
    return `${n}`.padStart(digits, "0");
  }

  static padYear(n, digits = 2) {
    return `${n}`.padStart(digits, " ");
  }

  /**
   * @deprecated Not supported in About Time v13 port.
   */
  static isLeapYear(year) {
    console.error("about-time | isLeapYear not supported (use your calendar system’s API).");
    return undefined;
  }

  /**
   * @deprecated Not supported; calendar-specific. Use your calendar system’s API.
   */
  static daysInYear(year) {
    warn("about-time | daysInYear is deprecated — no direct replacement here (use Simple Calendar / system API).");
    return undefined;
  }

  /** Seconds per (SC) day based on current calendar rules. */
  static get spd() {
    const api = globalThis.SimpleCalendar?.api;
    // If SC isn't available, fall back to 24h days.
    if (!api) return 24 * 60 * 60;
    // timestampPlusInterval returns a timestamp; with base 0 it yields seconds per day
    return api.timestampPlusInterval(0, { day: 1 });
  }

  /**
   * Convert a time spec to seconds.
   * Accepts { days, hours, minutes, seconds }.
   * @deprecated Prefer:
   *   const now = game.time.worldTime;
   *   const interval = { day: d, hour: h, minute: m, second: s };
   *   const future = SimpleCalendar.api.timestampPlusInterval(now, interval);
   *   const delta = future - now;
   */
  static timeToSeconds({ days = 0, hours = 0, minutes = 0, seconds = 0 } = {}) {
    console.error(`about-time | timeToSeconds is deprecated. Use SimpleCalendar.api.timestampPlusInterval(now, interval) - now instead.`);
    const api = globalThis.SimpleCalendar?.api;

    // Preferred (accurate) path via Simple Calendar
    if (api) {
      const now = game.time.worldTime; // authoritative world time
      const interval = { day: days, hour: hours, minute: minutes, second: seconds };
      const future = api.timestampPlusInterval(now, interval);
      return (future ?? now) - now;
    }

    // Fallback approximation without SC (24h days)
    return (
      (days * 24 * 60 * 60) +
      (hours * 60 * 60) +
      (minutes * 60) +
      (seconds)
    );
  }
}

/** Simple reducer helper preserved from original. */
DTCalc.sum = (...args) => args.reduce((acc, v) => acc + v, 0);
