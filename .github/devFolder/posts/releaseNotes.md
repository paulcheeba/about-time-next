# About Time Next v13.5.0.0 (2026-01-10)

Major update bringing full Simple Calendar Reborn integration and neutral calendar selection system.

Added:
- **Simple Calendar Reborn (SCR) full integration** with Time Authority Model B - SCR controls worldTime, ATN enhances with event scheduling
- **SCRAdapter class** implementing proper time routing through `SimpleCalendar.api.changeDate()`
- **Neutral calendar selection** - removed hierarchy, all calendars treated equally
- **Calendar selection dialog** appears when multiple calendars detected (compact 300px layout)
- **Time authority tooltips** in settings showing which system manages time (ATN vs SCR)
- **Smart checkbox disabling** - ATN pause/combat settings disabled when SCR manages them, showing SCR's values
- **Calendar selection template** extracted to Handlebars file for better maintainability
- **Logic bypass** for SCR - ATN skips pause/combat hooks when SCR is active to prevent conflicts
- **Comprehensive documentation** including SCR API reference and integration guide

Fixed:
- Timestamp-based events confirmed calendar-agnostic (switching calendars preserves all events)
- Time routing architecture ensures proper delegation to calendar systems

Breaking Changes:
- None - all existing functionality preserved, new features are additive

Migration Notes:
- Simple Calendar (legacy) users should migrate to Simple Calendar Reborn v2.4.0+
- Existing events continue to work unchanged
- First-time users with multiple calendars see selection dialog
- Existing calendar selections preserved unless additional calendar modules enabled

Manifest URL:
- https://github.com/paulcheeba/about-time-next/releases/latest/download/module.json

Patreon:
- OverEngineeredVTT - https://www.patreon.com/cw/u45257624

Discord:
- OverEngineeredVTT - About Time Next - https://discord.com/channels/1038881475732451368/1454747384692215840

---

# About Time Next v13.4.1.0 (2026-01-04)

This release adds a new required dependency (OEV Suite Monitor) and updates documentation links.

Added:
- Module now requires the OverEngineeredVTT Suite Monitor (`oev-suite-monitor`) hub module.

Fixed:
- NA

Breaking Changes:
- OEV Suite Monitor is now required (install it alongside About Time Next).

Manifest URL:
- https://github.com/paulcheeba/about-time-next/releases/latest/download/module.json

Patreon:
- OverEngineeredVTT - https://www.patreon.com/cw/u45257624

Discord:
- OverEngineeredVTT - About Time Next - https://discord.com/channels/1038881475732451368/1454747384692215840


# About Time Next — Release Notes v13.4.0.1

**Release Date:** December 21, 2025  
**From:** v13.2.1.0  
**To:** v13.4.0.1  
**Foundry VTT Compatibility:** v13

---

## Overview
This release focuses on **quality-of-life improvements** for calendar/time display, event management, and delegated “timekeeper” permissions, plus several stability fixes around world refresh and calendar module interactions.

---

## Highlights (QoL)

### Better calendar support & clearer time display
- **Native D&D 5e calendar support (v5.2+)** via a dedicated adapter that reads from Foundry’s `game.time.calendar`.
- **Unified date/time formatting across all adapters** (D&D5e / Seasons & Stars / Simple Calendar / core time fallback), including ordinal suffixes rendered as superscript (e.g. `3<sup>rd</sup>`).
- **New Time Format setting (12-hour or 24-hour)** for consistent display across the module.
- **Dynamic Calendar System dropdown** that only shows available options; adapter refresh happens automatically when changed.
- **Calendar recommendation prompt for GMs** when Auto-detect is selected or a selected calendar is unavailable, with a “suppress until selection changes” option.

### Easier, safer queue management
- **Timekeeper role threshold**: a world setting that allows delegating queue management to non-GM users (GM always overrides).
- **Confirm/Cancel chat cards** for destructive actions:
  - `/at clear` and `/at stop` now post a confirm card and update the same message in-place after confirm/cancel.
