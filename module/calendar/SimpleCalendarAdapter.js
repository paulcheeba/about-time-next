// module/calendar/SimpleCalendarAdapter.js
// v13.3.1.0 — Simple Calendar integration adapter
// Wraps Simple Calendar API and provides unified interface via CalendarAdapter

import { CalendarAdapter } from "./CalendarAdapter.js";
import { MODULE_ID } from "../settings.js";

/**
 * Adapter for Simple Calendar (foundryvtt-simple-calendar).
 * 
 * Key characteristics:
 * - Uses 0-based indexing (month 0-11, day 0-30)
 * - Global: globalThis.SimpleCalendar.api
 * - Hook: "simple-calendar-date-time-change"
 * - Synchronous API methods
 * - Supports multiple calendar types via calendar packs
 */
export class SimpleCalendarAdapter extends CalendarAdapter {
  constructor() {
    super();
    
    console.log(`${MODULE_ID} | [SimpleCalendarAdapter] Initializing...`);
    
    // Verify SC is available
    if (!this.isAvailable()) {
      console.warn(`${MODULE_ID} | [SimpleCalendarAdapter] ⚠ SC not available at instantiation time`);
    } else {
      console.log(`${MODULE_ID} | [SimpleCalendarAdapter] ✓ SC API verified available`);
    }
  }

