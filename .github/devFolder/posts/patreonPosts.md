# About Time Next - Major Update v13.5.0.0 (2026-01-10)

(Use the same image as the original About Time Next post.)

Hey everyone — exciting update for About Time Next!

🎉 **Simple Calendar has been reborn!** After years of waiting for a Foundry v13 update, the community has delivered. Simple Calendar has been forked and updated as **Simple Calendar Reborn** by Arctis Fireblight, and we've fully integrated it into About Time Next.

## What's New

### Simple Calendar Reborn Integration
- **Full SCR Support**: When SCR is active, it controls worldTime while ATN enhances it with event scheduling, elapsed time tracking, and UI controls
- **Time Authority Model B**: ATN properly routes all time manipulation through SCR's API instead of conflicting with it
- **0-Based Indexing Support**: Correctly handles Simple Calendar's JavaScript-style month/day indexing

### Neutral Calendar Selection
- **No Calendar Hierarchy**: All supported calendars (D&D5e, SCR, Seasons & Stars) are now treated equally
- **Smart Auto-Detection**: 
  - 0 calendars → Use core time
  - 1 calendar → Auto-select it
  - 2+ calendars → Show selection dialog
- **Selection Dialog**: Clean, compact interface when multiple calendars are available

### Enhanced Settings UI
- **Time Authority Indicators**: Settings now show which system manages time (ATN vs SCR)
- **Smart Checkbox Disabling**: When SCR is active, ATN's pause/combat settings are disabled with info showing SCR's equivalent settings
- **Calendar Detection Display**: Shows which calendars are available and which manages time

### UI Refinements
- Extracted calendar selection to Handlebars template for better maintainability
- Optimized compact 300px dialog layout
- Window title: "About Time Next: Choose Calendar System"

## Architecture Improvements

Formalized two time management patterns:
- **Model A** (S&S, D&D5e): ATN controls time, calendar provides display
- **Model B** (SCR): Calendar controls time, ATN enhances with events

ATN now bypasses its own pause/combat hooks when SCR is managing those behaviors, preventing conflicts.

## Migration Notes

- **Legacy Simple Calendar**: v1.x is archived and incompatible with v13. Migrate to Simple Calendar Reborn v2.4.0+
- **Existing Events**: All events continue to work—timestamps are calendar-agnostic
- **Settings**: First-time users with multiple calendars will see a selection dialog

## Compatibility

- Foundry VTT: v13+
- System compatibility: Universal
- Supported Calendars: D&D 5e v5.2+, Simple Calendar Reborn, Seasons & Stars

## Latest Release / Manifest

https://github.com/paulcheeba/about-time-next/releases/latest/download/module.json

This is a major step forward for calendar integration! If you run into anything weird, drop feedback in the Discord channel and I'll take a look.

Discord channel:
OverEngineeredVTT - [About Time Next channel](https://discord.com/channels/1038881475732451368/1454747384692215840).

---

# About Time Next - Update v13.4.1.0 (2026-01-04)

(Use the same image as the original About Time Next post.)

Hey everyone — quick update for About Time Next.

This release adds the OEV Suite Monitor as a required dependency, a new lightweight hub module that tracks OEV module versions and notifies you when updates or new modules are available. Also added Discord and Patreon links to the README.

## What you'll notice

- OEV Suite Monitor is now required (install it alongside About Time Next)
- README includes new Dependencies section and community links
- No functional changes to About Time Next itself

## Compatibility

- Foundry VTT: v13+
- System compatibility: Universal

## Latest Release / Manifest

https://github.com/paulcheeba/about-time-next/releases/latest/download/module.json

If you run into anything weird, drop feedback in the Discord channel and I'll take a look.

Discord channel:
OverEngineeredVTT - [About Time Next channel](https://discord.com/channels/1038881475732451368/1454747384692215840).