- **Pause/Resume support**:
  - Added pause/resume controls in the Event Manager and corresponding `/at pause` / `/at resume` chat commands.

### More reliable Event Manager updates
- **Event Status Board now prefers the persisted store as authoritative** for display, reducing “stale queue” views after refresh.
- **Improved timestamp display & tooltips** (e.g., stable “Started On” context where available).

---

## Changes by Area

### Calendar & settings
- Introduced the **CalendarAdapter system** and migrated time formatting and interval operations to use it (non-breaking refactor).
- Added/updated calendar detection to support:
  - **D&D 5e calendar (v5.2+)**
  - **Seasons & Stars**
  - **Simple Calendar** (kept as a legacy/reference integration pending FVTT v13 readiness)
  - **Foundry core time fallback**
- Added **calendar settings migration** from legacy Simple Calendar toggle to the new `calendar-system` setting.

### Mini Panel
- **Layout refresh** for readability.
- Uses adapter formatting consistently and provides clearer tooltips indicating which calendar system is in use.

### Event notifications / chat cards
- Event notification cards continue to use standardized formatting.
- Added user-facing context fields:
  - **“Started On”** (when available)
  - **“Next Occurrence”** for repeating events

### Permissions
- Added a **minimum role required to be a timekeeper** world setting.
- Updated UI entry points (chat commands, Event Manager, toolbar button) to use **timekeeper checks** rather than GM-only gating.

---

## Fixes & Stability
- **World refresh reliability:** fixed an intermittent window during master timekeeper election where `addEvent` messages could be lost. Events are now queued until a master is acquired, then drained and persisted.
- **v13.4.0.1 — Notification sound trigger refinement:** notification sounds now play only for scheduled **event notification cards** (standardized event cards), not for other About Time Next chat/status/confirmation cards.
- **Realtime clock safety:** if advancing world time throws an error, realtime stops and warns once (prevents repeated tick errors).
- **Reduced console noise:** most adapter and notification logs are now debug-gated (while keeping minimal always-on status info for troubleshooting).

---

## Compatibility Notes
- **Simple Calendar:** retained as a legacy/reference integration; full support depends on Simple Calendar being FVTT v13-ready.
- Calendar auto-detect and recommendations are designed to avoid silent switches while still helping GMs converge on a “best available” calendar setup.

---

## Migration Notes (Users)
- No manual migration steps required for most users.
- If you use delegated timekeeping, set **Configure Settings → About Time Next → Minimum role required to be a timekeeper**.

---

## Full Changelog
See [changelog.md](../changelog.md) for the complete version history.


# About Time Next v13.2.1.0 Release Notes

## Overview
Version 13.2.1.0 introduces standardized event notification cards with consistent formatting and fixes a critical bug where event metadata was lost after Foundry reloads.

---

## Features

### Standardized Event Chat Cards
All events created through the Event Manager now display detailed, consistently formatted notification cards:

**Card Format:**
```
[about-time-next]
Event Name: <name or NA>
Message: <message or NA>
Duration: DD:HH:MM:SS (or NA)
Repeating: Yes/No
Macro: <macro name or NA>
Event UID: <unique identifier>
```

**Visual Design:**
- Green left border for quick identification
- Monospace font for consistent alignment
- Clear section labels with bold headings
- Duration displayed in DD:HH:MM:SS format

**Benefits:**
- **Clarity**: All event details visible at a glance
- **Persistence**: Format maintained through Foundry reloads
- **Consistency**: Same format for all events (with/without macros)
- **Notification Support**: `[about-time-next]` prefix ensures sounds trigger correctly

---

## Bug Fixes

### Event Metadata Persistence (Critical)
**Issue:** After Foundry reload, event notification chat cards appeared empty or malformed due to metadata loss during serialization.

