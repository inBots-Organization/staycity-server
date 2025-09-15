/*
 * Aqara Webhook-Based Sensor Change Detection System
 * -------------------------------------------------
 * Real-time sensor monitoring with webhook integration
 * Detects ALL sensor changes and triggers automated responses
 */

require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto");
const express = require("express");
const fs = require("fs");

// Configuration from .env
const {
  REGION_DOMAIN: REGION_DOMAIN_RAW = "",
  APP_ID,
  APP_KEY,
  KEY_ID,
  ACCESS_TOKEN,
  WEBHOOK_URL = "https://open-ger.aqara.com/aqara/webhook",
  PORT = 3000
} = process.env;

const REGION_DOMAIN = (
  /^https?:\/\//i.test(REGION_DOMAIN_RAW)
    ? REGION_DOMAIN_RAW
    : `https://${REGION_DOMAIN_RAW}`
).replace(/\/$/, "");
const BASE_URL = `${REGION_DOMAIN}/v3.0/open/api`;

// Motion sensors configuration
const SENSORS = {
  motion_301: {
    id: "lumi1.54ef447baa7f",
    name: "301m",
    location: "Floor 3",
    type: "motion"
  },
  motion_201: {
    id: "lumi1.54ef44666843", 
    name: "201",
    location: "Floor 2",
    type: "motion"
  },
  gateway_floor2: {
    id: "lumi1.54ef4474a7be",
    name: "Exch Floor 2",
    location: "Floor 2",
    type: "gateway"
  },
  gateway_floor3: {
    id: "lumi1.54ef447e68c6",
    name: "Exch Floor 3",
    location: "Floor 3", 
    type: "gateway"
  }
};

// Change detection state
let previousStates = {};
let changeLog = [];

// API helpers
const nonce = () => crypto.randomBytes(8).toString("hex");
const md5 = (s) => crypto.createHash("md5").update(s).digest("hex");

function buildHeaders() {
  const now = Date.now().toString();
  const n = nonce();
  const headers = {
    "Content-Type": "application/json",
    Accesstoken: ACCESS_TOKEN,
    Appid: APP_ID,
    Keyid: KEY_ID,
    Nonce: n,
    Time: now,
    Lang: "en",
  };
  
  const signStr =
    Object.entries({
      Accesstoken: headers.Accesstoken,
      Appid: headers.Appid,
      Keyid: headers.Keyid,
      Nonce: headers.Nonce,
      Time: headers.Time,
    })
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("&") + APP_KEY;
  headers.Sign = md5(signStr.toLowerCase());
  
  return headers;
}

async function callApi(intent, data = {}) {
  const body = { intent, data };
  const headers = buildHeaders();

  try {
    const res = await axios.post(BASE_URL, body, {
      headers,
      validateStatus: () => true,
    });
    
    if (res.status !== 200 || res.data.code !== 0) {
      throw new Error(`API Error ${res.data.code}: ${res.data.message}`);
    }
    
    return res.data.result;
  } catch (err) {
    console.error("❌ API Error:", err.message);
    return null;
  }
}

// Scene management functions
async function runScene(sceneId) {
  try {
    console.log(`🎬 Running scene: ${sceneId}`);
    await callApi("config.scene.run", { sceneId });
    console.log(`✅ Scene ${sceneId} executed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to run scene ${sceneId}:`, error.message);
    return false;
  }
}

async function createSimpleScene(name, subjectId, actionId, params = []) {
  try {
    const sceneData = {
      name: name,
      action: [{
        subjectId: subjectId,
        actionDefinitionId: actionId,
        params: params
      }]
    };
    
    const result = await callApi("config.scene.create", sceneData);
    if (result?.sceneId) {
      console.log(`✅ Created scene "${name}" with ID: ${result.sceneId}`);
      return result.sceneId;
    }
  } catch (error) {
    console.error(`❌ Failed to create scene "${name}":`, error.message);
  }
  return null;
}

