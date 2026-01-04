# Event Notification Sound — Planning Document

**Feature:** Audible notification for event-triggered chat messages  
**Target Version:** v13.2.0.0  
**Status:** 🧠 Planning Phase  
**Created:** 2025-11-22

---

## 📋 Feature Requirements

### User Story
"As a Foundry VTT user, I want to hear a notification sound when an ATN event fires and sends a chat message, so I don't miss important reminders or scheduled events."

### Scope (What Gets a Sound)

✅ **YES - Play sound for:**
- Event reminders (scheduled via Event Manager)
- Macro-triggered events that produce chat output
- Repeating events that fire
- Any event that calls the handler and produces a message

❌ **NO - Do NOT play sound for:**
- `/at` chat commands (user input)
- Queue list messages (when viewing queue in chat)
- Event creation confirmations
- Event stop/flush confirmations
- Any ATN system messages that aren't event triggers

### User Configuration

All settings are **client-scoped** (per user):

1. **Enable/Disable toggle** (default: enabled)
2. **Sound source dropdown** (default: built-in)
   - "Built-in notification sound"
   - "Custom file path"
3. **Custom file path** (text input, only visible when "Custom file path" selected) using Foundry's internal file browser.
4. **Volume slider** (default: 40%, range: 0-100%)

---

## 🎯 Technical Approach

### Detection Strategy

**RECOMMENDED: Hook-based detection (Non-invasive)**

**Important Design Principle:** Do NOT modify existing ATN chat message creation code. The current structure works well and should remain untouched.

**Strategy:**
- Hook into `createChatMessage` (fires when any chat message is created)
- Inspect message properties to identify ATN event notifications
- Distinguish event notifications from other ATN messages (commands, confirmations, etc.)
- Play sound only when event-triggered messages appear in chat

**Detection Criteria:**
Check for messages that indicate an event has fired:
1. **Whisper to GM** - Most event messages are GM whispers
2. **Content patterns** - Look for ATN event markers in content
3. **Message metadata** - Check `message.speaker`, `message.flavor`, or custom data
4. **Module-specific identifiers** - Check if message originates from ATN event system

**Advantages:**
- Zero modification to existing ATN code
- Non-invasive approach preserves current stability
- Can be easily disabled/removed without affecting core functionality
- Works with existing event system as-is

**Implementation:**
```javascript
Hooks.on("createChatMessage", (message, options, userId) => {
  // Check if this is an ATN event notification
  // Logic to distinguish event messages from other ATN messages
  // Play sound if criteria met
});
```

---

## 🔧 Implementation Plan

### Phase 1: Settings Registration

**File:** `module/settings.js`

Add four new client settings:

```javascript
// Enable/disable notification sounds
game.settings.register("about-time-next", "enableEventNotificationSound", {
  name: "ATN.SETTINGS.EnableEventNotificationSound",
  hint: "ATN.SETTINGS.EnableEventNotificationSoundHint",
  scope: "client",
  config: true,
  type: Boolean,
  default: true,
  onChange: value => {
    console.log(`About Time Next | Event notification sound ${value ? 'enabled' : 'disabled'}`);
  }
});

// Sound source selection
game.settings.register("about-time-next", "eventNotificationSoundSource", {
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
    console.log(`About Time Next | Event notification sound source set to: ${value}`);
  }
});

// Custom sound file path
game.settings.register("about-time-next", "eventNotificationSoundPath", {
  name: "ATN.SETTINGS.EventNotificationSoundPath",
  hint: "ATN.SETTINGS.EventNotificationSoundPathHint",
  scope: "client",
  config: true,
  type: String,
  filePicker: "audio",
  default: "",
  onChange: value => {
    console.log(`About Time Next | Custom notification sound path set to: ${value}`);
  }
});

// Volume control
game.settings.register("about-time-next", "eventNotificationVolume", {
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
    console.log(`About Time Next | Event notification volume set to: ${value}%`);
  }
});
```

---

### Phase 2: Analyze Event Message Patterns

**Files to Research:** `module/ATEventManagerAppV2.js`, `module/ElapsedTime.js`

**IMPORTANT:** Do NOT modify these files. Only analyze them to understand message patterns.

**Research Tasks:**
1. Identify what ATN event notifications look like in chat
   - What does the content contain?
   - Are they always whispers?
   - What distinguishes them from commands/confirmations?

2. Find reliable detection patterns:
   - Content markers (e.g., specific text patterns)
   - Message structure (whisper recipients, speaker data)
   - Timing (created via scheduled handler vs. user action)

3. Document message types to differentiate:
   - ✅ Event fires (SHOULD play sound)
   - ❌ `/at` command executed (NO sound)
   - ❌ Queue list displayed (NO sound)
   - ❌ Event created/stopped (NO sound)

**Example Analysis:**
```javascript
// What does an event notification message look like?
// Inspect message properties:
// - message.content (HTML content)
// - message.whisper (array of user IDs)
// - message.speaker (who created it)
// - message.flavor (additional context)
// - message.type (CONST.CHAT_MESSAGE_TYPES)

// Potential detection logic:
// if (message.whisper.length > 0 && 
//     message.content.includes('[about-time-next]') &&
//     !message.content.includes('Created') &&
//     !message.content.includes('Queue:')) {
//   // Likely an event notification
// }
```