  /**
   * Get reference to Simple Calendar API.
   * @returns {object|null} SC API object or null
   */
  #getAPI() {
    return globalThis.SimpleCalendar?.api || null;
  }

  // ============================================================================
  // INTERFACE IMPLEMENTATION
  // ============================================================================

  get name() {
    return "Simple Calendar";
  }

  get systemId() {
    return "simple-calendar";
  }

  isAvailable() {
    const scMod = game.modules.get("foundryvtt-simple-calendar") 
               ?? game.modules.get("simple-calendar");
    return !!(scMod?.active && globalThis.SimpleCalendar?.api);
  }

  formatTimestamp(timestamp) {
    const api = this.#getAPI();
    if (!api) {
      console.warn(`${MODULE_ID} | [SimpleCalendarAdapter] formatTimestamp: API not available`);
      return `t+${Math.round(timestamp)}s`;
    }

    try {
      const dt = api.timestampToDate(timestamp);
      const formatted = api.formatDateTime(dt);
      const date = formatted?.date ?? "";
      const time = formatted?.time ?? "";
      const separator = (date && time) ? " " : "";
      const result = `${date}${separator}${time}`.trim() || `t+${Math.round(timestamp)}s`;
      console.log(`${MODULE_ID} | [SimpleCalendarAdapter] formatTimestamp(${timestamp}) => "${result}"`);
      return result;
    } catch (e) {
      console.error(`${MODULE_ID} | [SimpleCalendarAdapter] formatTimestamp error:`, e);
      return `t+${Math.round(timestamp)}s`;
    }
  }

  formatDateTime(timestamp) {
    const api = this.#getAPI();
    if (!api) {
      return { date: "", time: `t+${Math.round(timestamp)}s` };
    }

    try {
      const dt = api.timestampToDate(timestamp);
      const formatted = api.formatDateTime(dt);
      return {
        date: formatted?.date ?? "",
        time: formatted?.time ?? `t+${Math.round(timestamp)}s`
      };
    } catch (e) {
      console.error(`${MODULE_ID} | SimpleCalendarAdapter.formatDateTime error:`, e);
      return { date: "", time: `t+${Math.round(timestamp)}s` };
    }
  }

  timestampPlusInterval(timestamp, interval) {
    const api = this.#getAPI();
    if (!api) {
      console.warn(`${MODULE_ID} | [SimpleCalendarAdapter] timestampPlusInterval: API not available, using fallback`);
      return this.#fallbackIntervalAdd(timestamp, interval);
    }

    try {
      const normalized = this.normalizeInterval(interval);
      console.log(`${MODULE_ID} | [SimpleCalendarAdapter] timestampPlusInterval(${timestamp}, ${JSON.stringify(normalized)})`);
      const result = api.timestampPlusInterval(timestamp, normalized);
      console.log(`${MODULE_ID} | [SimpleCalendarAdapter]   => ${result}`);
      return result ?? timestamp;
    } catch (e) {
      console.error(`${MODULE_ID} | [SimpleCalendarAdapter] timestampPlusInterval error:`, e);
      return this.#fallbackIntervalAdd(timestamp, interval);
    }
  }

  dateToTimestamp(dateObj) {
    const api = this.#getAPI();
    if (!api) {
      console.warn(`${MODULE_ID} | SimpleCalendarAdapter.dateToTimestamp: SC API not available`);
      return game.time.worldTime;
    }

    try {
      const normalized = this.normalizeInterval(dateObj);
      return api.dateToTimestamp(normalized) ?? game.time.worldTime;
    } catch (e) {
      console.error(`${MODULE_ID} | SimpleCalendarAdapter.dateToTimestamp error:`, e);
      return game.time.worldTime;
    }
  }

  getCurrentDate() {
    const api = this.#getAPI();
    if (!api) return this.timestampToDate(game.time.worldTime);

    try {
      return api.timestampToDate(game.time.worldTime);
    } catch (e) {
      console.error(`${MODULE_ID} | SimpleCalendarAdapter.getCurrentDate error:`, e);
      return this.timestampToDate(game.time.worldTime);
    }
  }

  timestampToDate(timestamp) {
    const api = this.#getAPI();
    if (!api) {
      // Fallback: return basic structure
      return {
        year: 0,
        month: 0,
        day: 0,
        hour: 0,
        minute: 0,
        second: Math.floor(timestamp)
      };
    }

    try {
      return api.timestampToDate(timestamp);
    } catch (e) {
      console.error(`${MODULE_ID} | SimpleCalendarAdapter.timestampToDate error:`, e);
      return { year: 0, month: 0, day: 0, hour: 0, minute: 0, second: Math.floor(timestamp) };
    }
  }

  normalizeInterval(interval) {
    if (interval == null) return {};
    if (typeof interval === "number") {
      return { second: interval };
    }

    // Map plural/variant keys to SC's singular keys
    const map = {
      years: "year", year: "year", yr: "year",
      months: "month", month: "month", mo: "month",
      days: "day", day: "day", d: "day",
      hours: "hour", hour: "hour", h: "hour",
      minutes: "minute", minute: "minute", min: "minute", m: "minute",
      seconds: "second", second: "second", sec: "second", s: "second",
    };

    const out = {};
    for (const [key, value] of Object.entries(interval)) {
      const normalizedKey = map[key] || key;
      const num = Number(value) || 0;
      if (!num) continue;
      out[normalizedKey] = (out[normalizedKey] || 0) + num;
    }

    return out;
  }

  getCalendarData() {
    const api = this.#getAPI();
    if (!api) {
      console.warn(`${MODULE_ID} | [SimpleCalendarAdapter] getCalendarData: API not available, using fallback`);
      return this.#getFallbackCalendarData();
    }

    try {
      console.log(`${MODULE_ID} | [SimpleCalendarAdapter] getCalendarData: Querying SC for calendar structure...`);
      // Query SC for active calendar configuration
      // SC API provides: currentCalendar, getAllCalendars, etc.
      const currentCal = api.getCurrentCalendar?.();
      
      if (!currentCal) {
        console.warn(`${MODULE_ID} | [SimpleCalendarAdapter] No current calendar from SC, using fallback`);
        return this.#getFallbackCalendarData();
      }
      console.log(`${MODULE_ID} | [SimpleCalendarAdapter] Retrieved calendar: "${currentCal.name}"`);

      // Extract calendar structure from SC's calendar object
      // SC structure: calendar.months = [{name, numberOfDays, ...}], calendar.weekdays = [...]
      const months = (currentCal.months || []).map(m => m.name || "");
      const daysPerMonth = (currentCal.months || []).map(m => m.numberOfDays || 30);
      const weekdays = (currentCal.weekdays || []).map(w => w.name || "");
      
      const calData = {
        name: currentCal.name || "Unknown Calendar",
        months: months,
        monthsInYear: months.length,
        daysPerMonth: daysPerMonth,
        weekdays: weekdays,
        daysPerWeek: weekdays.length,
        leapYearRule: currentCal.leapYearRule?.rule || "None"
      };
      console.log(`${MODULE_ID} | [SimpleCalendarAdapter] Calendar data:`, {
        name: calData.name,
        monthsInYear: calData.monthsInYear,
        daysPerWeek: calData.daysPerWeek
      });
      return calData;
    } catch (e) {
      console.error(`${MODULE_ID} | SimpleCalendarAdapter.getCalendarData error:`, e);
      return this.#getFallbackCalendarData();
    }
  }

  getClockStatus() {
    const api = this.#getAPI();
    if (!api) {
      return { running: false, paused: true };
    }

    try {
      const status = api.clockStatus();
      return {
        running: status?.started ?? false,
        paused: status?.paused ?? true
      };
    } catch (e) {
      console.error(`${MODULE_ID} | SimpleCalendarAdapter.getClockStatus error:`, e);
      return { running: false, paused: true };
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Fallback interval addition when SC API unavailable.
   * Uses conservative estimates: 1 year = 365 days, 1 month = 30 days.
   * 
   * @param {number} timestamp - Base timestamp
   * @param {object} interval - Interval to add
   * @returns {number} New timestamp
   */
  #fallbackIntervalAdd(timestamp, interval) {
    const norm = this.normalizeInterval(interval);
    let seconds = 0;
    
    seconds += (norm.year || 0) * 365 * 24 * 3600;
    seconds += (norm.month || 0) * 30 * 24 * 3600;
    seconds += (norm.day || 0) * 24 * 3600;
    seconds += (norm.hour || 0) * 3600;
    seconds += (norm.minute || 0) * 60;
    seconds += (norm.second || 0);
    
    return timestamp + seconds;
  }

  /**
   * Get fallback Gregorian calendar data when SC unavailable.
   * 
   * @returns {object} Gregorian calendar structure
   */
  #getFallbackCalendarData() {
    return {
      name: "Gregorian",
      months: [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ],
      monthsInYear: 12,
      daysPerMonth: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
      weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      daysPerWeek: 7,
      leapYearRule: "Every 4 years (not divisible by 100, unless divisible by 400)"
    };
  }
}

// Register adapter in global namespace for factory access
if (!window.AboutTimeNext) window.AboutTimeNext = {};
if (!window.AboutTimeNext.adapters) window.AboutTimeNext.adapters = {};
window.AboutTimeNext.adapters.SimpleCalendarAdapter = SimpleCalendarAdapter;

export default SimpleCalendarAdapter;
