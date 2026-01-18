// module/calendar/MCAdapter.js
// v13.6.0.0 — Mini Calendar (wgtgm-mini-calendar) integration adapter
// Wraps Mini Calendar and provides unified interface via CalendarAdapter

import { CalendarAdapter } from "./CalendarAdapter.js";
import { MODULE_ID } from "../settings.js";

/**
 * Adapter for Mini Calendar (wgtgm-mini-calendar).
 * 
 * Key characteristics:
 * - Uses Foundry's worldTime (game.time.worldTime) as authoritative time
 * - Mini Calendar modifies CONFIG.time.worldCalendarConfig/worldCalendarClass
 * - Uses game.time.calendar for conversions (like D&D5e adapter)
 * - Hook: "updateWorldTime" (Foundry core)
 * - 0-based month/day indexing in components (JavaScript Date-style)
 * - ATN-managed time (does not override advanceTime)
 * 
 * Integration posture:
 * - Pattern: S&S/D&D5e-style (Foundry worldTime + calendar model)
 * - Read time: game.time.worldTime + game.time.calendar.timeToComponents()
 * - Write time: game.time.advance() (base CalendarAdapter implementation)
 * - Mini Calendar is primarily a calendar configuration provider
 * 
 * Time runner conflict caveat:
 * - Mini Calendar has its own optional time runner (play/stop + timeMultiplier)
 * - If both ATN and MC runners are active simultaneously, they will conflict
 * - Current policy: ATN authoritative by default; document "don't use MC's play button"
 * - Future enhancement: detect MC runner state and add guardrails
 */
export class MCAdapter extends CalendarAdapter {
  constructor() {
    super();
    
    const debug = (() => {
      try { return !!game.settings.get(MODULE_ID, "debug"); } catch { return false; }
    })();
    
    if (debug) console.log(`${MODULE_ID} | [MCAdapter] Initializing...`);
    
    // Verify Mini Calendar is available
    if (!this.isAvailable()) {
      console.warn(`${MODULE_ID} | [MCAdapter] ⚠ Mini Calendar not available at instantiation time`);
    } else {
      if (debug) console.log(`${MODULE_ID} | [MCAdapter] ✓ Mini Calendar API verified available`);
    }
  }

