# About Time Next — Next Steps (Dec 2025)

This doc captures the *planned* follow-up work for About Time Next after the recent stabilization work (chat confirms, timekeeper permissions, Event Manager reliability under calendar mixes).

## Current Status

- The module appears stable in FVTT v13 with the current calendar adapter system.
- **Simple Calendar (SC)** is **not FVTT v13-ready**. We are intentionally keeping the legacy SC integration code as a *reference/back-compat layer*, with reduced log noise (warnings gated behind the module debug flag).

## Prioritized Next Steps

### 1) High Priority (Correctness / Avoid Future Races)

1. **Consolidate duplicate `ready` behaviors**
   - Today there are multiple `Hooks.once('ready')` blocks in `about-time.js`.
   - Practical risk: duplicated side effects (ex: auto-opening the mini panel twice) and harder reasoning about startup order.
   - Target outcome: a single `ready` initializer that coordinates “mini panel open”, “calendar prompt”, and other startup actions.

2. **Make “running/paused” status calendar-agnostic**
   - `PseudoClock.isRunning()` currently checks `SimpleCalendar.api.clockStatus()`.
   - Desired direction: if SC isn’t the selected/available system, don’t touch SC APIs; prefer adapter/core signals.

3. **Standardize chat queue formatting via `CalendarAdapter`**
   - `ElapsedTime.chatQueue()` still formats timestamps via direct SC APIs.
   - Goal: use `CalendarAdapter.getActive()` formatting where available; fall back safely when none.
   - Note: this is safe to do even if SC remains legacy; the adapter already handles SC when present.

### 2) Medium Priority (Compatibility / Reduce Integration Conflicts)

1. **Consolidate settings UI hooks**
   - `module/settings.js` registers multiple settings-render hooks (`renderSettingsConfig` appears twice, plus `renderGameSettings`).
   - Goal: one handler per UI surface; ensure DOM queries are scoped to the `html` passed to the hook.

2. **Scene control tool injection ordering/guards**
   - Both `ATToolbar` and `ATMiniToolbar` inject into the same toolbar group.
   - Goal: confirm stable ordering and ensure no duplicates across Foundry versions.

### 3) Low Priority (Cleanup / Future Removal)

1. **Legacy SC layer: keep, document, and eventually remove**
   - Keep `DTMod`, `DTCalc`, `DateTime` as reference/back-compat until SC supports FVTT v13.
   - When SC is v13-ready (or officially retired):
     - Remove legacy DT helpers and any direct `globalThis.SimpleCalendar.*` access outside the adapter.
     - Update docs/macros accordingly.

2. **Docs consistency pass**
   - Ensure README and dev-docs align on what is “adapter-first” vs “legacy”.

## Suggested Verification Checklist (Before Each Release)

- Startup/refresh reliability:
  - Reload world; create events immediately; confirm the event appears in Event Manager.
  - Confirm events persist after refresh and across calendar selection changes.

- Permissions:
  - Verify GM override always works.
  - Verify timekeeper role threshold gates: toolbar access, chat commands, Event Manager actions.

- Calendar formatting:
  - Switch between D&D5e and Seasons & Stars; confirm time formatting updates while timestamps remain stable.

- No-error baseline:
  - With debug off: confirm no recurring warnings/errors from About Time Next during normal operation.

## When to Turn Debug On

Enable the module’s debug setting only when investigating:
- master election / addEvent queuing behavior
- store propagation to non-master clients
- event queue signature refresh behavior in Event Manager

(Keep debug off for normal play to avoid log spam.)
