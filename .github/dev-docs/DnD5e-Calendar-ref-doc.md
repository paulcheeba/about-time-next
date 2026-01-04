# D&D 5e Calendar System Reference Documentation

**Last Updated:** 2025-12-20  
**D&D 5e System Version:** 5.2.0+  
**Foundry VTT Version:** 13+

## Overview

The D&D 5e system (v5.2.0+) now includes a built-in calendar system that integrates with Foundry VTT's core calendar API. It provides:
- Calendar HUD for displaying date/time
- Multiple pre-configured calendars (Gregorian, Greyhawk, Harptos/Forgotten Realms, Khorvaire/Eberron)
- Configurable date/time formatters
- GM tools for time advancement
- Integration with Foundry's `game.time.worldTime` system

## Detection

### Module/System Detection
```javascript
// Check if D&D 5e system is active
const isDnd5e = game.system.id === "dnd5e";

// Check if calendar is enabled (requires system version 5.2.0+)
const isCalendarEnabled = game.settings.get("dnd5e", "calendarEnabled");

// Check if D&D 5e calendar data model exists
const hasCalendarModel = !!game.calendar;
```

### Version Check
```javascript
// Check D&D 5e system version
const systemVersion = game.system.version;
const [major, minor] = systemVersion.split('.').map(Number);
const hasCalendarSupport = major > 5 || (major === 5 && minor >= 2);
```

## Calendar Data Model

The D&D 5e system extends Foundry's `CalendarData` with `CalendarData5e`:

```javascript
// Access the active calendar
const calendar = game.calendar;

// Calendar properties
calendar.name;          // Calendar name (e.g., "Calendar of Harptos")
calendar.description;   // Calendar description
calendar.months;        // Array of month definitions
calendar.days;          // Day definitions
calendar.years;         // Year configuration
calendar.seasons;       // Season definitions
```

## Core Methods

### Time Conversion

#### `timeToComponents(time)`
Converts world time (seconds) to calendar components.

```javascript
const worldTime = game.time.worldTime;
const components = game.calendar.timeToComponents(worldTime);
// Returns: {
//   year: number,
//   month: number,     // 0-based index
//   day: number,       // 1-based
//   hour: number,
//   minute: number,
//   second: number
// }
```

#### `componentsToTime(components)`
Converts calendar components to world time (seconds).

```javascript
const components = {
  year: 2024,
  month: 2,      // March (0-based)
  day: 15,
  hour: 14,
  minute: 30,
  second: 0
};
const worldTime = game.calendar.componentsToTime(components);
```

### Time Arithmetic

#### `add(startTime, deltaTime)`
Add time delta to a start time.

```javascript
// Add components to current time
const futureTime = game.calendar.add(
  game.time.worldTime,
  { day: 1, hour: 2, minute: 30 }
);

// Add seconds to current time
const futureTime2 = game.calendar.add(
  game.time.worldTime,
  3600  // 1 hour in seconds
);
```

#### `difference(endTime, startTime)`
Calculate the difference between two times.

```javascript
const diff = game.calendar.difference(futureTime, game.time.worldTime);
// Returns components: { year, month, day, hour, minute, second }
```

### Formatting

#### `format(time, formatter, options)`
Format a time using a registered formatter.

```javascript
// Format current time with default formatter
const formatted = game.calendar.format();

// Format specific time with custom formatter
const formatted = game.calendar.format(
  worldTime,
  "timestamp",  // or custom formatter name
  {}
);
```

**Note:** D&D 5e doesn't provide direct `formatDate()` or `formatDateTime()` methods on the calendar instance. Instead, use the `format()` method with appropriate formatters.

## Formatters

D&D 5e provides several built-in formatters accessible via `CONFIG.DND5E.calendar.formatters`:

### Default Formatters
- `dateDefault`: Month and day (e.g., "March 15")
- `timeDefault`: Hours and minutes (e.g., "14:30")

### Full Formatters
- `dateFull`: Year, month, and day (e.g., "March 15, 2024")
- `timeFull`: Hours, minutes, and seconds (e.g., "14:30:45")

### Approximate Formatters
- `dateApproximate`: Season progress (e.g., "Mid-Winter", "Early Summer")
- `timeApproximate`: Time of day (e.g., "Sunrise", "Morning", "Noon", "Evening", "Night")

### Custom Formatter Example
```javascript
// Register a custom formatter
CONFIG.DND5E.calendar.formatters.myCustom = {
  value: "myCustom",
  label: "My Custom Format",
  formatter: (calendar, components, options) => {
    return `${components.month + 1}/${components.day}/${components.year}`;
  },
  group: "DND5E.CALENDAR.Formatters.Date"
};
```

## Calendar Configuration

### Access Configuration
```javascript
// Calendar configuration
const calendarConfig = CONFIG.DND5E.calendar;

// Available calendars
const calendars = calendarConfig.calendars;
// Object with entries like:
// {
//   value: "forgotten-realms",
//   label: "Calendar of Harptos (Forgotten Realms)",
//   config: { ... },
//   class: CalendarData5e
// }

// Formatters
const formatters = calendarConfig.formatters;
```

### Available Calendars (v5.2.0)
1. **Simplified Gregorian** (`gregorian`)
2. **Calendar of Greyhawk** (`greyhawk`)
3. **Calendar of Harptos** (`forgotten-realms`) - Forgotten Realms
4. **Calendar of Khorvaire** (`khorvaire`) - Eberron

## Settings

### Calendar Enabled
```javascript
// Check if calendar is enabled
const enabled = game.settings.get("dnd5e", "calendarEnabled");

// Enable calendar (GM only)
await game.settings.set("dnd5e", "calendarEnabled", true);
```

