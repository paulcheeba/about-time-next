# About Time Next — Reference Documentation

**Last Updated:** 2025-11-22  
**Baseline Version:** v13.2.1.0  
**Next Target Version:** v13.2.2.0  
**Module ID:** `about-time-next`

This document serves as the **persistent knowledge base** for the ATN coding assistant. It stores accumulated technical knowledge, API references, architectural decisions, and FVTT v13 patterns discovered during development.

---

## 📚 External References

### Foundry VTT v13 Documentation
- **Official API:** https://foundryvtt.com/api/
- **Community Wiki:** https://foundryvtt.wiki/en/development/api
- **V13 Compatibility:** Minimum 13, verified 13, maximum 13.999

### Simple Calendar Integration
- **Module ID:** `foundryvtt-simple-calendar` or `simple-calendar`
- **Detection:** Check `game.modules.get("foundryvtt-simple-calendar")?.active`
- **API Access:** `globalThis.SimpleCalendar?.api`
- **Status:** SC v13 compatibility needs reconfirmation when SC updates

---

## 🏗️ Project Architecture

### Module Structure
```
about-time-next/
├── about-time.js           # Entry point, hook initialization
├── module.json             # Module manifest (version auto-managed via Git tags)
├── vars.js                 # Legacy compatibility (if exists)
├── module/                 # Core functionality
│   ├── ATEventManagerAppV2.js    # Event Manager singleton (ApplicationV2)
│   ├── ATToolbar.js              # Toolbar button injection
│   ├── ATMiniPanel.js            # Mini time display panel
│   ├── ATMiniSettings.js         # Settings for mini panel
│   ├── ATMiniToolbar.js          # Mini panel toolbar integration
│   ├── ATRealtimeClock.js        # Real-time clock progression
│   ├── ATChat.js                 # /at chat commands
│   ├── ElapsedTime.js            # Event scheduling engine
│   ├── PseudoClock.js            # Clock master/socket coordination
│   ├── FastPriorityQueue.js      # Priority queue for events
│   ├── preloadTemplates.js       # Template preloader
│   ├── settings.js               # Module settings registration
│   └── calendar/                 # Calendar/time utilities
│       ├── DateTime.js           # Time conversion utilities
│       ├── DTCalc.js             # Date calculations
│       └── DTMod.js              # Date modifications
├── templates/
│   ├── ATEventManagerAppV2.hbs   # Event Manager UI template
│   └── countDown.html            # (legacy/optional)
├── lang/                   # Internationalization (10 languages)
├── macros/                 # Dev test macros
└── devFolder/              # Assistant memory database
    ├── initialPrompt.md        # Assistant initialization document
    ├── referenceDocumentation.md  # This file (persistent knowledge)
    └── releaseNote-vX.Y.Z.W.md   # Release notes (created at publish time)
```

### Key Files

#### `about-time.js` (Entry Point)
- **Version Note:** Header says v13.1.1.1 (Hotfix: active-combat signal)
- **Initialization:**
  - `init` hook: registers settings, mini settings, preloads templates
  - `setup` hook: builds `game.abouttime` operations API
  - `ready` hook: initializes PseudoClock & ElapsedTime, optionally opens mini panel
- **Global Exports:**
  - `game.abouttime` — primary API namespace
  - `game.Gametime` — deprecated proxy (warns on access)
  - `globalThis.abouttime` / `globalThis.Gametime` — global shims
- **Legacy Helper:** `DTNow()` returns `game.time.worldTime`

#### `module/ATEventManagerAppV2.js`
- **Version:** v13.1.3.1 (macro datalist + refresh)
- **Class:** `ATEventManagerAppV2` extends `HandlebarsApplicationMixin(ApplicationV2)`
- **Pattern:** Singleton instance (managed by ATToolbar)
- **Features:**
  - Create one-time or repeating events
  - Stop by name/UID
  - Flush all events (with optional +1h reminder)
  - Live status board with countdown updates
  - Macro picker with `<datalist>` + refresh button
  - Dynamic queue signature tracking (`#queueSig`) for efficient re-renders
