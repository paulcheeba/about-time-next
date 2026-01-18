// module/calendar/CalendarAdapter.js
// v13.5.0.0 — Neutral auto-detection: no calendar hierarchy, user choice for multiple options
// Abstract base class for calendar system adapters with factory pattern

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
  static #debugEnabled() {
    try {
      return !!game.settings.get(MODULE_ID, "debug");
    } catch {
      return false;
    }
  }

  static #lastLoggedInUse = null;

  static #logCalendarInUse(systemId) {
    const id = systemId || "none";
    if (CalendarAdapter.#lastLoggedInUse === id) return;
    CalendarAdapter.#lastLoggedInUse = id;

    // Always-on, low-noise status line for basic troubleshooting.
    try {
      console.info(`${MODULE_ID} | Calendar in use: ${CalendarAdapter.getSystemName(id)}`);
    } catch {
      // ignore
    }
  }

  /**
   * Cached active adapter instance.
   * @type {CalendarAdapter|null}
   */
  static #activeAdapter = null;

  /**
   * Get ordinal suffix for a number (1st, 2nd, 3rd, 4th, etc.)
   * @param {number} num - The number to get suffix for
   * @returns {string} The ordinal suffix with superscript HTML
   */
  static getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return `<sup>st</sup>`;
    if (j === 2 && k !== 12) return `<sup>nd</sup>`;
    if (j === 3 && k !== 13) return `<sup>rd</sup>`;
    return `<sup>th</sup>`;
  }

  /**
   * Format time according to user preference (12-hour or 24-hour)
   * @param {number} hour - Hour (0-23)
   * @param {number} minute - Minute (0-59)
   * @param {number} second - Second (0-59)
   * @returns {string} Formatted time string
   */
  static formatTime(hour, minute, second) {
    let timeFormat = "24";
    try {
      timeFormat = game.settings.get(MODULE_ID, "time-format") || "24";
    } catch (e) {
      // Setting not available yet
    }

    const mm = String(minute).padStart(2, '0');
    const ss = String(second).padStart(2, '0');

    if (timeFormat === "12") {
      const period = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 || 12;
      return `${hour12}:${mm}:${ss} ${period}`;
    } else {
      const hh = String(hour).padStart(2, '0');
      return `${hh}:${mm}:${ss}`;
    }
  }

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
    let preference = "none"; // Default to none (neutral selection)
    try {
      preference = game.settings.get(MODULE_ID, "calendar-system") || "none";
      
      // Migrate legacy "auto" to "none" (auto-detect removed in v13.5.0.0)
      if (preference === "auto") {
        preference = "none";
        try {
          game.settings.set(MODULE_ID, "calendar-system", "none");
        } catch {
          // Ignore migration error
        }
      }
    } catch (e) {
      // Setting doesn't exist yet (during migration/first run)
      // Fall back to legacy setting
      try {
        const legacyUseSC = game.settings.get(MODULE_ID, "use-simple-calendar");
        if (legacyUseSC === false) preference = "none";
        // If true, let neutral selection handle it
      } catch {
        // No settings at all, use none
      }
    }

    // Detect available calendar systems
    const available = CalendarAdapter.detectAvailable();

    // Use preference directly (neutral selection via checkForCalendarChanges dialog)
    let choice = preference;

    // If user chose a system that's not available, fall back to first available
    if (choice !== "none" && !available.includes(choice)) {
      console.warn(`${MODULE_ID} | Calendar system "${choice}" not available, using "${available[0] || "none"}"`);
      choice = available[0] || "none";
    }

    // Instantiate appropriate adapter
    if (choice === "none") {
      CalendarAdapter.#activeAdapter = null;
      CalendarAdapter.#logCalendarInUse("none");
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
            if (CalendarAdapter.#debugEnabled()) console.log(`${MODULE_ID} | Loaded calendar adapter: D&D 5e Calendar`);
          } else {
            console.warn(`${MODULE_ID} | Dnd5eAdapter class not found`);
            CalendarAdapter.#activeAdapter = null;
          }
          break;
        
        case "simple-calendar-reborn":
          if (window.AboutTimeNext?.adapters?.SCRAdapter) {
            CalendarAdapter.#activeAdapter = new window.AboutTimeNext.adapters.SCRAdapter();
            if (CalendarAdapter.#debugEnabled()) console.log(`${MODULE_ID} | Loaded calendar adapter: Simple Calendar Reborn`);
          } else {
            console.warn(`${MODULE_ID} | SCRAdapter class not found`);
            CalendarAdapter.#activeAdapter = null;
          }
          break;
        
        // ========================================================================
        // LEGACY SIMPLE CALENDAR (ARCHIVED - v13 incompatible)
        // Preserved for potential restoration if SC receives v13 update
        // ========================================================================
        // case "simple-calendar":
        //   if (window.AboutTimeNext?.adapters?.SimpleCalendarAdapter) {
        //     CalendarAdapter.#activeAdapter = new window.AboutTimeNext.adapters.SimpleCalendarAdapter();
        //     if (CalendarAdapter.#debugEnabled()) console.log(`${MODULE_ID} | Loaded calendar adapter: Simple Calendar`);
        //   } else {
        //     console.warn(`${MODULE_ID} | SimpleCalendarAdapter class not found`);
        //     CalendarAdapter.#activeAdapter = null;
        //   }
        //   break;
        // ========================================================================
        
        case "seasons-and-stars":
          if (window.AboutTimeNext?.adapters?.SandSAdapter) {
            CalendarAdapter.#activeAdapter = new window.AboutTimeNext.adapters.SandSAdapter();
            if (CalendarAdapter.#debugEnabled()) console.log(`${MODULE_ID} | Loaded calendar adapter: Seasons & Stars`);
          } else {
            console.warn(`${MODULE_ID} | SandSAdapter class not found`);
            CalendarAdapter.#activeAdapter = null;
          }
          break;
        
        case "wgtgm-mini-calendar":
          if (window.AboutTimeNext?.adapters?.MCAdapter) {
            CalendarAdapter.#activeAdapter = new window.AboutTimeNext.adapters.MCAdapter();
            if (CalendarAdapter.#debugEnabled()) console.log(`${MODULE_ID} | Loaded calendar adapter: Mini Calendar`);
          } else {
            console.warn(`${MODULE_ID} | MCAdapter class not found`);
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

    if (CalendarAdapter.#activeAdapter) {
      CalendarAdapter.#logCalendarInUse(CalendarAdapter.#activeAdapter.systemId);
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

    // Highest priority: Seasons & Stars (most specialized)
    const ssMod = game.modules.get("seasons-and-stars");
    if (ssMod?.active && game.seasonsStars?.api?.getCurrentDate) {
      available.push("seasons-and-stars");
    }

    // Simple Calendar Reborn (v13+ compatible fork)
    const scrMod = game.modules.get("foundryvtt-simple-calendar-reborn");
    if (scrMod?.active && globalThis.SimpleCalendar?.api) {
      available.push("simple-calendar-reborn");
    }

    // ========================================================================
    // LEGACY SIMPLE CALENDAR (ARCHIVED - v13 incompatible)
    // Preserved for potential restoration if SC receives v13 update
    // ========================================================================
    // const scMod = game.modules.get("foundryvtt-simple-calendar") 
    //            ?? game.modules.get("simple-calendar");
    // if (scMod?.active && globalThis.SimpleCalendar?.api) {
    //   available.push("simple-calendar");
    // }
    // ========================================================================

    // Mini Calendar (v13.6.0.0) - calendar configuration provider
    const mcMod = game.modules.get("wgtgm-mini-calendar");
    if (mcMod?.active && game.modules.get("wgtgm-mini-calendar")?.api && game.time?.calendar) {
      available.push("wgtgm-mini-calendar");
    }

    // Next priority: D&D 5e Calendar (v5.2.0+) - native system calendar
    const isDnd5e = game.system?.id === "dnd5e";
    if (isDnd5e) {
      try {
        const calendarSetting = game.settings.get("dnd5e", "calendar");
        if (calendarSetting && game.time?.calendar) {
          available.push("dnd5e");
        }
      } catch {
        // Setting doesn't exist, likely pre-5.2.0
      }
    }

    if (available.length > 0) {
      if (CalendarAdapter.#debugEnabled()) console.log(`${MODULE_ID} | Detected calendars: ${available.join(', ')}`);
    }
    return available;
  }

  /**
   * Get detection results as an object with boolean properties (helper for UI/migration).
   * @returns {{dnd5e: boolean, simpleCalendarReborn: boolean, seasonsStars: boolean}}
   */
  static detectAvailableAsObject() {
    const available = CalendarAdapter.detectAvailable();
    return {
      dnd5e: available.includes("dnd5e"),
      simpleCalendarReborn: available.includes("simple-calendar-reborn"),
      // simpleCalendar: available.includes("simple-calendar"), // ARCHIVED
      seasonsStars: available.includes("seasons-and-stars"),
      miniCalendar: available.includes("wgtgm-mini-calendar")
    };
  }

  static #getRecommendation(available) {
    // No hierarchy: any supported calendar > none
    // If multiple calendars available, don't pick one - let user choose
    
    if (available.length === 0) {
      // No calendars available
      return { 
        recommended: "none", 
        bestSet: new Set(["none"]),
        availableOptions: null
      };
    }
    
    if (available.length === 1) {
      // Exactly one calendar available - recommend it
      return {
        recommended: available[0],
        bestSet: new Set(available),
        availableOptions: null
      };
    }
    
    // Multiple calendars available - no automatic preference
    return {
      recommended: null,
      bestSet: new Set(available),
      availableOptions: available
    };
  }

  static async #recommendDialog({ title, content, confirmLabel }) {
    const D2 = foundry?.applications?.api?.DialogV2;
    if (D2) {
      return new Promise((resolve) => {
        let dlg;
        let resolved = false;

        const readSuppress = () => {
          try {
            const root = dlg?.element ?? null;
            const el = root?.querySelector?.('input[name="atn-suppress"]');
            return !!el?.checked;
          } catch {
            return false;
          }
        };

        const finalize = (confirmed) => {
          if (resolved) return;
          resolved = true;
          resolve({ confirmed: !!confirmed, suppress: readSuppress() });
        };

        dlg = new D2({
          window: { title },
          content,
          buttons: [
            {
              action: "yes",
              icon: '<i class="fas fa-check"></i>',
              label: confirmLabel ?? "Switch",
              default: false,
              callback: (_ev, _btn, dialog) => {
                finalize(true);
                try { dialog.close?.(); } catch { /* ignore */ }
              }
            },
            {
              action: "no",
              icon: '<i class="fas fa-times"></i>',
              label: "Keep Current",
              default: true,
              callback: (_ev, _btn, dialog) => {
                finalize(false);
                try { dialog.close?.(); } catch { /* ignore */ }
              }
            }
          ],
          submit: async () => {}
        });

        const _origClose = dlg.close?.bind(dlg);
        dlg.close = async (...args) => {
          try {
            finalize(false);
          } finally {
            return _origClose?.(...args);
          }
        };

        dlg.render({ force: true });
      });
    }

    // Fallback (pre-v13 API): Dialog (V1)
    return new Promise((resolve) => {
      const dlg = new Dialog({
        title,
        content,
        buttons: {
          yes: {
            icon: '<i class="fas fa-check"></i>',
            label: confirmLabel ?? "Switch",
            callback: (html) => {
              const el = html?.[0]?.querySelector?.('input[name="atn-suppress"]');
              resolve({ confirmed: true, suppress: !!el?.checked });
            }
          },
          no: {
            icon: '<i class="fas fa-times"></i>',
            label: "Keep Current",
            callback: (html) => {
              const el = html?.[0]?.querySelector?.('input[name="atn-suppress"]');
              resolve({ confirmed: false, suppress: !!el?.checked });
            }
          }
        },
        default: "no",
        close: () => resolve({ confirmed: false, suppress: false })
      });
      dlg.render(true);
    });
  }

  /**
   * Show selection dialog when multiple calendars are available.
   * Presents all available calendars in alphabetical order with no default selection.
   * 
   * @param {string} selected - Currently selected calendar system
   * @param {string[]} available - Array of available calendar system IDs
   */
  static async #showSelectionDialog(selected, available) {
    const selectedName = CalendarAdapter.getSystemName(selected);
    
    // Build option list sorted alphabetically
    const options = available
      .map(id => ({ id, name: CalendarAdapter.getSystemName(id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    // Render template
    const content = await foundry.applications.handlebars.renderTemplate(
      `modules/${MODULE_ID}/templates/calendarSelection.hbs`,
      { selectedName, options }
    );
    
    const D2 = foundry?.applications?.api?.DialogV2;
    if (D2) {
      return new Promise((resolve) => {
        let dlg;
        let resolved = false;
        
        const readSuppress = () => {
          try {
            const root = dlg?.element ?? null;
            const el = root?.querySelector?.('input[name="atn-suppress"]');
            return !!el?.checked;
          } catch {
            return false;
          }
        };
        
        const readChoice = () => {
          try {
            const root = dlg?.element ?? null;
            const select = root?.querySelector?.('select[name="calendar-choice"]');
            return select?.value || null;
          } catch {
            return null;
          }
        };
        
        const finalize = async (confirmed) => {
          if (resolved) return;
          resolved = true;
          
          const suppress = readSuppress();
          const choice = readChoice();
          
          if (suppress) {
            try {
              await game.settings.set(MODULE_ID, "suppress-calendar-recommendation-for", selected);
            } catch {
              // ignore
            }
          }
          
          if (confirmed && choice) {
            try {
              await game.settings.set(MODULE_ID, "calendar-system", choice);
              CalendarAdapter.refresh();
              ui.notifications.info(`Using ${CalendarAdapter.getSystemName(choice)} calendar data`);
            } catch (e) {
              console.error(`${MODULE_ID} | Failed to switch calendar:`, e);
              ui.notifications.error("Failed to switch calendar system");
            }
          } else if (!confirmed && (selected === "none" || selected === "auto") && available.length > 0) {
            // Only show notification when canceling if user is on "none" and other options exist
            ui.notifications.info("Calendar system remains set to None");
          }
          
          resolve();
        };
        
        dlg = new D2({
          window: { 
            title: "About Time Next: Choose Calendar System",
            minimizable: false,
            resizable: false,
            contentClasses: ["atn-calendar-select"]
          },
          position: {
            width: 300,
            height: "auto"
          },
          content,
          buttons: [
            {
              action: "select",
              icon: '<i class="fas fa-check"></i>',
              label: "Select",
              default: false,
              callback: async (_ev, _btn, dialog) => {
                const choice = readChoice();
                if (!choice) {
                  ui.notifications.warn("Please select a calendar system");
                  return;
                }
                await finalize(true);
                try { dialog.close?.(); } catch { /* ignore */ }
              }
            },
            {
              action: "cancel",
              icon: '<i class="fas fa-times"></i>',
              label: "Cancel",
              default: true,
              callback: async (_ev, _btn, dialog) => {
                await finalize(false);
                try { dialog.close?.(); } catch { /* ignore */ }
              }
            }
          ],
          submit: async () => {}
        });
        
        const _origClose = dlg.close?.bind(dlg);
        dlg.close = async (...args) => {
          try {
            await finalize(false);
          } finally {
            return _origClose?.(...args);
          }
        };
        
        dlg.render({ force: true });
      });
    }
    
    // Fallback for pre-v13 API: Dialog (V1)
    return new Promise((resolve) => {
      const dlg = new Dialog({
        title: "Choose Calendar System",
        content,
        buttons: {
          select: {
            icon: '<i class="fas fa-check"></i>',
            label: "Select",
            callback: async (html) => {
              const select = html?.[0]?.querySelector?.('select[name="calendar-choice"]');
              const choice = select?.value;
              
              if (!choice) {
                ui.notifications.warn("Please select a calendar system");
                resolve();
                return;
              }
              
              const suppressEl = html?.[0]?.querySelector?.('input[name="atn-suppress"]');
              const suppress = !!suppressEl?.checked;
              
              if (suppress) {
                try {
                  await game.settings.set(MODULE_ID, "suppress-calendar-recommendation-for", selected);
                } catch {
                  // ignore
                }
              }
              
              try {
                await game.settings.set(MODULE_ID, "calendar-system", choice);
                CalendarAdapter.refresh();
                ui.notifications.info(`Using ${CalendarAdapter.getSystemName(choice)} calendar data`);
              } catch (e) {
                console.error(`${MODULE_ID} | Failed to switch calendar:`, e);
                ui.notifications.error("Failed to switch calendar system");
              }
              
              resolve();
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: async (html) => {
              const suppressEl = html?.[0]?.querySelector?.('input[name="atn-suppress"]');
              const suppress = !!suppressEl?.checked;
              
              if (suppress) {
                try {
                  await game.settings.set(MODULE_ID, "suppress-calendar-recommendation-for", selected);
                } catch {
                  // ignore
                }
              }
              
              resolve();
            }
          }
        },
        default: "cancel",
        close: () => resolve()
      });
      dlg.render(true);
    });
  }

  /**
   * On-load calendar recommendation.
   * Priority: (S&S or Simple Calendar) > D&D5e v5.2+ > Foundry core time (none).
   *
   * Shows a confirmation dialog and supports "don't show again until selection changes".
   */
  static async checkForCalendarChanges() {
    if (!game.user.isGM) return;

    const available = CalendarAdapter.detectAvailable();
    const { recommended, bestSet } = CalendarAdapter.#getRecommendation(available);

    let selected = "auto";
    try {
      selected = game.settings.get(MODULE_ID, "calendar-system") || "auto";
    } catch {
      // ignore
    }

    let suppressedFor = "";
    try {
      suppressedFor = game.settings.get(MODULE_ID, "suppress-calendar-recommendation-for") || "";
    } catch {
      // ignore
    }

    if (suppressedFor && suppressedFor === selected) return;

    const selectedAvailable = (selected === "auto" || selected === "none") ? true : available.includes(selected);
    
    // Prompt if:
    // 1. User is on "auto" or "none" and calendars are available
    // 2. User's selected calendar is no longer available
    // 3. Multiple calendars are available (recommended is null) - let user know about options
    const hasCalendarsAvailable = available.length > 0;
    const multipleCalendarsAvailable = available.length > 1;
    const userOnDefault = selected === "auto" || selected === "none";
    
    const shouldPrompt = 
      (userOnDefault && hasCalendarsAvailable) ||  // User on auto/none, calendars exist
      !selectedAvailable ||                         // Selected calendar no longer available
      (multipleCalendarsAvailable && recommended === null); // Multiple options, let user choose
    
    if (!shouldPrompt) return;

    const selectedName = CalendarAdapter.getSystemName(selected);
    
    // If recommended is null, we have multiple equivalent options - show selection dialog
    if (recommended === null) {
      await CalendarAdapter.#showSelectionDialog(selected, available);
      return;
    }
    
    const recName = CalendarAdapter.getSystemName(recommended);

    const checkbox = `
      <hr/>
      <label style="display:flex; gap:8px; align-items:center; margin-top:6px;">
        <input type="checkbox" name="atn-suppress" />
        <span>Don't show this again until I change the Calendar System selection</span>
      </label>
    `;

    let title = "Calendar Recommendation";
    let body = "";
    if (!selectedAvailable) {
      title = "Selected Calendar Unavailable";
      body = `<p>Your selected calendar <strong>${selectedName}</strong> is not currently available.</p>
              <p>Recommended: <strong>${recName}</strong></p>`;
    } else if (selected === "auto") {
      body = `<p>Your Calendar System is set to <strong>${selectedName}</strong>.</p>
              <p>Recommended for this world: <strong>${recName}</strong></p>`;
    } else {
      body = `<p>You are currently using <strong>${selectedName}</strong>.</p>
              <p>Recommended: <strong>${recName}</strong></p>`;
    }

    const { confirmed, suppress } = await CalendarAdapter.#recommendDialog({
      title,
      content: `${body}<p>Would you like to switch?</p>${checkbox}`,
      confirmLabel: "Switch"
    });

    if (suppress) {
      try {
        await game.settings.set(MODULE_ID, "suppress-calendar-recommendation-for", selected);
      } catch {
        // ignore
      }
    }

    if (!confirmed) return;

    try {
      await game.settings.set(MODULE_ID, "calendar-system", recommended);
      CalendarAdapter.refresh();
      ui.notifications.info(`Using ${recName} calendar data`);
    } catch (e) {
      console.error(`${MODULE_ID} | Failed to switch calendar:`, e);
      ui.notifications.error("Failed to switch calendar system");
    }
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
      "simple-calendar-reborn": "Simple Calendar Reborn",
      "simple-calendar": "Simple Calendar (Legacy)", // Kept for migration compatibility
      "seasons-and-stars": "Seasons & Stars",
      "wgtgm-mini-calendar": "Mini Calendar",
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

  /**
   * Advance world time by a number of seconds.
   * Base implementation uses Foundry's native time advance.
   * Calendar adapters that manage their own time (like SCR) should override this.
   * 
   * @param {number} seconds - Number of seconds to advance (can be negative to go back)
   * @returns {Promise<boolean>} True if successful
   */
  async advanceTime(seconds) {
    // Default implementation: use Foundry's native time advance
    // This is appropriate for "Model A" calendars (S&S, D&D5e) where ATN manages time
    return await game.time.advance(seconds);
  }
}

// Export for use in other modules
export default CalendarAdapter;
