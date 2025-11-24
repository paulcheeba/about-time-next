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
    console.log(`${MODULE_ID} | [CalendarAdapter] Refreshing adapter cache`);
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
      console.log(`${MODULE_ID} | [CalendarAdapter] Returning cached adapter: ${CalendarAdapter.#activeAdapter.name}`);
      return CalendarAdapter.#activeAdapter;
    }

    console.log(`${MODULE_ID} | [CalendarAdapter] No cached adapter, initializing...`);


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
    console.log(`${MODULE_ID} | [CalendarAdapter] Detected available systems:`, available);

    // Resolve "auto" preference on first run
    let choice = preference;
    console.log(`${MODULE_ID} | [CalendarAdapter] User preference: "${preference}"`);
    if (choice === "auto") {
      choice = available[0] || "none";
      console.log(`${MODULE_ID} | [CalendarAdapter] Auto-detected choice: "${choice}"`);
      
      // Try to persist the auto-detected choice
      try {
        game.settings.set(MODULE_ID, "calendar-system", choice);
        console.log(`${MODULE_ID} | [CalendarAdapter] Persisted auto-detected choice to settings`);
      } catch (e) {
        console.warn(`${MODULE_ID} | [CalendarAdapter] Could not persist choice (setting not registered yet)`);
      }
    }

    // If user chose a system that's not available, fall back to first available
    if (choice !== "none" && !available.includes(choice)) {
      console.warn(`${MODULE_ID} | Calendar system "${choice}" not available. Available: ${available.join(", ")}`);
      choice = available[0] || "none";
    }

    // Instantiate appropriate adapter
    if (choice === "none") {
      console.log(`${MODULE_ID} | [CalendarAdapter] Choice is "none", no adapter loaded`);
      CalendarAdapter.#activeAdapter = null;
      return null;
    }

    console.log(`${MODULE_ID} | [CalendarAdapter] Attempting to instantiate adapter: "${choice}"`);


    // Import and instantiate adapters dynamically
    // Note: Actual adapter classes must be imported at top of file
    // This factory pattern will be completed by adapter implementations
    try {
      switch (choice) {
        case "simple-calendar":
          // SimpleCalendarAdapter will register itself
          if (window.AboutTimeNext?.adapters?.SimpleCalendarAdapter) {
            console.log(`${MODULE_ID} | [CalendarAdapter] Instantiating SimpleCalendarAdapter`);
            CalendarAdapter.#activeAdapter = new window.AboutTimeNext.adapters.SimpleCalendarAdapter();
            console.log(`${MODULE_ID} | [CalendarAdapter] ✓ SimpleCalendarAdapter instantiated successfully`);
          } else {
            console.warn(`${MODULE_ID} | [CalendarAdapter] SimpleCalendarAdapter class not found in window.AboutTimeNext.adapters`);
            CalendarAdapter.#activeAdapter = null;
          }
          break;
        
        case "seasons-and-stars":
          // SandSAdapter will register itself
          if (window.AboutTimeNext?.adapters?.SandSAdapter) {
            console.log(`${MODULE_ID} | [CalendarAdapter] Instantiating SandSAdapter`);
            CalendarAdapter.#activeAdapter = new window.AboutTimeNext.adapters.SandSAdapter();
            console.log(`${MODULE_ID} | [CalendarAdapter] ✓ SandSAdapter instantiated successfully`);
          } else {
            console.warn(`${MODULE_ID} | [CalendarAdapter] SandSAdapter class not found in window.AboutTimeNext.adapters`);
            CalendarAdapter.#activeAdapter = null;
          }
          break;
        
        default:
          console.warn(`${MODULE_ID} | [CalendarAdapter] Unknown calendar system: ${choice}`);
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
   * @returns {string[]} Array of available system IDs: ["simple-calendar", "seasons-and-stars"]
   */
  static detectAvailable() {
    console.log(`${MODULE_ID} | [CalendarAdapter] Detecting available calendar systems...`);
    const available = [];

    // Check Simple Calendar (two possible module IDs)
    const scMod = game.modules.get("foundryvtt-simple-calendar") 
               ?? game.modules.get("simple-calendar");
    const scActive = scMod?.active ?? false;
    const scApiAvailable = !!(globalThis.SimpleCalendar?.api);
    console.log(`${MODULE_ID} | [CalendarAdapter]   Simple Calendar: module=${scActive ? '✓' : '✗'}, api=${scApiAvailable ? '✓' : '✗'}`);
    if (scMod?.active && globalThis.SimpleCalendar?.api) {
      available.push("simple-calendar");
    }

    // Check Seasons & Stars
    const ssMod = game.modules.get("seasons-and-stars");
    const ssActive = ssMod?.active ?? false;
    const ssApiAvailable = !!(game.seasonsStars?.getCurrentDate);
    console.log(`${MODULE_ID} | [CalendarAdapter]   Seasons & Stars: module=${ssActive ? '✓' : '✗'}, api=${ssApiAvailable ? '✓' : '✗'}`);
    if (ssMod?.active && game.seasonsStars?.getCurrentDate) {
      available.push("seasons-and-stars");
    }

    console.log(`${MODULE_ID} | [CalendarAdapter] Detection complete. Available: [${available.join(', ')}]`);
    return available;
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
