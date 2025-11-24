// debugSandSAPI.js
// Diagnostic macro to check Seasons & Stars API state

console.log("==================== S&S API DEBUG ====================");

// Check module
const ssMod = game.modules.get("seasons-and-stars");
console.log("Module lookup:", ssMod);
console.log("Module active:", ssMod?.active);

// Check API object
console.log("\ngame.seasonsStars:", game.seasonsStars);

if (game.seasonsStars) {
  console.log("\nAPI Methods:");
  console.log("  getCurrentDate:", typeof game.seasonsStars.getCurrentDate);
  console.log("  worldTimeToDate:", typeof game.seasonsStars.worldTimeToDate);
  console.log("  dateToWorldTime:", typeof game.seasonsStars.dateToWorldTime);
  console.log("  formatDate:", typeof game.seasonsStars.formatDate);
  console.log("  advanceDays:", typeof game.seasonsStars.advanceDays);
  console.log("  advanceHours:", typeof game.seasonsStars.advanceHours);
  
  // Try to call getCurrentDate
  console.log("\nAttempting getCurrentDate()...");
  try {
    const date = game.seasonsStars.getCurrentDate();
    console.log("Success! Current date:", date);
  } catch (err) {
    console.error("Failed:", err);
  }
} else {
  console.log("\n❌ game.seasonsStars is not defined");
  console.log("\nPossible reasons:");
  console.log("  1. S&S not fully initialized yet");
  console.log("  2. S&S requires calendar configuration in module settings");
  console.log("  3. S&S API changed in newer versions");
  console.log("\nCheck: Configure Settings → Seasons & Stars");
  console.log("Make sure a calendar pack is selected.");
}

console.log("\n==================== DEBUG COMPLETE ====================");
