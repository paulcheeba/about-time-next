# Simple Calendar API Reference

**Module ID:** `foundryvtt-simple-calendar` (or legacy `simple-calendar`)  
**Global Object:** `globalThis.SimpleCalendar`  
**Repository:** https://github.com/vigoren/foundryvtt-simple-calendar

---

## Overview

Simple Calendar (SC) is an established calendar and timekeeping module for Foundry VTT. It provides comprehensive calendar functionality with extensive customization options, multiple calendar systems, and a mature API used by many weather and time-tracking modules.

### Architecture

- **Monolithic Design**: All calendars and functionality bundled in single module
- **0-based Indexing**: JavaScript Date-style format (month 0-11, day 0-30)
- **Mature Ecosystem**: Many modules depend on SC's API
- **Hook System**: Uses dash notation (`simple-calendar-dateTimeChange`)

---

## Detection & Availability

```javascript
// Check if SC is installed and active
const sc = game.modules.get("foundryvtt-simple-calendar") ?? game.modules.get("simple-calendar");
const isActive = !!(sc && sc.active && globalThis.SimpleCalendar?.api);
```

**About Time Next Pattern:**
```javascript
function isSCActive() {
  const useSC = game.settings.get(MODULE_ID, "use-simple-calendar");
  if (!useSC) return false;
  const sc = game.modules.get("foundryvtt-simple-calendar") ?? game.modules.get("simple-calendar");
  return !!(sc && sc.active && globalThis.SimpleCalendar?.api);
}
```

---

## Core API Methods

### Time Conversion

#### `SimpleCalendar.api.timestampToDate(seconds, calendarId?)`
Converts a timestamp (in seconds) to a date object.

**Parameters:**
- `seconds` (number) - The timestamp in seconds
- `calendarId` (string, optional) - Calendar ID to use (default: "active")

**Returns:** `SimpleCalendar.DateData` object with properties:
- `year`, `month`, `day`, `hour`, `minute`, `second` - Date/time components
- `dayOfTheWeek` - Index of weekday
- `dayOffset` - Numeric representation offset
- `yearZero` - Year zero value
- `isLeapYear` - Boolean
- `currentSeason` - Season object with name, color, start day/month
- `sunrise`, `sunset`, `midday` - Timestamps for these times
- `weekdays` - Array of weekday names
- `showWeekdayHeadings` - Boolean
- `display` - Object with formatted strings (date, time, day, month, year, etc.)

**Example:**
```javascript
const dateData = SimpleCalendar.api.timestampToDate(1622505600);
console.log(dateData.display.date); // "June 01, 2021"
console.log(dateData.display.time); // "00:00:00"
```

---

#### `SimpleCalendar.api.dateToTimestamp(date, calendarId?)`
Converts a date object to a timestamp.

**Parameters:**
- `date` (object) - Date parts: `{year, month, day, hour, minute, seconds}`
  - **Important:** Month and day are 0-indexed (January = 0, first day = 0)
  - Missing parameters default to current date values
- `calendarId` (string, optional) - Calendar ID (default: "active")

**Returns:** Number (timestamp in seconds)

**Example:**
```javascript
const ts = SimpleCalendar.api.dateToTimestamp({year: 2021, month: 0, day: 0, hour: 1, minute: 1, seconds: 0});
// Returns timestamp for January 1, 2021, 01:01:00
```

---

#### `SimpleCalendar.api.timestampPlusInterval(currentSeconds, interval, calendarId?)`
Adds an interval to a timestamp and returns the new timestamp.

**Parameters:**
- `currentSeconds` (number) - Base timestamp
- `interval` (object) - Interval with optional properties:
  - `year`, `month`, `day`, `hour`, `minute`, `seconds`
  - Each property specifies how many of that unit to add
- `calendarId` (string, optional) - Calendar ID (default: "active")

**Returns:** Number (new timestamp in seconds)

