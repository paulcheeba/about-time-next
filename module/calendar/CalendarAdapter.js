// module/calendar/CalendarAdapter.js
// v13.3.1.0 — Abstract base class for calendar system adapters
// Provides factory pattern for detecting and instantiating calendar adapters

import { MODULE_ID } from "../settings.js";

/**
 * Abstract base class for calendar system adapters.
 * Provides unified interface for Simple Calendar, Seasons & Stars, and future calendar systems.
 * 
 * Architecture:
 * - Factory pattern via static getActive() method
 * - Detection via static detectAvailable() method
 * - Each calendar system implements this interface in a separate adapter
 * - Adapters handle system-specific quirks (indexing, async methods, etc.)
 */
export class CalendarAdapter {
  /**
   * Cached active adapter instance.
   * @type {CalendarAdapter|null}
   */
  static #activeAdapter = null;

  /**
   * Force refresh of active adapter (clears cache).
   * Useful after settings change or module activation.
   */
  static refresh() {
    CalendarAdapter.#activeAdapter = null;
  }

  /**
   * Get the currently active calendar adapter based on settings.
   * Returns null if no calendar system is configured or available.
   * 
   * @returns {CalendarAdapter|null} Active adapter instance or null
   */
  static getActive() {
    // Return cached adapter if available
    if (CalendarAdapter.#activeAdapter !== null) {
      return CalendarAdapter.#activeAdapter;
    }


    // Get user's calendar system preference
    let preference = "auto";
    try {
      preference = game.settings.get(MODULE_ID, "calendar-system") || "auto";
    } catch (e) {
      // Setting doesn't exist yet (during migration/first run)
      // Fall back to legacy setting
      try {
        const legacyUseSC = game.settings.get(MODULE_ID, "use-simple-calendar");
        if (legacyUseSC === false) preference = "none";
        // If true, let auto-detection handle it
      } catch {
        // No settings at all, use auto
      }
    }

    // Detect available calendar systems
    const available = CalendarAdapter.detectAvailable();

    // Resolve "auto" preference on first run
    let choice = preference;
    if (choice === "auto") {
      choice = available[0] || "none";
      
      // Try to persist the auto-detected choice
      try {
        game.settings.set(MODULE_ID, "calendar-system", choice);
      } catch (e) {
        // Setting not registered yet
      }
    }

    // If user chose a system that's not available, fall back to first available
    if (choice !== "none" && !available.includes(choice)) {
      console.warn(`${MODULE_ID} | Calendar system "${choice}" not available, using "${available[0] || "none"}"`);
      choice = available[0] || "none";
    }

    // Instantiate appropriate adapter
    if (choice === "none") {
      CalendarAdapter.#activeAdapter = null;
      return null;
    }

    // Import and instantiate adapters dynamically
    // Note: Actual adapter classes must be imported at top of file
    // This factory pattern will be completed by adapter implementations
    try {
      switch (choice) {
        case "dnd5e":
          if (window.AboutTimeNext?.adapters?.Dnd5eAdapter) {
            CalendarAdapter.#activeAdapter = new window.AboutTimeNext.adapters.Dnd5eAdapter();
            console.log(`${MODULE_ID} | Loaded calendar adapter: D&D 5e Calendar`);
          } else {
            console.warn(`${MODULE_ID} | Dnd5eAdapter class not found`);
            CalendarAdapter.#activeAdapter = null;
          }
          break;
        
        case "simple-calendar":
          if (window.AboutTimeNext?.adapters?.SimpleCalendarAdapter) {
            CalendarAdapter.#activeAdapter = new window.AboutTimeNext.adapters.SimpleCalendarAdapter();
            console.log(`${MODULE_ID} | Loaded calendar adapter: Simple Calendar`);
          } else {
            console.warn(`${MODULE_ID} | SimpleCalendarAdapter class not found`);
            CalendarAdapter.#activeAdapter = null;
          }
          break;
        
        case "seasons-and-stars":
          if (window.AboutTimeNext?.adapters?.SandSAdapter) {
            CalendarAdapter.#activeAdapter = new window.AboutTimeNext.adapters.SandSAdapter();
            console.log(`${MODULE_ID} | Loaded calendar adapter: Seasons & Stars`);
          } else {
            console.warn(`${MODULE_ID} | SandSAdapter class not found`);
            CalendarAdapter.#activeAdapter = null;
          }
          break;
        
        default:
          console.warn(`${MODULE_ID} | Unknown calendar system: ${choice}`);
          CalendarAdapter.#activeAdapter = null;
      }
    } catch (e) {
      console.error(`${MODULE_ID} | Failed to instantiate calendar adapter:`, e);
      CalendarAdapter.#activeAdapter = null;
    }

    return CalendarAdapter.#activeAdapter;
  }

  /**
   * Detect which calendar systems are currently available (installed & active).
   * 
   * @returns {string[]} Array of available system IDs: ["dnd5e", "simple-calendar", "seasons-and-stars"]
   */
  static detectAvailable() {
    const available = [];

    // Check D&D 5e Calendar (v5.2.0+) - PRIORITY: native system calendar
    const isDnd5e = game.system?.id === "dnd5e";
    let dnd5eCalendarAvailable = false;
    if (isDnd5e) {
      try {
        // Check if calendar setting exists and is configured
        const calendarSetting = game.settings.get("dnd5e", "calendar");
        // Calendar is at game.time.calendar in Foundry v13+
        dnd5eCalendarAvailable = !!(calendarSetting && game.time?.calendar);
      } catch (e) {
        // Setting doesn't exist, likely pre-5.2.0
      }
    }
    if (isDnd5e && dnd5eCalendarAvailable) {
      available.push("dnd5e");
    }

    // Check Simple Calendar (two possible module IDs)
    const scMod = game.modules.get("foundryvtt-simple-calendar") 
               ?? game.modules.get("simple-calendar");
    if (scMod?.active && globalThis.SimpleCalendar?.api) {
      available.push("simple-calendar");
    }

    // Check Seasons & Stars (API is at game.seasonsStars.api, not game.seasonsStars directly)
    const ssMod = game.modules.get("seasons-and-stars");
    if (ssMod?.active && game.seasonsStars?.api?.getCurrentDate) {
      available.push("seasons-and-stars");
    }

    if (available.length > 0) {
      console.log(`${MODULE_ID} | Detected calendars: ${available.join(', ')}`);
    }
    return available;
  }