- **Actions (ApplicationV2 pattern):**
  - `create`, `list`, `flush`, `flush-rem`, `stop-by-name`, `stop-by-uid`, `row-stop`, `copy-uid`
- **Handler Serialization:** Marks handlers with `_atHandlerType = "gmWhisper"` for queue persistence
- **Macro Execution:**
  - v11+: `await macro.execute({ args: [metaArg] })`
  - Pre-v11: Function wrapper fallback
  - Stores macro UUID for reload reliability

#### `module/ElapsedTime.js`
- **Version:** v13.0.9.0.4 (stabilized SC checks)
- **Core Scheduling API:**
  - `doAt(when, handler, ...args)` — schedule at absolute time
  - `doIn(when, handler, ...args)` — schedule after interval (one-time)
  - `doEvery(when, handler, ...args)` — schedule repeating interval
  - `doAtEvery(...)` — absolute start, then repeat (not shown in initial scan)
- **Reminder/Notify Variants:**
  - `reminderAt/In/Every` — schedule GM whisper messages
  - `notifyAt/In/Every` — schedule hook events
- **Queue Management:**
  - Uses `FastPriorityQueue` for efficient event ordering
  - `gclearTimeout(uid)` — cancel event by UID
  - `_save(immediate)` — persist queue to world settings
  - `_load()` — restore queue from settings
- **SC Integration:**
  - Checks `isSCActive()` before using SC interval helpers
  - Falls back to core Foundry time if SC unavailable
  - Normalizes intervals via `normalizeATInterval()` + `secondsFromATInterval()`
- **Increment Handling:** Always stores numeric seconds for repeating events

#### `module/PseudoClock.js`
- **Version:** v13.0.9.0.4 (v13-safe sockets/users)
- **Purpose:** Master timekeeper election via socket coordination
- **Socket Events:**
  - `_eventTrigger` — notify all users of hook event
  - `_queryMaster` — ask "who is master?"
  - `_masterResponse` — "I am master"
  - `_masterMutiny` — "I'm taking over"
  - `_runningClock` — deprecated
  - `_addEvent` — replicate event to master's queue
- **Master Election:**
  - On `init`, sends `_queryMaster`
  - If no response in 10s, assumes master role via `mutiny()`
  - Hook: `about-time.pseudoclockMaster` fires on master acquisition
- **Clock Status:** Uses `globalThis.SimpleCalendar?.api?.clockStatus?.()` for SC integration

#### `module/settings.js`
- **MODULE_ID:** `"about-time-next"`
- **Registered Settings:**
  - `store` (world, hidden): event queue persistence
  - `debug` (client, visible): verbose logging toggle
  - `use-simple-calendar` (world, visible): SC integration toggle (default: true)
  - `election-timeout` (world, hidden): master election timeout

#### `module/ATToolbar.js`
- **Version:** v13.1.3.0 (single instance toggle)
- **Hook:** `getSceneControlButtons`
- **Injection Point:** Journal/Notes toolbar (`controls["journal"]` or `controls["notes"]`)
- **Tool Definition:**
  - Name: `about-time-manager`
  - Icon: `fas fa-clock`
  - Button: true (always visible to GM)
  - Order: `parent.order + 1` or 999
- **Singleton Pattern:**
  - Stores `_emAppV2` reference
  - Toggle behavior: close if rendered, else open
  - Clears reference on close
- **Controls Normalization:** Handles both v13 Record format and legacy Array format

#### `templates/ATEventManagerAppV2.hbs`
- **Version:** v13.1.3.1 (light mode accents + button order)
- **Structure:**
  - Inline `<style>` block with CSS custom properties
  - Dark mode (Dracula theme): `--atd-*` variables
  - Light mode overrides: `.theme-light .at-emv2 .at-btn.*`
- **Form Inputs:**
  - Event Name (text)
  - Duration (text, mixed format: `1h30m`, `45s`, `2d 4h`)
  - Message (text)
  - Options: Repeat (checkbox), Run Macro (checkbox)
  - Macro Name (text + datalist `#atn-em-macro-list`)
  - Refresh button (⟳ icon)