// Enhanced sensor data parsing
function parseSensorData(values, sensorId) {
  const sensorValues = values.filter(v => v.subjectId === sensorId);
  
  const data = {
    motion: sensorValues.find(v => v.resourceId === "3.51.85"), // Motion detected
    battery: sensorValues.find(v => v.resourceId === "0.4.85"), // Battery level
    signal: sensorValues.find(v => v.resourceId === "8.0.2116"), // RSSI
    light: sensorValues.find(v => v.resourceId === "13.27.85"), // Light level
    temperature: sensorValues.find(v => v.resourceId === "8.0.2026"), // Temperature
    occupancy: sensorValues.find(v => v.resourceId === "4.22.85"), // Occupancy
    doorWindow: sensorValues.find(v => v.resourceId === "0.9.85"), // Door/Window state
    vibration: sensorValues.find(v => v.resourceId === "4.75.85"), // Vibration
    onlineStatus: sensorValues.find(v => v.resourceId === "8.0.2045") // Online status
  };
  
  return data;
}

// Change detection engine
function detectChanges(currentData, sensorConfig) {
  const changes = [];
  const sensorId = sensorConfig.id;
  const previousData = previousStates[sensorId] || {};
  
  // Check each sensor parameter for changes
  Object.keys(currentData).forEach(param => {
    const current = currentData[param];
    const previous = previousData[param];
    
    if (current && current.value !== undefined) {
      const currentValue = current.value;
      const previousValue = previous?.value;
      
      if (previousValue !== undefined && currentValue !== previousValue) {
        const change = {
          sensor: sensorConfig,
          parameter: param,
          previousValue,
          currentValue,
          timestamp: new Date().toISOString(),
          resourceId: current.resourceId
        };
        
        changes.push(change);
        
        // Log critical changes
        if (param === 'motion') {
          const motionState = currentValue == 1 ? 'DETECTED' : 'CLEARED';
          console.log(`🚨 MOTION ${motionState}: ${sensorConfig.name} (${sensorConfig.location})`);
        } else if (param === 'doorWindow') {
          const doorState = currentValue == 1 ? 'OPEN' : 'CLOSED';
          console.log(`🚪 DOOR ${doorState}: ${sensorConfig.name} (${sensorConfig.location})`);
        } else if (param === 'battery' && Math.abs(currentValue - previousValue) > 5) {
          console.log(`🔋 BATTERY CHANGE: ${sensorConfig.name} ${previousValue}% → ${currentValue}%`);
        }
      }
    }
  });
  
  // Update previous states
  previousStates[sensorId] = currentData;
  
  return changes;
}

// Process sensor changes and trigger automations
async function processSensorChanges(changes) {
  for (const change of changes) {
    // Log the change
    changeLog.push(change);
    
    // Trigger specific automations based on change type
    await triggerAutomation(change);
  }
  
  // Keep only last 100 changes in memory
  if (changeLog.length > 100) {
    changeLog = changeLog.slice(-100);
  }
}

// Automation trigger logic
async function triggerAutomation(change) {
  const { sensor, parameter, currentValue } = change;
  
  try {
    // Motion detection automations
    if (parameter === 'motion' && currentValue == 1) {
      console.log(`🤖 AUTOMATION: Motion detected on ${sensor.name}`);
      
      // Example: Try to run a light scene for the corresponding gateway
      if (sensor.location === "Floor 2") {
        // Could trigger gateway light on Floor 2
        console.log(`💡 Would trigger Floor 2 gateway light`);
      } else if (sensor.location === "Floor 3") {
        // Could trigger gateway light on Floor 3
        console.log(`💡 Would trigger Floor 3 gateway light`);
      }
    }
    
    // Battery level automations
    if (parameter === 'battery' && currentValue < 20) {
      console.log(`⚠️ LOW BATTERY ALERT: ${sensor.name} at ${currentValue}%`);
    }
    
    // Door/Window automations
    if (parameter === 'doorWindow' && currentValue == 1) {
      console.log(`🚪 SECURITY: Door/Window opened on ${sensor.name}`);
    }
    
    // Temperature alerts
    if (parameter === 'temperature' && (currentValue > 30 || currentValue < 10)) {
      console.log(`🌡️ TEMPERATURE ALERT: ${sensor.name} at ${currentValue}°C`);
    }
    
  } catch (error) {
    console.error(`❌ Automation error for ${sensor.name}:`, error.message);
  }
}

