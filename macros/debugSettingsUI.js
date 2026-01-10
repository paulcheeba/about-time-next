// debugSettingsUI.js
// Diagnostic to check why detection info isn't showing in Settings UI

console.log("==================== SETTINGS UI DEBUG ====================");

const MODULE_ID = "about-time-next";

// Check if CalendarAdapter is available
console.log("\n1. CalendarAdapter availability:");
console.log("   window.AboutTimeNext:", !!window.AboutTimeNext);
console.log("   CalendarAdapter:", !!window.AboutTimeNext?.CalendarAdapter);
console.log("   detectAvailableAsObject:", typeof window.AboutTimeNext?.CalendarAdapter?.detectAvailableAsObject);

// Test detection
if (window.AboutTimeNext?.CalendarAdapter?.detectAvailableAsObject) {
  const detected = window.AboutTimeNext.CalendarAdapter.detectAvailableAsObject();
  console.log("\n2. Detection results:");
  console.log("   ", detected);
}

// Check for settings in DOM (you need to have Module Settings open)
console.log("\n3. Checking DOM elements:");

// First, let's see what apps are open
console.log("   Open applications:");
const apps = document.querySelectorAll('.app.window-app');
apps.forEach(app => {
  console.log(`     - ${app.className}`, app.id || '');
});

// Try to find the calendar input anywhere in the document
const calendarInput = document.querySelector(`[name="${MODULE_ID}.calendar-system"]`);
console.log("\n   Direct search for calendar input:", !!calendarInput);

if (calendarInput) {
  console.log("   ✓ Calendar input found!");
  
  const formGroup = calendarInput.closest('.form-group');
  console.log("   Form group:", !!formGroup);
  
  if (formGroup) {
    const hint = formGroup.querySelector('.notes');
    console.log("   Hint element:", !!hint);
    
    if (hint) {
      console.log("   Hint text:", hint.textContent?.substring(0, 50) + '...');
    }
    
    // Check if detection box already exists
    const detectionBox = formGroup.querySelector('div[style*="background: rgba(0,0,0,0.1)"]');
    console.log("   Detection box:", !!detectionBox);
    
    if (!detectionBox && hint) {
      console.log("\n4. Detection box missing - manually adding...");
      
      const detected = window.AboutTimeNext?.CalendarAdapter?.detectAvailableAsObject() || { dnd5e: false, simpleCalendarReborn: false, seasonsStars: false };
      
      let detectionHTML = '<div style="margin-top: 0.5em; padding: 0.5em; background: rgba(0,0,0,0.1); border-radius: 3px; font-size: 0.9em;">';
      detectionHTML += '<strong>Detected Calendar Modules:</strong><br>';
      
      if (detected.dnd5e) {
        detectionHTML += '✓ D&D 5e Calendar (available)<br>';
      } else {
        detectionHTML += '✗ D&D 5e Calendar (not detected)<br>';
      }
      
      if (detected.simpleCalendarReborn) {
        detectionHTML += '✓ Simple Calendar Reborn (available)<br>';
      } else {
        detectionHTML += '✗ Simple Calendar Reborn (not detected)<br>';
      }
      
      if (detected.seasonsStars) {
        detectionHTML += '✓ Seasons & Stars (available)';
      } else {
        detectionHTML += '✗ Seasons & Stars (not detected)';
      }
      
      detectionHTML += '</div>';
      
      hint.insertAdjacentHTML('afterend', detectionHTML);
      console.log("   ✓ Detection box added manually");
      console.log("\n   Refresh or close/reopen settings to see the detection info!");
    } else if (detectionBox) {
      console.log("\n   ✓ Detection box already exists!");
    }
  }
} else {
  console.log("   ✗ Calendar input not found in DOM");
  console.log("   Make sure you're on the 'Module Settings' tab!");
  
  // Show what settings inputs ARE available
  const allSettings = document.querySelectorAll(`[name^="${MODULE_ID}."]`);
  if (allSettings.length > 0) {
    console.log(`\n   Found ${allSettings.length} settings for ${MODULE_ID}:`);
    allSettings.forEach(input => {
      console.log(`     - ${input.name}`);
    });
  }
}

console.log("\n==================== DEBUG COMPLETE ====================");