**Example:**
```javascript
let newTime = SimpleCalendar.api.timestampPlusInterval(0, {day: 1});
// Returns 86400 (1 day in seconds for most calendars)

newTime = SimpleCalendar.api.timestampPlusInterval(1622505600, {month: 1, day: 1});
// Returns timestamp for July 2, 2021
```

---

#### `SimpleCalendar.api.secondsToInterval(seconds, calendarId?)`
Converts a number of seconds into an interval object.

**Parameters:**
- `seconds` (number) - Number of seconds to convert
- `calendarId` (string, optional) - Calendar ID (default: "active")

**Returns:** Interval object with `{year, month, day, hour, minute, second}`

---

### Date/Time Formatting

#### `SimpleCalendar.api.formatDateTime(date, format?, calendarId?)`
Formats a date object into date and time strings.

**Parameters:**
- `date` (object) - Date parts: `{year, month, day, hour, minute, seconds}`
  - Negative values become 0 (except year, which can be negative)
  - Values exceeding maximum are capped
  - Month/day are 0-indexed
- `format` (string, optional) - Custom format string
- `calendarId` (string, optional) - Calendar ID (default: "active")

**Returns:**
- If no format: `{date: string, time: string}`
- If format provided: Single formatted string

**Example:**
```javascript
SimpleCalendar.api.formatDateTime({year: 2021, month: 11, day: 24, hour: 12, minute: 13, seconds: 14});
// Returns {date: 'December 25, 2021', time: '12:13:14'}

SimpleCalendar.api.formatDateTime({year: 2021, month: 11, day: 24, hour: 12, minute: 13, seconds: 14}, "DD/MM/YYYY HH:mm:ss");
// Returns '25/12/2021 12:13:14'
```

---

#### `SimpleCalendar.api.formatTimestamp(timestamp, format?, calendarId?)`
Formats a timestamp into date and time strings.

**Parameters:**
- `timestamp` (number) - Timestamp in seconds
- `format` (string, optional) - Custom format string
- `calendarId` (string, optional) - Calendar ID (default: "active")

**Returns:**
- If no format: `{date: string, time: string}`
- If format provided: Single formatted string

**Example:**
```javascript
SimpleCalendar.api.formatTimestamp(1640434394);
// Returns {date: 'December 25, 2021', time: '12:13:14'}

SimpleCalendar.api.formatTimestamp(1640434394, "DD/MM/YYYY HH:mm:ss A");
// Returns '25/12/2021 12:13:14 PM'
```

---

### Clock Control

#### `SimpleCalendar.api.clockStatus(calendarId?)`
Gets the current status of the built-in clock.

**Parameters:**
- `calendarId` (string, optional) - Calendar ID (default: "active")

**Returns:** Object with:
- `started` (boolean) - Clock is running
- `stopped` (boolean) - Clock is not running
- `paused` (boolean) - Clock is paused (game paused or combat active)

**Example:**
```javascript
const status = SimpleCalendar.api.clockStatus();
console.log(status); // {started: false, stopped: true, paused: false}
```

---

#### `SimpleCalendar.api.startClock(calendarId?)`
Starts the clock (Primary GM only).

**Parameters:**
- `calendarId` (string, optional) - Calendar ID (default: "active")

**Returns:** Boolean - Success/failure

---

#### `SimpleCalendar.api.stopClock(calendarId?)`
Stops the clock (Primary GM only).

**Parameters:**
- `calendarId` (string, optional) - Calendar ID (default: "active")

**Returns:** Boolean - Success/failure

---

#### `SimpleCalendar.api.timestamp(calendarId?)`
Gets the current timestamp of the calendar.

**Parameters:**
- `calendarId` (string, optional) - Calendar ID (default: "active")

**Returns:** Number (current timestamp in seconds)

---

### UI Control

#### `SimpleCalendar.api.showCalendar(date?, compact?)`
Opens the Simple Calendar interface.

