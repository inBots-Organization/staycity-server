/*
 * Aqara Sensor System Summary
 * ---------------------------
 * Complete overview of your sensor detection system
 */

const axios = require("axios");

async function showSystemSummary() {
  console.log("🏠 Aqara Sensor Detection System Summary");
  console.log("=".repeat(50));
  
  try {
    // Get status from webhook server
    const status = await axios.get("http://localhost:3000/status");
    const changes = await axios.get("http://localhost:3000/changes");
    
    // System info
    console.log("📊 System Status:");
    console.log(`   ✅ Webhook server: Running`);
    console.log(`   👁️  Sensors monitored: ${status.data.sensors}`);
    console.log(`   ⏱️  Uptime: ${Math.floor(status.data.uptime)} seconds`);
    console.log(`   🔄 Total changes detected: ${status.data.changes}`);
    
    // Sensors configured
    console.log("\n📱 Configured Sensors:");
    console.log("   • 301m (Motion) - Floor 3 [lumi1.54ef447baa7f]");
    console.log("   • 201 (Motion) - Floor 2 [lumi1.54ef44666843]");
    console.log("   • Exch Floor 2 (Gateway) [lumi1.54ef4474a7be]");
    console.log("   • Exch Floor 3 (Gateway) [lumi1.54ef447e68c6]");
    
    // Change analysis
    if (changes.data.length > 0) {
      console.log("\n📈 Change Analysis:");
      
      // Count changes by sensor
      const changeBySensor = {};
      const changeByType = {};
      
      changes.data.forEach(change => {
        const sensorName = change.sensor.name;
        const paramType = change.parameter;
        
        changeBySensor[sensorName] = (changeBySensor[sensorName] || 0) + 1;
        changeByType[paramType] = (changeByType[paramType] || 0) + 1;
      });
      
      console.log("   By Sensor:");
      Object.entries(changeBySensor).forEach(([sensor, count]) => {
        console.log(`     • ${sensor}: ${count} changes`);
      });
      
      console.log("   By Type:");
      Object.entries(changeByType).forEach(([type, count]) => {
        console.log(`     • ${type}: ${count} changes`);
      });
      
      // Recent changes
      console.log("\n📝 Recent Changes (last 5):");
      changes.data.slice(-5).forEach(change => {
        const time = new Date(change.timestamp).toLocaleTimeString();
        const arrow = change.parameter === 'motion' ? 
          (change.currentValue == 1 ? '🟢 DETECTED' : '🔴 CLEARED') : 
          `${change.previousValue} → ${change.currentValue}`;
        
        console.log(`   • [${time}] ${change.sensor.name} (${change.sensor.location})`);
        console.log(`     ${change.parameter}: ${arrow}`);
      });
    } else {
      console.log("\n📝 No changes detected yet");
      console.log("   💡 Walk near your sensors to test detection");
    }
    
    // Capabilities
    console.log("\n🔧 System Capabilities:");
    console.log("   ✅ Real-time motion detection");
    console.log("   ✅ Battery level monitoring");
    console.log("   ✅ Signal strength tracking");
    console.log("   ✅ Light level detection");
    console.log("   ✅ Temperature monitoring");
    console.log("   ✅ Online status tracking");
    console.log("   ✅ Change history logging");
    console.log("   ✅ Web API for status/changes");
    console.log("   ✅ Automatic scene triggering (when configured)");
    
    // API endpoints
    console.log("\n🌐 Available Endpoints:");
    console.log("   • http://localhost:3000/status - System status");
    console.log("   • http://localhost:3000/changes - Change history");
    console.log("   • http://localhost:3000/webhook - Webhook receiver");
    
    // Instructions
    console.log("\n🎯 Testing Instructions:");
    console.log("   1. Walk in front of motion sensor '301m' (Floor 3)");
    console.log("   2. Walk in front of motion sensor '201' (Floor 2)");
    console.log("   3. Check for motion state changes in the logs");
    console.log("   4. Battery levels may fluctuate (normal behavior)");
    
    // Notes
    console.log("\n📝 Notes:");
    console.log("   • System polls sensors every 2 seconds");
    console.log("   • Change history is kept in memory (last 100 changes)");
    console.log("   • Press Ctrl+C in the webhook server to save changes to file");
    console.log("   • Webhook registration failed (API permissions), but polling works perfectly");
    
  } catch (error) {
    console.log("❌ Could not connect to webhook server");
    console.log("💡 Make sure to run: node webhook-sensor-detector.js");
  }
}

// Run summary
showSystemSummary();