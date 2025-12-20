// module/settings.js
// v13.3.2.0 — Added calendar-system setting and migration from use-simple-calendar

export const MODULE_ID = "about-time-next";

export const registerSettings = function () {
  console.log(`${MODULE_ID} | Registering settings...`);
  
  // ============================================================================
  // INTERNAL SETTINGS (hidden from UI)
  // ============================================================================
  
  game.settings.register(MODULE_ID, "store", {
    name: "Elapsed Time event queue",
    hint: "Internal storage for About Time. Do not edit.",
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });

  game.settings.register(MODULE_ID, "election-timeout", {
    name: "For calendar-weather",
    hint: "Internal timing for master timekeeper election. Do not edit.",
    scope: "world",
    config: false,
    type: Number,
    default: 5
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

  // ============================================================================
  // CALENDAR INTEGRATION (v13.3.2.0)
  // ============================================================================

  game.settings.register(MODULE_ID, "calendar-system", {
    name: "Calendar System",
    hint: "Choose which calendar system to use for time formatting and event scheduling. Auto-detect will choose the first available system.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "auto": "Auto-detect",
      "none": "None (Foundry Core Time)",
      "simple-calendar": "Simple Calendar",
      "seasons-and-stars": "Seasons & Stars"
    },
    default: "auto",
    requiresReload: true,
    onChange: value => {
      console.log(`${MODULE_ID} | [Settings] Calendar system changed to: ${value}`);
      // Force adapter refresh on next access
      if (window.AboutTimeNext?.CalendarAdapter) {
        window.AboutTimeNext.CalendarAdapter.refresh();
      }
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
      console.log(`${MODULE_ID} | Event notification sound ${value ? 'enabled' : 'disabled'}`);
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
      console.log(`${MODULE_ID} | Event notification sound source set to: ${value}`);
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
      if (value) console.log(`${MODULE_ID} | Custom notification sound path set to: ${value}`);
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
      console.log(`${MODULE_ID} | Event notification volume set to: ${value}%`);
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
      
      console.log(`${MODULE_ID} | Testing sound: ${soundPath} at ${volume * 100}% volume`);
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
        
        console.log(`${MODULE_ID} | Testing sound (preview): ${soundPath} at ${volume}% volume`);
      };
      testInput.replaceWith(button);
    }
  });

  // Add calendar detection information to settings UI (v13.3.2.0)
  // Support both old SettingsConfig and new Foundry v13 Game Settings
  const addDetectionInfo = (html) => {
    // Find the calendar-system setting
    const calendarSetting = html.find ? html.find(`[name="${MODULE_ID}.calendar-system"]`) : $(html).find(`[name="${MODULE_ID}.calendar-system"]`);
    if (calendarSetting.length === 0) return;

    const formGroup = calendarSetting.closest('.form-group');
    
    // Check if already added to prevent duplicates
    if (formGroup.find('.calendar-detection-info').length > 0) return;

    // Get detection results
    const detected = window.AboutTimeNext?.CalendarAdapter?.detectAvailableAsObject() || { simpleCalendar: false, seasonsStars: false };
    
    // Build detection message
    let detectionHTML = '<div class="calendar-detection-info" style="margin-top: 0.5em; padding: 0.5em; background: rgba(0,0,0,0.1); border-radius: 3px; font-size: 0.9em;">';
    detectionHTML += '<strong>Detected Calendar Modules:</strong><br>';
    
    if (detected.simpleCalendar) {
      detectionHTML += '✓ Simple Calendar (available)<br>';
    } else {
      detectionHTML += '✗ Simple Calendar (not detected)<br>';
    }
    
    if (detected.seasonsStars) {
      detectionHTML += '✓ Seasons & Stars (available)';
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
    
    console.log(`${MODULE_ID} | [Settings UI] Added calendar detection info`);
  };
  
  // Hook for old settings interface (pre-v13)
  Hooks.on('renderSettingsConfig', (app, html, data) => {
    addDetectionInfo(html);
  });
  
  // Hook for new Foundry v13 Game Settings interface
  Hooks.on('renderGameSettings', (app, html, data) => {
    addDetectionInfo(html);
  });

  console.log(`${MODULE_ID} | Settings registered successfully`);
};
