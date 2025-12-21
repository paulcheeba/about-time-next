// module/ATNotificationSound.js
// v13.2.0.0 — Non-invasive notification sound system for ATN events
// Handles playback of notification sounds for event-triggered chat messages

import { MODULE_ID } from "./settings.js";

export class ATNotificationSound {
  
  static BUILT_IN_SOUND = "modules/about-time-next/assets/sounds/notification-alert-7-331719.mp3";
  
  /**
   * Initialize the notification sound system
   */
  static init() {
    try {
      if (game.settings.get(MODULE_ID, "debug")) console.log(`${MODULE_ID} | Initializing event notification sounds`);
    } catch {
      // ignore
    }
    this.registerHooks();
  }
  
  /**
   * Register Foundry hooks
   */
  static registerHooks() {
    Hooks.on("createChatMessage", this.onCreateChatMessage.bind(this));
  }
  
  /**
   * Handle chat message creation
   * @param {ChatMessage} message - The chat message being created
   * @param {object} options - Creation options
   * @param {string} userId - ID of the user creating the message
   */
  static onCreateChatMessage(message, options, userId) {
    // Only GMs should hear notification sounds (ATN is GM-only tool)
    if (!game.user.isGM) return;
    
    // Check if notification sounds are enabled first (quick exit)
    const enabled = game.settings.get(MODULE_ID, "enableEventNotificationSound");
    if (!enabled) return;
    
    // Determine if this is an ATN event notification
    if (!this.isEventNotification(message)) return;
    
    // Play the notification sound
    this.playNotificationSound();
  }
  
  /**
   * Determine if a chat message is an ATN event notification
   * Uses pattern matching without modifying existing code
   * @param {ChatMessage} message - The chat message to check
   * @returns {boolean} True if this is an event notification
   */
  static isEventNotification(message) {
    // Get message content
    const content = message.content || "";

    // Only trigger on GM whispers.
    const isWhisper = Array.isArray(message?.whisper) && message.whisper.length > 0;
    if (!isWhisper) return false;

    // v13.4.0.1: Restrict sound playback to standardized event notification cards only.
    // These are created by formatEventChatCard() and include stable field labels.
    const hasModulePrefix = content.includes("[about-time-next]");
    const hasEventName = /\bEvent Name:\s*<\/strong>/i.test(content) || content.includes("Event Name:");
    const hasEventUid = /\bEvent UID:\s*<\/strong>/i.test(content) || content.includes("Event UID:");

    // Exclude confirmation/status cards that also contain the module prefix.
    if (content.includes("atn-at-confirm") || content.includes("data-atn-confirm") || content.includes("data-atn-cancel")) {
      return false;
    }

    return hasModulePrefix && hasEventName && hasEventUid;
  }
  
  /**
   * Play the configured notification sound
   */
  static playNotificationSound() {
    try {
      // Get the selected sound path (already defaults to built-in sound)
      const soundPath = game.settings.get(MODULE_ID, "eventNotificationSoundPath");
      const volume = game.settings.get(MODULE_ID, "eventNotificationVolume") / 100;
      
      // Play the sound using Foundry's modern audio API
      foundry.audio.AudioHelper.play({
        src: soundPath,
        volume: volume,
        autoplay: true,
        loop: false
      }, false); // false = don't push to playlist
      
      if (game.settings.get(MODULE_ID, "debug")) {
        console.log(`${MODULE_ID} | Played event notification sound: ${soundPath} at ${volume * 100}% volume`);
      }
      
    } catch (error) {
      console.error(`${MODULE_ID} | Error playing notification sound:`, error);
    }
  }
  
  /**
   * Test the notification sound (for settings preview or console testing)
   */
  static testSound() {
    try {
      if (game.settings.get(MODULE_ID, "debug")) console.log(`${MODULE_ID} | Testing notification sound`);
    } catch {
      // ignore
    }
    this.playNotificationSound();
  }
}