- **Button Layout (GM-only):**
  1. Stop all Events (danger)
  2. Stop all + 1h reminder (danger)
  3. Stop Key input field
  4. Stop by Name (warn)
  5. Stop by UID (warn)
  6. Send Queue to Chat (default)
  7. Create (primary)
- **Status Board:**
  - Table columns: Name, Starts, Remaining, Repeat, Macro, Message, UID, Actions
  - Live countdown via `data-remaining` attribute
  - Stop button per row (GM-only)
- **Theming:**
  - Dark: Dracula palette (purple/green/red/orange accents)
  - Light: Filled buttons (dark green Create, orange Stop-by, dark red Stop-all)
  - Table headers: yellow (dark) / dark brown (light)

---

## 🎨 UI/UX Patterns

### Dark Mode (Identity Theme)
- **Palette:** Dracula-inspired
  - Background: `#282a36`
  - Panel: `#1e1f29`
  - Surface: `#2b2e3b`
  - Foreground: `#f8f8f2`
  - Muted: `#bd93f9` (purple)
  - Accent: `#6272a4` (blue-gray)
  - Green: `#50fa7b`
  - Red: `#ff5555`
  - Orange: `#ffb86c`
  - Yellow: `#f1fa8c`
  - Cyan: `#8be9fd`
  - Pink: `#ff79c6`

### Light Mode (Accessibility)
- **Accents:** Slightly darker for readability
  - Create button: `#2e7d32` (dark green, filled)
  - Stop-by buttons: `#ef6c00` (orange, filled)
  - Stop-all buttons: `#b71c1c` (dark red, filled)
  - Table headers: `#5d4037` (dark brown)
- **Backgrounds:** Use Foundry's Theme V2 CSS variables
- **Text:** `#222` / `#332c2c` for contrast

### Macro Picker UX
- **Input Type:** `<input type="text" list="atn-em-macro-list">`
- **Display:** Macro name (plain text)
- **Tooltip:** `"Folder • Type • ID"` via `title` attribute
- **Refresh:** Icon button (⟳) adjacent to input
- **Permissions:** GMs see all; non-GMs see Observer+ macros
- **Sorting:** Alphabetical by name, then by folder name
- **Chevron Icon:** Custom SVG via `background-image` to indicate dropdown
- **WebKit Fix:** Hides native calendar picker indicator

### Toolbar Button (Singleton)
- **Behavior:** Toggle open/close (never duplicate instances)
- **Location:** Journal/Notes toolbar sub-button
- **Visibility:** GM-only
- **Icon:** `fas fa-clock`

---

## 🔧 Technical Notes

### ApplicationV2 Pattern (FVTT v13)
- **Base Classes:**
  - `foundry.applications.api.ApplicationV2`
  - `foundry.applications.api.HandlebarsApplicationMixin`
- **Required Statics:**
  - `DEFAULT_OPTIONS` — window config, actions, classes
  - `PARTS` — template paths
- **Lifecycle:**
  - `_prepareContext()` — data for template
  - `render(force, options)` — async render + post-render hooks
  - `close(options)` — async cleanup
- **Actions:** Defined in `DEFAULT_OPTIONS.actions`, invoked via `data-action` attributes

### Event Queue (FastPriorityQueue)
- **Structure:** Min-heap ordered by `_time` (world time timestamp)
- **Entry Format (Quentry):**
  - `_uid` — unique identifier (UUID)
  - `_time` — fire time (world time seconds)
  - `_recurring` — boolean
  - `_increment` — seconds (numeric, for repeating events)
  - `_handler` — function reference (serialized via `_atHandlerType` marker)
  - `_args` — array (first element: metadata object)
- **Metadata Object (`_args[0]`):**
  - `__atName` — event name (user-defined)
  - `__atMsg` — message text
  - `__macroName` — macro name (for persistence)
  - `__macroUuid` — macro UUID (for reliable reload)
  - `__duration` — seconds (stored for card display, v13.2.1.0+)
  - `__uid` — event UID (stored after creation for fresh card display, v13.2.1.0+)
