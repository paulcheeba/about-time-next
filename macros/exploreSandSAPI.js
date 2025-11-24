// exploreSandSAPI.js
// Explore the actual S&S API structure

console.log("==================== S&S API EXPLORATION ====================");

const ss = game.seasonsStars;
if (!ss) {
  console.log("❌ game.seasonsStars not available");
} else {
  console.log("✓ game.seasonsStars exists");
  console.log("\nTop-level properties:");
  for (const key in ss) {
    console.log(`  ${key}:`, typeof ss[key]);
  }
  
  if (ss.api) {
    console.log("\n✓ game.seasonsStars.api exists");
    console.log("\nAPI methods:");
    for (const key in ss.api) {
      console.log(`  api.${key}:`, typeof ss.api[key]);
    }
    
    // Try calling some methods
    console.log("\n--- Testing API Methods ---");
    
    if (typeof ss.api.getCurrentDate === 'function') {
      try {
        const date = ss.api.getCurrentDate();
        console.log("✓ getCurrentDate():", date);
      } catch (err) {
        console.error("✗ getCurrentDate() error:", err);
      }
    }
    
    if (typeof ss.api.worldTimeToDate === 'function') {
      try {
        const timestamp = game.time.worldTime;
        const date = ss.api.worldTimeToDate(timestamp);
        console.log(`✓ worldTimeToDate(${timestamp}):`, date);
      } catch (err) {
        console.error("✗ worldTimeToDate() error:", err);
      }
    }
    
    if (typeof ss.api.formatDate === 'function') {
      try {
        const date = ss.api.getCurrentDate?.() || {};
        const formatted = ss.api.formatDate(date);
        console.log("✓ formatDate():", formatted);
      } catch (err) {
        console.error("✗ formatDate() error:", err);
      }
    }
  }
}

console.log("\n==================== EXPLORATION COMPLETE ====================");
