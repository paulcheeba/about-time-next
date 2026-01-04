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
