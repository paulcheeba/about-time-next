# Changelog (v13.2.0.0)

- **Event Notification Sounds**  
  Added audible alerts when scheduled events trigger (GM-only). Configure sound source, volume, and preview selections via module settings. Includes 3 built-in notification sounds with file picker support for custom audio.

- **Settings Enhancements**  
  Added 5 new client settings for notification sound system: enable/disable toggle, sound source selector, custom sound path with file picker, volume slider (0-100%), and test button for previewing sounds before saving.

- **Hook-Based Detection**  
  Implemented ATNotificationSound.js with pattern-matching detection for ATN event chat messages, ensuring notifications play only for actual event triggers without modifying existing event handling code.

- **Localization**  
  Added 11 new translation keys for notification settings and test button (English only; other languages use fallback).

---

# Changelog (v13.1.1.1)

- **Fixed pause/link bug**  
  Replaced all combat-state checks from `game.combats?.size` to `!!game.combat`, ensuring realtime is gated only by active combat, not dormant combat documents.

- **Realtime runner reconciliation**  
  Added `Hooks.on("updateCombat", ...)` to catch combat start/stop transitions that don't create or delete combat documents (e.g., starting an encounter from an existing record, scene changes).

- **Pause/unpause logic corrected**  
  Updated the `pauseGame` hook to resume realtime only when the game is unpaused *and* no active combat exists.

- **Setting `rtLinkPause` fixed**  
  Adjusted its `onChange` handler to also use `!!game.combat`, eliminating sticky mismatches where toggling wouldn't update the runner state.

- **UI text clarification**  
  Updated hover text for `rtAutoPauseCombat` to:  
  *"Auto Pause at Combat Start/End"* for clearer user intent.
