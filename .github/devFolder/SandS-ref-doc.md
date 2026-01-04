# Seasons and Stars API Reference

**Module ID:** `seasons-and-stars`  
**Global Object:** `game.seasonsStars`  
**Repository:** https://github.com/rayners/fvtt-seasons-and-stars

---

## Overview

Seasons and Stars (S&S) is a modern, ground-up reimplementation of calendar functionality for Foundry VTT v13+, designed as a clean alternative to Simple Calendar. While **inspired by Simple Calendar's API patterns**, S&S is **not a fork**—it uses modern ApplicationV2 architecture, TypeScript, and a component-based design.

### Design Philosophy

- **Clean-room implementation**: Built from scratch with modern Foundry best practices
- **Backward compatibility**: Separate compatibility bridge module for Simple Calendar API emulation
- **Modular ecosystem**: Calendar data separated into optional pack modules
- **1-based indexing**: Human-readable date format (January = 1, first day = 1) vs SC's 0-based

### Ecosystem Architecture

S&S uses a **modular pack system** where calendar data is distributed across optional modules:

- **Core Module** (`seasons-and-stars`) - Engine + Gregorian calendar only
- **Calendar Packs** - Auto-detected modules providing calendar collections:
  - `seasons-and-stars-fantasy` - 16+ fantasy RPG calendars (D&D, Pathfinder, Critical Role, Warhammer, etc.)
  - `seasons-and-stars-scifi` - 3+ sci-fi calendars (Star Trek, Starfinder, Traveller)
  - `seasons-and-stars-pf2e` - Pathfinder 2e integration + Golarion variants
- **Tool Modules**:
  - `seasons-and-stars-custom-calendar-builder` - Visual calendar editor
  - `foundryvtt-simple-calendar-compat` - Simple Calendar API compatibility bridge (separate module)

**Auto-Detection**: Modules matching `seasons-and-stars-*` pattern are automatically detected and their calendars loaded from `calendars/index.json`.

### Integration Impact for About Time Next

**Good News**: ATN only needs to integrate with the **core S&S API**. Calendar packs are transparent backend data sources—S&S handles loading and provides a unified frontend API regardless of which pack provides the active calendar.

**No Special Handling Needed**: Whether using Gregorian (core), Exandrian (fantasy pack), or Golarion (PF2e pack), ATN calls the same `game.seasonsStars.api` methods. Pack detection/loading is S&S's internal responsibility.

---

## Detection & Availability

```javascript
// Check if S&S is installed and active
const module = game.modules.get("seasons-and-stars");
const isActive = !!(module && module.active && game.seasonsStars?.api);
```

**Recommended Detection Pattern:**
```javascript
function isSandSActive() {
  const useSandS = game.settings.get(MODULE_ID, "use-seasons-and-stars");
  if (!useSandS) return false;
  const module = game.modules.get("seasons-and-stars");
  return !!(module && module.active && game.seasonsStars?.api);
}
```

---

## Core API Methods

### Date Retrieval

#### `game.seasonsStars.api.getCurrentDate(calendarId?)`
Get the current date from the active or specified calendar.

**Parameters:**
- `calendarId` (string, optional) - Specific calendar ID (default: active calendar)

**Returns:** `CalendarDate | null`

**CalendarDate Structure:**
```javascript
{
  year: number,
  month: number,          // 1-based (January = 1)
  day: number,           // 1-based (first day = 1)
  weekday: number,       // 0-based index
  time: {
    hour: number,
    minute: number,
    second: number
  }
}
```

**Example:**
```javascript
const currentDate = game.seasonsStars.api.getCurrentDate();
if (currentDate) {
  console.log(`Current date: ${currentDate.year}-${currentDate.month}-${currentDate.day}`);
  console.log(`Time: ${currentDate.time.hour}:${currentDate.time.minute}`);
}
```

---

### Date Conversion

#### `game.seasonsStars.api.dateToWorldTime(date, calendarId?)`
Convert a calendar date to Foundry world time (timestamp in seconds).

**Parameters:**
- `date` (CalendarDate) - Calendar date object
- `calendarId` (string, optional) - Calendar ID (default: active)

**Returns:** Number (timestamp in seconds)

**Example:**
```javascript
const date = {
  year: 2024,
  month: 12,
  day: 25,
  weekday: 3,
  time: { hour: 12, minute: 0, second: 0 }
};

const worldTime = game.seasonsStars.api.dateToWorldTime(date);
console.log('World time:', worldTime);
```

---