**Goal:** Build reliable detection heuristics without touching existing code.

---

### Phase 3: Sound Playback Hook

**New File:** `module/ATNotificationSound.js`

Create a dedicated module that hooks `createChatMessage` and plays sound based on message pattern detection.

```javascript
/**
 * ATNotificationSound.js
 * v13.2.0.0 - Non-invasive notification sound system for ATN events
 * Handles playback of notification sounds for event-triggered chat messages
 */

export class ATNotificationSound {
  
  static MODULE_ID = "about-time-next";
  static BUILT_IN_SOUND = "modules/about-time-next/assets/sounds/event-notification.ogg";
  
  /**
   * Initialize the notification sound system
   */
  static init() {
    console.log("About Time Next | Initializing event notification sounds");
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
    // Check if notification sounds are enabled first (quick exit)
    const enabled = game.settings.get(this.MODULE_ID, "enableEventNotificationSound");
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
    
    // Must contain ATN identifier
    if (!content.includes("[about-time-next]") && !content.includes("about-time")) {
      return false;
    }
    
    // Exclude messages that are clearly NOT event notifications
    const excludePatterns = [
      "Created",           // Event creation confirmation
      "Stopped",           // Event stop confirmation
      "Queue:",            // Queue list display
      "/at",               // Chat command echo
      "Flushed",           // Queue flush confirmation
      "cleared"            // Timeout clear confirmation
    ];
    
    for (const pattern of excludePatterns) {
      if (content.includes(pattern)) {
        return false;
      }
    }
    
    // If whispered to GM and contains ATN identifier, likely an event
    const isWhisper = message.whisper && message.whisper.length > 0;
    
    // Event notifications are typically whispers with event content
    // This heuristic may need refinement based on testing
    return isWhisper;
  }
  
  /**
   * Play the configured notification sound
   */
  static playNotificationSound() {
    try {
      // Get user settings
      const soundSource = game.settings.get(this.MODULE_ID, "eventNotificationSoundSource");
      const customPath = game.settings.get(this.MODULE_ID, "eventNotificationSoundPath");
      const volume = game.settings.get(this.MODULE_ID, "eventNotificationVolume") / 100;
      
      // Determine which sound to play
      let soundPath;
      if (soundSource === "custom" && customPath) {
        soundPath = customPath;
      } else {
        soundPath = this.BUILT_IN_SOUND;
      }
      
      // Play the sound using Foundry's AudioHelper
      AudioHelper.play({
        src: soundPath,
        volume: volume,
        autoplay: true,
        loop: false
      }, false); // false = don't push to playlist
      
      console.log(`About Time Next | Played event notification sound: ${soundPath} at ${volume * 100}% volume`);
      
    } catch (error) {
      console.error("About Time Next | Error playing notification sound:", error);
    }
  }
  
  /**
   * Test the notification sound (for settings preview)
   */
  static testSound() {
    console.log("About Time Next | Testing notification sound");
    this.playNotificationSound();
  }
}
```

**Import and initialize in `about-time.js`:**

```javascript
import { ATNotificationSound } from "./module/ATNotificationSound.js";

Hooks.once('ready', () => {
  // ... existing ready code ...
  ATNotificationSound.init();
});
```

**Note:** The `isEventNotification()` method uses pattern matching to detect event messages. This may need refinement during testing based on actual message content.

---

### Phase 4: Sound Asset

**New File:** `assets/sounds/event-notification.ogg`

**Requirements:**
- Duration: 0.5-2 seconds
- Format: OGG Vorbis (Foundry standard)
- Tone: Pleasant, non-intrusive notification sound
- Volume: Normalized to consistent level
- Quality: 44.1kHz sample rate recommended

**Sourcing Options:**
1. Use a royalty-free sound from freesound.org or similar
2. Generate using audio software (Audacity, etc.)
3. Use Foundry's built-in notification sound as reference

**Recommended Sound Characteristics:**
- Soft bell or chime
- Rising pitch pattern (feels positive)
- No harsh frequencies
- Clean fade-out

---

### Phase 5: Localization

**Files:** `lang/*.json`

Add translation keys for all settings in each language file:

```json
{
  "ATN.SETTINGS.EnableEventNotificationSound": "Enable Event Notification Sounds",
  "ATN.SETTINGS.EnableEventNotificationSoundHint": "Play a sound when an event fires and sends a chat message.",
  
  "ATN.SETTINGS.EventNotificationSoundSource": "Notification Sound Source",
  "ATN.SETTINGS.EventNotificationSoundSourceHint": "Choose between the built-in notification sound or a custom audio file.",
  
  "ATN.SETTINGS.SoundSourceBuiltin": "Built-in notification sound",
  "ATN.SETTINGS.SoundSourceCustom": "Custom file path",
  
  "ATN.SETTINGS.EventNotificationSoundPath": "Custom Sound File Path",
  "ATN.SETTINGS.EventNotificationSoundPathHint": "Path to a custom notification sound (only used when 'Custom file path' is selected).",
  
  "ATN.SETTINGS.EventNotificationVolume": "Notification Volume",
  "ATN.SETTINGS.EventNotificationVolumeHint": "Volume level for event notification sounds (0-100%)."
}
```