  /**
   * Get reference to Mini Calendar API.
   * @returns {object|null} MC API object or null
   */
  #getAPI() {
    return game.modules.get("wgtgm-mini-calendar")?.api || null;
  }

  /**
   * Get reference to Mini Calendar instance (note the spelling: Calender).
   * @returns {object|null} MC instance or null
   */
  #getInstance() {
    return game.wgtngmMiniCalender || null;
  }

  /**
   * Get reference to Foundry's calendar (configured by Mini Calendar).
   * @returns {object|null} Calendar data model or null
   */
  #getCalendar() {
    return game.time?.calendar || null;
  }

  /**
   * Get calendar configuration.
   * @returns {object|null} Calendar config or null
   */
  #getCalendarConfig() {
    return CONFIG?.time?.worldCalendarConfig ?? null;
  }

  /**
   * Get months array from calendar config.
   * @returns {Array} Array of month objects
   */
  #getMonthsValues() {
    const cfg = this.#getCalendarConfig();
    return cfg?.months?.values ?? [];
  }

  /**
   * Normalize month index (MC uses 0-based).
   * @param {number} rawMonth - Raw month value
   * @param {number} monthsLength - Total number of months
   * @returns {number} Normalized 0-based month index
   */
  #normalizeMonthIndex(rawMonth, monthsLength) {
    const m = Number(rawMonth);
    if (!Number.isFinite(m) || monthsLength <= 0) return 0;
    
    // MC uses 0-based, clamp to valid range
    if (m >= 0 && m < monthsLength) return m;
    if (m >= 1 && m <= monthsLength) return m - 1;
    return 0;
  }

  /**
   * Normalize day of month (MC uses 0-based).
   * @param {number} rawDay - Raw day value
   * @param {number} daysInMonth - Days in month
   * @returns {number} Normalized 1-based day for display
   */
  #normalizeDayOfMonth(rawDay, daysInMonth) {
    const d = Number(rawDay);
    if (!Number.isFinite(d) || !Number.isFinite(daysInMonth) || daysInMonth <= 0) return 1;
    
    // MC uses 0-based internally, convert to 1-based for display
    if (d >= 0 && d < daysInMonth) return d + 1;
    if (d >= 1 && d <= daysInMonth) return d;
    return 1;
  }

  /**
   * Get absolute year (accounting for yearZero).
   * @param {number} rawYear - Raw year value
   * @returns {number} Absolute year
   */
  #getAbsoluteYear(rawYear) {
    const calendar = this.#getCalendar();
    const cfg = this.#getCalendarConfig();
    const year = Number(rawYear);
    const yearZero = Number(cfg?.years?.yearZero ?? calendar?.years?.yearZero ?? 0);
    if (!Number.isFinite(year)) return yearZero;
    if (!Number.isFinite(yearZero)) return year;
    return year + yearZero;
  }

  // ============================================================================
  // INTERFACE IMPLEMENTATION
  // ============================================================================

  get name() {
    return "Mini Calendar";
  }

  get systemId() {
    return "wgtgm-mini-calendar";
  }

  isAvailable() {
    // Check if Mini Calendar module is active
    const mcMod = game.modules.get("wgtgm-mini-calendar");
    if (!mcMod?.active) {
      return false;
    }
    
    // Check if API exists (set during init hook)
    const api = this.#getAPI();
    if (!api) {
      return false;
    }
    
    // Check if calendar has been configured by MC
    // MC sets CONFIG.time.worldCalendarClass and worldCalendarConfig
    const calendar = this.#getCalendar();
    if (!calendar) {
      return false;
    }
    
    const debug = (() => {
      try { return !!game.settings.get(MODULE_ID, "debug"); } catch { return false; }
    })();
    
    if (debug) {
      console.log(`${MODULE_ID} | [MCAdapter] isAvailable: module=${!!mcMod}, api=${!!api}, calendar=${!!calendar}`);
    }
    
    return true;
  }

  formatTimestamp(timestamp) {
    const calendar = this.#getCalendar();
    if (!calendar) {
      const debug = (() => {
        try { return !!game.settings.get(MODULE_ID, "debug"); } catch { return false; }
      })();
      if (debug) console.warn(`${MODULE_ID} | [MCAdapter] formatTimestamp: Calendar not available`);
      return `t+${Math.round(timestamp)}s`;
    }

    try {
      const f = this.formatDateTime(timestamp);
      const date = f?.date || "";
      const time = f?.time || "";
      const sep = (date && time) ? ", " : "";
      return `${date}${sep}${time}`.trim() || `t+${Math.round(timestamp)}s`;
    } catch (e) {
      console.error(`${MODULE_ID} | [MCAdapter] formatTimestamp error:`, e);
      return `t+${Math.round(timestamp)}s`;
    }
  }

  formatDateTime(timestamp) {
    const calendar = this.#getCalendar();
    if (!calendar) {
      return { date: "", time: `t+${Math.round(timestamp)}s` };
    }

    try {
      // Use Mini Calendar's calendar conversion
      const components = (typeof calendar.timeToComponents === "function")
        ? calendar.timeToComponents(timestamp)
        : game.time.components;

      const monthsValues = this.#getMonthsValues();
      const monthIndex = this.#normalizeMonthIndex(components?.month, monthsValues.length);
      const monthData = monthsValues?.[monthIndex];
      
      // Get month name
      let monthName = monthData?.name || `Month ${monthIndex + 1}`;
      
      // Check for intercalary month (special case)
      if (monthData?.intercalary) {
        monthName = monthData?.name || "Intercalary";
      }
      
      // Get day with ordinal suffix (1st, 2nd, 3rd, etc.)
      const daysInMonth = Number(monthData?.days ?? 0);
      const rawDay = components?.dayOfMonth ?? components?.day;
      const day = this.#normalizeDayOfMonth(rawDay, daysInMonth || 30);
      const ordinal = CalendarAdapter.getOrdinalSuffix(day);
      
      // Check if this is an intercalary day (dayOfWeek: -1)
      const isIntercalaryDay = (components?.dayOfWeek === -1);
      
      // Format like: "3rd of Hammer, 1789" or "Intercalary Day, 1789"
      const year = this.#getAbsoluteYear(components?.year);
      let dateStr;
      if (isIntercalaryDay) {
        dateStr = `${monthName} (Intercalary), ${year}`;
      } else {
        dateStr = `${day}${ordinal} of ${monthName}, ${year}`;
      }
      
      // Format time according to user preference
      const timeStr = CalendarAdapter.formatTime(
        components?.hour ?? 0, 
        components?.minute ?? 0, 
        components?.second ?? 0
      );
      
      const debug = (() => {
        try { return !!game.settings.get(MODULE_ID, "debug"); } catch { return false; }
      })();
      
      if (debug) {
        console.log(`${MODULE_ID} | [MCAdapter] formatDateTime(${timestamp}) => date: "${dateStr}", time: "${timeStr}"`);
      }
      
      return {
        date: dateStr,
        time: timeStr
      };
    } catch (e) {
      console.error(`${MODULE_ID} | [MCAdapter] formatDateTime error:`, e);
      return { date: "", time: `t+${Math.round(timestamp)}s` };
    }
  }

  timestampPlusInterval(timestamp, interval) {
    const calendar = this.#getCalendar();
    if (!calendar) {
      console.warn(`${MODULE_ID} | [MCAdapter] timestampPlusInterval: Calendar not available, using fallback`);
      return this.#fallbackIntervalAdd(timestamp, interval);
    }

    try {
      const normalized = this.normalizeInterval(interval);
      
      const debug = (() => {
        try { return !!game.settings.get(MODULE_ID, "debug"); } catch { return false; }
      })();
      
      if (debug) {
        console.log(`${MODULE_ID} | [MCAdapter] timestampPlusInterval(${timestamp}, ${JSON.stringify(normalized)})`);
      }
      
      // Prefer documented CalendarData API if available (like D&D5e)
      if (typeof calendar.add === "function" && typeof calendar.componentsToTime === "function") {
        const comps = calendar.add(timestamp, normalized);
        const result = calendar.componentsToTime(comps);
        
        if (debug) {
          console.log(`${MODULE_ID} | [MCAdapter]   => ${result} (via calendar.add)`);
        }
        
        return result;
      }

      // Fallback: manual calculation
      // MC's calendar may not implement add(), so calculate manually
      let seconds = timestamp;
      seconds += (normalized.second || 0);
      seconds += (normalized.minute || 0) * 60;
      seconds += (normalized.hour || 0) * 3600;
      
      // For days/months/years, we need to be more careful
      // Use conservative estimates or try to use calendar data
      const cfg = this.#getCalendarConfig();
      const secondsPerDay = (cfg?.days?.hoursPerDay || 24) * 
                            (cfg?.days?.minutesPerHour || 60) * 
                            (cfg?.days?.secondsPerMinute || 60);
      
      seconds += (normalized.day || 0) * secondsPerDay;
      
      // For months/years, use very conservative estimates
      // TODO: This could be improved by walking through actual month lengths
      seconds += (normalized.month || 0) * 30 * secondsPerDay;
      seconds += (normalized.year || 0) * 365 * secondsPerDay;
      
      if (debug) {
        console.log(`${MODULE_ID} | [MCAdapter]   => ${seconds} (via manual calculation)`);
      }
      
      return seconds;
    } catch (e) {
      console.error(`${MODULE_ID} | [MCAdapter] timestampPlusInterval error:`, e);
      return this.#fallbackIntervalAdd(timestamp, interval);
    }
  }

  dateToTimestamp(dateObj) {
    const calendar = this.#getCalendar();
    if (!calendar) {
      console.warn(`${MODULE_ID} | [MCAdapter] dateToTimestamp: Calendar not available`);
      return game.time.worldTime;
    }

    try {
      // Use calendar's componentsToTime if available
      if (typeof calendar.componentsToTime === "function") {
        // MC expects 0-based month and day, convert if needed
        const components = {
          year: dateObj.year ?? 0,
          month: (dateObj.month ?? 1) - 1, // Convert 1-based to 0-based
          day: (dateObj.day ?? 1) - 1,     // Convert 1-based to 0-based
          hour: dateObj.hour ?? 0,
          minute: dateObj.minute ?? 0,
          second: dateObj.second ?? 0
        };
        
        return calendar.componentsToTime(components);
      }
      
      return game.time.worldTime;
    } catch (e) {
      console.error(`${MODULE_ID} | [MCAdapter] dateToTimestamp error:`, e);
      return game.time.worldTime;
    }
  }

  getCurrentDate() {
    const calendar = this.#getCalendar();
    if (!calendar) return this.timestampToDate(game.time.worldTime);

    try {
      // Use current world time and convert to components
      return this.timestampToDate(game.time.worldTime);
    } catch (e) {
      console.error(`${MODULE_ID} | [MCAdapter] getCurrentDate error:`, e);
      return this.timestampToDate(game.time.worldTime);
    }
  }

  timestampToDate(timestamp) {
    const calendar = this.#getCalendar();
    if (!calendar) {
      return {
        year: 0,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: Math.floor(timestamp)
      };
    }

    try {
      const components = (typeof calendar.timeToComponents === "function")
        ? calendar.timeToComponents(timestamp)
        : game.time.components;

      const monthsValues = this.#getMonthsValues();
      const monthIndex = this.#normalizeMonthIndex(components?.month, monthsValues.length);
      const monthData = monthsValues?.[monthIndex];
      const daysInMonth = Number(monthData?.days ?? 0);
      const rawDay = components?.dayOfMonth ?? components?.day;

      // Return 1-based month/day for ATN compatibility
      return {
        year: this.#getAbsoluteYear(components?.year),
        month: monthIndex + 1,  // Convert 0-based to 1-based
        day: this.#normalizeDayOfMonth(rawDay, daysInMonth || 30),
        hour: components?.hour ?? 0,
        minute: components?.minute ?? 0,
        second: components?.second ?? 0
      };
    } catch (e) {
      console.error(`${MODULE_ID} | [MCAdapter] timestampToDate error:`, e);
      return {
        year: 0,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: Math.floor(timestamp)
      };
    }
  }

  normalizeInterval(interval) {
    if (interval == null) return {};
    if (typeof interval === "number") {
      return { second: interval };
    }

    // Map plural/variant keys to singular keys (consistent with other adapters)
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
    const calendar = this.#getCalendar();
    const cfg = this.#getCalendarConfig();
    
    if (!calendar || !cfg) {
      console.warn(`${MODULE_ID} | [MCAdapter] getCalendarData: Calendar/config not available, using fallback`);
      return {
        name: "Unknown Calendar",
        months: ["Month 1"],
        monthsInYear: 1,
        daysPerMonth: [30],
        weekdays: ["Day 1"],
        daysPerWeek: 1,
        leapYearRule: "Unknown"
      };
    }

    try {
      const monthsValues = this.#getMonthsValues();
      const monthNames = monthsValues.map(m => m.name || "Unnamed");
      const daysPerMonth = monthsValues.map(m => Number(m.days) || 30);
      
      // Get weekday configuration
      const weekdays = cfg?.days?.weekdays || ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"];
      
      // Get leap year rule description
      let leapYearRule = "None";
      if (cfg?.years?.leapYear) {
        const leap = cfg.years.leapYear;
        if (leap.leapInterval) {
          leapYearRule = `Every ${leap.leapInterval} years`;
          
          // Special handling for Gregorian preset
          if (cfg.id === "gregorian-preset") {
            leapYearRule = "Gregorian (every 4 years, except centuries not divisible by 400)";
          }
        }
      }
      
      const debug = (() => {
        try { return !!game.settings.get(MODULE_ID, "debug"); } catch { return false; }
      })();
      
      if (debug) {
        console.log(`${MODULE_ID} | [MCAdapter] getCalendarData:`, {
          name: cfg.name || "Mini Calendar",
          monthsInYear: monthNames.length,
          daysPerWeek: weekdays.length,
          leapYearRule
        });
      }
      
      return {
        name: cfg.name || "Mini Calendar",
        months: monthNames,
        monthsInYear: monthNames.length,
        daysPerMonth: daysPerMonth,
        weekdays: weekdays,
        daysPerWeek: weekdays.length,
        leapYearRule: leapYearRule
      };
    } catch (e) {
      console.error(`${MODULE_ID} | [MCAdapter] getCalendarData error:`, e);
      return {
        name: "Error",
        months: ["Month 1"],
        monthsInYear: 1,
        daysPerMonth: [30],
        weekdays: ["Day 1"],
        daysPerWeek: 1,
        leapYearRule: "Error"
      };
    }
  }

  getClockStatus() {
    const instance = this.#getInstance();
    
    // Mini Calendar has its own time runner with timeIsRunning setting
    // However, we don't control it from ATN - ATN has its own realtime clock
    // Return a status that reflects whether MC's runner is active
    try {
      // Check if MC's time runner is active via its settings
      const timeIsRunning = game.settings?.get?.("wgtgm-mini-calendar", "timeIsRunning") ?? false;
      
      const debug = (() => {
        try { return !!game.settings.get(MODULE_ID, "debug"); } catch { return false; }
      })();
      
      if (debug && timeIsRunning) {
        console.warn(`${MODULE_ID} | [MCAdapter] ⚠ Mini Calendar's internal time runner is active - potential conflict with ATN realtime clock`);
      }
      
      return {
        running: timeIsRunning,
        paused: !timeIsRunning
      };
    } catch (e) {
      // Setting not available or error reading it
      return {
        running: false,
        paused: true
      };
    }
  }

  // Note: advanceTime() is NOT overridden
  // Uses base CalendarAdapter.advanceTime(seconds) which calls game.time.advance(seconds)
  // This is the correct approach for Mini Calendar (ATN-managed time, Pattern 2: S&S/D&D5e-style)

  // ============================================================================
  // FALLBACK HELPER
  // ============================================================================

  /**
   * Fallback interval addition when calendar API is unavailable.
   * Uses conservative estimates for time calculations.
   * 
   * @param {number} timestamp - Starting timestamp
   * @param {object} interval - Normalized interval object
   * @returns {number} New timestamp
   */
  #fallbackIntervalAdd(timestamp, interval) {
    const normalized = this.normalizeInterval(interval);
    
    let seconds = timestamp;
    seconds += (normalized.second || 0);
    seconds += (normalized.minute || 0) * 60;
    seconds += (normalized.hour || 0) * 3600;
    seconds += (normalized.day || 0) * 86400;      // 24-hour days
    seconds += (normalized.month || 0) * 2592000;   // 30-day months
    seconds += (normalized.year || 0) * 31536000;   // 365-day years
    
    return seconds;
  }
}

// ============================================================================
// SELF-REGISTRATION
// ============================================================================

// Register adapter for factory pattern
if (!window.AboutTimeNext) window.AboutTimeNext = {};
if (!window.AboutTimeNext.adapters) window.AboutTimeNext.adapters = {};
window.AboutTimeNext.adapters.MCAdapter = MCAdapter;

// Export for use in other modules
export default MCAdapter;