#### `game.seasonsStars.api.worldTimeToDate(timestamp, calendarId?)`
Convert Foundry world time to a calendar date.

**Parameters:**
- `timestamp` (number) - World time in seconds
- `calendarId` (string, optional) - Calendar ID (default: active)

**Returns:** CalendarDate

**Example:**
```javascript
const currentTime = game.time.worldTime;
const date = game.seasonsStars.api.worldTimeToDate(currentTime);
console.log('Calendar date:', date);
```

---

### Date Formatting

#### `game.seasonsStars.api.formatDate(date, options?)`
Format a date according to calendar conventions.

**Parameters:**
- `date` (CalendarDate) - Date to format
- `options` (DateFormatOptions, optional) - Formatting options

**DateFormatOptions:**
```javascript
{
  includeTime?: boolean,
  includeWeekday?: boolean,
  includeYear?: boolean,
  format?: 'short' | 'long' | 'numeric'
}
```

**Returns:** String (formatted date)

**Example:**
```javascript
const date = game.seasonsStars.api.getCurrentDate();

// Default formatting
const formatted = game.seasonsStars.api.formatDate(date);
// Returns: "December 25th, 2024 CE"

// Custom formatting
const custom = game.seasonsStars.api.formatDate(date, {
  includeTime: true,
  includeWeekday: true,
  format: 'long'
});
// Returns: "Wednesday, December 25th, 2024 CE at 2:30 PM"
```

---

### Time Advancement

#### `game.seasonsStars.api.advanceDays(days, calendarId?)`
Advance world time by specified number of days.

**Parameters:**
- `days` (number) - Number of days to advance (negative values go backward)
- `calendarId` (string, optional) - Calendar ID (default: active)

**Returns:** Promise<void>

**Example:**
```javascript
// Advance by 1 day
await game.seasonsStars.api.advanceDays(1);

// Go back 3 days
await game.seasonsStars.api.advanceDays(-3);
```

---

#### `game.seasonsStars.api.advanceHours(hours, calendarId?)`
Advance world time by specified number of hours.

**Parameters:**
- `hours` (number) - Number of hours to advance
- `calendarId` (string, optional) - Calendar ID (default: active)

**Returns:** Promise<void>

**Example:**
```javascript
// Advance by 8 hours (long rest)
await game.seasonsStars.api.advanceHours(8);
```

---

#### Other Time Advancement Methods

```javascript
// Minutes
await game.seasonsStars.api.advanceMinutes(minutes, calendarId?);

// Weeks
await game.seasonsStars.api.advanceWeeks(weeks, calendarId?);

// Months
await game.seasonsStars.api.advanceMonths(months, calendarId?);

// Years
await game.seasonsStars.api.advanceYears(years, calendarId?);

// Generic time advancement
await game.seasonsStars.api.advanceTime(amount, unit);
// unit: 'day'|'days', 'hour'|'hours', 'minute'|'minutes', 'week'|'weeks', 'month'|'months', 'year'|'years'
```

---

### Calendar Management

#### `game.seasonsStars.api.getActiveCalendar()`
Get the currently active calendar configuration.

**Returns:** SeasonsStarsCalendar

**Example:**
```javascript
const calendar = game.seasonsStars.api.getActiveCalendar();
console.log('Active calendar:', calendar.id, calendar.name);
console.log('Months:', calendar.months.length);
console.log('Weekdays:', calendar.weekdays);
```

---

#### `game.seasonsStars.api.setActiveCalendar(calendarId)`
Switch to a different calendar.

**Parameters:**
- `calendarId` (string) - ID of calendar to activate

**Returns:** Promise<void>

---

#### `game.seasonsStars.api.getAvailableCalendars()`
Get list of all available calendar IDs.

**Returns:** string[]

---

### Calendar Metadata

#### `game.seasonsStars.api.getMonthNames(calendarId?)`
Get array of month names from the active or specified calendar.

**Returns:** string[]

---

#### `game.seasonsStars.api.getWeekdayNames(calendarId?)`
Get array of weekday names from the active or specified calendar.

**Returns:** string[]

---

#### `game.seasonsStars.api.getSunriseSunset(date, calendarId?)`
Get sunrise and sunset times for a given date.

**Parameters:**
- `date` (CalendarDate) - Date to get times for
- `calendarId` (string, optional) - Calendar ID

**Returns:** `{ sunrise: number, sunset: number }`  
Times are in **seconds from midnight** (e.g., 21600 = 6:00 AM)

