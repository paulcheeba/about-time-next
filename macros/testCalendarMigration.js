// testCalendarMigration.js
// Test macro for validating calendar settings migration (v13.3.2.0 - Phase 2)
// Run this as GM to test migration scenarios

console.log("==================== CALENDAR MIGRATION TEST ====================");

const MODULE_ID = "about-time-next";

// Check if user is GM
if (!game.user.isGM) {
  ui.notifications.error("This test must be run by a GM");
  console.error("❌ Test aborted: GM privileges required");
  return;
}

// Test 1: Check settings availability
console.log("\n--- Test 1: Settings Availability ---");
try {
  const hasNewSetting = game.settings.settings.has(`${MODULE_ID}.calendar-system`);
  const hasOldSetting = game.settings.settings.has(`${MODULE_ID}.use-simple-calendar`);
  
  console.log(`New setting (calendar-system): ${hasNewSetting ? '✓ Registered' : '✗ Not found'}`);
  console.log(`Old setting (use-simple-calendar): ${hasOldSetting ? '✓ Registered' : '✗ Not found'}`);
  
  if (!hasNewSetting) {
    console.error("❌ New calendar-system setting not found!");
    return;
  }
} catch (err) {
  console.error("❌ Settings check failed:", err);
  return;
}

// Test 2: Read current settings
console.log("\n--- Test 2: Current Settings Values ---");
try {
  const calendarSystem = game.settings.get(MODULE_ID, "calendar-system");
  const useSC = game.settings.get(MODULE_ID, "use-simple-calendar");
  
  console.log(`Calendar System: "${calendarSystem}"`);
  console.log(`Use Simple Calendar (legacy): ${useSC}`);
} catch (err) {
  console.error("❌ Failed to read settings:", err);
}

// Test 3: Check adapter detection
console.log("\n--- Test 3: Calendar Detection ---");
try {
  const CalendarAdapter = window.AboutTimeNext?.CalendarAdapter;
  if (!CalendarAdapter) {
    console.error("❌ CalendarAdapter not available!");
    return;
  }
  
  const detected = CalendarAdapter.detectAvailable();
  console.log("Detection results:", detected);
  console.log(`  Simple Calendar: ${detected.simpleCalendar ? '✓ Available' : '✗ Not detected'}`);
  console.log(`  Seasons & Stars: ${detected.seasonsStars ? '✓ Available' : '✗ Not detected'}`);
  
  // Test active adapter
  const adapter = CalendarAdapter.getActive();
  console.log(`Active adapter: ${adapter.getSystemName()}`);
} catch (err) {
  console.error("❌ Detection/adapter test failed:", err);
}

// Test 4: Migration simulation options
console.log("\n--- Test 4: Migration Test Options ---");
console.log("To test migration, you can:");
console.log("1. Reset calendar-system to 'auto':");
console.log(`   game.settings.set("${MODULE_ID}", "calendar-system", "auto")`);
console.log("2. Change legacy use-simple-calendar:");
console.log(`   game.settings.set("${MODULE_ID}", "use-simple-calendar", false)`);
console.log("3. Reload world to trigger migration");
console.log("");
console.log("Current state will migrate to:");

try {
  const calendarSystem = game.settings.get(MODULE_ID, "calendar-system");
  const useSC = game.settings.get(MODULE_ID, "use-simple-calendar");
  const detected = window.AboutTimeNext?.CalendarAdapter?.detectAvailable();
  
  if (calendarSystem !== "auto") {
    console.log(`  → No migration (already set to "${calendarSystem}")`);
  } else {
    let prediction = "auto (keep default)";
    
    if (useSC === false) {
      prediction = "none (SC was disabled)";
    } else if (useSC === true && detected.simpleCalendar) {
      prediction = "simple-calendar (SC enabled and available)";
    } else if (useSC === true && !detected.simpleCalendar && detected.seasonsStars) {
      prediction = "seasons-and-stars (SC unavailable, S&S available)";
    }
    
    console.log(`  → ${prediction}`);
  }
} catch (err) {
  console.error("❌ Migration prediction failed:", err);
}

// Test 5: Settings UI hint (manual check)
console.log("\n--- Test 5: Settings UI Check ---");
console.log("Open Module Settings and check for:");
console.log("  1. 'Calendar System' setting with dropdown");
console.log("  2. Detection info showing available calendars");
console.log("  3. 'Use Simple Calendar' should NOT be visible");
console.log("  4. Settings organized into sections");

console.log("\n==================== TEST COMPLETE ====================");
ui.notifications.info("Calendar migration test complete - check console");
