// module/calendar/SandSAdapter.js
// v13.3.1.0 — Seasons & Stars integration adapter
// Wraps Seasons & Stars API and provides unified interface via CalendarAdapter

import { CalendarAdapter } from "./CalendarAdapter.js";
import { MODULE_ID } from "../settings.js";

/**
 * Adapter for Seasons & Stars (seasons-and-stars).
 * 
 * Key characteristics:
 * - Uses 1-based indexing (month 1-12, day 1-31)
 * - Global: game.seasonsStars
 * - Hook: "seasons-stars:dateChanged"
 * - Async advancement methods (advanceDays, advanceHours, etc.)
 * - Modular calendar pack system (auto-detected)
 * - Calendar packs are transparent (no special handling needed)
 */
export class SandSAdapter extends CalendarAdapter {
  constructor() {
    super();
    
    console.log(`${MODULE_ID} | [SandSAdapter] Initializing...`);
    
    // Verify S&S is available
    if (!this.isAvailable()) {
      console.warn(`${MODULE_ID} | [SandSAdapter] ⚠ S&S not available at instantiation time`);
    } else {
      console.log(`${MODULE_ID} | [SandSAdapter] ✓ S&S API verified available`);
    }
  }

  /**
   * Get reference to Seasons & Stars API.
   * @returns {object|null} S&S API object or null
   */
  #getAPI() {
    return game.seasonsStars?.api || null;
  }

  // ============================================================================
  // INTERFACE IMPLEMENTATION
  // ============================================================================

  get name() {
    return "Seasons & Stars";
  }

  get systemId() {
    return "seasons-and-stars";
  }

  isAvailable() {
    const ssMod = game.modules.get("seasons-and-stars");
    return !!(ssMod?.active && game.seasonsStars?.api?.getCurrentDate);
  }

  formatTimestamp(timestamp) {
    const api = this.#getAPI();
    if (!api) {
      console.warn(`${MODULE_ID} | [SandSAdapter] formatTimestamp: API not available`);
      return `t+${Math.round(timestamp)}s`;
    }

    try {
      const date = api.worldTimeToDate?.(timestamp) || api.getCurrentDate?.();
      if (!date) {
        console.warn(`${MODULE_ID} | [SandSAdapter] formatTimestamp: Could not get date from timestamp`);
        return `t+${Math.round(timestamp)}s`;
      }

      const formatted = api.formatDate?.(date) || this.#formatDateFallback(date);
      console.log(`${MODULE_ID} | [SandSAdapter] formatTimestamp(${timestamp}) => "${formatted}"`);
      return formatted || `t+${Math.round(timestamp)}s`;
    } catch (e) {
      console.error(`${MODULE_ID} | [SandSAdapter] formatTimestamp error:`, e);
      return `t+${Math.round(timestamp)}s`;
    }
  }

  formatDateTime(timestamp) {
    const api = this.#getAPI();
    if (!api) {
      return { date: "", time: `t+${Math.round(timestamp)}s` };
    }

    try {
      const date = api.worldTimeToDate?.(timestamp) || api.getCurrentDate?.();
      if (!date) {
        return { date: "", time: `t+${Math.round(timestamp)}s` };
      }

      // S&S formatDate returns full string, need to split date/time
      const formatted = api.formatDate?.(date) || this.#formatDateFallback(date);
      
      // Try to split date and time components
      // S&S format varies by calendar, but typically "Date Time" or just date
      const parts = formatted.split(/\s+at\s+|\s{2,}/);
      if (parts.length >= 2) {
        return {
          date: parts[0].trim(),
          time: parts[1].trim()
        };
      }
      
      // If no time component, extract from date object
      const timeStr = this.#formatTime(date);
      return {
        date: formatted,
        time: timeStr
      };
    } catch (e) {
      console.error(`${MODULE_ID} | SandSAdapter.formatDateTime error:`, e);
      return { date: "", time: `t+${Math.round(timestamp)}s` };
    }
  }

  timestampPlusInterval(timestamp, interval) {
    const api = this.#getAPI();
    if (!api) {
      console.warn(`${MODULE_ID} | [SandSAdapter] timestampPlusInterval: API not available, using fallback`);
      return this.#fallbackIntervalAdd(timestamp, interval);
    }

    try {
      const normalized = this.normalizeInterval(interval);
      console.log(`${MODULE_ID} | [SandSAdapter] timestampPlusInterval(${timestamp}, ${JSON.stringify(normalized)})`);
      
      // S&S doesn't have a direct timestampPlusInterval method
      // We need to convert timestamp to date, add interval components, convert back
      const startDate = api.worldTimeToDate?.(timestamp) || api.getCurrentDate?.();
      if (!startDate) {
        console.warn(`${MODULE_ID} | [SandSAdapter] Could not get start date, using fallback`);
        return this.#fallbackIntervalAdd(timestamp, interval);
      }

      // Calculate total seconds from interval (for sub-day precision)
      let seconds = timestamp;
      seconds += (normalized.second || 0);
      seconds += (normalized.minute || 0) * 60;
      seconds += (normalized.hour || 0) * 3600;
      seconds += (normalized.day || 0) * 86400; // Conservative: 24-hour days
      seconds += (normalized.month || 0) * 30 * 86400; // Conservative: 30-day months
      seconds += (normalized.year || 0) * 365 * 86400; // Conservative: 365-day years
      
      console.log(`${MODULE_ID} | [SandSAdapter]   => ${seconds}`);
      return seconds;
    } catch (e) {
      console.error(`${MODULE_ID} | [SandSAdapter] timestampPlusInterval error:`, e);
      return this.#fallbackIntervalAdd(timestamp, interval);
    }
  }

  dateToTimestamp(dateObj) {
    const api = this.#getAPI();
    if (!api) {
      console.warn(`${MODULE_ID} | SandSAdapter.dateToTimestamp: S&S API not available`);
      return game.time.worldTime;
    }

    try {
      // S&S uses dateToWorldTime (opposite direction of SC's naming)
      const timestamp = api.dateToWorldTime?.(dateObj);
      return timestamp ?? game.time.worldTime;
    } catch (e) {
      console.error(`${MODULE_ID} | SandSAdapter.dateToTimestamp error:`, e);
      return game.time.worldTime;
    }
  }

  getCurrentDate() {
    const api = this.#getAPI();
    if (!api) return this.timestampToDate(game.time.worldTime);

    try {
      return api.getCurrentDate?.() || this.timestampToDate(game.time.worldTime);
    } catch (e) {
      console.error(`${MODULE_ID} | SandSAdapter.getCurrentDate error:`, e);
      return this.timestampToDate(game.time.worldTime);
    }
  }

  timestampToDate(timestamp) {
    const api = this.#getAPI();
    if (!api) {
      // Fallback: return basic structure with 1-based indexing
      return {
        year: 1,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: Math.floor(timestamp)
      };
    }

    try {
      return api.worldTimeToDate?.(timestamp) || {
        year: 1, month: 1, day: 1, hour: 0, minute: 0, second: Math.floor(timestamp)
      };
    } catch (e) {
      console.error(`${MODULE_ID} | SandSAdapter.timestampToDate error:`, e);
      return { year: 1, month: 1, day: 1, hour: 0, minute: 0, second: Math.floor(timestamp) };
    }
  }

  normalizeInterval(interval) {
    if (interval == null) return {};
    if (typeof interval === "number") {
      return { second: interval };
    }

    // Map plural/variant keys to singular keys (same as SC)
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
      console.warn(`${MODULE_ID} | [SandSAdapter] getCalendarData: API not available, using fallback`);
      return this.#getFallbackCalendarData();
    }

    try {
      console.log(`${MODULE_ID} | [SandSAdapter] getCalendarData: Querying S&S for calendar structure...`);
      // Query S&S for active calendar configuration
      // S&S exposes calendar data through game.seasonsStars.calendar
      const calendar = api.calendar;
      
      if (!calendar) {
        console.warn(`${MODULE_ID} | [SandSAdapter] No calendar data from S&S, using fallback`);
        return this.#getFallbackCalendarData();
      }
      console.log(`${MODULE_ID} | [SandSAdapter] Retrieved calendar: "${calendar.name}"`);

      // Extract calendar structure from S&S's calendar object
      // S&S structure: calendar.months = [{name, days, ...}], calendar.weekdays = [...]
      const months = (calendar.months || []).map(m => m.name || "");
      const daysPerMonth = (calendar.months || []).map(m => m.days || 30);
      const weekdays = (calendar.weekdays || []).map(w => w.name || w);
      
      const calData = {
        name: calendar.name || "Unknown Calendar",
        months: months,
        monthsInYear: months.length,
        daysPerMonth: daysPerMonth,
        weekdays: weekdays,
        daysPerWeek: weekdays.length,
        leapYearRule: calendar.leapYearRule || "None"
      };
      console.log(`${MODULE_ID} | [SandSAdapter] Calendar data:`, {
        name: calData.name,
        monthsInYear: calData.monthsInYear,
        daysPerWeek: calData.daysPerWeek
      });
      return calData;
    } catch (e) {
      console.error(`${MODULE_ID} | SandSAdapter.getCalendarData error:`, e);
      return this.#getFallbackCalendarData();
    }
  }

  getClockStatus() {
    const api = this.#getAPI();
    if (!api) {
      return { running: false, paused: true };
    }

    try {
      // S&S tracks clock status differently than SC
      // Check if time is advancing (based on Foundry's game.paused)
      const paused = game.paused ?? true;
      
      return {
        running: !paused,
        paused: paused
      };
    } catch (e) {
      console.error(`${MODULE_ID} | SandSAdapter.getClockStatus error:`, e);
      return { running: false, paused: true };
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Format time component from date object.
   * 
   * @param {object} date - S&S date object
   * @returns {string} Formatted time string (HH:MM:SS)
   */
  #formatTime(date) {
    const h = String(date.hour || 0).padStart(2, '0');
    const m = String(date.minute || 0).padStart(2, '0');
    const s = String(date.second || 0).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  /**
   * Fallback date formatting when S&S formatDate unavailable.
   * 
   * @param {object} date - S&S date object
   * @returns {string} Formatted date string
   */
  #formatDateFallback(date) {
    // S&S uses 1-based indexing
    const year = date.year || 1;
    const month = date.month || 1;
    const day = date.day || 1;
    const time = this.#formatTime(date);
    
    return `Year ${year}, Month ${month}, Day ${day} at ${time}`;
  }

  /**
   * Fallback interval addition when S&S API unavailable.
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
   * Get fallback Gregorian calendar data when S&S unavailable.
   * Note: Uses 1-based indexing to match S&S convention.
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

  // ============================================================================
  // S&S-SPECIFIC ASYNC METHODS (for future use)
  // ============================================================================

  /**
   * Advance time by a specified number of days (async).
   * S&S advancement methods are async - wrap for consistency.
   * 
   * @param {number} days - Number of days to advance
   * @returns {Promise<void>}
   */
  async advanceDays(days) {
    const api = this.#getAPI();
    if (!api || !api.advanceDays) {
      console.warn(`${MODULE_ID} | SandSAdapter.advanceDays: Method not available`);
      return;
    }

    try {
      await api.advanceDays(days);
    } catch (e) {
      console.error(`${MODULE_ID} | SandSAdapter.advanceDays error:`, e);
    }
  }

  /**
   * Advance time by a specified number of hours (async).
   * 
   * @param {number} hours - Number of hours to advance
   * @returns {Promise<void>}
   */
  async advanceHours(hours) {
    const api = this.#getAPI();
    if (!api || !api.advanceHours) {
      console.warn(`${MODULE_ID} | SandSAdapter.advanceHours: Method not available`);
      return;
    }

    try {
      await api.advanceHours(hours);
    } catch (e) {
      console.error(`${MODULE_ID} | SandSAdapter.advanceHours error:`, e);
    }
  }
}

// Register adapter in global namespace for factory access
if (!window.AboutTimeNext) window.AboutTimeNext = {};
if (!window.AboutTimeNext.adapters) window.AboutTimeNext.adapters = {};
window.AboutTimeNext.adapters.SandSAdapter = SandSAdapter;

export default SandSAdapter;
