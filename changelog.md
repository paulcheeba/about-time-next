# Changelog (v13.3.1.0)

**Phase 1: Calendar Adapter Foundation (Non-Breaking)**

- **Calendar Adapter System**  
  Added abstraction layer for calendar system integration. Implements factory pattern with CalendarAdapter base class providing unified interface for multiple calendar systems. Non-breaking addition - existing functionality unchanged.

- **Simple Calendar Adapter**  
  Full integration adapter for Simple Calendar with 0-based indexing support, calendar data extraction, fallback Gregorian calendar, and comprehensive error handling. Wraps all SC API calls with defensive coding patterns.

- **Seasons & Stars Adapter**  
  Complete integration adapter for Seasons & Stars with 1-based indexing conversion, async method support, modular calendar pack detection, and calendar structure extraction. Handles S&S's unique API patterns transparently.

- **Auto-Detection & Factory Pattern**  
  Automatic detection of installed calendar systems (SC and S&S), factory instantiation of appropriate adapter, graceful degradation when no calendar modules present, and settings-based adapter selection with auto-detection on first run.

- **Comprehensive Logging**  
  Development-focused console logging throughout adapter lifecycle: initialization tracking, detection results, method call tracing, calendar data extraction logs, and error reporting with context. All logs prefixed with `[CalendarAdapter]`, `[SimpleCalendarAdapter]`, or `[SandSAdapter]`.

- **Test Infrastructure**  
  Added `testCalendarAdapters.js` macro for validating adapter functionality, testing all adapter methods, detection verification, and cache refresh testing. Provides detailed console output for development validation.

- **Global API Access**  
  CalendarAdapter exposed via `window.AboutTimeNext.CalendarAdapter` and `game.abouttime.CalendarAdapter` for macro and console access. All adapters register in `window.AboutTimeNext.adapters` namespace.

---

# Changelog (v13.2.1.0)

- **Standardized Event Chat Cards**  
  All Event Manager events now display detailed, consistently formatted notification cards with clear visual styling. Cards include event name, message, duration (DD:HH:MM:SS), repeating status, macro name, and event UID. Format persists through Foundry reloads with all metadata intact.

- **Event Card Persistence Fix**  
  Fixed critical bug where event metadata was lost after Foundry reload, causing empty or malformed chat messages. Implemented deep cloning for proper serialization through Foundry's settings system, ensuring all event details survive reload cycles.

- **[about-time-next] Prefix Integration**  
  Event cards now always include the `[about-time-next]` prefix, ensuring notification sounds trigger correctly for both fresh events and after reload. Both fresh handlers and reconstructed handlers use the same standardized format for consistency.

- **Macro Integration Enhancement**  
  Events with macros now display the event notification card *before* executing the macro, providing clear context about what triggered the macro execution. Both card and macro output appear in sequence.

- **UID Display Fix**  
  Corrected issue where event UID displayed as "null" in fresh event cards. UIDs now display correctly in both pre-reload and post-reload scenarios.

---

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
