// module/ATMiniSettings.js
// v13.5.0.0 — Mini settings with SCR-aware checkbox disabling


import { MODULE_ID } from "./settings.js";

/** Register client settings for the mini panel. */
function hasSetting(key) { try { return game.settings.settings.has(`${MODULE_ID}.${key}`); } catch { return false; } }

export function registerMiniSettings() {
  const scope = "client";
  const config = true;

  game.settings.register(MODULE_ID, "enableMiniPanel", {
    name: "Enable AT Time Manager",
    hint: "Show the small About Time manager panel when Foundry loads (per-user). GMs see control buttons; players see time only.",
    scope, config, type: Boolean, default: false,
    onChange: () => {
      // Prompt to reload so toolbar appears/disappears immediately.
      Dialog.confirm({
        title: "About Time",
        content: "<p>Changing Time Manager visibility requires a reload. Reload now?</p>",
        yes: () => window.location.reload(),
        no: () => ui.notifications?.info?.("Reload later to apply Time Manager visibility."),
        defaultYes: true
      });
    }
  });

  const durationOnChange = (key) => () => {
    // Let the panel (if open) rebuild labels without a reload.
    Hooks.callAll("about-time.miniDurationsChanged", key);
  };

  // Five button duration strings; /at-style tokens like 10s, 1m, 1h5m3s
  game.settings.register(MODULE_ID, "miniRWD1", {
    name: "RWD1 duration", scope, config, type: String, default: "1m",
    onChange: durationOnChange("miniRWD1")
  });
  game.settings.register(MODULE_ID, "miniRWD2", {
    name: "RWD2 duration", scope, config, type: String, default: "10s",
    onChange: durationOnChange("miniRWD2")
  });
  game.settings.register(MODULE_ID, "miniFFWD1", {
    name: "FFWD1 duration", scope, config, type: String, default: "10s",
    onChange: durationOnChange("miniFFWD1")
  });
  game.settings.register(MODULE_ID, "miniFFWD2", {
    name: "FFWD2 duration", scope, config, type: String, default: "1m",
    onChange: durationOnChange("miniFFWD2")
  });
  game.settings.register(MODULE_ID, "miniFFWD3", {
    name: "FFWD3 duration", scope, config, type: String, default: "1h",
    onChange: durationOnChange("miniFFWD3")
  });

  // --- v13.0.7: Additional settings required by Mini Panel & Realtime ---
  if (!hasSetting("miniDawnTime")) game.settings.register(MODULE_ID, "miniDawnTime", {
    name: "Dawn time (HH:MM)", scope: "client", config: true, type: String, default: "06:00"
  });
  if (!hasSetting("miniDuskTime")) game.settings.register(MODULE_ID, "miniDuskTime", {
    name: "Dusk time (HH:MM)", scope: "client", config: true, type: String, default: "18:00"
  });
  if (!hasSetting("miniDimOnBlur")) game.settings.register(MODULE_ID, "miniDimOnBlur", {
    name: "Dim panel on blur", scope: "client", config: true, type: Boolean, default: true
  });
  if (!hasSetting("miniDisableInCombat")) game.settings.register(MODULE_ID, "miniDisableInCombat", {
    name: "Hide controls during combat", scope: "client", config: true, type: Boolean, default: false
  });
  if (!hasSetting("miniRespectPause")) game.settings.register(MODULE_ID, "miniRespectPause", {
    name: "Respect world pause", scope: "client", config: true, type: Boolean, default: true
  });
  if (!hasSetting("miniSafetyLock")) game.settings.register(MODULE_ID, "miniSafetyLock", {
    name: "Safety lock (confirm big jumps)", scope: "client", config: true, type: Boolean, default: false
  });
  if (!hasSetting("rtAutoPauseCombat")) game.settings.register(MODULE_ID, "rtAutoPauseCombat", {
    name: "Auto Pause at Combat Start/End",
    hint: "When enabled, the game UI is automatically paused when combat begins and when combat ends. (Managed by Simple Calendar Reborn when SCR is active)",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
  if (!hasSetting("rtLinkPause")) game.settings.register(MODULE_ID, "rtLinkPause", {
    name: "Link realtime to pause", 
    hint: "When enabled, realtime clock starts/stops with game pause. (Managed by Simple Calendar Reborn when SCR is active)",
    scope: "world", 
    config: true, 
    type: Boolean, 
    default: true,
    onChange: (value) => {
      try {
        const hasActiveCombat = !!game.combat;
        if (game.paused || hasActiveCombat) {
          game.abouttime?.stopRealtime?.();
        } else if (value) {
          game.abouttime?.startRealtime?.();
        }
      } catch (e) {
        console.warn(`${MODULE_ID} | rtLinkPause onChange failed`, e);
      }
    }
  });

  // Add UI customization for SCR integration (v13.4.2.0)
  const customizeSCRSettings = (html) => {
    // Check if SCR is active
    const calendarSystem = game.settings.get(MODULE_ID, "calendar-system");
    const isSCRActive = calendarSystem === "simple-calendar-reborn" || 
                        (calendarSystem === "auto" && globalThis.SimpleCalendar?.api);
    
    if (!isSCRActive) return;

    // Find and customize the rtAutoPauseCombat setting
    const autoPauseSetting = html.find ? html.find(`[name="${MODULE_ID}.rtAutoPauseCombat"]`) : $(html).find(`[name="${MODULE_ID}.rtAutoPauseCombat"]`);
    if (autoPauseSetting.length > 0) {
      autoPauseSetting.prop('disabled', true);
      autoPauseSetting.css('opacity', '0.6');
      
      const formGroup = autoPauseSetting.closest('.form-group');
      
      // Check if already added to prevent duplicates
      if (formGroup.find('.scr-override-info').length === 0) {
        // Get SCR's combatRunning setting value
        try {
          const scrSettings = globalThis.SimpleCalendar?.api?.getConfiguration?.();
          const scrCombatValue = scrSettings?.generalSettings?.gameWorldTimeIntegration?.combatRunning;
          
          let infoHTML = '<div class="scr-override-info" style="margin-top: 0.25em; padding: 0.25em; background: rgba(0,0,255,0.1); border-left: 3px solid #4a90e2; font-size: 0.85em; font-style: italic;">';
          infoHTML += `⚠️ <strong>Managed by SCR:</strong> Combat pause is ${scrCombatValue === "pause" ? "ENABLED" : "DISABLED"} in Simple Calendar Reborn settings.`;
          infoHTML += '</div>';
          
          formGroup.append(infoHTML);
        } catch (e) {
          // Fallback if we can't read SCR settings
          let infoHTML = '<div class="scr-override-info" style="margin-top: 0.25em; padding: 0.25em; background: rgba(0,0,255,0.1); border-left: 3px solid #4a90e2; font-size: 0.85em; font-style: italic;">';
          infoHTML += '⚠️ <strong>Managed by SCR:</strong> This setting is controlled by Simple Calendar Reborn.';
          infoHTML += '</div>';
          
          formGroup.append(infoHTML);
        }
      }
    }

    // Find and customize the rtLinkPause setting
    const linkPauseSetting = html.find ? html.find(`[name="${MODULE_ID}.rtLinkPause"]`) : $(html).find(`[name="${MODULE_ID}.rtLinkPause"]`);
    if (linkPauseSetting.length > 0) {
      linkPauseSetting.prop('disabled', true);
      linkPauseSetting.css('opacity', '0.6');
      
      const formGroup = linkPauseSetting.closest('.form-group');
      
      // Check if already added to prevent duplicates
      if (formGroup.find('.scr-override-info').length === 0) {
        // Get SCR's unifyGameAndClockPause setting value
        try {
          const scrSettings = globalThis.SimpleCalendar?.api?.getConfiguration?.();
          const scrPauseValue = scrSettings?.generalSettings?.gameWorldTimeIntegration?.unifyGameAndClockPause ?? false;
          
          let infoHTML = '<div class="scr-override-info" style="margin-top: 0.25em; padding: 0.25em; background: rgba(0,0,255,0.1); border-left: 3px solid #4a90e2; font-size: 0.85em; font-style: italic;">';
          infoHTML += `⚠️ <strong>Managed by SCR:</strong> Unified pause is ${scrPauseValue ? "ENABLED" : "DISABLED"} in Simple Calendar Reborn settings.`;
          infoHTML += '</div>';
          
          formGroup.append(infoHTML);
        } catch (e) {
          // Fallback if we can't read SCR settings
          let infoHTML = '<div class="scr-override-info" style="margin-top: 0.25em; padding: 0.25em; background: rgba(0,0,255,0.1); border-left: 3px solid #4a90e2; font-size: 0.85em; font-style: italic;">';
          infoHTML += '⚠️ <strong>Managed by SCR:</strong> This setting is controlled by Simple Calendar Reborn.';
          infoHTML += '</div>';
          
          formGroup.append(infoHTML);
        }
      }
    }
  };

  // Hook for old settings interface (pre-v13)
  Hooks.on('renderSettingsConfig', (app, html, data) => {
    customizeSCRSettings(html);
  });
  
  // Hook for new Foundry v13 Game Settings interface
  Hooks.on('renderGameSettings', (app, html, data) => {
    customizeSCRSettings(html);
  });
}
