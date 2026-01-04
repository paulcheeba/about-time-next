# About Time Next — To-Do List

**Last Updated:** 2025-11-22  
**Current Version:** v13.2.0.0  
**Next Target:** v13.2.1.0

This document tracks future features and enhancements. Items will be worked on one at a time, in no specific order.

---

## 📌 Post-Stabilization Backlog (Dec 2025)

Quick list of the next maintenance items after the recent stabilization work.
See also: `dev-docs/nextSteps.md`.

- [ ] Consolidate duplicate `Hooks.once('ready')` init behavior (avoid double side-effects like mini panel auto-open)
- [ ] Make “running/paused” status calendar-agnostic (avoid touching Simple Calendar APIs unless selected/available)
- [ ] Standardize `ElapsedTime.chatQueue()` timestamp formatting via CalendarAdapter
- [ ] Deduplicate settings UI hooks (`renderSettingsConfig` / `renderGameSettings`) and scope DOM queries to the passed HTML
- [ ] Verify toolbar injection ordering/guards for Event Manager + Mini tool
- [ ] Keep legacy Simple Calendar helpers for reference; plan a clean removal once SC supports FVTT v13 (or is retired)

---

## ✅ Event Notification Sound — COMPLETED (v13.2.0.0)

**Status:** Implemented and released

**Completed Features:**
- ✅ Client settings for notification sound (enable/disable, volume, sound selection)
- ✅ 3 built-in notification sounds from Pixabay
- ✅ Custom file picker with default path to module sounds
- ✅ Test button for previewing sounds
- ✅ Hook-based detection using pattern matching on chat messages
- ✅ GM-only playback
- ✅ Works with repeating events

**Known Limitations:**
- Event messages missing `[about-time-next]` prefix after reload (breaks sound detection)
- Inconsistent card format across event types
- `/at` command events don't trigger sounds

---

## 📋 1. Standardize Event Chat Cards (v13.2.1.0) — IN PROGRESS

**User Request:** All event trigger messages should use consistent, detailed format and persist correctly through reload.

**Current Issues:**
- Event messages missing `[about-time-next]` prefix after reload → notification sounds don't trigger
- Macro events don't show event card, only macro output (before reload)
- Inconsistent behavior pre/post reload
- `/at` command events use different simple format

**Target Format for All Events:**
```
[about-time-next]
Event Name: {name or NA}
Message: {message or NA}
Duration: {DD:HH:MM:SS or NA}
Repeating: {Yes/No}
Macro: {macroName or NA}
Event UID: {uid}
```

**Implementation Plan:**
- [ ] Create `formatEventChatCard()` helper function in FastPriorityQueue.js
- [ ] Update FastPriorityQueue.js reconstructed handler to use formatter
- [ ] Update ATEventManagerAppV2.js handler to always show card (even with macros)
- [ ] Store duration in event metadata (`__duration`) for display
- [ ] Test pre/post reload consistency
- [ ] Verify notification sounds trigger correctly after reload

**Files to Modify:**
- `module/FastPriorityQueue.js` — add formatter function, update createFromJSON handler
- `module/ATEventManagerAppV2.js` — use formatter, show card before macro execution

**Out of Scope (Future Tasks):**
- `/at` command standardization (deferred)
- `ElapsedTime.message()` updates for reminder* API (deferred)

---

## 📋 2. Standardize `/at` Command Events (Future)

**User Request:** Make `/at` created events use same card format and trigger notification sounds.

**Scope:**
- Update `ATChat.js` to use event card formatter
- Update `ElapsedTime.message()` to include `[about-time-next]` prefix
- Ensure `reminderIn/reminderEvery` events trigger notification sounds

**Status:** Planned for future release (v13.2.2.0 or later)

---

## Potential Next Steps (v13.2.2.0+)

1. **Standardize `/at` chat command event cards**
   - Update ATChat.js to use formatEventChatCard()
   - Ensure notification sounds work with chat commands