**Root Cause:** Direct assignment of `_args` array in `FastPriorityQueue.exportToJson()` didn't properly clone nested metadata objects. When Foundry's settings system serialized the queue using `JSON.stringify()`, object references were lost.

**Solution:** Implemented deep cloning using `foundry.utils.deepClone()` with fallback to `JSON.parse(JSON.stringify())`. Added defensive checks in `createFromJSON()` to ensure args is always an array.

**Files Modified:**
- `module/FastPriorityQueue.js` - Added deep clone logic in exportToJson() and defensive checks in createFromJSON()

### [about-time-next] Prefix Consistency
**Issue:** Event cards lost the `[about-time-next]` prefix after reload, preventing notification sounds from triggering (ATNotificationSound.js pattern matching failed).

**Solution:** Integrated prefix into `formatEventChatCard()` helper function used by both fresh handlers (ATEventManagerAppV2) and reconstructed handlers (FastPriorityQueue). Prefix now persists through reload cycle.

### UID Display Issue
**Issue:** Event UID displayed as "null" in fresh event cards because handler was called before UID was available from `doIn`/`doEvery` return value.

**Solution:** Store UID in metadata (`__uid`) after `doIn`/`doEvery` returns, then handler accesses it via `metaArg.__uid`. Ensures UID displays correctly in both fresh and reloaded events.

### Macro Integration
Events with macros now display notification card *before* macro execution:
1. Show standardized event card (with all details)
2. Execute linked macro (if configured)

This provides clear context about what triggered the macro.

---

## Technical Implementation

### New Helper Function
```javascript
formatEventChatCard(meta, uid, recurring, increment)
```
Centralized formatter ensures consistent HTML generation across:
- Fresh event handlers (ATEventManagerAppV2.js)
- Reconstructed handlers after reload (FastPriorityQueue.js)

**Parameters:**
- `meta`: Metadata object with `__atName`, `__atMsg`, `__macroName`, `__macroUuid`, `__duration`, `__uid`
- `uid`: Event unique identifier (from `metaArg.__uid` or `data.uid`)
- `recurring`: Boolean indicating if event repeats
- `increment`: Seconds between repeats (for duration display)

**Returns:** HTML string with standardized card format

### Duration Calculation
Duration now stored in metadata (`__duration`) and formatted as DD:HH:MM:SS:
```javascript
const d = Math.floor(seconds / 86400);
const h = Math.floor((seconds % 86400) / 3600);
const m = Math.floor((seconds % 3600) / 60);
const s = Math.floor(seconds % 60);
```

---

## Files Modified

### Core Changes
- **module/FastPriorityQueue.js**
  - Added `formatEventChatCard()` helper function (exported)
  - Updated `exportToJson()` with deep clone logic
  - Updated `createFromJSON()` reconstructed handler to use formatter
  - Added defensive array check for args

- **module/ATEventManagerAppV2.js**
  - Added `__duration` to metadata object
  - Added `__uid` to metadata after event creation for display in fresh cards
  - Imported `formatEventChatCard` from FastPriorityQueue
  - Updated handler to always show event card (even with macros)
  - Handler now calls formatter with `metaArg.__uid` before macro execution

### Documentation
- **changelog.md** - Added v13.2.1.0 section with 5 bullet points including UID fix
- **module.json** - Updated version to 13.2.1.0
- **README.md** - Added Event Notification Cards section with example format
- **devFolder/releaseNote-v13.2.1.0.md** - Created comprehensive release notes
- **devFolder/todo.md** - Marked standardization task complete (updated in previous session)

---

## Known Limitations

### Out of Scope (Deferred to Future Releases)
- **`/at` Chat Commands**: `/at remind`, `/at every`, etc. still use legacy format. Standardization planned for future release.
- **`/at` Chat Commands**: `/at remind`, `/at every`, etc. will NOT trigger notifaction sounds until post-standardization.
- **ElapsedTime.message()**: Direct API calls don't use new format yet. Functionality unchanged, standardization planned for future release.