- **Persistence:** Serialized to `game.settings.get(MODULE_ID, "store")` using `foundry.utils.deepClone()` to preserve nested objects
- **Signature Tracking:** `#computeQueueSignature()` hashes UID:time pairs to detect changes

### Simple Calendar Integration
- **Detection Function:**
  ```javascript
  function isSCActive() {
    const useSC = game.settings.get(MODULE_ID, "use-simple-calendar");
    if (!useSC) return false;
    const sc = game.modules.get("foundryvtt-simple-calendar") ?? game.modules.get("simple-calendar");
    return !!(sc && sc.active && globalThis.SimpleCalendar?.api);
  }
  ```
- **API Usage:**
  - `SimpleCalendar.api.timestampToDate(timestamp)` — convert to date object
  - `SimpleCalendar.api.timestampPlusInterval(base, interval)` — add interval
  - `SimpleCalendar.api.clockStatus()` — get play/pause state
  - `SimpleCalendar.api.startClock() / stopClock()` — control clock
  - `SimpleCalendar.api.showCalendar()` — open SC UI
- **Fallback:** If SC unavailable or disabled, use `game.time.worldTime` directly

### Duration Parsing
- **Input Format:** Mixed string like `"1h30m"`, `"45s"`, `"2d 4h"`
- **Regex:** `/(\d+)\s*(d|h|m|s)?/gi`
- **Conversion:**
  - `d` → × 86400
  - `h` → × 3600
  - `m` → × 60
  - `s` → × 1
- **Default Unit:** seconds (if no suffix)

### Duration Display
- **Format:** `DD:HH:MM:SS`
- **Padding:** 2 digits for D, zero-pad HH/MM/SS
- **Example:** 93661s → `01:02:01:01`

### Timestamp Display
- **SC Available:** Use `SimpleCalendar.api.timestampToDate(time)` and format
- **SC Unavailable:** Display raw world time seconds

### Event Card Formatting (v13.2.1.0+)
- **Function:** `formatEventChatCard(meta, uid, recurring, increment)` (exported from `FastPriorityQueue.js`)
- **Purpose:** Generate standardized HTML for event notification cards
- **Format:**
  ```
  [about-time-next]
  Event Name: {meta.__atName or NA}
  Message: {meta.__atMsg or NA}
  Duration: {DD:HH:MM:SS or NA}
  Repeating: {Yes/No}
  Macro: {meta.__macroName or NA}
  Event UID: {uid}
  ```
- **Styling:** Green left border (`#50fa7b`), monospace font, compact spacing
- **Usage:** Called by both fresh handlers (ATEventManagerAppV2) and reconstructed handlers (FastPriorityQueue)
- **Escaping:** All user input escaped via `foundry.utils.escapeHTML()`

### Macro Execution (v11+ and legacy)
```javascript
// v11+ (preferred)
await macro.execute({ args: [metaArg] });

// Pre-v11 (fallback)
const body = `return (async () => { ${macro.command} })()`;
const fn = Function("{speaker, actor, token, character, item, args}={}", body);
await fn.call(this, { speaker: {}, args: [metaArg] });
```

### Socket Communication
- **Module Socket:** `module.about-time-next`
- **Message Format:** `PseudoClockMessage`
  - `_action` — event type
  - `_userId` — sender ID
  - `_newTime` — optional time value
  - `_args` — payload
  - `_originator` — `game.user.id`
- **Broadcast:** `game.socket.emit(_moduleSocket, message, callback)`
- **Receive:** `game.socket.on(_moduleSocket, handler)`

### Hooks (Custom)
- `about-time.eventTrigger` — fired when notify* API called
- `about-time.pseudoclockMaster` — fired when master role acquired/lost
- `pseudoclockSet` — fired on `updateWorldTime`