**Translation Priority:**
1. English (en.json) - PRIMARY
2. Spanish (es.json)
3. French (fr.json)
4. German (de.json)
5. Other languages as time permits

---

## 🧪 Testing Checklist

### Functionality Tests

- [ ] Sound plays when event fires via Event Manager
- [ ] Sound plays for macro-triggered events
- [ ] Sound plays for repeating events
- [ ] Sound does NOT play for `/at` chat commands
- [ ] Sound does NOT play for queue list messages
- [ ] Sound does NOT play for event creation confirmations

### Configuration Tests

- [ ] Toggle enable/disable works correctly
- [ ] Built-in sound plays correctly
- [ ] Custom sound path works with valid file
- [ ] Custom sound path handles invalid file gracefully
- [ ] Volume slider affects playback volume (test 0%, 50%, 100%)
- [ ] Settings persist across sessions
- [ ] Settings are client-specific (different users can have different settings)

### Edge Cases

- [ ] Multiple events firing simultaneously (should play multiple sounds)
- [ ] Events firing in rapid succession
- [ ] Sound playback when user is not on Foundry tab
- [ ] Sound playback when user has browser/system volume muted
- [ ] Missing built-in sound file (error handling)
- [ ] Corrupted/invalid custom sound file (error handling)

### Browser Compatibility

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if possible)

### Performance

- [ ] No noticeable lag when sound plays
- [ ] No memory leaks from repeated sound playback
- [ ] Console logs are appropriate (not spammy)

---

## 🚧 Open Questions

### 1. Should we rate-limit notifications?

**Scenario:** What if 10 events fire within 1 second?

**Options:**
- A) Play all sounds (potentially cacophonous)
- B) Rate-limit to max 1 sound per X seconds (e.g., 2 seconds)
- C) Queue sounds with small delay between them

**Recommendation:** Start with option A (play all), add rate-limiting in future version if users complain.

---

### 2. Should we provide multiple built-in sounds?

**Options:**
- A) Single built-in sound (simplest)
- B) 2-3 built-in sounds with dropdown selection
- C) Different sounds for different event types

**Recommendation:** Option A for v13.2.0.0, consider option B for future version based on user feedback.

---

### 3. Should sounds play for non-GM users?

**Current behavior:** Events are typically GM-only features.

**Options:**
- A) Only GM hears notification sounds
- B) All users who receive the whispered chat message hear sounds
- C) Add separate setting to control this

**DECISION:** Option A - Only GMs hear notification sounds. ATN is a GM-only tool, so notifications are GM-only as well.

---

### 4. Should we integrate with Foundry's notification system?

**Foundry has:** `ui.notifications.notify()`, `ui.notifications.info()`, etc.

**Options:**
- A) Use our own sound system (current plan)
- B) Also trigger a visual notification via Foundry's UI
- C) Make it configurable

**Recommendation:** Option A for now. Keep it simple and focused on audio. Visual notifications could be a separate feature.

---

## 📝 Implementation Notes

### File Changes Summary

**New Files:**
- `module/ATNotificationSound.js` - Main notification sound handler
- `assets/sounds/event-notification.ogg` - Built-in notification sound

**Modified Files:**
- `about-time.js` - Import and initialize ATNotificationSound
- `module/settings.js` - Add 4 new client settings
- `lang/*.json` - Add localization strings (all 10 language files)

**Files NOT Modified (Non-invasive approach):**
- `module/ATEventManagerAppV2.js` - No changes needed
- `module/ElapsedTime.js` - No changes needed
- All existing event handling code remains untouched

### Dependencies

- No external dependencies required
- Uses Foundry's built-in `AudioHelper.play()` API
- Uses Foundry's built-in settings system
- Uses Foundry's built-in hooks system

### Estimated Effort

- **Phase 1 (Settings):** 30 minutes
- **Phase 2 (Pattern Analysis):** 1 hour (research message patterns, build detection heuristics)
- **Phase 3 (Hook):** 1 hour
- **Phase 4 (Sound Asset):** 30 minutes (sourcing/creating sound)
- **Phase 5 (Localization):** 1 hour (10 language files)
- **Testing:** 1-2 hours

**Total:** ~5-6 hours

---

## 🚀 Next Steps

1. Review this planning document with stakeholders
2. Resolve open questions (or defer to future versions)
3. Source/create the notification sound asset
4. Begin Phase 1 implementation (settings registration)
5. Proceed through phases sequentially
6. Conduct thorough testing before release
7. Update changelog and user documentation

---

**Last Updated:** 2025-11-22  
**Author:** Planning Phase  
**Status:** Ready for Implementation ✅
