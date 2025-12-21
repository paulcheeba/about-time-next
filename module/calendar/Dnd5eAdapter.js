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

  #getCalendarConfig() {
    return CONFIG?.time?.worldCalendarConfig ?? null;
  }

  #getMonthsValues() {
    const calendar = this.#getCalendar();
    const cfg = this.#getCalendarConfig();
    return cfg?.months?.values ?? calendar?.months?.values ?? [];
  }

  #normalizeMonthIndex(rawMonth, monthsLength) {
    const m = Number(rawMonth);
    if (!Number.isFinite(m) || monthsLength <= 0) return 0;

    // Prefer 0-based if it fits.
    if (m >= 0 && m < monthsLength) return m;
    // Fall back to 1-based.
    if (m >= 1 && m <= monthsLength) return m - 1;
    return 0;
  }

  #normalizeDayOfMonth(rawDay, daysInMonth) {
    const d = Number(rawDay);
    if (!Number.isFinite(d) || !Number.isFinite(daysInMonth) || daysInMonth <= 0) return 1;

    // Prefer 0-based if it fits.
    if (d >= 0 && d < daysInMonth) return d + 1;
    // Fall back to 1-based.
    if (d >= 1 && d <= daysInMonth) return d;
    return 1;
  }

  #getAbsoluteYear(rawYear) {
    const calendar = this.#getCalendar();
    const year = Number(rawYear);
    const yearZero = Number(calendar?.years?.yearZero ?? 0);
    if (!Number.isFinite(year)) return yearZero;
    if (!Number.isFinite(yearZero)) return year;
    return year + yearZero;
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
      const f = this.formatDateTime(timestamp);
      const date = f?.date || "";
      const time = f?.time || "";
      const sep = (date && time) ? ", " : "";
      return `${date}${sep}${time}`.trim() || `t+${Math.round(timestamp)}s`;
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
      const components = (typeof calendar.timeToComponents === "function")
        ? calendar.timeToComponents(timestamp)
        : game.time.components;

      const monthsValues = this.#getMonthsValues();
      const monthIndex = this.#normalizeMonthIndex(components?.month, monthsValues.length);
      const monthData = monthsValues?.[monthIndex];
      let monthName = monthData?.name || `Month ${monthIndex + 1}`;
      
      // Localize if it's a localization key
      if (monthName.includes('.')) {
        monthName = game.i18n.localize(monthName);
      }
      
      // Get day with ordinal suffix (1st, 2nd, 3rd, etc.)
      const daysInMonth = Number(monthData?.days ?? 0);
      const rawDay = components?.dayOfMonth ?? components?.day;
      const day = this.#normalizeDayOfMonth(rawDay, daysInMonth || 30);
      const ordinal = CalendarAdapter.getOrdinalSuffix(day);
      
      // Format like: "3rd of Hammer, 1789"
      const year = this.#getAbsoluteYear(components?.year);
      const dateStr = `${day}${ordinal} of ${monthName}, ${year}`;
      
      // Format time according to user preference
      const timeStr = CalendarAdapter.formatTime(components?.hour ?? 0, components?.minute ?? 0, components?.second ?? 0);
      
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

      // Prefer documented CalendarData API.
      if (typeof calendar.add === "function" && typeof calendar.componentsToTime === "function") {
        const comps = calendar.add(timestamp, normalized);
        return calendar.componentsToTime(comps);
      }

      // Back-compat / non-standard calendar models.
      if (typeof calendar.offset === "function") {
        return calendar.offset(timestamp, normalized);
      }

      return this.#fallbackIntervalAdd(timestamp, interval);
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
      const components = (typeof calendar.timeToComponents === "function")
        ? calendar.timeToComponents(timestamp)
        : game.time.components;

      const monthsValues = this.#getMonthsValues();
      const monthIndex = this.#normalizeMonthIndex(components?.month, monthsValues.length);
      const monthData = monthsValues?.[monthIndex];
      const daysInMonth = Number(monthData?.days ?? 0);
      const rawDay = components?.dayOfMonth ?? components?.day;

      return {
        year: this.#getAbsoluteYear(components?.year),
        month: monthIndex + 1, // return 1-based
        day: this.#normalizeDayOfMonth(rawDay, daysInMonth || 30),
        hour: components?.hour ?? 0,
        minute: components?.minute ?? 0,
        second: components?.second ?? 0
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
      try {
        if (game.settings.get(MODULE_ID, "debug")) console.log(`${MODULE_ID} | [Dnd5eAdapter] getCalendarData: Querying D&D 5e for calendar structure...`);
      } catch {
        // ignore
      }
      
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

      try {
        if (game.settings.get(MODULE_ID, "debug")) console.log(`${MODULE_ID} | [Dnd5eAdapter] getCalendarData: Retrieved data:`, data);
      } catch {
        // ignore
      }
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