### Hooks (Foundry Core)
- `init` — module initialization
- `setup` — API setup
- `ready` — clock initialization, auto-open mini panel
- `getSceneControlButtons` — toolbar injection
- `updateWorldTime` — clock advance
- `updateCombat` — reconcile realtime runner (v13.1.1.1 fix)
- `pauseGame` — resume realtime if no active combat

---

## 🐛 Known Issues & Fixes

### v13.1.1.1 Hotfix (Combat Pause/Link Bug)
- **Problem:** Pause/unpause logic checked `game.combats?.size` instead of `!!game.combat`
- **Symptom:** Realtime gated by dormant combat documents, not active combat
- **Fix:**
  - Use `!!game.combat` for active combat detection
  - Add `Hooks.on("updateCombat", ...)` to catch start/stop transitions
  - Update `rtLinkPause` setting `onChange` handler
- **Files Modified:** `ATRealtimeClock.js` (not scanned yet, but inferred from changelog)

### v13.2.1.0 (Standardized Event Chat Cards)
- **Added:** Standardized event notification card format with consistent layout across all Event Manager events
- **Added:** `formatEventChatCard()` helper function (exported from `FastPriorityQueue.js`)
- **Fixed:** Critical metadata persistence bug - event details now survive Foundry reloads via deep clone
- **Fixed:** `[about-time-next]` prefix now persists through reload, ensuring notification sounds trigger correctly
- **Fixed:** UID display issue - UIDs now show correctly in fresh event cards (previously showed "null")
- **Enhanced:** Macro events now show event card *before* macro execution for better context
- **Technical:** Deep clone using `foundry.utils.deepClone()` ensures proper serialization through Foundry's settings system
- **Card Format:** Displays event name, message, duration (DD:HH:MM:SS), repeating status, macro name, and UID
- **Files Modified:** `FastPriorityQueue.js`, `ATEventManagerAppV2.js`, `README.md`, `changelog.md`, `module.json`
- **Known Limitation:** `/at` chat commands still use legacy format (planned for v13.2.2.0+)

### v13.2.0.0 (Event Notification Sounds)
- **Added:** Audible alerts when scheduled events trigger (GM-only)
- **Added:** 5 client settings: enable/disable, sound source, custom path with file picker, volume slider, test button
- **Added:** `ATNotificationSound.js` with hook-based pattern-matching detection
- **Added:** 3 built-in notification sound assets (MP3) from Pixabay
- **Added:** 11 localization strings for notification settings
- **Technical:** Hook listens to `createChatMessage`, pattern-matches ATN event whispers, plays via `foundry.audio.AudioHelper.play()`
- **UX:** Test button previews unsaved form values; actual notifications use saved settings
- **Files Modified:** `settings.js`, `about-time.js`, `lang/en.json`, `README.md`, `changelog.md`
- **Files Created:** `module/ATNotificationSound.js`, `assets/sounds/*.mp3`

### v13.1.3.1 (Light Mode & Macro Datalist)
- **Added:** Macro picker with `<datalist>` and refresh button
- **Added:** Light mode filled button accents
- **Removed:** "Copy UID" button from template (action handler remains)
- **Files Modified:** `ATEventManagerAppV2.js`, `ATEventManagerAppV2.hbs`

---

## 📋 Development Checklist Template

For any feature or bugfix, follow this workflow:

### 1. Impact Analysis
- Which files require changes?
- Which FVTT APIs are involved?
- Does this affect SC integration?
- Does this require new settings?

### 2. Diff Proposal
- Provide minimal diffs for affected files
- Preserve surrounding context (3-5 lines)
- Comment all changes

### 3. User Confirmation
- Wait for explicit approval before implementing
- Answer clarifying questions

### 4. Full File Delivery
- Provide complete updated files
- **CRITICAL:** Update version in file header comments (e.g., `// v13.2.0.0 — Description`)
- Track which files changed per version via header comments
- Update `changelog.md` if user-facing

