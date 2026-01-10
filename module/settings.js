// module/settings.js
// v13.5.0.0 — Calendar settings with time authority tooltips and detection info

export const MODULE_ID = "about-time-next";

export const registerSettings = function () {
  const debugLog = (...args) => {
    try {
      if (game.settings.get(MODULE_ID, "debug")) console.log(...args);
    } catch {
      // debug setting may not exist yet
    }
  };

  const calendarLabelFor = (value) => {
    const names = {
      auto: "Auto-detect",
      none: "None (Foundry Core Time)",
      dnd5e: "D&D 5e Calendar (v5.2+)",
      "simple-calendar-reborn": "Simple Calendar Reborn",
      "simple-calendar": "Simple Calendar (Legacy)", // Kept for migration compatibility
      "seasons-and-stars": "Seasons & Stars"
    };
    return names[value] || String(value);
  };

  debugLog(`${MODULE_ID} | Registering settings...`);
  
  // ============================================================================
  // INTERNAL SETTINGS (hidden from UI)
  // ============================================================================
  
  game.settings.register(MODULE_ID, "store", {
    name: "Elapsed Time event queue",
    hint: "Internal storage for About Time. Do not edit.",
    scope: "world",
    config: false,
    type: Object,
    default: {},
    onChange: (value) => {
      // Keep non-master clients in sync when the master persists the queue.
      // This is especially important now that non-GM timekeepers can manage events.
      try {
        const api = (game.abouttime ?? game.Gametime);
        const isMaster = (typeof api?.isMaster === "function") ? !!api.isMaster() : false;

        // Diagnostics: when debug is enabled, log propagation and which clients sync.
        try {
          if (game.settings.get(MODULE_ID, "debug")) {
            const size = value?._eventQueue?.size;
            const hasArray = Array.isArray(value?._eventQueue?.array);
            console.log(`${MODULE_ID} | [store.onChange] received update`, {
              isMaster,
              queueSize: Number.isFinite(size) ? size : size,
              hasArray
            });
          }
        } catch {
          // ignore debug logging failures
        }

        if (isMaster) return;

        const ET = api?.ElapsedTime;
        if (ET && typeof ET._createFromData === "function") {
          ET._createFromData(value);

          try {
            if (game.settings.get(MODULE_ID, "debug")) {
              const liveSize = ET?._eventQueue?.size;
              console.log(`${MODULE_ID} | [store.onChange] synced live queue`, {
                liveSize: Number.isFinite(liveSize) ? liveSize : liveSize
              });
            }
          } catch {
            // ignore
          }
        }
      } catch (e) {
        // Never let settings propagation break the game.
        console.warn(`${MODULE_ID} | store onChange sync failed`, e);
      }
    }
  });

  game.settings.register(MODULE_ID, "election-timeout", {
    name: "For calendar-weather",
    hint: "Internal timing for master timekeeper election. Do not edit.",
    scope: "world",
    config: false,
    type: Number,
    default: 5
  });

  // Legacy: Timekeeper allowlist (deprecated). Stored as JSON array of user IDs.
  game.settings.register(MODULE_ID, "timekeepers", {
    name: "Timekeepers",
    hint: "DEPRECATED (v13.4.1+): Use the role threshold setting instead. Do not edit.",
    scope: "world",
    config: false,
    type: String,
    default: "[]"
  });

  // Legacy setting - HIDDEN but kept for migration
  game.settings.register(MODULE_ID, "use-simple-calendar", {
    name: "Use Simple Calendar (DEPRECATED - DO NOT USE)",
    hint: "This setting is deprecated. Use 'Calendar System' instead.",
    scope: "world",
    config: false, // Hidden from UI
    type: Boolean,
    default: true
  });

  // Track last detected calendars for change detection (v13.4.0.0)
  game.settings.register(MODULE_ID, "last-detected-calendars", {
    name: "Last Detected Calendars",
    hint: "Internal storage for calendar change detection. Do not edit.",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });

  game.settings.register(MODULE_ID, "suppress-calendar-recommendation-for", {
    name: "Suppress Calendar Recommendation For",
    hint: "Internal storage for calendar recommendation suppression. Do not edit.",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });

  // ============================================================================
  // GENERAL SETTINGS
  // ============================================================================

  game.settings.register(MODULE_ID, "debug", {
    name: "Debug output",
    hint: "Enable verbose logging for About Time.",
    scope: "client",
    config: true,
    type: Boolean,
    default: false
  });

  // Timekeeper authorization (v13.4.1.0)
  // Users with a role >= this threshold may manage the About Time queue.
  // GMs are always allowed regardless of this setting.
  game.settings.register(MODULE_ID, "timekeeperRoleMin", {
    name: "Minimum role required to be a timekeeper",
    hint: "Users at or above this role can manage About Time’s event queue. GMs are always allowed.",
    scope: "world",
    config: true,
    type: Number,
    choices: {
      [CONST.USER_ROLES.PLAYER]: "Player",
      [CONST.USER_ROLES.TRUSTED]: "Trusted Player",
      [CONST.USER_ROLES.ASSISTANT]: "Assistant GM",
      [CONST.USER_ROLES.GAMEMASTER]: "Game Master"
    },
    default: CONST.USER_ROLES.GAMEMASTER
  });

  // ============================================================================
  // CALENDAR INTEGRATION (v13.3.2.0)
  // ============================================================================

  game.settings.register(MODULE_ID, "calendar-system", {
    name: "Calendar System",
    hint: "Choose which calendar system to use for time formatting and event scheduling. ⚙️ Time Authority: SCR controls worldTime when active; ATN manages worldTime for D&D5e/S&S.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "auto": "Auto-detect",
      "none": "None (Foundry Core Time)",
      "dnd5e": "D&D 5e Calendar (v5.2+)",
      "simple-calendar-reborn": "Simple Calendar Reborn",
      // "simple-calendar": "Simple Calendar (Legacy)", // ARCHIVED - v13 incompatible
      "seasons-and-stars": "Seasons & Stars"
    },
    default: "auto",
    requiresReload: false,
    onChange: value => {
      // Always-on basic status (users can confirm what they selected).
      try {
        console.info(`${MODULE_ID} | Calendar system selected: ${calendarLabelFor(value)}`);
      } catch {
        // ignore
      }

      debugLog(`${MODULE_ID} | [Settings] Calendar system changed to: ${value}`);
      // Force adapter refresh on next access
      if (window.AboutTimeNext?.CalendarAdapter) {
        window.AboutTimeNext.CalendarAdapter.refresh();
      }

      // Clear recommendation suppression when user changes selection
      try {
        game.settings.set(MODULE_ID, "suppress-calendar-recommendation-for", "");
      } catch {
        // ignore
      }
    }
  });

  game.settings.register(MODULE_ID, "time-format", {
    name: "Time Format",
    hint: "Choose between 12-hour (AM/PM) or 24-hour (military) time display.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "12": "12-hour (AM/PM)",
      "24": "24-hour (Military)"
    },
    default: "24",
    onChange: value => {
      debugLog(`${MODULE_ID} | Time format changed to: ${value}-hour`);
    }
  });

  // ============================================================================
  // EVENT NOTIFICATIONS (v13.2.0.0)
  // ============================================================================

  game.settings.register(MODULE_ID, "enableEventNotificationSound", {
    name: "ATN.SETTINGS.EnableEventNotificationSound",
    hint: "ATN.SETTINGS.EnableEventNotificationSoundHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: value => {
      debugLog(`${MODULE_ID} | Event notification sound ${value ? 'enabled' : 'disabled'}`);
    }
  });

  game.settings.register(MODULE_ID, "eventNotificationSoundSource", {
    name: "ATN.SETTINGS.EventNotificationSoundSource",
    hint: "ATN.SETTINGS.EventNotificationSoundSourceHint",
    scope: "client",
    config: true,
    type: String,
    choices: {
      "builtin": "ATN.SETTINGS.SoundSourceBuiltin",
      "custom": "ATN.SETTINGS.SoundSourceCustom"
    },
    default: "builtin",
    onChange: value => {
      debugLog(`${MODULE_ID} | Event notification sound source set to: ${value}`);
    }
  });

  game.settings.register(MODULE_ID, "eventNotificationSoundPath", {
    name: "ATN.SETTINGS.EventNotificationSoundPath",
    hint: "ATN.SETTINGS.EventNotificationSoundPathHint",
    scope: "client",
    config: true,
    type: String,
    filePicker: {
      type: "audio",
      current: "modules/about-time-next/assets/sounds/"
    },
    default: "modules/about-time-next/assets/sounds/notification-alert-7-331719.mp3",
    onChange: value => {
      if (value) debugLog(`${MODULE_ID} | Custom notification sound path set to: ${value}`);
    }
  });

  game.settings.register(MODULE_ID, "eventNotificationVolume", {
    name: "ATN.SETTINGS.EventNotificationVolume",
    hint: "ATN.SETTINGS.EventNotificationVolumeHint",
    scope: "client",
    config: true,
    type: Number,
    range: {
      min: 0,
      max: 100,
      step: 5
    },
    default: 40,
    onChange: value => {
      debugLog(`${MODULE_ID} | Event notification volume set to: ${value}%`);
    }
  });

  // Simple test button - just a dummy setting with a button
  game.settings.register(MODULE_ID, "testNotificationSoundButton", {
    name: "ATN.SETTINGS.TestNotificationSound",
    hint: "ATN.SETTINGS.TestNotificationSoundHint",
    scope: "client",
    config: true,
    type: String,
    default: "",
    onChange: () => {
      // Get the selected sound path from settings (already has default if not changed)
      const soundPath = game.settings.get(MODULE_ID, "eventNotificationSoundPath");
      const volume = game.settings.get(MODULE_ID, "eventNotificationVolume") / 100;
      
      // Play the selected sound at the configured volume
      foundry.audio.AudioHelper.play({
        src: soundPath,
        volume: volume,
        autoplay: true,
        loop: false
      });

      debugLog(`${MODULE_ID} | Testing sound: ${soundPath} at ${volume * 100}% volume`);
    }
  });

  // Replace the text input with a button after render
  Hooks.on("renderSettingsConfig", (app, html) => {
    const testInput = html.querySelector(`[name="${MODULE_ID}.testNotificationSoundButton"]`);
    if (testInput) {
      const button = document.createElement('button');
      button.type = 'button';
      button.innerHTML = '<i class="fas fa-volume-up"></i> Test Sound';
      button.onclick = () => {
        // Read CURRENT form values (unsaved) for preview
        const soundPathInput = document.querySelector(`[name="${MODULE_ID}.eventNotificationSoundPath"]`);
        const volumeInput = document.querySelector(`[name="${MODULE_ID}.eventNotificationVolume"]`);
        
        const soundPath = soundPathInput?.value || game.settings.get(MODULE_ID, "eventNotificationSoundPath");
        const volume = parseInt(volumeInput?.value || game.settings.get(MODULE_ID, "eventNotificationVolume"));
        
        // Play the preview with current form values
        foundry.audio.AudioHelper.play({
          src: soundPath,
          volume: volume / 100,
          autoplay: true,
          loop: false
        });

        debugLog(`${MODULE_ID} | Testing sound (preview): ${soundPath} at ${volume}% volume`);
      };
      testInput.replaceWith(button);
    }
  });

  // Add calendar detection information to settings UI (v13.3.5.0)
  // Support both old SettingsConfig and new Foundry v13 Game Settings
  const addDetectionInfo = (html) => {
    // Find the calendar-system setting
    const calendarSetting = html.find ? html.find(`[name="${MODULE_ID}.calendar-system"]`) : $(html).find(`[name="${MODULE_ID}.calendar-system"]`);
    if (calendarSetting.length === 0) return;

    const formGroup = calendarSetting.closest('.form-group');
    
    // Check if already added to prevent duplicates
    if (formGroup.find('.calendar-detection-info').length > 0) return;

    // Get detection results
    const detected = window.AboutTimeNext?.CalendarAdapter?.detectAvailableAsObject() || { dnd5e: false, simpleCalendarReborn: false, seasonsStars: false };
    
    // DYNAMIC DROPDOWN FILTERING (v13.3.5.0)
    // Remove options for systems that aren't detected (keep "auto" and "none" always)
    const currentValue = calendarSetting.val();
    calendarSetting.find('option').each(function() {
      const optionValue = $(this).val();
      
      // Always keep "auto" and "none"
      if (optionValue === 'auto' || optionValue === 'none') return;
      
      // Remove option if system not detected
      const shouldShow = (
        (optionValue === 'dnd5e' && detected.dnd5e) ||
        (optionValue === 'simple-calendar-reborn' && detected.simpleCalendarReborn) ||
        (optionValue === 'seasons-and-stars' && detected.seasonsStars)
      );
      
      if (!shouldShow) {
        // If current value is being removed, change to auto
        if (optionValue === currentValue) {
          calendarSetting.val('auto');
        }
        $(this).remove();
      }
    });
    
    // Build detection message (shows ALL systems, detected or not)
    let detectionHTML = '<div class="calendar-detection-info" style="margin-top: 0.5em; padding: 0.5em; background: rgba(0,0,0,0.1); border-radius: 3px; font-size: 0.9em;">';
    detectionHTML += '<strong>Detected Calendar Systems:</strong><br>';
    
    if (detected.dnd5e) {
      detectionHTML += '✓ D&D 5e Calendar (available) - <em>Uses ATN Time Management</em><br>';
    } else {
      detectionHTML += '✗ D&D 5e Calendar (not detected)<br>';
    }
    
    if (detected.simpleCalendarReborn) {
      detectionHTML += '✓ Simple Calendar Reborn (available) - <em>Uses SCR Time Management</em><br>';
    } else {
      detectionHTML += '✗ Simple Calendar Reborn (not detected)<br>';
    }
    
    if (detected.seasonsStars) {
      detectionHTML += '✓ Seasons & Stars (available) - <em>Uses ATN Time Management</em>';
    } else {
      detectionHTML += '✗ Seasons & Stars (not detected)';
    }
    
    detectionHTML += '</div>';
    
    // Insert detection info
    const hint = formGroup.find('.notes');
    if (hint.length > 0) {
      hint.after(detectionHTML);
    } else {
      formGroup.append(detectionHTML);
    }
    
    debugLog(`${MODULE_ID} | [Settings UI] Added calendar detection info and filtered dropdown`);
  };
  
  // Hook for old settings interface (pre-v13)
  Hooks.on('renderSettingsConfig', (app, html, data) => {
    addDetectionInfo(html);
  });
  
  // Hook for new Foundry v13 Game Settings interface
  Hooks.on('renderGameSettings', (app, html, data) => {
    addDetectionInfo(html);
  });

  debugLog(`${MODULE_ID} | Settings registered successfully`);
};
