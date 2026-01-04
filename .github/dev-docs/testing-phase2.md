# Phase 2 Testing Plan (v13.3.2.0)

## Testing Objectives
Validate calendar settings UI, migration logic, and detection functionality.

## Prerequisites
- Foundry VTT v13 running
- About Time Next v13.3.2.0 installed
- GM user account
- Optional: Simple Calendar and/or Seasons & Stars modules for full testing

---

## Test Scenarios

### Scenario 1: Fresh Install (No Previous Settings)
**Setup:**
- New world or reset settings to defaults
- No calendar modules installed

**Steps:**
1. Install ATN v13.3.2.0
2. Launch world as GM
3. Check console for initialization logs

**Expected Results:**
- `calendar-system` setting defaults to "auto"
- Migration detects no previous configuration
- Logs show "Already configured, skipping migration"
- Adapter auto-detects "none" (no calendars)
- No migration notification shown

### Scenario 2: Upgrade with SC Enabled
**Setup:**
- Existing world with ATN v13.3.1.0 or earlier
- Simple Calendar module installed and active
- `use-simple-calendar` set to `true`

**Steps:**
1. Note current `use-simple-calendar` value (should be `true`)
2. Update to ATN v13.3.2.0
3. Reload world as GM
4. Check console for migration logs
5. Open Module Settings → About Time Next
6. Verify `calendar-system` value

**Expected Results:**
- Migration runs on first ready hook
- Console shows: "SC was enabled and is available → setting to 'simple-calendar'"
- `calendar-system` set to "simple-calendar"
- GM notification: "Calendar settings migrated. Now using: Simple Calendar"
- Settings UI shows "✓ Simple Calendar (available)"
- Old `use-simple-calendar` not visible in UI

### Scenario 3: Upgrade with SC Disabled
**Setup:**
- Existing world with ATN v13.3.1.0 or earlier
- Simple Calendar module available but user disabled it
- `use-simple-calendar` set to `false`

**Steps:**
1. Set `use-simple-calendar` to `false`: `game.settings.set("about-time-next", "use-simple-calendar", false)`
2. Reset `calendar-system` to "auto": `game.settings.set("about-time-next", "calendar-system", "auto")`
3. Reload world as GM
4. Check console and settings

**Expected Results:**
- Migration detects `use-simple-calendar = false`
- Console shows: "User had disabled SC → setting to 'none'"
- `calendar-system` set to "none"
- GM notification shown
- Adapter uses Foundry core time only

### Scenario 4: SC Missing, S&S Available
**Setup:**
- Existing world with ATN upgrade
- Simple Calendar NOT installed
- Seasons & Stars installed and active
- `use-simple-calendar` was `true` (user wanted calendar integration)

**Steps:**
1. Ensure SC not installed, S&S installed
2. Set legacy setting: `game.settings.set("about-time-next", "use-simple-calendar", true)`
3. Reset to auto: `game.settings.set("about-time-next", "calendar-system", "auto")`
4. Reload world as GM

**Expected Results:**
- Detection finds S&S but not SC
- Console shows: "SC unavailable but S&S detected → setting to 'seasons-and-stars'"
- `calendar-system` set to "seasons-and-stars"
- Settings UI shows "✗ Simple Calendar (not detected)" and "✓ Seasons & Stars (available)"

### Scenario 5: Manual Setting Change
**Setup:**
- World with both SC and S&S installed
- Current `calendar-system` set to "simple-calendar"

**Steps:**
1. Open Module Settings → About Time Next
2. Change Calendar System to "seasons-and-stars"
3. Save settings
4. Check console logs
5. Reload world

**Expected Results:**
- onChange callback fires: "Calendar system changed to: seasons-and-stars"
- `CalendarAdapter.refresh()` called (clears cache)
- World reload required (Foundry prompts)
- After reload, adapter uses S&S methods
- Test with: `window.AboutTimeNext.CalendarAdapter.getActive().getSystemName()`

### Scenario 6: Settings UI Validation
**Setup:**
- World with at least one calendar module

**Steps:**
1. Open Module Settings → Configure Settings
2. Locate About Time Next section
3. Verify UI organization and hints

**Expected Results:**
- Settings organized into sections (not visible in UI, but logical grouping in code)
- "Debug output" visible
- "Calendar System" visible with dropdown
- Detection info box shows below hint:
  - "Detected Calendar Modules:"
  - "✓ Simple Calendar (available)" or "✗ Simple Calendar (not detected)"
  - "✓ Seasons & Stars (available)" or "✗ Seasons & Stars (not detected)"
- "Use Simple Calendar" NOT visible
- Event notification settings visible

### Scenario 7: Test Macro Validation
**Setup:**
- GM user with console access

**Steps:**
1. Create macro from `macros/testCalendarMigration.js`
2. Run macro
3. Review console output

**Expected Results:**
- All tests pass:
  - ✓ Settings registered
  - ✓ Current values readable
  - ✓ Detection works
  - ✓ Adapter instantiation successful
- Migration prediction accurate
- Instructions clear for manual testing

---

## Console Logging Checklist

### During Init Hook:
```
about-time-next | Initializing v13.3.2.0
about-time-next | Registering settings...
about-time-next | Settings registered successfully
```

### During Ready Hook (Migration):
```
about-time-next | [Migration] Current calendar-system: "auto"
about-time-next | [Migration] Legacy use-simple-calendar: true
about-time-next | [Migration] Detected calendars: {simpleCalendar: true, seasonsStars: false}
about-time-next | [Migration] SC was enabled and is available → setting to "simple-calendar"
about-time-next | [Migration] ✓ Migrated calendar-system to: "simple-calendar"
```

### During Settings Render:
```
about-time-next | [Settings UI] Added calendar detection info
```

### On Setting Change:
```
about-time-next | [Settings] Calendar system changed to: seasons-and-stars
```

---

## Regression Testing

### Ensure No Breaking Changes:
1. Adapter system still works (run `testCalendarAdapters.js`)
2. All adapter methods functional
3. Detection logic unchanged
4. Global API access maintained (`window.AboutTimeNext.CalendarAdapter`)
5. Legacy `use-simple-calendar` still readable (even if hidden)

### Backward Compatibility:
- Existing macros using old setting continue to work (setting still exists)
- Module can safely downgrade to v13.3.1.0 if needed (data loss: new setting value only)

---

## Known Limitations

1. **Migration runs only once per world**  
   If `calendar-system` is not "auto", migration skips. To re-test, manually reset to "auto".

2. **Setting change requires reload**  
   Foundry forces reload when `requiresReload: true`. Adapter cache refresh happens, but full module re-init safer.

3. **Detection runs at settings render time**  
   If user installs calendar module while settings UI is open, detection won't update until UI re-renders.

4. **Non-GM users don't trigger migration**  
   Migration logic only runs for GMs (`game.user.isGM` check). Players see settings but can't migrate world-scope settings.

---

## Success Criteria

- ✅ All 7 test scenarios pass without errors
- ✅ Console logging provides clear visibility into all operations
- ✅ Migration respects user preferences (disabled SC → none)
- ✅ Settings UI shows accurate detection information
- ✅ No breaking changes to Phase 1 adapter functionality
- ✅ Legacy setting hidden but preserved for migration
- ✅ Test macro validates all core functionality
- ✅ No console errors in any scenario

---

## Post-Testing Actions

1. Commit all Phase 2 changes
2. Update version numbers (module.json, about-time.js, settings.js) ✅
3. Update changelog with Phase 2 summary ✅
4. Push v13.3.2.0 branch to remote
5. Proceed to Phase 3 (core refactor) after validation
