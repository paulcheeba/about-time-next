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