### 5. Verification Checklist
- [ ] Launch Foundry with module enabled — no errors
- [ ] Test without Simple Calendar
- [ ] Test with Simple Calendar (when SC v13 available)
- [ ] Toggle light/dark mode
- [ ] Create one-time event
- [ ] Create repeating event
- [ ] Stop by name
- [ ] Stop by UID
- [ ] Stop all / Flush
- [ ] Verify Macro Picker + refresh
- [ ] Inspect status board countdown updates
- [ ] Check mini panel (if enabled)
- [ ] Verify toolbar button toggle

---

## 🔐 Security & Best Practices

### GM-Only Operations
- Event creation/deletion
- Queue flushing
- Chat commands (`/at`)
- Macro execution

### Permissions
- Non-GM users can view event queue
- Macro picker filters by Observer+ permission for non-GMs

### Input Sanitization
- Always use `foundry.utils.escapeHTML()` for user input in chat messages
- Never execute arbitrary code from non-GM users

### Singleton Pattern Enforcement
- Event Manager: single instance via `_emAppV2` reference
- Time Manager: `globalThis.ATN.timeManager` (not yet scanned)

---

## 🧪 Testing Strategy

### Local Testing Environment
- **FVTT Version:** v13 (local instance)
- **Game System:** dnd5e (latest)
- **Testing Phase:** All changes tested locally before pushing to GitHub

### Unit Test Scenarios (Manual)
1. **Standalone Mode:** Disable SC, create events, verify countdown
2. **SC Integration:** Enable SC, create events using SC intervals
3. **Combat Integration:** Start/stop combat, verify realtime pause
4. **Master Election:** Simulate GM disconnect, verify mutiny
5. **Queue Persistence:** Create events, reload world, verify restoration
6. **Macro Execution:** Schedule macro, verify args passed correctly
7. **Light/Dark Toggle:** Switch themes, verify button colors

### Edge Cases
- Empty macro name with "Run Macro" checked
- Invalid duration strings (negatives, non-numeric)
- Events scheduled in the past
- Multiple GMs (master election race)
- SC disabled mid-session

---

## 📝 Versioning & Release

### Version Format
`v13.[major].[test].[sub].[hotfix]`

Example: `v13.1.3.2`
- `13` — FVTT compatibility version
- `1` — major feature milestone
- `3` — test/beta iteration
- `2` — sub-feature/polish
- (omitted) — hotfix counter

### Current Development Cycle
- **Baseline:** v13.2.1.0 (current stable)
- **Next Target:** v13.2.2.0
- **Development Approach:** Work on local files, test with local FVTT v13 + dnd5e system
- **Branch Strategy:** Push to new branch in GitHub before merging to main

### Version Locations & Management
- `module.json` — authoritative version (auto-updated by GitHub workflows on publish)
- **File header comments** — MUST be manually updated during development for tracking
  - Every modified file gets updated version comment in header
  - Format: `// v13.2.0.0 — Brief description of changes`
  - Enables tracking which files changed per version
- `README.md` — user-facing version
- `changelog.md` — release history

### Workflow
1. Modify files locally, updating header version comments
2. Test on local FVTT v13 instance
3. Commit to new branch
4. GitHub workflow updates `module.json` version on publish
5. Merge to main after verification

### Pre-Release Tasks (Assistant Responsibilities)
When the user declares a version ready for release:
1. **Update `changelog.md`** — Add entry for the new version with all changes
2. **Create Release Note** — Generate `devFolder/releaseNote-v13.2.0.0.md` (example)
   - Format: Markdown suitable for GitHub release notes
   - User will copy contents to paste into GitHub release after publishing
  - File remains in `devFolder/` as historical reference
3. **Update `.gitignore`** — Add any new files in `devFolder/` to ensure they're not published to release
  - All `devFolder/` contents are development-only and must not be in releases

### Changelog Format
```markdown
# Changelog (vX.Y.Z.W)

- **Feature/Fix Title**  
  Description of change.

- **Another Change**  
  Details.
```

---

## 🧰 Utility Functions (Common Patterns)

