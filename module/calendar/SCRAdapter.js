// module/calendar/SCRAdapter.js
// v13.5.0.0 — Simple Calendar Reborn (SCR) integration adapter with Time Authority Model B
// Wraps Simple Calendar Reborn API and provides unified interface via CalendarAdapter
// Tested with SCR v2.5.3 (foundryvtt-simple-calendar-reborn)

import { CalendarAdapter } from "./CalendarAdapter.js";
import { MODULE_ID } from "../settings.js";

/**
 * Adapter for Simple Calendar Reborn (foundryvtt-simple-calendar-reborn).
 * 
 * Key characteristics:
 * - Uses 0-based indexing (month 0-11, day 0-30)
 * - Global: globalThis.SimpleCalendar.api (same as legacy SC)
 * - Hook: "simple-calendar-date-time-change"
 * - Synchronous API methods
 * - Supports multiple calendar types via calendar packs
 * - Fork of Simple Calendar maintained by Arctis Fireblight for v13+
 * 
 * IMPORTANT: Time Management Authority
 * - About Time Next (ATN) is authoritative for time progression
 * - SCR is used for DISPLAY and FORMATTING only
 * - Users should disable SCR's clock and use ATN's Time Manager to advance time
 * - SCR will automatically sync its display to ATN's worldTime changes
 * - Both modules trying to control time simultaneously will cause conflicts
 */
export class SCRAdapter extends CalendarAdapter {
  // Some SCR builds expect plural interval keys (seconds) while others accept singular (second).
  // Cache which style works at runtime to keep doIn/doEvery duration math correct.
  #intervalKeyMode = null; // "singular" | "plural" | null

  constructor() {
    super();

    const debug = (() => {
      try { return !!game.settings.get(MODULE_ID, "debug"); } catch { return false; }
    })();
    if (debug) console.log(`${MODULE_ID} | [SCRAdapter] Initializing...`);
    
    // Verify SCR is available
    if (!this.isAvailable()) {
      console.warn(`${MODULE_ID} | [SCRAdapter] ⚠ SCR not available at instantiation time`);
    } else {
      if (debug) console.log(`${MODULE_ID} | [SCRAdapter] ✓ SCR API verified available`);
    }
  }