// Main sensor monitoring loop
async function monitorSensors() {
  try {
    const sensorIds = Object.values(SENSORS).map(s => ({ subjectId: s.id }));
    const values = await callApi("query.resource.value", { resources: sensorIds });
    
    if (!values) return;
    
    const allChanges = [];
    
    // Check each sensor for changes
    Object.values(SENSORS).forEach(sensorConfig => {
      const currentData = parseSensorData(values, sensorConfig.id);
      const changes = detectChanges(currentData, sensorConfig);
      allChanges.push(...changes);
    });
    
    // Process any detected changes
    if (allChanges.length > 0) {
      console.log(`\n📊 ${allChanges.length} changes detected at ${new Date().toLocaleTimeString()}`);
      await processSensorChanges(allChanges);
      console.log("-".repeat(50));
    }
    
  } catch (error) {
    console.error("Monitor error:", error.message);
  }
}

// Webhook server for real-time events
function setupWebhookServer() {
  const app = express();
  app.use(express.json());
  
  // Webhook endpoint for Aqara events
  app.post('/webhook', (req, res) => {
    console.log('\n🔔 Webhook received:', req.body);
    
    // Process webhook data
    if (req.body && req.body.data) {
      console.log('📦 Webhook data:', JSON.stringify(req.body.data, null, 2));
    }
    
    res.status(200).send('OK');
  });
  
  // Status endpoint
  app.get('/status', (req, res) => {
    res.json({
      sensors: Object.keys(SENSORS).length,
      changes: changeLog.length,
      lastChange: changeLog[changeLog.length - 1],
      uptime: process.uptime()
    });
  });
  
  // Changes history endpoint
  app.get('/changes', (req, res) => {
    res.json(changeLog);
  });
  
  app.listen(PORT, () => {
    console.log(`🌐 Webhook server running on http://localhost:${PORT}`);
    console.log(`   Status: http://localhost:${PORT}/status`);
    console.log(`   Changes: http://localhost:${PORT}/changes`);
  });
}

// Initialize and start monitoring
async function initialize() {
  console.log("🚀 Aqara Webhook Sensor Change Detection System");
  console.log("=".repeat(60));
  console.log(`📡 Base URL: ${BASE_URL}`);
  console.log(`🔗 Webhook URL: ${WEBHOOK_URL}`);
  console.log(`👁️  Monitoring ${Object.keys(SENSORS).length} sensors`);
  
  // Display sensors
  console.log("\n📱 Configured Sensors:");
  Object.values(SENSORS).forEach(sensor => {
    console.log(`   • ${sensor.name} (${sensor.type}) - ${sensor.location} [${sensor.id}]`);
  });
  
  // Initialize states with first read
  console.log("\n🔍 Initializing sensor states...");
  await monitorSensors();
  console.log("✅ Initial states loaded");
  
  // Setup webhook server
  setupWebhookServer();
  
  // Start monitoring loop
  console.log("\n👀 Starting continuous monitoring (every 2 seconds)...");
  console.log("Walk near your sensors to test change detection!\n");
  
  setInterval(monitorSensors, 2000); // Monitor every 2 seconds
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down sensor monitoring...');
  console.log(`📊 Total changes detected: ${changeLog.length}`);
  
  // Save change log to file
  if (changeLog.length > 0) {
    fs.writeFileSync('sensor-changes.json', JSON.stringify(changeLog, null, 2));
    console.log('💾 Change log saved to sensor-changes.json');
  }
  
  process.exit(0);
});

// Start the system
initialize().catch(console.error);