### Safe Settings Access
```javascript
function hasSettingKey(key) {
  try { return game?.settings?.settings?.has?.(`${MODULE_ID}.${key}`) ?? false; }
  catch { return false; }
}

function getSettingSafe(key, fallback) {
  try {
    if (!hasSettingKey(key)) return fallback;
    return game.settings.get(MODULE_ID, key);
  } catch { return fallback; }
}
```

### GM Whisper
```javascript
const gmWhisper = (html) => {
  try {
    const ids = ChatMessage.getWhisperRecipients("GM")
      .filter((u) => u.active)
      .map((u) => u.id);
    return ChatMessage.create({ content: html, whisper: ids });
  } catch (e) {
    console.warn("[about-time] gmWhisper failed", e);
    return ChatMessage.create({ content: html });
  }
};
```

### Controls Normalization (v13)
```javascript
function normalizeControls(controlsArg) {
  if (controlsArg && !Array.isArray(controlsArg)) return controlsArg;
  if (Array.isArray(controlsArg)) {
    const rec = {};
    for (const c of controlsArg) if (c?.name) rec[c.name] = c;
    return rec;
  }
  // Fallback to ui.controls.controls
  const maybe = ui?.controls?.controls;
  if (Array.isArray(maybe)) {
    const rec = {};
    for (const c of maybe) if (c?.name) rec[c.name] = c;
    return rec;
  }
  return {};
}
```

---

## 🌐 Internationalization

### Supported Languages (10 total)
- English (`en`)
- Deutsch / German (`de`)
- Korean (`ko`)
- 日本語 / Japanese (`ja`)
- Français / French (`fr`)
- Português (Brasil) (`pt-BR`)
- Español / Spanish (`es`)
- Italian (`it`)
- 中文 / Chinese Simplified (`cn`)
- 正體中文 / Chinese Traditional (`zh-tw`)

### Translation Keys (Inferred)
- `about-time.notMaster` — "Not master timekeeper" error

### Adding New Strings
1. Add key to `lang/en.json`
2. Use `game.i18n.localize("about-time.key")` in code
3. Update other language files (or leave English as fallback)

---

## 📦 Module Metadata

### Authors
1. `tposney` — original About Time author
2. `crusherDestroyer666/paulcheeba` — ATN maintainer
3. `chatGPT5-givingCreditWhereCreditIsDue` — AI assistant credit

### Links
- **GitHub:** https://github.com/paulcheeba/about-time-next
- **Issues:** https://github.com/paulcheeba/about-time-next/issues
- **Manifest:** https://github.com/paulcheeba/about-time-next/releases/latest/download/module.json
- **Download:** https://github.com/paulcheeba/about-time-next/releases/latest/download/about-time-next.zip

### Compatibility
- **Min:** Foundry v13
- **Verified:** v13
- **Max:** v13.999

### Dependencies
- **Optional:** Simple Calendar (v13+ when available)
- **Socket:** Required (module uses socket communication)

---

## 🔍 Code Style Guidelines

### Naming Conventions
- **Files:** PascalCase for classes (`ATEventManagerAppV2.js`)
- **Variables:** camelCase (`_eventQueue`, `isMaster`)
- **Private Fields:** `#privateField` (ES2022 syntax)
- **Constants:** UPPER_SNAKE_CASE (`MODULE_ID`, `_moduleSocket`)

### Comments
- **File Headers:** Version + brief description
- **Function Docs:** JSDoc style (optional but helpful)
- **Inline Comments:** Explain "why", not "what"

### ES Features
- **Modules:** Use `import`/`export`
- **Async/Await:** Preferred over Promises
- **Optional Chaining:** `game?.modules?.get?.()`
- **Nullish Coalescing:** `value ?? fallback`
- **Private Fields:** `#field` for class internals

### Error Handling
- **Try/Catch:** Wrap risky operations
- **Console Logs:** Use `MODULE_ID` prefix
- **User Notifications:** Use `ui.notifications.warn/error()`

---

## 🎯 Future Enhancements (Ideas)

### Potential Features
- Visual event timeline (Gantt-style)
- Event templates (save/load common configs)
- Event categories/tags
- Export/import event queue
- Webhook integration for external notifications
- Sound effects on event trigger
- Conditional events (e.g., "only if combat active")