2. **Update `ElapsedTime.message()` to use formatter**
   - Standardize API-created events
   - Maintain backward compatibility

3. **Add user-configurable card styling options**
   - Allow GMs to customize card colors, borders, fonts
   - Store preferences in module settings

4. **Localization for card field labels**
   - Currently hardcoded English ("Event Name:", "Duration:", etc.)
   - Add translation keys for all card labels

5. **Optional: Add event preview in Event Manager before creation**
   - Show formatted card preview before confirming event
   - Help users verify event details before scheduling

---

## 📅 2. Seasons and Stars Calendar Integration

**User Request:** Add date/time picker for events using a calendar module.

**Background:**
- Simple Calendar (SC) integration exists but SC development appears stalled (5+ months)
- Keep existing SC integration for legacy support
- Add **Seasons and Stars (SaS)** as alternative calendar module option
- Module remains system-agnostic and works standalone

**Implementation Checklist:**
- [ ] Research Seasons and Stars module
  - [ ] Scan for hooks (date/time updates, calendar open/close, etc.)
  - [ ] Identify API for reading current date/time
  - [ ] Check if SaS provides date picker UI or if we need to build one
- [ ] Add calendar module selection setting (GM-only, world scope)
  - [ ] Dropdown: "None (standalone)", "Simple Calendar", "Seasons and Stars"
  - [ ] Auto-detect available modules and disable unavailable options
- [ ] Abstract calendar API calls
  - [ ] Create wrapper functions for date/time operations
  - [ ] Route to SC, SaS, or Foundry core based on setting
  - [ ] Ensure fallback to core `game.time.worldTime` always works
- [ ] Add date/time picker to Event Manager
  - [ ] Display current calendar date (from selected module)
  - [ ] Dropdown calendar UI (use SaS config if available)
  - [ ] Allow user to select exact date + time for event
  - [ ] Convert selected date/time to world time seconds for scheduling
- [ ] Support recurrence syntax
  - [ ] Keep existing interval format (`24h`, `10m`, `5d`, etc.)
  - [ ] Apply intervals using selected calendar's time system
- [ ] Test with D&D's Harptos Calendar (via SaS)
  - [ ] 10-day weeks, 30-day months, special 1-day months
  - [ ] Verify interval calculations respect calendar structure
- [ ] Update documentation (README, inline comments)

**Files Likely Modified:**
- `module/settings.js` — add calendar selection setting
- `module/calendar/DateTime.js` — add SaS integration functions
- `module/ElapsedTime.js` — route calendar calls through abstraction layer
- `module/ATEventManagerAppV2.js` — add date/time picker UI
- `templates/ATEventManagerAppV2.hbs` — add calendar picker elements
- `dev-docs/referenceDocumentation.md` — document SaS integration

**Dependencies:**
- Seasons and Stars module (optional)

---

## 🗓️ 3. ATN Calendar Companion Module (Future/Brainstorm)

**Concept:** Create standalone calendar module (`atn-calendar`) as SC successor.