**Example:**
```javascript
const currentDate = game.seasonsStars.api.getCurrentDate();
const times = game.seasonsStars.api.getSunriseSunset(currentDate);
// returns: { sunrise: 21600, sunset: 64800 }
// 21600 seconds = 6 hours × 3600 seconds/hour = 6:00 AM
```

---

## Hooks

Seasons and Stars emits several hooks that modules can listen to.

### Hook Constants

Available at `game.seasonsStars.HOOK_NAMES` or string literals:

```javascript
const HOOK_NAMES = {
  DATE_CHANGED: 'seasons-stars:dateChanged',
  CALENDAR_CHANGED: 'seasons-stars:calendarChanged',
  NOTE_CREATED: 'seasons-stars:noteCreated',
  NOTE_UPDATED: 'seasons-stars:noteUpdated',
  NOTE_DELETED: 'seasons-stars:noteDeleted',
  READY: 'seasons-stars:ready',
};
```

---

### `seasons-stars:dateChanged`

**When Emitted:**
- World time changes (any time advancement)
- User manually changes date
- Combat round advances
- Real-time clock ticks

**Data Passed:**
```javascript
{
  newDate: CalendarDate,    // New calendar date
  oldTime: number,          // Previous world time (seconds)
  newTime: number,          // New world time (seconds)
  delta: number             // Change in seconds
}
```

**Example:**
```javascript
Hooks.on('seasons-stars:dateChanged', (data) => {
  console.log('Date changed from', data.oldTime, 'to', data.newTime);
  console.log('New date:', data.newDate);
  console.log('Time delta:', data.delta, 'seconds');

  // Update your module's time-sensitive features
  updateWeatherForNewDate(data.newDate);
  refreshTimedAbilities();
});
```

---

### `seasons-stars:calendarChanged`

**When Emitted:**
- Active calendar switches
- User changes calendar in settings
- Initial calendar setup

**Data Passed:**
```javascript
{
  oldCalendarId: string | null,  // Previous calendar ID (null on init)
  newCalendarId: string,         // New active calendar ID
  calendar: SeasonsStarsCalendar,// Full calendar configuration
  reason: CalendarChangeReason   // Why calendar changed
}
```

**CalendarChangeReason:**
- `'initialization'` - During module startup
- `'settings-sync'` - Settings synchronization
- `'user-change'` - User manually changed
- `'external'` - Changed by another module
- `'migration'` - Data migration

**Example:**
```javascript
Hooks.on('seasons-stars:calendarChanged', (data) => {
  console.log('Calendar changed:', data.oldCalendarId, '->', data.newCalendarId);
  console.log('Reason:', data.reason);

  // Recalculate dates for new calendar system
  convertEventDatesForNewCalendar(data.calendar);
});
```

---

### `seasons-stars:ready`

**When Emitted:**
- Module is fully initialized and ready to use
- API is functional
- All calendars are loaded

**Data Passed:**
```javascript
{
  manager: CalendarManager,  // Calendar manager instance
  api: SeasonsStarsAPI      // Full API object
}
```

**Example:**
```javascript
Hooks.on('seasons-stars:ready', (data) => {
  console.log('Seasons & Stars is ready!');
  const currentDate = data.api.getCurrentDate();
  initializeMyModule(currentDate);
});
```

---

### `seasons-stars:noteCreated`

**When Emitted:**
- Calendar note is created

**Data Passed:** `journalEntry` (JournalEntry)

**Example:**
```javascript
Hooks.on('seasons-stars:noteCreated', (journalEntry) => {
  console.log('Calendar note created:', journalEntry.name);
  refreshCalendarWidgets();
});
```

---

### `seasons-stars:noteUpdated`

**When Emitted:**
- Calendar note is modified

**Data Passed:** `journalEntry` (JournalEntry)

**Example:**
```javascript
Hooks.on('seasons-stars:noteUpdated', (journalEntry) => {
  console.log('Calendar note updated:', journalEntry.name);
  updateNoteDisplays(journalEntry.id);
});
```

---

### `seasons-stars:noteDeleted`

**When Emitted:**
- Calendar note is removed

**Data Passed:** `noteId` (string)

**Example:**
```javascript
Hooks.on('seasons-stars:noteDeleted', (noteId) => {
  console.log('Calendar note deleted:', noteId);
  removeNoteReferences(noteId);
});
```

---

### `seasons-stars:eventOccurs`

**When Emitted:**
- Time advancement crosses into a day with calendar events
- On application startup if current date has events

**Data Passed:**
```javascript
{
  events: EventOccurrence[],  // All events on this date
  date: {                     // The date these events occur
    year: number,
    month: number,
    day: number
  },
  isStartup: boolean,         // True if fired during init
  previousDate?: {            // Only present during advancement
    year: number,
    month: number,
    day: number
  }
}
```

