# D&D 5e Calendar Integration - Implementation Summary

**Version:** v13.3.5.0  
**Date:** Implementation complete  
**Status:** Ready for testing

## Overview

Added native support for D&D 5e v5.2.0+ calendar system as a first-class calendar option in About Time Next. The implementation follows the existing CalendarAdapter pattern and makes D&D 5e calendar the **default choice** when detected.

## Files Created

### 1. `module/calendar/Dnd5eAdapter.js` (NEW)
Complete adapter implementation for D&D 5e calendar system.

**Key Features:**
- Extends `CalendarAdapter` base class
- Uses Foundry's core `CalendarData` API via `game.calendar`
- Implements all required interface methods:
  - `isAvailable()` - Detects D&D 5e system, v5.2+, calendar enabled
  - `formatDateTime(timestamp)` - Uses `timeToComponents()` to format timestamps
  - `timestampPlusInterval()` - Uses `calendar.add()` for interval arithmetic
  - `timestampToDate()` - Converts timestamps to date components (0-based to 1-based months)
  - `getCalendarData()` - Extracts month names, day counts, time units
- Handles month indexing conversion (D&D 5e uses 0-based internally)
- Graceful fallback for missing calendar data
- Self-registers in `window.AboutTimeNext.adapters`

**API Methods Used:**
- `game.calendar.timeToComponents(timestamp)` - Convert timestamp to date components
- `game.calendar.add(timestamp, interval)` - Add interval to timestamp
- `game.calendar.months[]` - Month configuration (names, day counts)
- `game.calendar.days[]` - Day names/configuration

## Files Modified

### 2. `module/calendar/CalendarAdapter.js`
Updated detection and factory pattern for D&D 5e.

**Changes:**
- Added D&D 5e detection **first** (priority position) in `detectAvailable()`
  - Checks: `game.system.id === "dnd5e"`
  - Checks: `game.settings.get("dnd5e", "calendarEnabled")`
  - Checks: `!!game.calendar` (calendar data model exists)
- Updated `detectAvailableAsObject()` to include `dnd5e: boolean` property
- Added `"dnd5e": "D&D 5e Calendar (v5.2+)"` to `getSystemName()` mapping
- Added `case "dnd5e"` to factory switch statement for adapter instantiation
- Updated return type comments to reflect 3 calendar systems

**Detection Order (Priority):**
1. D&D 5e Calendar (native system - HIGHEST PRIORITY)
2. Simple Calendar (module)
3. Seasons & Stars (module)

### 3. `module/settings.js`
Added D&D 5e option and dynamic UI filtering.

**Changes:**
- Added `"dnd5e": "D&D 5e Calendar (v5.2+)"` to `calendar-system` setting choices
- Updated detection display to show all 3 systems (D&D 5e, Simple Calendar, Seasons & Stars)
- **Dynamic Dropdown Filtering:** Only detected systems appear in dropdown
  - "Auto-detect" and "None" always available
  - Calendar-specific options only shown when detected
  - If current value is removed (not detected), falls back to "auto"
- Detection info panel shows ALL systems with ✓/✗ status (for visibility)

### 4. `about-time.js`
Imported new adapter for self-registration.

**Changes:**
- Added `import './module/calendar/Dnd5eAdapter.js';` after CalendarAdapter import
- Updated version comment to v13.3.5.0
- Import triggers self-registration in `window.AboutTimeNext.adapters`

### 5. `module.json`
Updated version number.

**Changes:**
- Updated `"version": "13.3.5.0"`

### 6. `changelog.md`
Added v13.3.5.0 release notes.

**Changes:**
- New section documenting D&D 5e Calendar integration
- Highlighted priority auto-detection
- Documented dynamic settings UI
- Listed requirements and backward compatibility

### 7. `devFolder/DnD5e-Calendar-ref-doc.md` (Previously Created)
Complete API reference documentation (created in earlier step).

## Key Features

### 1. Priority Auto-Detection
When "Auto-detect" is selected (default), D&D 5e Calendar has **highest priority**:
```
Priority Order:
1. D&D 5e Calendar (if system + enabled + available)
2. Simple Calendar (if module active)
3. Seasons & Stars (if module active)
4. None (fallback)
```

### 2. Dynamic Settings Dropdown
**User Experience:**
- Dropdown shows only available options
- "Auto-detect" and "None" always present
- Calendar-specific options appear only when functional

**Example Scenarios:**
- **D&D 5e system with calendar enabled:** Shows Auto, None, D&D 5e
- **Generic system with S&S module:** Shows Auto, None, Seasons & Stars
- **D&D 5e + Simple Calendar:** Shows Auto, None, D&D 5e, Simple Calendar
- **No calendars:** Shows Auto, None only

### 3. Detection Display
**Visual Feedback:**
Shows all calendar systems with status:
```
Detected Calendar Systems:
✓ D&D 5e Calendar (available)
✗ Simple Calendar (not detected)
✓ Seasons & Stars (available)
```