**Vision:**
- Simplified, user-friendly calendar UI (ApplicationV2)
- GM-configurable calendar settings (days/week, months/year, etc.)
- Per-day notes with improved navigation (vs. SC's cluttered approach)
- Digital day planner view: select day → see all events + notes
- Import/export calendar configs as JSON
- Interlink notes with ATN events
- Create events directly from day planner (interact with ATN Event Manager in the background)
- System-agnostic (support D&D, Pathfinder, homebrew, etc.)
- **Preset Calendars:** Include ready-to-use calendar templates for popular TTRPG systems
  - Research most-used systems in Foundry VTT (D&D 5e, Pathfinder, Call of Cthulhu, etc.)
  - Create preset configs for their canonical calendars (Harptos, Golarion, Gregorian, etc.)
  - Allow users to select from dropdown or create custom
- **World Time Anchor:** Allow GMs to set a calendar start date that syncs with `game.time.worldTime`
  - Example: GM sets "March 1, 1814, 6:00 AM" as calendar date for worldTime 0
  - All future time calculations respect this anchor
  - Enables adding calendar to existing worlds without losing event history
  - Auto-populate day planner with existing ATN events based on anchor conversion

## 4. ATN and AT mirroring (Future/Brainstorm/Dependent)

**Concept:** Keep ATN upd to date with Tim Posney's About Time module

**Vision:**
- In the near furture Tim will release his new version of About Time.
- I've been given permission to implement his future updates into ATN.
- We could create a dynamic AT integration, and remove unnecessary original AT code from our module and instead load AT into ATN while keeping our module (event manager, time manager, S&S integration, etc), enhancing our code with tim's updates. This way users can use his light weight verion or my heavier expanded feature version.
- It's possible Tim could add S&S integration before we do, or create his own calendar manager. If so we would use his methods instead, he's a very smart coder with wide vision and has repeatedly produced amazing modules.

**Status:** 🚧 **BRAINSTORM PHASE** — Do not start implementation yet.

## 5. ATN and AT mirroring (Future/Brainstorm/Dependent)

**Concept:** Keep ATN upd to date with Tim Posney's About Time module

**Vision:**
- In the near furture Ti

**Pre-Development Tasks:**
- [ ] Define calendar data model
  - [ ] Configurable week/month/year structures
  - [ ] Date storage format (compatibility with FVTT core time)
  - [ ] Note schema (linked to dates and optional events)
  - [ ] World time anchor data (start date → worldTime 0 mapping)
- [ ] Design UI mockups
  - [ ] Month/year view with day grid
  - [ ] Day planner detail view
  - [ ] Settings panel for calendar config
  - [ ] Preset calendar selection dropdown
  - [ ] World time anchor configuration UI
- [ ] Plan ATN integration points
  - [ ] Hook into ATN event queue for day planner display
  - [ ] Launch Event Manager from calendar UI
  - [ ] Sync event times with calendar dates
  - [ ] Convert existing ATN events to calendar dates using anchor
- [ ] Research existing calendar modules for inspiration
  - [ ] Simple Calendar (legacy reference)
  - [ ] Seasons and Stars (alternative approach)
  - [ ] Calendar/Weather (if relevant)
- [ ] Research popular TTRPG calendars for presets
  - [ ] Survey Foundry VTT community for most-used systems
  - [ ] Document canonical calendars (D&D Harptos, Pathfinder Golarion, etc.)
  - [ ] Collect calendar specs (days/week, months/year, special days, leap years)
  - [ ] Create JSON templates for each preset
- [ ] Define import/export format
  - [ ] JSON schema for calendar configs
  - [ ] Include world time anchor in export
  - [ ] Compatibility with SC exports (if feasible)
- [ ] Plan world time anchor system
  - [ ] Math for converting calendar dates ↔ worldTime seconds
  - [ ] Handle retroactive event display (events before anchor date)
  - [ ] Allow anchor updates without breaking existing events
  - [ ] Validate anchor on calendar structure changes
- [ ] Determine scope boundaries
  - [ ] Weather integration? (out of scope initially)
  - [ ] Multi-calendar support? (e.g., Gregorian + Harptos side-by-side)
  - [ ] API for other modules to hook into?
  - [ ] Preset calendar update mechanism (if we add more later)

**Brainstorming Questions:**
- Should `atn-calendar` be a separate repo or subfolder of ATN?
- How tightly coupled should it be with ATN? (optional dependency vs. required)
- Do we build our own date math library or leverage existing solutions?
- How do we handle time zones / world clocks for multi-region campaigns?
- Should calendar notes support rich text / HTML / links?

**Decision:** Revisit this after implementing To-Do items #1 and #2.

---

## 📝 Notes

- Work on one to-do item at a time
- No specific order unless user requests priority
- Update this file as items are completed or new items are added
- Move completed items to a "Completed" section below with version number

---

## ✅ Completed Items

_(None yet — baseline v13.1.2.1)_

---

**End of To-Do List**