**Parameters:**
- `date` (object, optional) - Date to display
- `compact` (boolean, optional) - Show compact view

---

### Information Getters

#### `SimpleCalendar.api.isPrimaryGM()`
Checks if current user is the primary GM.

**Returns:** Boolean

---

## Hooks

Simple Calendar emits several hooks that other modules can listen to.

### Hook Constants

Access via `SimpleCalendar.Hooks`:
- `DateTimeChange` = `"simple-calendar-date-time-change"`
- `ClockStartStop` = `"simple-calendar-clock-start-stop"`
- `PrimaryGM` = `"simple-calendar-primary-gm"`
- `Ready` = `"simple-calendar-ready"`
- `Init` = `"simple-calendar-init"`

---

### `SimpleCalendar.Hooks.DateTimeChange`

**When Emitted:**
- GM clicks "Set Current Date" button
- Clock is running (every interval update)
- `setDate()` function is called
- `changeDate()` function is called
- Game world time changes (if SC configured to update)

**Data Passed:**
```javascript
{
  date: {
    year: 2021,
    month: 5,
    day: 0,
    dayOfTheWeek: 2,
    hour: 0,
    minute: 0,
    second: 0,
    // ... (full DateData object)
  },
  diff: 3600, // Difference in seconds from previous time
  moons: [/* array of moon data */]
}
```

**Example:**
```javascript
Hooks.on(SimpleCalendar.Hooks.DateTimeChange, (data) => {
  console.log(`Time changed by ${data.diff} seconds`);
  console.log(`New date: ${data.date.display.date}`);
});
```

---

### `SimpleCalendar.Hooks.ClockStartStop`

**When Emitted:**
- Clock is started
- Clock is stopped
- Game is paused/unpaused
- Combat starts/ends in active scene
- Combat round is advanced

**Data Passed:**
```javascript
{
  started: false,  // Clock is running
  stopped: true,   // Clock is not running
  paused: false    // Clock is paused
}
```

**Example:**
```javascript
Hooks.on(SimpleCalendar.Hooks.ClockStartStop, (data) => {
  if (data.started) console.log("Clock started");
  if (data.paused) console.log("Clock paused");
});
```

---

### `SimpleCalendar.Hooks.PrimaryGM`

**When Emitted:**
- Current user is promoted to primary GM role
- Happens 5 seconds after loading if no other GM is primary

**Data Passed:**
```javascript
{
  isPrimaryGM: true
}
```

**Example:**
```javascript
Hooks.on(SimpleCalendar.Hooks.PrimaryGM, (data) => {
  console.log("I am now the primary GM!");
});
```

---

### `SimpleCalendar.Hooks.Ready`

**When Emitted:**
- Simple Calendar is fully initialized and ready
- For GMs, up to 5 seconds after loading (primary GM checks)

**Data Passed:** None

**Example:**
```javascript
Hooks.on(SimpleCalendar.Hooks.Ready, () => {
  console.log("Simple Calendar is ready!");
});
```

---

### `SimpleCalendar.Hooks.Init`

**When Emitted:**
- While Simple Calendar is initializing (before Ready)

**Data Passed:** None

---

## About Time Next Integration Patterns

### Current Usage in ATN

#### 1. Detection Pattern
```javascript
// Used in ElapsedTime.js, PseudoClock.js, ATMiniPanel.js
const useSC = game.settings.get(MODULE_ID, "use-simple-calendar");
const sc = game.modules.get("foundryvtt-simple-calendar") ?? game.modules.get("simple-calendar");
const isActive = !!(useSC && sc && sc.active && globalThis.SimpleCalendar?.api);
```

#### 2. Time Display Pattern
```javascript
// ATMiniPanel.js - scFormat()
const sc = game.modules.get("foundryvtt-simple-calendar")?.active ? globalThis.SimpleCalendar?.api : null;
if (sc?.timestampToDate && sc?.formatDateTime) {
  const dt = sc.timestampToDate(worldTime);
  const out = sc.formatDateTime(dt);
  return `${out.date} ${out.time}`.trim();
}
```