**Example:**
```javascript
Hooks.on('seasons-stars:eventOccurs', (data) => {
  if (data.isStartup) {
    console.log('Current date has events:', data.events);
  } else {
    console.log('Time advanced into event date:', data.events);
  }
  
  // Notify players about events
  data.events.forEach(event => {
    ChatMessage.create({
      content: `<strong>${event.name}</strong>: ${event.description}`
    });
  });
});
```

---

### `seasons-stars:settingsChanged`

**When Emitted:**
- Module setting is updated

**Data Passed:** `settingName` (string)

**Example:**
```javascript
Hooks.on('seasons-stars:settingsChanged', (settingName) => {
  if (settingName === 'quickTimeButtons') {
    refreshQuickTimeUI();
  }
});
```

---

## Integration Manager (Bridge API)

For compatibility with Simple Calendar patterns, S&S provides an integration interface:

```javascript
const integration = game.seasonsStars.integration;

// Core operations
const currentDate = integration.api.getCurrentDate();
const formattedDate = integration.api.formatDate(currentDate);
await integration.api.advanceDays(1);

// Widget management
integration.widgets.main?.addSidebarButton('weather', 'fas fa-cloud', 'Weather', () => {
  console.log('Weather button clicked');
});

integration.widgets.mini?.show();  // Show mini widget
integration.widgets.mini?.toggle(); // Toggle visibility

// Hook system
integration.hooks.onDateChanged(event => {
  console.log('Date changed:', event.newDate);
});

integration.hooks.onCalendarChanged(event => {
  console.log('Calendar changed:', event.newCalendarId);
});
```

---

## Comparison to Simple Calendar

### Key Differences

| Feature | Simple Calendar | Seasons and Stars |
|---------|----------------|-------------------|
| **Module ID** | `foundryvtt-simple-calendar` or `simple-calendar` | `seasons-and-stars` |
| **Global Object** | `globalThis.SimpleCalendar` | `game.seasonsStars` |
| **Date Indexing** | 0-based (month/day) | 1-based (month/day) |
| **Hook Prefix** | `simple-calendar-` | `seasons-stars:` |
| **Date Object** | `{ year, month: 0-11, day: 0-30 }` | `{ year, month: 1-12, day: 1-31 }` |
| **Time Storage** | Part of date object | Separate `time` property |

### Date Format Conversion

```javascript
// Convert S&S date to SC format (0-based)
function sandSToSC(sandSDate) {
  return {
    year: sandSDate.year,
    month: sandSDate.month - 1,    // 1-based → 0-based
    day: sandSDate.day - 1,        // 1-based → 0-based
    hour: sandSDate.time?.hour ?? 0,
    minute: sandSDate.time?.minute ?? 0,
    seconds: sandSDate.time?.second ?? 0
  };
}

// Convert SC date to S&S format (1-based)
function scToSandS(scDate) {
  return {
    year: scDate.year,
    month: scDate.month + 1,       // 0-based → 1-based
    day: scDate.day + 1,           // 0-based → 1-based
    weekday: 0,                    // Will be calculated
    time: {
      hour: scDate.hour ?? 0,
      minute: scDate.minute ?? 0,
      second: scDate.seconds ?? 0
    }
  };
}
```

---

## Integration Patterns for About Time Next

### 1. Detection Pattern

```javascript
function isSandSActive() {
  const useSandS = game.settings.get(MODULE_ID, "use-seasons-and-stars");
  if (!useSandS) return false;
  const module = game.modules.get("seasons-and-stars");
  return !!(module && module.active && game.seasonsStars?.api);
}
```

### 2. Time Display Pattern

```javascript
function sandSFormat(worldTime) {
  if (!isSandSActive() || !game.seasonsStars?.api?.worldTimeToDate) return null;
  
  try {
    const date = game.seasonsStars.api.worldTimeToDate(worldTime);
    const formatted = game.seasonsStars.api.formatDate(date, {
      includeTime: true,
      format: 'long'
    });
    return formatted;
  } catch (error) {
    console.warn('Error formatting S&S date:', error);
    return null;
  }
}

function currentTimeLabel() {
  const wt = game.time?.worldTime ?? 0;
  return sandSFormat(wt) ?? fmtDHMS(wt);  // fallback to default
}
```

### 3. Interval Normalization Pattern

S&S uses **1-based** date components and expects singular keys. AT uses plural keys.