### Compatibility Notes
- Requires Foundry VTT v13+
- Event cards use inline CSS (no external stylesheet changes)
- Deep clone fallback ensures compatibility with environments lacking `foundry.utils.deepClone()`

---

## Migration Notes

### For Users
- **No Action Required**: Existing events will automatically use new format after reload
- **Settings Preserved**: Notification sound settings from v13.2.0.0 remain unchanged
- **Event Queue Safe**: Existing scheduled events maintain their trigger times and functionality

### For Developers
- **Formatter Available**: `formatEventChatCard()` exported from `FastPriorityQueue.js` for custom event integrations
- **Metadata Structure**: Handlers expect `__atName`, `__atMsg`, `__duration`, `__macroName`, `__macroUuid` in args
- **Handler Marking**: Use `handler._atHandlerType = "gmWhisper"` to ensure proper serialization

---

## Credits
- Deep clone fix pattern adapted from Foundry core utils
- Duration formatting inspired by standard time display conventions
- Card styling uses Dracula theme accent color (#50fa7b) for consistency

# About Time Next — Release Notes v13.2.0.0

**Release Date:** November 22, 2025  
**Foundry VTT Compatibility:** v13

---

## What's New

### Event Notification Sounds 🎵 

Never miss a scheduled event again! This release introduces an optional audible notification system for GMs:

- **Automatic Playback:** Sounds play when scheduled events trigger, alerting you without needing to watch the Event Manager
- **Customizable:** Choose from 3 included notification sounds or use your own audio files
- **Volume Control:** Adjust notification volume independently (0-100%) without affecting other game sounds
- **Test Before Saving:** Preview your sound selection and volume before committing changes
- **Non-Intrusive:** Enable/disable anytime via module settings, works seamlessly with repeating events

**New Settings (Client-Side):**
- Enable Event Notification Sound — Toggle on/off
- Sound Source — Built-in or custom
- Custom Sound Path — File picker with default path to module sounds
- Notification Volume — 0-100% slider
- Test Sound — Button to preview current selection

**Technical Details:**
- GM-only feature (matches ATN's design philosophy)
- Hook-based detection using pattern matching on chat messages
- Settings apply immediately after saving (no reload required)
- Works with repeating events — change settings mid-session while events continue to trigger

---

## Installation

**Manifest URL:**
```
https://github.com/paulcheeba/about-time-next/releases/latest/download/module.json
```

Or search for **"About Time Next"** in Foundry's module browser.

---

## Configuration

After updating, open **Configure Settings → About Time Next** to find the new **Event Notification Sounds** section at the bottom of the settings panel.

**Recommended Setup:**
1. Enable event notification sound
2. Select sound source (built-in is fine for most users)
3. Adjust volume to comfortable level (default: 40%)
4. Click **Test Sound** to preview
5. Click **Save Changes** to apply

**Custom Sounds:**
- Change sound source to "Custom"
- Click file picker button
- Navigate to your audio file (MP3, OGG, WAV supported)
- Test and save

---

## Credits

**Sound Effects:** All 3 included notification sounds are courtesy of [Notification_Message](https://pixabay.com/users/notification_message-47259947/) from [Pixabay](https://pixabay.com/sound-effects/) (Pixabay License).

---

## Known Issues

None reported for v13.2.0.0. If you encounter issues, please report them on the [GitHub Issues](https://github.com/paulcheeba/about-time-next/issues) page.

---

## Full Changelog

See [changelog.md](https://github.com/paulcheeba/about-time-next/blob/main/changelog.md) for complete version history.

---

## Acknowledgments

Originally created by **Tim Posney**, maintained for FVTT v13+ by **paulcheeba** with community feedback and AI-assisted development.

---

## License

MIT License — see [LICENSE](https://github.com/paulcheeba/about-time-next/blob/main/LICENSE) file.