#### 3. Interval Conversion Pattern
```javascript
// DateTime.js - normalizeATInterval()
// Converts AT plural keys to SC singular keys
function normalizeATInterval(raw) {
  const map = {
    years: "year", months: "month", days: "day",
    hours: "hour", minutes: "minute", seconds: "second"
  };
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = map[k] || k;
    out[key] = (out[key] || 0) + Number(v);
  }
  return out;
}
```

#### 4. Event Scheduling Pattern
```javascript
// ElapsedTime.js - doIn()
const norm = normalizeATInterval(when);
if (isSCActive() && globalThis.SimpleCalendar?.api?.timestampPlusInterval) {
  const nextTs = globalThis.SimpleCalendar.api.timestampPlusInterval(0, norm);
  incSeconds = Math.max(0, Math.floor(nextTs));
} else {
  incSeconds = secondsFromATInterval(norm);
}
const at = Math.floor(currentWorldTime()) + incSeconds;
```

#### 5. Clock Status Pattern
```javascript
// PseudoClock.js - isRunning()
const status = globalThis.SimpleCalendar?.api?.clockStatus?.();
return !!(status && status.started && !status.paused);
```

#### 6. UI Integration Pattern
```javascript
// about-time.js
operations.startRunning = () => globalThis.SimpleCalendar?.api?.startClock?.();
operations.stopRunning = () => globalThis.SimpleCalendar?.api?.stopClock?.();
operations.showClock = () => globalThis.SimpleCalendar?.api?.showCalendar?.(null, true);
operations.showCalendar = () => globalThis.SimpleCalendar?.api?.showCalendar?.();
```

---

## Key Integration Files in ATN

1. **`module/ElapsedTime.js`**
   - `isSCActive()` - Detection
   - `currentTimeString()` - Time formatting
   - `doIn()`, `doEvery()`, `doAt()` - Event scheduling with SC intervals
   
2. **`module/PseudoClock.js`**
   - `isRunning()` - Clock status check
   
3. **`module/calendar/DateTime.js`**
   - `normalizeATInterval()` - Interval normalization
   - `intervalATtoSC()` - AT→SC conversion
   - `intervalSCtoAT()` - SC→AT conversion
   - `dateToTimestamp()` - Wrapper for SC API
   - `clockStatus()` - Wrapper for SC API
   
4. **`module/ATMiniPanel.js`**
   - `scFormat()` - Time display formatting
   
5. **`module/settings.js`**
   - `use-simple-calendar` - Boolean toggle setting

---

## Notes for S&S Integration

**Patterns to replicate:**
1. Detection function similar to `isSCActive()`
2. Conditional API calls with fallback
3. Interval normalization/conversion
4. Time display formatting
5. Event scheduling with calendar-aware intervals
6. Settings toggle with auto-detection

**Key differences to expect:**
- Different API namespace (likely `game.modules.get("seasons-and-stars")`)
- Different time/date object structure
- Different hook names and data structures
- Potentially different interval calculation methods

---

## Version Notes

This documentation is based on Simple Calendar v2.x API patterns as observed in the ATN codebase and SC repository documentation (versions 1.2.x through 2.4.x).

**Stable API Methods Used by ATN:**
- `timestampToDate()` ✓
- `dateToTimestamp()` ✓
- `formatDateTime()` ✓
- `clockStatus()` ✓
- `timestampPlusInterval()` ✓
- `showCalendar()` ✓
- `startClock()` ✓
- `stopClock()` ✓

**Hooks Monitored:**
- Currently ATN does not actively listen to SC hooks, but could utilize:
  - `DateTimeChange` for real-time updates
  - `ClockStartStop` for synchronized pause handling
  - `Ready` for initialization timing
