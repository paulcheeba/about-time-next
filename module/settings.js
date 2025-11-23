// module/settings.js
// v13.2.0.0 — Added event notification sound settings

export const MODULE_ID = "about-time-next";

export const registerSettings = function () {
  game.settings.register(MODULE_ID, "store", {
    name: "Elapsed Time event queue",
    hint: "Internal storage for About Time. Do not edit.",
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });

  game.settings.register(MODULE_ID, "debug", {
    name: "Debug output",
    hint: "Enable verbose logging for About Time.",
    scope: "client",
    config: true,
    type: Boolean,
    default: false
  });

  // Optional SC integration toggle (some code already checks this)
  game.settings.register(MODULE_ID, "use-simple-calendar", {
    name: "Use Simple Calendar (if installed)",
    hint: "When enabled and SC is active, About Time uses SC intervals/formatting. Otherwise uses Foundry core time.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "election-timeout", {
    name: "For calendar-weather",
    hint: "Internal timing for master timekeeper election. Do not edit.",
    scope: "world",
    config: false,
    type: Number,
    default: 5
  });

  // Event Notification Sound Settings (v13.2.0.0)
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
};
