/*
 * Test webhook server status and check for changes
 */

const axios = require("axios");

async function checkWebhookStatus() {
  try {
    console.log("🔍 Checking webhook server status...");
    const response = await axios.get("http://localhost:3000/status");
    
    console.log("✅ Webhook server status:");
    console.log(`   Sensors monitored: ${response.data.sensors}`);
    console.log(`   Changes detected: ${response.data.changes}`);
    console.log(`   Uptime: ${Math.floor(response.data.uptime)} seconds`);
    
    if (response.data.lastChange) {
      console.log(`   Last change: ${response.data.lastChange.sensor.name} - ${response.data.lastChange.parameter}`);
    }
    
  } catch (error) {
    console.error("❌ Could not connect to webhook server:", error.message);
  }
}

async function checkChanges() {
  try {
    console.log("\n📊 Getting change history...");
    const response = await axios.get("http://localhost:3000/changes");
    
    if (response.data.length === 0) {
      console.log("   No changes detected yet");
    } else {
      console.log(`   ${response.data.length} changes recorded:`);
      response.data.slice(-5).forEach(change => {
        const time = new Date(change.timestamp).toLocaleTimeString();
        console.log(`   • [${time}] ${change.sensor.name}: ${change.parameter} ${change.previousValue} → ${change.currentValue}`);
      });
    }
    
  } catch (error) {
    console.error("❌ Could not get changes:", error.message);
  }
}

// Run tests
(async () => {
  await checkWebhookStatus();
  await checkChanges();
})();