  /**
   * Get detection results as an object with boolean properties (helper for UI/migration).
   * @returns {{dnd5e: boolean, simpleCalendar: boolean, seasonsStars: boolean}}
   */
  static detectAvailableAsObject() {
    const available = CalendarAdapter.detectAvailable();
    return {
      dnd5e: available.includes("dnd5e"),
      simpleCalendar: available.includes("simple-calendar"),
      seasonsStars: available.includes("seasons-and-stars")
    };
  }

  /**
   * Get human-readable name for a calendar system ID.
   * 
   * @param {string} systemId - Calendar system ID
   * @returns {string} Display name
   */
  static getSystemName(systemId) {
    const names = {
      "none": "None (Foundry Core Time)",
      "dnd5e": "D&D 5e Calendar (v5.2+)",
      "simple-calendar": "Simple Calendar",
      "seasons-and-stars": "Seasons & Stars",
      "auto": "Auto-detect"
    };
    return names[systemId] || systemId;
  }

  // ============================================================================
  // ABSTRACT METHODS - Must be implemented by subclasses
  // ============================================================================

  /**
   * Get the name of this calendar adapter.
   * @returns {string} Adapter name (e.g., "Simple Calendar", "Seasons & Stars")
   */
  get name() {
    throw new Error("CalendarAdapter.name() must be implemented by subclass");
  }

  /**
   * Get the system ID of this calendar adapter.
   * @returns {string} System ID (e.g., "simple-calendar", "seasons-and-stars")
   */
  get systemId() {
    throw new Error("CalendarAdapter.systemId() must be implemented by subclass");
  }

  /**
   * Format a timestamp (worldTime seconds) as a date/time string.
   * 
   * @param {number} timestamp - World time in seconds
   * @returns {string} Formatted date/time string
   */
  formatTimestamp(timestamp) {
    throw new Error("CalendarAdapter.formatTimestamp() must be implemented by subclass");
  }

  /**
   * Format a timestamp as separate date and time components.
   * 
   * @param {number} timestamp - World time in seconds
   * @returns {{date: string, time: string}} Formatted date and time
   */
  formatDateTime(timestamp) {
    throw new Error("CalendarAdapter.formatDateTime() must be implemented by subclass");
  }

  /**
   * Add an interval to a timestamp and return the new timestamp.
   * 
   * @param {number} timestamp - Starting timestamp in seconds
   * @param {object} interval - Interval object: {year, month, day, hour, minute, second}
   * @returns {number} New timestamp after adding interval
   */
  timestampPlusInterval(timestamp, interval) {
    throw new Error("CalendarAdapter.timestampPlusInterval() must be implemented by subclass");
  }

  /**
   * Convert a date object to a timestamp.
   * 
   * @param {object} dateObj - Date object with calendar-specific structure
   * @returns {number} Timestamp in seconds
   */
  dateToTimestamp(dateObj) {
    throw new Error("CalendarAdapter.dateToTimestamp() must be implemented by subclass");
  }

  /**
   * Get the current date/time from the calendar system.
   * 
   * @returns {object} Current date object with calendar-specific structure
   */
  getCurrentDate() {
    throw new Error("CalendarAdapter.getCurrentDate() must be implemented by subclass");
  }

  /**
   * Convert a timestamp to a date object.
   * 
   * @param {number} timestamp - World time in seconds
   * @returns {object} Date object with calendar-specific structure
   */
  timestampToDate(timestamp) {
    throw new Error("CalendarAdapter.timestampToDate() must be implemented by subclass");
  }

  /**
   * Normalize an interval object to singular keys.
   * Handles plural forms (years → year, months → month, etc.)
   * 
   * @param {object|number} interval - Interval object or seconds
   * @returns {object} Normalized interval with singular keys
   */
  normalizeInterval(interval) {
    throw new Error("CalendarAdapter.normalizeInterval() must be implemented by subclass");
  }

  /**
   * Get calendar metadata for rendering a date picker.
   * Returns structure information about the active calendar.
   * 
   * @returns {object} Calendar structure:
   *   - name: Calendar name (e.g., "Gregorian", "Harptos")
   *   - months: Array of month names
   *   - monthsInYear: Number of months
   *   - daysPerMonth: Array of day counts per month
   *   - weekdays: Array of weekday names
   *   - daysPerWeek: Number of days per week
   *   - leapYearRule: Description of leap year rule (if any)
   */
  getCalendarData() {
    throw new Error("CalendarAdapter.getCalendarData() must be implemented by subclass");
  }

  /**
   * Get clock running status from the calendar system.
   * 
   * @returns {{running: boolean, paused: boolean}} Clock status
   */
  getClockStatus() {
    throw new Error("CalendarAdapter.getClockStatus() must be implemented by subclass");
  }

  /**
   * Check if this adapter is currently available (module active & API accessible).
   * 
   * @returns {boolean} True if adapter can be used
   */
  isAvailable() {
    throw new Error("CalendarAdapter.isAvailable() must be implemented by subclass");
  }
}

// Export for use in other modules
export default CalendarAdapter;