### Active Calendar
```javascript
// Get active calendar ID
const calendarId = game.settings.get("dnd5e", "calendarId");
// Returns: "forgotten-realms", "greyhawk", "khorvaire", or "gregorian"
```

## Special Methods (CalendarData5e)

The D&D 5e extended calendar model (`CalendarData5e`) provides additional methods:

### `sunrise(time)`
Calculate sunrise time for a given timestamp.

```javascript
const sunriseTime = game.calendar.sunrise(game.time.worldTime);
// Returns: seconds representing sunrise time
```

### `sunset(time)`
Calculate sunset time for a given timestamp.

```javascript
const sunsetTime = game.calendar.sunset(game.time.worldTime);
// Returns: seconds representing sunset time
```

These methods are used for:
- Time-of-day visualization in calendar HUD
- Approximate time formatters
- Integration with lighting systems

## Hooks

### `dnd5e.setupCalendar`
Called during `init` hook to allow modification of calendar configuration.

```javascript
Hooks.on("dnd5e.setupCalendar", () => {
  // Modify calendar configuration
  CONFIG.DND5E.calendar.calendars.push({
    value: "my-calendar",
    label: "My Custom Calendar",
    config: { ... },
    class: MyCalendarData
  });
  
  // Return false to prevent system from initializing calendar
  // return false;
});
```

### `updateWorldTime`
Enhanced by D&D 5e with additional delta information.

```javascript
Hooks.on("updateWorldTime", (worldTime, delta, options) => {
  // D&D 5e adds: options.dnd5e.deltas
  const deltas = options.dnd5e?.deltas;
  if (deltas) {
    console.log("Midnights passed:", deltas.midnights);
    console.log("Middays passed:", deltas.middays);
    console.log("Sunrises passed:", deltas.sunrises);
    console.log("Sunsets passed:", deltas.sunsets);
  }
});
```

## Integration Pattern

### Basic Time Display
```javascript
// Get current world time
const worldTime = game.time.worldTime;

// Convert to components
const components = game.calendar.timeToComponents(worldTime);

// Format for display
const dateStr = `${components.month + 1}/${components.day}/${components.year}`;
const timeStr = `${String(components.hour).padStart(2, '0')}:${String(components.minute).padStart(2, '0')}`;

console.log(`${dateStr} ${timeStr}`);
```

### Event Scheduling
```javascript
// Schedule event in 1 day
const futureTime = game.calendar.add(
  game.time.worldTime,
  { day: 1 }
);

// Store event
const event = {
  name: "Meeting",
  timestamp: futureTime
};

// When checking if event should trigger
if (game.time.worldTime >= event.timestamp) {
  // Trigger event
}
```

## Comparison with Other Calendar Systems

### vs Simple Calendar
- D&D 5e: Native system integration, requires D&D 5e system
- Simple Calendar: Standalone module, system-agnostic

### vs Seasons & Stars
- D&D 5e: Built into system, simpler API
- Seasons & Stars: Dedicated calendar module, more features

### Advantages of D&D 5e Calendar
- No additional module required
- Pre-configured for popular D&D settings
- Integrated with system features (future: bastion turns, item recovery)
- Uses Foundry core's calendar API

### Limitations
- Requires D&D 5e system v5.2.0+
- Less feature-rich than dedicated calendar modules
- Limited to D&D-focused calendars

## Best Practices

1. **Always check for calendar availability** before using
2. **Use `game.calendar` for accessing the active calendar**
3. **Work with world time (seconds)** internally, convert for display
4. **Register formatters during `dnd5e.setupCalendar` hook**
5. **Use `timeToComponents()` and `componentsToTime()` for conversions**
6. **Listen to `updateWorldTime` hook for time changes**

## Example: Adapter Integration

```javascript
class DnD5eAdapter extends CalendarAdapter {
  get name() {
    return "D&D 5e Calendar";
  }
  
  get systemId() {
    return "dnd5e";
  }
  
  isAvailable() {
    return game.system.id === "dnd5e" 
      && game.settings.get("dnd5e", "calendarEnabled")
      && !!game.calendar;
  }
  
  formatDateTime(timestamp) {
    if (!this.isAvailable()) {
      return { date: "", time: "" };
    }
    
    const components = game.calendar.timeToComponents(timestamp);
    
    // Format date (using calendar's month names)
    const month = game.calendar.months[components.month];
    const dateStr = `${month.name} ${components.day}, ${components.year}`;
    
    // Format time
    const timeStr = `${String(components.hour).padStart(2, '0')}:${String(components.minute).padStart(2, '0')}:${String(components.second).padStart(2, '0')}`;
    
    return {
      date: dateStr,
      time: timeStr
    };
  }
  
  timestampPlusInterval(timestamp, interval) {
    if (!this.isAvailable()) {
      return timestamp + (interval.second || 0);
    }
    
    return game.calendar.add(timestamp, interval);
  }
  
  timestampToDate(timestamp) {
    if (!this.isAvailable()) {
      return { year: 0, month: 1, day: 1, hour: 0, minute: 0, second: 0 };
    }
    
    const components = game.calendar.timeToComponents(timestamp);
    
    return {
      year: components.year,
      month: components.month + 1,  // Convert to 1-based
      day: components.day,
      hour: components.hour,
      minute: components.minute,
      second: components.second
    };
  }
}
```

## References

- [D&D 5e Calendar Wiki](https://github.com/foundryvtt/dnd5e/wiki/Calendar)
- [Foundry CalendarData API](https://foundryvtt.com/api/classes/foundry.data.CalendarData.html)
- [D&D 5e Release Notes 5.2.0](https://github.com/foundryvtt/dnd5e/releases/tag/release-5.2.0)

## Changelog

- **2025-12-20**: Initial documentation for D&D 5e v5.2.0 calendar system
