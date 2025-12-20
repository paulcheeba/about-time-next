// module/calendar/Dnd5eAdapter.js
// v13.4.0.0 — D&D 5e Calendar integration adapter
// Wraps D&D 5e v5.2.0+ calendar system and provides unified interface via CalendarAdapter

import { CalendarAdapter } from "./CalendarAdapter.js";
import { MODULE_ID } from "../settings.js";

/**
 * Adapter for D&D 5e Calendar System (v5.2.0+).
 * 
 * Key characteristics:
 * - Uses Foundry's core CalendarData API
 * - Global: game.time.calendar
 * - Hook: "updateWorldTime" (enhanced with dnd5e.deltas)
 * - Built-in calendars: Gregorian, Greyhawk, Harptos, Khorvaire
 * - Requires D&D 5e system v5.2.0+ and calendar configured in settings
 */
export class Dnd5eAdapter extends CalendarAdapter {
  constructor() {
    super();
  }

  /**
   * Get reference to D&D 5e Calendar API.
   * @returns {object|null} Calendar data model or null
   */
  #getCalendar() {
    return game.time?.calendar || null;
  }

  // ============================================================================
  // INTERFACE IMPLEMENTATION
  // ============================================================================

  get name() {
    return "D&D 5e Calendar";
  }

  get systemId() {
    return "dnd5e";
  }

  isAvailable() {
    // Check if D&D 5e system is active
    if (game.system?.id !== "dnd5e") {
      return false;
    }

    // Check if calendar is configured (requires 5.2.0+)
    try {
      const calendarId = game.settings.get("dnd5e", "calendar");
      if (!calendarId) return false;
    } catch (e) {
      // Setting doesn't exist, likely pre-5.2.0
      return false;
    }

    // Check if calendar data model exists at game.time.calendar
    return !!game.time?.calendar;
  }

  formatTimestamp(timestamp) {
    const calendar = this.#getCalendar();
    if (!calendar) {
      console.warn(`${MODULE_ID} | [Dnd5eAdapter] formatTimestamp: Calendar not available`);
      return `t+${Math.round(timestamp)}s`;
    }

    try {
      // For current time, use game.time.components
      // For other timestamps, calculate offset from current time
      const currentTime = game.time.worldTime;
      const components = game.time.components;
      
      if (Math.abs(timestamp - currentTime) < 1) {
        // Current time - use components directly
        return calendar.format(components, "timestamp");
      } else {
        // Different timestamp - calculate offset and use simple format
        const offset = timestamp - currentTime;
        return `t+${Math.round(offset)}s`;
      }
    } catch (e) {
      console.error(`${MODULE_ID} | [Dnd5eAdapter] formatTimestamp error:`, e);
      return `t+${Math.round(timestamp)}s`;
    }
  }

  formatDateTime(timestamp) {
    const calendar = this.#getCalendar();
    if (!calendar) {
      return { date: "", time: `t+${Math.round(timestamp)}s` };
    }

    try {
      // For current time, use game.time.components
      const components = game.time.components;
      
      // Get month name from calendar configuration
      const calendarConfig = CONFIG.time.worldCalendarConfig;
      const monthData = calendarConfig?.months?.values?.[components.month - 1];
      let monthName = monthData?.name || `Month ${components.month}`;
      
      // Localize if it's a localization key
      if (monthName.includes('.')) {
        monthName = game.i18n.localize(monthName);
      }
      
      // Format like S&S: "Day MonthName, Year"
      const dateStr = `${components.dayOfMonth} ${monthName}, ${components.year}`;
      
      // Format time: "HH:MM:SS"
      const timeStr = `${String(components.hour).padStart(2, '0')}:${String(components.minute).padStart(2, '0')}:${String(components.second).padStart(2, '0')}`;
      
      return {
        date: dateStr,
        time: timeStr
      };
    } catch (e) {
      console.error(`${MODULE_ID} | [Dnd5eAdapter] formatDateTime error:`, e);
      return { date: "", time: `t+${Math.round(timestamp)}s` };
    }
  }

  timestampPlusInterval(timestamp, interval) {
    const calendar = this.#getCalendar();
    if (!calendar) {
      console.warn(`${MODULE_ID} | [Dnd5eAdapter] timestampPlusInterval: Calendar not available, using fallback`);
      return this.#fallbackIntervalAdd(timestamp, interval);
    }

    try {
      const normalized = this.normalizeInterval(interval);
      
      // Use calendar.offset() to add interval to timestamp
      const result = calendar.offset(timestamp, normalized);
      
      return result;
    } catch (e) {
      console.error(`${MODULE_ID} | [Dnd5eAdapter] timestampPlusInterval error:`, e);
      return this.#fallbackIntervalAdd(timestamp, interval);
    }
  }

  timestampToDate(timestamp) {
    const calendar = this.#getCalendar();
    if (!calendar) {
      console.warn(`${MODULE_ID} | [Dnd5eAdapter] timestampToDate: Calendar not available`);
      return { year: 0, month: 1, day: 1, hour: 0, minute: 0, second: 0 };
    }

    try {
      // Use game.time.components for current time
      const components = game.time.components;
      
      // Return components (month is already 1-based in Foundry v13)
      return {
        year: components.year || 0,
        month: components.month || 1,
        day: components.dayOfMonth || 1,
        hour: components.hour || 0,
        minute: components.minute || 0,
        second: components.second || 0
      };
    } catch (e) {
      console.error(`${MODULE_ID} | [Dnd5eAdapter] timestampToDate error:`, e);
      return { year: 0, month: 1, day: 1, hour: 0, minute: 0, second: Math.floor(timestamp) };
    }
  }

  normalizeInterval(interval) {
    if (interval == null) return {};
    if (typeof interval === "number") {
      return { second: interval };
    }

    // Map plural/variant keys to singular keys
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
    if (!calendar) {
      console.warn(`${MODULE_ID} | [Dnd5eAdapter] getCalendarData: Calendar not available, using fallback`);
      return this.#getFallbackCalendarData();
    }

    try {
      console.log(`${MODULE_ID} | [Dnd5eAdapter] getCalendarData: Querying D&D 5e for calendar structure...`);
      
      // Extract calendar structure from D&D 5e calendar model
      const months = [];
      if (calendar.months) {
        for (let i = 0; i < calendar.months.length; i++) {
          const month = calendar.months[i];
          months.push({
            name: month.name || `Month ${i + 1}`,
            days: month.days || 30,
            month: i + 1  // 1-based for our API
          });
        }
      }

      const data = {
        months,
        monthsInYear: months.length,
        daysInWeek: calendar.days?.length || 7,
        hoursInDay: 24,
        minutesInHour: 60,
        secondsInMinute: 60,
        secondsInCombatRound: 6
      };

      console.log(`${MODULE_ID} | [Dnd5eAdapter] getCalendarData: Retrieved data:`, data);
      return data;
    } catch (e) {
      console.error(`${MODULE_ID} | [Dnd5eAdapter] getCalendarData error:`, e);
      return this.#getFallbackCalendarData();
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Fallback for interval addition when calendar unavailable.
   */
  #fallbackIntervalAdd(timestamp, interval) {
    const normalized = this.normalizeInterval(interval);
    let seconds = timestamp;
    
    seconds += (normalized.second || 0);
    seconds += (normalized.minute || 0) * 60;
    seconds += (normalized.hour || 0) * 3600;
    seconds += (normalized.day || 0) * 86400;
    seconds += (normalized.month || 0) * 30 * 86400;  // Approximate
    seconds += (normalized.year || 0) * 365 * 86400;  // Approximate
    
    return seconds;
  }

  /**
   * Fallback calendar data when calendar unavailable.
   */
  #getFallbackCalendarData() {
    return {
      months: [
        { name: "January", days: 31, month: 1 },
        { name: "February", days: 28, month: 2 },
        { name: "March", days: 31, month: 3 },
        { name: "April", days: 30, month: 4 },
        { name: "May", days: 31, month: 5 },
        { name: "June", days: 30, month: 6 },
        { name: "July", days: 31, month: 7 },
        { name: "August", days: 31, month: 8 },
        { name: "September", days: 30, month: 9 },
        { name: "October", days: 31, month: 10 },
        { name: "November", days: 30, month: 11 },
        { name: "December", days: 31, month: 12 }
      ],
      monthsInYear: 12,
      daysInWeek: 7,
      hoursInDay: 24,
      minutesInHour: 60,
      secondsInMinute: 60,
      secondsInCombatRound: 6
    };
  }
}

// Self-register adapter class (required for factory pattern)
if (!window.AboutTimeNext) window.AboutTimeNext = {};
if (!window.AboutTimeNext.adapters) window.AboutTimeNext.adapters = {};
window.AboutTimeNext.adapters.Dnd5eAdapter = Dnd5eAdapter;