### Technical Improvements
- Unit tests (Jest or similar)
- TypeScript migration
- CSS preprocessor (SCSS/Less)
- Localization completeness audit
- Performance profiling for large queues

---

## 📖 Learning Resources

### Foundry VTT Concepts
- **World Time:** `game.time.worldTime` (seconds since epoch)
- **ApplicationV2:** New app framework in v12+
- **Hooks:** Event-driven architecture
- **Sockets:** Real-time multiplayer communication
- **Settings:** Persistent configuration storage

### JavaScript Patterns
- **Singleton:** Single instance per session
- **Proxy:** Intercept object access (for deprecation warnings)
- **Priority Queue:** Min-heap for efficient event scheduling
- **Observer Pattern:** Hooks for event subscription

---

## 🔄 Change Log Integration

### During Development
Track changes mentally or in comments as work progresses.

### At Release Time
When user declares version ready:
1. **Update `changelog.md`** — Prepend new version section
   ```markdown
   # Changelog (vX.Y.Z.W)

   - **Feature Title**  
     Description of change.

   - **Bug Fix**  
     What was broken, how it's fixed.
   ```

2. **Create Release Note** — Generate `devFolder/releaseNote-vX.Y.Z.W.md`
   - User-friendly format for GitHub release notes
   - Include features, fixes, breaking changes, upgrade instructions
   - User copies contents to GitHub release page after publishing

Keep entries concise and user-focused.

---

## 🧩 Module API Surface

### Public API (`game.abouttime`)
```javascript
// Status
isMaster: () => boolean
isRunning: () => boolean

// Scheduling
doAt(when, handler, ...args): string (UID)
doIn(when, handler, ...args): string (UID)
doEvery(when, handler, ...args): string (UID)
doAtEvery(when, interval, handler, ...args): string (UID)

// Reminders
reminderAt(when, ...args): string (UID)
reminderIn(when, ...args): string (UID)
reminderEvery(when, ...args): string (UID)
reminderAtEvery(when, interval, ...args): string (UID)

// Notifications
notifyAt(when, eventName, ...args): string (UID)
notifyIn(when, eventName, ...args): string (UID)
notifyEvery(when, eventName, ...args): string (UID)
notifyAtEvery(when, interval, eventName, ...args): string (UID)

// Queue Admin
clearTimeout(uid): boolean
getTimeString(): string
queue(): void (console output)
chatQueue(): void (send to chat)

// Legacy/Deprecated
startRunning(): void (calls SC API)
stopRunning(): void (calls SC API)
setClock(): void (error, not supported)
advanceClock(): void (error, not supported)
advanceTime(): void (error, not supported)
setTime(): void (error, not supported)
setDateTime(): void (error, not supported)
setAbsolute(): void (error, not supported)

// Utilities
showClock(): void (open SC calendar)
showCalendar(): void (open SC calendar)
showMiniPanel(): void
hideMiniPanel(): void
toggleMiniPanel(): void

// Internals (exposed)
_notifyEvent(eventName, ...args): Promise<void>
mutiny(): void
flushQueue(): void
reset(): void
status(): void (console output)
```

### Deprecated API (`game.Gametime`)
Proxy to `game.abouttime` with deprecation warnings.

---

### Online Foundry VTT reference Documentation
- **API:** https://foundryvtt.com/api/
- **Community WIKI:** https://foundryvtt.wiki/en/home

## 🏁 Summary

This reference document captures:
- **Architecture:** Singleton patterns, ApplicationV2, socket coordination
- **UI/UX:** Dark/light themes, macro picker, toolbar integration
- **Technical Details:** Queue serialization, SC integration, duration parsing
- **Development Workflow:** Impact analysis → diff → approval → implementation → verification
- **Best Practices:** Security, error handling, code style

As the ATN project evolves, this document will be updated to reflect new discoveries, API changes, and architectural decisions. It serves as the **single source of truth** for the coding assistant's understanding of the module.

---

**End of Reference Documentation**