```javascript
function normalizeATIntervalForSandS(raw) {
  if (raw == null) return {};
  if (typeof raw === "number") return { seconds: raw };
  
  const map = {
    years: "year", year: "year", yr: "year",
    months: "month", month: "month", mo: "month",
    days: "day", day: "day", d: "day",
    hours: "hour", hour: "hour", h: "hour",
    minutes: "minute", minute: "minute", min: "minute", m: "minute",
    seconds: "second", second: "second", sec: "second", s: "second",
  };
  
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = map[k] || k;
    const num = Number(v) || 0;
    if (!num) continue;
    out[key] = (out[key] || 0) + num;
  }
  return out;
}
```

### 4. Event Scheduling Pattern

```javascript
async function scheduleEvent(when, handler, ...args) {
  if (isSandSActive() && game.seasonsStars?.api) {
    // For relative intervals (doIn/doEvery)
    if (typeof when === 'object' && !when.year) {
      const norm = normalizeATIntervalForSandS(when);
      
      // Calculate time delta using S&S
      const currentDate = game.seasonsStars.api.getCurrentDate();
      const futureDate = { ...currentDate };
      
      // Apply interval (simplified - real impl needs proper date math)
      if (norm.day) futureDate.day += norm.day;
      if (norm.hour) futureDate.time.hour += norm.hour;
      // ... etc
      
      const futureTime = game.seasonsStars.api.dateToWorldTime(futureDate);
      const deltaSeconds = futureTime - game.time.worldTime;
      
      // Schedule at calculated time
      const at = game.time.worldTime + deltaSeconds;
      return scheduleAtTime(at, handler, ...args);
    }
    
    // For absolute dates (doAt)
    if (typeof when === 'object' && when.year) {
      const timestamp = game.seasonsStars.api.dateToWorldTime(when);
      return scheduleAtTime(timestamp, handler, ...args);
    }
  }
  
  // Fallback to default behavior
  return scheduleDefault(when, handler, ...args);
}
```

### 5. Hook Listening Pattern

```javascript
// Listen to S&S hooks
Hooks.on('seasons-stars:dateChanged', (data) => {
  console.log(`Time changed by ${data.delta} seconds`);
  
  // Check for scheduled events
  checkScheduledEvents(data.newTime);
  
  // Update UI
  refreshTimeDisplay();
});

Hooks.on('seasons-stars:ready', () => {
  console.log('S&S is ready, initializing integration');
  initializeSandSIntegration();
});
```

---

## Calendar Date Object Methods

The CalendarDate class provides additional utility methods:

```javascript
const date = game.seasonsStars.api.getCurrentDate();

// Formatting methods
date.toShortString();       // "2024-12-25"
date.toDateString();        // "December 25, 2024"
date.toTimeString();        // "14:30:00"
date.toLongString();        // "Wednesday, December 25, 2024 at 14:30:00"
date.toObject();            // Returns plain object

// Format with custom template
date.format({ includeTime: true, format: 'long' });
```

---

## Notes

1. **1-Based Indexing**: Unlike Simple Calendar, S&S uses 1-based indexing for months (January = 1) and days (first day = 1).

2. **Time Property**: Time components are in a separate `time` object property, not mixed with date components.

3. **Async Methods**: Time advancement methods are async and return Promises.

4. **Hook Names**: Use colon notation (`seasons-stars:hookName`) rather than dash notation.

5. **Calendar-Specific Operations**: Most API methods accept optional `calendarId` parameter for multi-calendar support (though About Time Next will use active calendar only).

6. **WorldTime Integration**: S&S handles system-specific worldTime transformations (e.g., PF2e world creation timestamps) automatically.

7. **Compatibility Bridge**: S&S includes a `SimpleCalendar` compatibility bridge for modules that expect SC API. About Time Next should use native S&S API for better integration.

---

## Version Notes

This documentation is based on Seasons and Stars v0.20.0+ API patterns as observed in the S&S repository.

**Key API Methods:**
- `getCurrentDate()` ✓
- `dateToWorldTime()` ✓
- `worldTimeToDate()` ✓
- `formatDate()` ✓
- `advanceDays/Hours/Minutes/etc()` ✓
- `getActiveCalendar()` ✓
- `setActiveCalendar()` ✓
- `getSunriseSunset()` ✓

**Key Hooks:**
- `seasons-stars:dateChanged` ✓
- `seasons-stars:calendarChanged` ✓
- `seasons-stars:ready` ✓
- `seasons-stars:noteCreated/Updated/Deleted` ✓
- `seasons-stars:eventOccurs` ✓
