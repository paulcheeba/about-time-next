# Changelog (v13.1.1.1)

- **Fixed pause/link bug**  
  Replaced all combat-state checks from `game.combats?.size` to `!!game.combat`, ensuring realtime is gated only by active combat, not dormant combat documents.

- **Realtime runner reconciliation**  
  Added `Hooks.on("updateCombat", ...)` to catch combat start/stop transitions that don’t create or delete combat documents (e.g., starting an encounter from an existing record, scene changes).

- **Pause/unpause logic corrected**  
  Updated the `pauseGame` hook to resume realtime only when the game is unpaused *and* no active combat exists.

- **Setting `rtLinkPause` fixed**  
  Adjusted its `onChange` handler to also use `!!game.combat`, eliminating sticky mismatches where toggling wouldn’t update the runner state.

- **UI text clarification**  
  Updated hover text for `rtAutoPauseCombat` to:  
  *“Auto Pause at Combat Start/End”* for clearer user intent.