### 4. Requirements Check
D&D 5e Calendar requires:
1. D&D 5e system (`game.system.id === "dnd5e"`)
2. System version 5.2.0 or higher
3. Calendar enabled (`game.settings.get("dnd5e", "calendarEnabled") === true`)
4. Calendar initialized (`game.calendar` exists)

If any requirement fails, adapter gracefully degrades (not available in dropdown).

## Technical Details

### Month Indexing
D&D 5e uses 0-based month indexing internally (0-11), but About Time Next uses 1-based (1-12).

**Conversion:**
```javascript
// D&D 5e → About Time Next
month: components.month + 1

// About Time Next → D&D 5e
month: date.month - 1
```

### Adapter Interface Compliance
`Dnd5eAdapter` implements all required methods:
- ✓ `get name()` → "D&D 5e Calendar"
- ✓ `get systemId()` → "dnd5e"
- ✓ `isAvailable()` → detection logic
- ✓ `formatTimestamp(timestamp)` → single string format
- ✓ `formatDateTime(timestamp)` → `{ date, time }` object
- ✓ `timestampPlusInterval(timestamp, interval)` → future timestamp
- ✓ `timestampToDate(timestamp)` → date components
- ✓ `normalizeInterval(interval)` → standardized interval object
- ✓ `getCalendarData()` → calendar structure (months, days, time units)

### Factory Pattern
Self-registration pattern (consistent with other adapters):
```javascript
// At end of Dnd5eAdapter.js
if (!window.AboutTimeNext) window.AboutTimeNext = {};
if (!window.AboutTimeNext.adapters) window.AboutTimeNext.adapters = {};
window.AboutTimeNext.adapters.Dnd5eAdapter = Dnd5eAdapter;
```

Factory instantiates via:
```javascript
case "dnd5e":
  if (window.AboutTimeNext?.adapters?.Dnd5eAdapter) {
    CalendarAdapter.#activeAdapter = new window.AboutTimeNext.adapters.Dnd5eAdapter();
  }
  break;
```

## Testing Checklist

### Prerequisites
- [ ] D&D 5e system v5.2.0 or higher installed
- [ ] World using D&D 5e system
- [ ] Calendar enabled in D&D 5e settings
- [ ] About Time Next v13.3.5.0 installed

### Detection Tests
- [ ] Open game settings, verify "Detected Calendar Systems" shows:
  - ✓ D&D 5e Calendar (available)
- [ ] Verify dropdown only shows: Auto-detect, None, D&D 5e Calendar
- [ ] With other systems: verify non-detected calendars hidden from dropdown
- [ ] Verify detection display shows all systems with status (✓/✗)

### Functionality Tests
- [ ] Set calendar to "Auto-detect", reload, verify D&D 5e Calendar selected
- [ ] Open Mini Panel, verify time displays with D&D 5e formatting
- [ ] Open Event Manager, verify event timestamps use D&D 5e calendar
- [ ] Create event with `/at doIn 10 seconds ...`, verify it triggers
- [ ] Change world time, verify Mini Panel updates
- [ ] Test with different D&D 5e calendars (Harptos, Greyhawk, Gregorian, Khorvaire)

### Edge Case Tests
- [ ] Disable calendar in D&D 5e settings, verify fallback to next available
- [ ] With Simple Calendar also installed, verify priority (D&D 5e first)
- [ ] Manually select "None", verify Foundry core time used
- [ ] Test backward compatibility with existing events

### Console Tests
- [ ] Reload, check console for:
  - `[Dnd5eAdapter] Initializing...`
  - `[Dnd5eAdapter] ✓ D&D 5e calendar verified available`
  - `[CalendarAdapter] D&D 5e Calendar: system=✓, enabled=✓, calendar=✓`
  - `[CalendarAdapter] Detection complete. Available: [dnd5e]`
- [ ] Verify no errors related to calendar adapter

## Backward Compatibility

✅ **Fully backward compatible:**
- Existing Simple Calendar integrations unchanged
- Existing Seasons & Stars integrations unchanged
- Existing events continue working
- Settings migration not required (new option added, not replaced)
- Systems without D&D 5e v5.2+ unaffected

## Future Enhancements

Possible future additions:
1. Support for custom D&D 5e calendars (user-defined)
2. Integration with D&D 5e sunrise/sunset system methods
3. Enhanced event scheduling using D&D 5e's "midnight" tracking
4. Calendar-specific formatting options per adapter
5. Support for other systems with native calendars (Pathfinder 2e, etc.)

## Notes

- **D&D 5e Calendar is OPTIONAL:** If not available, About Time Next falls back gracefully
- **Priority system ensures best experience:** Native calendars preferred over modules
- **Dynamic UI improves usability:** Users only see relevant choices
- **Detection transparency:** Users always see what systems are detected (even if not available in dropdown)
- **Consistent API:** D&D 5e adapter follows same patterns as existing adapters