  /**
   * Get reference to Simple Calendar Reborn API.
   * @returns {object|null} SCR API object or null
   */
  #getAPI() {
    return globalThis.SimpleCalendar?.api || null;
  }

  // ============================================================================
  // INTERFACE IMPLEMENTATION
  // ============================================================================

  get name() {
    return "Simple Calendar Reborn";
  }

  get systemId() {
    return "simple-calendar-reborn";
  }

  isAvailable() {
    const scrMod = game.modules.get("foundryvtt-simple-calendar-reborn");
    const available = !!(scrMod?.active && globalThis.SimpleCalendar?.api);
    
    const debug = (() => {
      try { return !!game.settings.get(MODULE_ID, "debug"); } catch { return false; }
    })();
    if (debug) {
      console.log(`${MODULE_ID} | [SCRAdapter] isAvailable check:`, {
        moduleActive: !!scrMod?.active,
        apiPresent: !!globalThis.SimpleCalendar?.api,
        result: available
      });
    }
    
    return available;
  }

  formatTimestamp(timestamp) {
    const api = this.#getAPI();
    if (!api) {
      try {
        if (game.settings.get(MODULE_ID, "debug")) {
          console.warn(`${MODULE_ID} | [SCRAdapter] formatTimestamp: API not available`);
        }
      } catch {
        // ignore
      }
      return `t+${Math.round(timestamp)}s`;
    }

    try {
      const dt = api.timestampToDate(timestamp);
      const formatted = api.formatDateTime(dt);
      const date = formatted?.date ?? "";
      const time = formatted?.time ?? "";
      const separator = (date && time) ? ", " : "";
      const result = `${date}${separator}${time}`.trim() || `t+${Math.round(timestamp)}s`;
      
      try {
        if (game.settings.get(MODULE_ID, "debug")) {
          console.log(`${MODULE_ID} | [SCRAdapter] formatTimestamp(${timestamp}) =>`, {
            date: date,
            time: time,
            result: result
          });
        }
      } catch {
        // ignore
      }
      
      return result;
    } catch (e) {
      console.error(`${MODULE_ID} | [SCRAdapter] formatTimestamp error:`, e);
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
      
      // SCR uses 0-based indexing but provides pre-formatted display values
      // Use display.day (already 1-based string) or convert dt.day (0-based) to 1-based
      const day = dt.display?.day ? Number(dt.display.day) : ((dt.day ?? 0) + 1);
      
      // Month name is in display object, not at root level
      const monthName = dt.display?.monthName || `Month ${(dt.month ?? 0) + 1}`;
      const year = dt.year ?? 0;
      
      // Get day with ordinal suffix (1st, 2nd, 3rd, etc.)
      const ordinal = CalendarAdapter.getOrdinalSuffix(day);
      
      // Format like: "3rd of Hammer, 1789"
      const dateStr = `${day}${ordinal} of ${monthName}, ${year}`;
      
      // Format time according to user preference
      const hour = dt.hour ?? 0;
      const minute = dt.minute ?? 0;
      const second = dt.seconds ?? dt.second ?? 0; // SCR uses 'seconds' but may also have 'second'
      const timeStr = CalendarAdapter.formatTime(hour, minute, second);
      
      try {
        if (game.settings.get(MODULE_ID, "debug")) {
          console.log(`${MODULE_ID} | [SCRAdapter] formatDateTime(${timestamp}):`, {
            rawDay: dt.day,
            displayDay: dt.display?.day,
            finalDay: day,
            monthName: monthName,
            formatted: { date: dateStr, time: timeStr }
          });
        }
      } catch {
        // ignore
      }
      
      return {
        date: dateStr,
        time: timeStr
      };
    } catch (e) {
      console.error(`${MODULE_ID} | [SCRAdapter] formatDateTime error:`, e);
      return { date: "", time: `t+${Math.round(timestamp)}s` };
    }
  }

  timestampPlusInterval(timestamp, interval) {
    const api = this.#getAPI();
    if (!api) {
      console.warn(`${MODULE_ID} | [SCRAdapter] timestampPlusInterval: API not available, using fallback`);
      return this.#fallbackIntervalAdd(timestamp, interval);
    }

    try {
      const normalized = this.normalizeInterval(interval);
      const hasUnits = normalized && Object.keys(normalized).length > 0;

      const toPlural = (singular) => {
        const out = {};
        for (const [k, v] of Object.entries(singular || {})) {
          const num = Number(v) || 0;
          if (!num) continue;
          switch (k) {
            case "year": out.years = (out.years || 0) + num; break;
            case "month": out.months = (out.months || 0) + num; break;
            case "day": out.days = (out.days || 0) + num; break;
            case "hour": out.hours = (out.hours || 0) + num; break;
            case "minute": out.minutes = (out.minutes || 0) + num; break;
            case "second": out.seconds = (out.seconds || 0) + num; break;
            default: out[k] = (out[k] || 0) + num; break;
          }
        }
        return out;
      };

      const normalizedPlural = toPlural(normalized);

      const pickPrimary = () => {
        if (this.#intervalKeyMode === "plural") return { mode: "plural", obj: normalizedPlural };
        // default to singular if unknown
        return { mode: "singular", obj: normalized };
      };

      const pickSecondary = (primaryMode) => {
        return primaryMode === "plural"
          ? { mode: "singular", obj: normalized }
          : { mode: "plural", obj: normalizedPlural };
      };

      const primary = pickPrimary();
      const secondary = pickSecondary(primary.mode);
      
      try {
        if (game.settings.get(MODULE_ID, "debug")) {
          console.log(`${MODULE_ID} | [SCRAdapter] timestampPlusInterval:`, {
            timestamp: timestamp,
            interval: normalized
          });
        }
      } catch {
        // ignore
      }
      
      let result = api.timestampPlusInterval(timestamp, primary.obj);

      // Some SCR versions ignore singular keys (second/minute/etc). If the API returns
      // an unchanged timestamp even though the interval is non-empty, try alternate keys.
      if (hasUnits && typeof result === "number" && result === timestamp) {
        const alt = api.timestampPlusInterval(timestamp, secondary.obj);
        if (typeof alt === "number" && alt !== timestamp) {
          result = alt;
          this.#intervalKeyMode = secondary.mode;
          try {
            if (game.settings.get(MODULE_ID, "debug")) {
              console.log(`${MODULE_ID} | [SCRAdapter] timestampPlusInterval: switched interval key mode to ${secondary.mode}`);
            }
          } catch {
            // ignore
          }
        }
      }

      // Last resort: if SCR still returns an unchanged timestamp, fall back to math.
      if (hasUnits && typeof result === "number" && result === timestamp) {
        result = this.#fallbackIntervalAdd(timestamp, normalized);
      }
      
      try {
        if (game.settings.get(MODULE_ID, "debug")) {
          console.log(`${MODULE_ID} | [SCRAdapter]   => result: ${result} (delta: ${result - timestamp}s)`);
        }
      } catch {
        // ignore
      }
      
      return result ?? timestamp;
    } catch (e) {
      console.error(`${MODULE_ID} | [SCRAdapter] timestampPlusInterval error:`, e);
      return this.#fallbackIntervalAdd(timestamp, interval);
    }
  }

  dateToTimestamp(dateObj) {
    const api = this.#getAPI();
    if (!api) {
      console.warn(`${MODULE_ID} | [SCRAdapter] dateToTimestamp: SCR API not available`);
      return game.time.worldTime;
    }

    try {
      const normalized = this.normalizeInterval(dateObj);
      
      try {
        if (game.settings.get(MODULE_ID, "debug")) {
          console.log(`${MODULE_ID} | [SCRAdapter] dateToTimestamp:`, normalized);
        }
      } catch {
        // ignore
      }
      
      const result = api.dateToTimestamp(normalized) ?? game.time.worldTime;
      
      try {
        if (game.settings.get(MODULE_ID, "debug")) {
          console.log(`${MODULE_ID} | [SCRAdapter]   => ${result}`);
        }
      } catch {
        // ignore
      }
      
      return result;
    } catch (e) {
      console.error(`${MODULE_ID} | [SCRAdapter] dateToTimestamp error:`, e);
      return game.time.worldTime;
    }
  }

  getCurrentDate() {
    const api = this.#getAPI();
    if (!api) return this.timestampToDate(game.time.worldTime);

    try {
      const result = api.timestampToDate(game.time.worldTime);
      
      try {
        if (game.settings.get(MODULE_ID, "debug")) {
          console.log(`${MODULE_ID} | [SCRAdapter] getCurrentDate:`, result);
        }
      } catch {
        // ignore
      }
      
      return result;
    } catch (e) {
      console.error(`${MODULE_ID} | [SCRAdapter] getCurrentDate error:`, e);
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
      const result = api.timestampToDate(timestamp);
      
      try {
        if (game.settings.get(MODULE_ID, "debug")) {
          console.log(`${MODULE_ID} | [SCRAdapter] timestampToDate(${timestamp}):`, result);
        }
      } catch {
        // ignore
      }
      
      return result;
    } catch (e) {
      console.error(`${MODULE_ID} | [SCRAdapter] timestampToDate error:`, e);
      return { year: 0, month: 0, day: 0, hour: 0, minute: 0, second: Math.floor(timestamp) };
    }
  }

  normalizeInterval(interval) {
    if (interval == null) return {};
    if (typeof interval === "number") {
      return { second: interval };
    }

    // Map plural/variant keys to SCR's singular keys
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

    try {
      if (game.settings.get(MODULE_ID, "debug")) {
        console.log(`${MODULE_ID} | [SCRAdapter] normalizeInterval:`, { input: interval, output: out });
      }
    } catch {
      // ignore
    }

    return out;
  }

  getCalendarData() {
    const api = this.#getAPI();
    if (!api) {
      console.warn(`${MODULE_ID} | [SCRAdapter] getCalendarData: API not available, using fallback`);
      return this.#getFallbackCalendarData();
    }

    try {
      try {
        if (game.settings.get(MODULE_ID, "debug")) {
          console.log(`${MODULE_ID} | [SCRAdapter] getCalendarData: Querying SCR for calendar structure...`);
        }
      } catch {
        // ignore
      }
      
      // Query SCR for active calendar configuration
      // SCR API provides: currentCalendar, getAllCalendars, etc.
      const currentCal = api.getCurrentCalendar?.();
      
      if (!currentCal) {
        console.warn(`${MODULE_ID} | [SCRAdapter] No current calendar from SCR, using fallback`);
        return this.#getFallbackCalendarData();
      }
      
      try {
        if (game.settings.get(MODULE_ID, "debug")) {
          console.log(`${MODULE_ID} | [SCRAdapter] Retrieved calendar: "${currentCal.name}"`);
        }
      } catch {
        // ignore
      }

      // Extract calendar structure from SCR's calendar object
      // SCR structure: calendar.months = [{name, numberOfDays, ...}], calendar.weekdays = [...]
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
      
      try {
        if (game.settings.get(MODULE_ID, "debug")) {
          console.log(`${MODULE_ID} | [SCRAdapter] Calendar data:`, {
            name: calData.name,
            monthsInYear: calData.monthsInYear,
            daysPerWeek: calData.daysPerWeek
          });
        }
      } catch {
        // ignore
      }
      
      return calData;
    } catch (e) {
      console.error(`${MODULE_ID} | [SCRAdapter] getCalendarData error:`, e);
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
      const result = {
        running: status?.started ?? false,
        paused: status?.paused ?? true
      };
      
      try {
        if (game.settings.get(MODULE_ID, "debug")) {
          console.log(`${MODULE_ID} | [SCRAdapter] getClockStatus:`, result);
        }
      } catch {
        // ignore
      }
      
      return result;
    } catch (e) {
      console.error(`${MODULE_ID} | [SCRAdapter] getClockStatus error:`, e);
      return { running: false, paused: true };
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Fallback interval addition when SCR API unavailable.
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
    
    try {
      if (game.settings.get(MODULE_ID, "debug")) {
        console.log(`${MODULE_ID} | [SCRAdapter] fallbackIntervalAdd: ${timestamp} + ${seconds} = ${timestamp + seconds}`);
      }
    } catch {
      // ignore
    }
    
    return timestamp + seconds;
  }

  /**
   * Get fallback Gregorian calendar data when SCR unavailable.
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

  /**
   * Advance time by routing through SCR's API (Model B: SCR controls time).
   * This ensures SCR maintains authority over worldTime changes.
   * 
   * @param {number} seconds - Number of seconds to advance (can be negative)
   * @returns {Promise<boolean>} True if successful
   */
  async advanceTime(seconds) {
    const api = this.#getAPI();
    if (!api?.changeDate) {
      console.warn(`${MODULE_ID} | [SCRAdapter] changeDate API not available, falling back to game.time.advance`);
      return await game.time.advance(seconds);
    }

    try {
      // Route time control through SCR's API
      const success = api.changeDate({ seconds: seconds });

      try {
        if (game.settings.get(MODULE_ID, "debug")) {
          console.log(`${MODULE_ID} | [SCRAdapter] Advanced time by ${seconds}s via SCR API`);
        }
      } catch {
        // ignore
      }
      
      return success;
    } catch (error) {
      console.error(`${MODULE_ID} | [SCRAdapter] Failed to advance time via SCR:`, error);
      // Fallback to native time advance if SCR fails
      return await game.time.advance(seconds);
    }
  }
}

// Register adapter in global namespace for factory access
if (!window.AboutTimeNext) window.AboutTimeNext = {};
if (!window.AboutTimeNext.adapters) window.AboutTimeNext.adapters = {};
window.AboutTimeNext.adapters.SCRAdapter = SCRAdapter;

export default SCRAdapter;
