# Changelog (v13.4.0.1)

**Minor QoL Fix**

- **Notification Sounds: Event Cards Only**  
  Reduced notification sound triggers to only play for scheduled event notification cards (standardized event cards), not for other About Time Next chat/status/confirmation cards.

---

# Changelog (v13.4.0.0)

**D&D 5e Calendar Integration + Timekeeper & Stability Updates**

- **New Dnd5eAdapter Class**  
  Added native support for D&D 5e v5.2.0+ calendar system via new `Dnd5eAdapter.js`. The adapter integrates with Foundry v13's core time API at `game.time.calendar`. Supports all four built-in D&D 5e calendars (Gregorian, Greyhawk, Harptos/Forgotten Realms, Khorvaire/Eberron).

- **Auto-Detect Calendar Priority (Updated)**  
  Auto-detect now prefers full calendar modules when present (Seasons & Stars / Simple Calendar), then falls back to the D&D 5e native calendar (v5.2+), then Foundry core time when no calendar system is available.

- **Calendar Recommendation on World Load**  
  Added a GM prompt when the current selection is set to Auto-detect, or when the selected calendar is unavailable. Includes an option to suppress future prompts until the Calendar System selection changes.

- **Dynamic Settings UI**  
  Calendar dropdown dynamically shows only detected calendar systems. "Auto-detect" and "None" always appear; other options only appear when functional. Changing the Calendar System no longer requires a world reload; the adapter cache is refreshed automatically.

- **Standardized Date/Time Formatting + Time Format Setting**  
  All calendar adapters now use consistent formatting with ordinal suffixes (1st, 2nd, 3rd, etc.) rendered as superscript, and a consistent date/time joiner. Added a new world setting for 12-hour (AM/PM) or 24-hour time display.

- **Timekeeper Permissions (GM Always Overrides)**  
  Added a minimum-role threshold world setting so non-GM users can be delegated as timekeepers. Timekeepers can manage the event queue (chat commands, Event Manager, toolbar entry), while GMs are always allowed regardless of threshold.

- **Chat Command Confirmations**  
  `/at clear` and `/at stop` now post confirm/cancel buttons and update the same chat card in-place after confirm/cancel.

- **Event Scheduling Reliability During Master Election**  
  Fixed an intermittent race during world refresh where socket `addEvent` messages could be lost before a master timekeeper is elected. Add events are now queued until a master is acquired and then drained/persisted.

- **Event Manager Improvements**  
  Event Manager now prefers the persisted store as the authoritative queue source for display (reduces stale views after refresh). Added Pause/Resume controls per event and improved timestamp display/tooltips.

- **Event Notification Card Enhancements**  
  Event chat cards now include stable "Started On" and "Next Occurrence" fields (for repeating events) using the active calendar adapter.

- **Realtime Clock Safety**  
  If realtime world time advancement throws, realtime is stopped and a warning is surfaced (prevents repeated error spam).

- **Reduced Log Noise**  
  Most calendar adapter and notification sound logs are now debug-gated, while keeping a minimal always-on status line for basic troubleshooting.

---

# Changelog (v13.3.4.0)

**Phase 3: Core Refactor - Use CalendarAdapter System (Non-Breaking)**

- **ElapsedTime.js Refactor**  
  Replaced all direct Simple Calendar API calls with CalendarAdapter abstraction. Removed `isSCActive()` function and added `getCalendarAdapter()` and `hasCalendarSystem()` helpers. Updated all time formatting and interval calculation methods (`currentTimeString`, `timeString`, `currentTime`, `doIn`, `doEvery`, `doAtEvery`, `reminderAtEvery`) to use adapter methods. Event scheduling now works consistently across Simple Calendar, Seasons & Stars, and Foundry core time.

- **ATMiniPanel.js Refactor**  
  Refactored `scFormat()` function to use `CalendarAdapter.formatDateTime()` instead of direct Simple Calendar API calls. Mini time panel now displays correctly formatted timestamps for all supported calendar systems.

- **ATEventManagerAppV2.js Refactor**  
  Updated `#fmtTimestamp()` method to use `CalendarAdapter.formatDateTime()` instead of direct Simple Calendar checks. Event Manager UI now displays event timestamps correctly for Simple Calendar, Seasons & Stars, and core time. Comments updated to reflect support for calendar systems in general, not just Simple Calendar.

- **Backward Compatibility**  
  All refactoring maintains backward compatibility. Existing events, macros, and time displays continue to work. Simple Calendar functionality unchanged for existing users. Seasons & Stars now fully integrated throughout the module.

---

# Changelog (v13.3.3.0)

**AT Mini Panel Layout Refresh (Non-Breaking)**

- **New Header Layout**  
  Reworked the header into a 2-column layout: a two-line "Current / time:" label on the left and the live time display on the right. Title aligns right; time display centers and stretches to fill available space.

- **Time Display Styling**  
  Time display now uses button-like styling (border + radius) and a dark theme-token background for clearer visual separation.

- **Step Button Compactness**  
  Step buttons updated to a tighter layout with icon + duration on one line (rewind icons left, advance icons right).

- **Bottom Row Split Into 3 Sections**  
  Time-of-day row reorganized into left/center/right sections: Play/Pause (left), Dawn→Midnight buttons (center), and toggle switches (right). Enforced a 23px minimum width for all buttons in this row.

- **Time-of-Day Hint Tints**  
  Dawn/Noon/Dusk/Midnight buttons now have subtle tinted backgrounds (still grey overall) with matching hover behavior.

- **Toggle Tooltip State**  
  The two toggle buttons now append their current state (On/Off) to tooltips and keep `aria-checked` in sync.

---

# Changelog (v13.3.2.0)

**Phase 2: Calendar Settings & Migration (Non-Breaking)**

- **New Calendar System Setting**  
  Added world-scope `calendar-system` setting with choices: "Auto-detect", "None (Foundry Core Time)", "Simple Calendar", "Seasons & Stars". Replaces legacy boolean `use-simple-calendar` setting. Includes dynamic detection hints showing which calendar modules are currently installed.

- **Settings Migration Logic**  
  Automatic one-time migration from legacy `use-simple-calendar` boolean to new `calendar-system` string setting. Runs on first GM login after upgrade. Respects user preferences: disabled SC → "none", enabled SC + available → "simple-calendar", SC unavailable + S&S available → "seasons-and-stars". Shows notification to GM on successful migration.

- **Settings UI Enhancements**  
  Reorganized settings into logical sections: Internal Settings (hidden), General Settings, Calendar Integration, Event Notifications. Added real-time calendar detection display in settings UI showing "✓ Available" or "✗ Not detected" for each calendar module. Enhanced console logging for all setting changes.

- **Legacy Setting Preservation**  
  Old `use-simple-calendar` setting hidden from UI (`config: false`) but preserved in database for migration logic. Prevents loss of user preferences during upgrade. Can be safely removed in future major version after migration period.

- **Adapter Refresh on Change**  
  Calendar system setting change triggers automatic adapter cache refresh (`CalendarAdapter.refresh()`). Requires world reload to take full effect (`requiresReload: true`). Ensures adapter state matches new setting immediately.

- **Console Logging Enhancement**  
  Comprehensive logging throughout settings registration, migration logic (detection results, old/new values, migration decisions), UI rendering (detection info injection), and setting changes (onChange callbacks with values).

---

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
