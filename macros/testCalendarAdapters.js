// Test macro for Calendar Adapters (Phase 1)
// Copy this into a Foundry macro and run it to test adapter detection and functionality
// Look at browser console (F12) for detailed logging

console.log("=".repeat(80));
console.log("CALENDAR ADAPTER TEST - Phase 1 (v13.3.1.0)");
console.log("=".repeat(80));

// Import adapters (these should be loaded by about-time.js)
const CalendarAdapter = window.AboutTimeNext?.CalendarAdapter;
const SimpleCalendarAdapter = window.AboutTimeNext?.adapters?.SimpleCalendarAdapter;
const SandSAdapter = window.AboutTimeNext?.adapters?.SandSAdapter;

console.log("\n1. CHECKING ADAPTER CLASS AVAILABILITY:");
console.log("   CalendarAdapter:", CalendarAdapter ? "✓ Found" : "✗ Not found");
console.log("   SimpleCalendarAdapter:", SimpleCalendarAdapter ? "✓ Found" : "✗ Not found");
console.log("   SandSAdapter:", SandSAdapter ? "✓ Found" : "✗ Not found");

if (!CalendarAdapter) {
  console.error("❌ CalendarAdapter not found! Ensure adapters are imported in about-time.js");
  ui.notifications.error("CalendarAdapter not loaded. Check console for details.");
  return;
}

console.log("\n2. DETECTING AVAILABLE CALENDAR SYSTEMS:");
const available = CalendarAdapter.detectAvailable();
console.log("   Available systems:", available);
if (available.length === 0) {
  console.warn("⚠ No calendar systems detected. Install Simple Calendar or Seasons & Stars to test.");
}

console.log("\n3. GETTING ACTIVE ADAPTER:");
const adapter = CalendarAdapter.getActive();
if (adapter) {
  console.log("   ✓ Active adapter:", adapter.name);
  console.log("   System ID:", adapter.systemId);
  console.log("   Is available:", adapter.isAvailable());
} else {
  console.log("   No adapter active (calendar-system setting = 'none' or no calendars installed)");
}

if (adapter) {
  console.log("\n4. TESTING ADAPTER METHODS:");
  
  // Test formatTimestamp
  console.log("\n   A. formatTimestamp():");
  const currentTime = game.time.worldTime;
  try {
    const formatted = adapter.formatTimestamp(currentTime);
    console.log(`      Current time (${currentTime}s): "${formatted}"`);
  } catch (e) {
    console.error("      Error:", e);
  }
  
  // Test formatDateTime
  console.log("\n   B. formatDateTime():");
  try {
    const formatted = adapter.formatDateTime(currentTime);
    console.log(`      Date: "${formatted.date}"`);
    console.log(`      Time: "${formatted.time}"`);
  } catch (e) {
    console.error("      Error:", e);
  }
  
  // Test getCurrentDate
  console.log("\n   C. getCurrentDate():");
  try {
    const date = adapter.getCurrentDate();
    console.log("      Current date object:", date);
  } catch (e) {
    console.error("      Error:", e);
  }
  
  // Test timestampPlusInterval
  console.log("\n   D. timestampPlusInterval():");
  try {
    const interval = { hour: 1, minute: 30 };
    const newTime = adapter.timestampPlusInterval(currentTime, interval);
    console.log(`      ${currentTime}s + 1h30m = ${newTime}s (delta: ${newTime - currentTime}s)`);
    const newFormatted = adapter.formatTimestamp(newTime);
    console.log(`      Formatted: "${newFormatted}"`);
  } catch (e) {
    console.error("      Error:", e);
  }
  
  // Test normalizeInterval
  console.log("\n   E. normalizeInterval():");
  try {
    const testIntervals = [
      { days: 2, hours: 3 },
      { day: 1, hour: 2, minute: 30 },
      365, // Number input
      { d: 1, h: 12, m: 30, s: 45 } // Short forms
    ];
    testIntervals.forEach((interval, i) => {
      const normalized = adapter.normalizeInterval(interval);
      console.log(`      [${i}] ${JSON.stringify(interval)} => ${JSON.stringify(normalized)}`);
    });
  } catch (e) {
    console.error("      Error:", e);
  }
  
  // Test getCalendarData
  console.log("\n   F. getCalendarData():");
  try {
    const calData = adapter.getCalendarData();
    console.log("      Calendar name:", calData.name);
    console.log("      Months in year:", calData.monthsInYear);
    console.log("      Days per week:", calData.daysPerWeek);
    console.log("      First 3 months:", calData.months.slice(0, 3));
    console.log("      Weekdays:", calData.weekdays);
  } catch (e) {
    console.error("      Error:", e);
  }
  
  // Test getClockStatus
  console.log("\n   G. getClockStatus():");
  try {
    const status = adapter.getClockStatus();
    console.log("      Clock status:", status);
  } catch (e) {
    console.error("      Error:", e);
  }
}

console.log("\n5. TESTING ADAPTER REFRESH:");
CalendarAdapter.refresh();
const adapter2 = CalendarAdapter.getActive();
if (adapter2) {
  console.log("   ✓ Adapter re-initialized after refresh:", adapter2.name);
} else {
  console.log("   No adapter after refresh");
}

console.log("\n" + "=".repeat(80));
console.log("TEST COMPLETE - Check console logs above for details");
console.log("=".repeat(80));

ui.notifications.info("Calendar Adapter test complete. Check browser console (F12) for results.");
