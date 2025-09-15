/*
 * Aqara Motion Sensor Real-time Test
 * ----------------------------------
 * Tests motion sensors: 301m and 201
 * Monitors motion detection and creates test scenes
 */

require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto");

// Environment setup
const {
  REGION_DOMAIN: REGION_DOMAIN_RAW = "",
  APP_ID,
  APP_KEY,
  KEY_ID,
  ACCESS_TOKEN,
} = process.env;

if (!APP_ID || !APP_KEY || !KEY_ID || !ACCESS_TOKEN) {
  console.error("❌ Missing required environment variables");
  process.exit(1);
}

const REGION_DOMAIN = (
  /^https?:\/\//i.test(REGION_DOMAIN_RAW)
    ? REGION_DOMAIN_RAW
    : `https://${REGION_DOMAIN_RAW}`
).replace(/\/$/, "");
const BASE_URL = `${REGION_DOMAIN}/v3.0/open/api`;

// Your motion sensors
const SENSORS = {
  motion_301: {
    id: "lumi1.54ef447baa7f",
    name: "301m",
    location: "Floor 3"
  },
  motion_201: {
    id: "lumi1.54ef44666843", 
    name: "201",
    location: "Floor 2"
  }
};

// Helper functions
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
    
    if (res.status !== 200) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    if (res.data.code !== 0) {
      throw new Error(`Aqara API Error ${res.data.code}: ${res.data.message}`);
    }
    
    return res.data.result;
  } catch (err) {
    console.error("❌ API call failed:", err.message);
    throw err;
  }
}

// Test motion sensors
async function testMotionSensors() {
  console.log("🏃 Testing Motion Sensors");
  console.log("=".repeat(40));
  
  try {
    const sensorIds = Object.values(SENSORS).map(s => ({ subjectId: s.id }));
    const values = await callApi("query.resource.value", {
      resources: sensorIds
    });
    
    console.log("\n📊 Current Sensor Status:");
    Object.values(SENSORS).forEach(sensor => {
      console.log(`\n🚪 ${sensor.name} (${sensor.location}):`);
      console.log(`   Device ID: ${sensor.id}`);
      
      // Filter values for this sensor
      const sensorValues = values.filter(v => v.subjectId === sensor.id);
      
      // Key motion-related resources
      const motionDetected = sensorValues.find(v => v.resourceId === "3.51.85");
      const batteryLevel = sensorValues.find(v => v.resourceId === "0.4.85");
      const rssi = sensorValues.find(v => v.resourceId === "8.0.2116");
      const luxLevel = sensorValues.find(v => v.resourceId === "13.27.85");
      
      if (motionDetected) {
        const isMotion = motionDetected.value == 1;
        console.log(`   🚶 Motion: ${isMotion ? '🟢 DETECTED' : '🔴 Clear'} @ ${new Date(motionDetected.timeStamp).toLocaleString()}`);
      }
      
      if (batteryLevel) {
        console.log(`   🔋 Battery: ${batteryLevel.value}%`);
      }
      
      if (rssi) {
        console.log(`   📶 Signal: ${rssi.value} dBm`);
      }
      
      if (luxLevel) {
        console.log(`   💡 Light: ${luxLevel.value} lux`);
      }
    });
    
  } catch (error) {
    console.error("❌ Sensor test failed:", error.message);
  }
}

// Create test scene for motion detection
async function createMotionTestScene() {
  console.log("\n🎬 Creating Motion Test Scene");
  
  try {
    const sceneData = {
      name: "Motion Sensor Test - Light Control",
      positionId: "real2.1411249688341331968", // Using position from your devices
      action: [
        {
          subjectId: "lumi1.54ef4474a7be", // Gateway Floor 2
          actionDefinitionId: "AD.lumi.gateway.set_corridor_light_argb",
          params: [
            {
              paramType: "0",
              paramUnit: "local",
              paramId: "PD.lightARGB",
              value: "16711680" // Red color when motion detected
            }
          ]
        }
      ]
    };
    
    const result = await callApi("config.scene.create", sceneData);
    console.log(`✅ Test scene created with ID: ${result.sceneId}`);
    
    // Create second scene for motion clear
    const sceneClearData = {
      name: "Motion Sensor Test - Light Off",
      positionId: "real2.1411249688341331968",
      action: [
        {
          subjectId: "lumi1.54ef4474a7be",
          actionDefinitionId: "AD.lumi.gateway.open_corridor_light",
          params: []
        }
      ]
    };
    
    const result2 = await callApi("config.scene.create", sceneClearData);
    console.log(`✅ Clear scene created with ID: ${result2.sceneId}`);
    
    return [result.sceneId, result2.sceneId];
    
  } catch (error) {
    console.error("❌ Scene creation failed:", error.message);
    return null;
  }
}

// Monitor sensors continuously
async function monitorSensors(duration = 60000) {
  console.log(`\n👀 Monitoring sensors for ${duration/1000} seconds...`);
  console.log("Walk in front of your motion sensors to test!");
  
  let lastMotionState = {};
  
  const monitor = setInterval(async () => {
    try {
      const sensorIds = Object.values(SENSORS).map(s => ({ subjectId: s.id }));
      const values = await callApi("query.resource.value", {
        resources: sensorIds
      });
      
      Object.values(SENSORS).forEach(sensor => {
        const sensorValues = values.filter(v => v.subjectId === sensor.id);
        const motionDetected = sensorValues.find(v => v.resourceId === "3.51.85");
        
        if (motionDetected) {
          const isMotion = motionDetected.value == 1;
          const stateChanged = lastMotionState[sensor.id] !== isMotion;
          
          if (stateChanged) {
            const timestamp = new Date().toLocaleTimeString();
            if (isMotion) {
              console.log(`🚶 [${timestamp}] MOTION DETECTED on ${sensor.name} (${sensor.location})!`);
            } else {
              console.log(`😴 [${timestamp}] Motion cleared on ${sensor.name} (${sensor.location})`);
            }
            lastMotionState[sensor.id] = isMotion;
          }
        }
      });
      
    } catch (error) {
      console.error("❌ Monitor error:", error.message);
    }
  }, 2000); // Check every 2 seconds
  
  setTimeout(() => {
    clearInterval(monitor);
    console.log("\n✅ Monitoring complete!");
  }, duration);
}

// Main execution
(async () => {
  console.log("🔍 Aqara Motion Sensor Test");
  console.log("=".repeat(30));
  
  try {
    // Test current sensor states
    await testMotionSensors();
    
    // Create test scenes
    const sceneIds = await createMotionTestScene();
    
    if (sceneIds) {
      console.log("\n📱 Test scenes created! Check your Aqara app.");
      console.log("   You can manually trigger these scenes to test automation");
    }
    
    // Start monitoring
    await monitorSensors(30000); // Monitor for 30 seconds
    
    console.log("\n💡 Tips:");
    console.log("   • Walk in front of sensors to trigger motion");
    console.log("   • Check the Aqara app for scene automation");
    console.log("   • Motion sensors typically have a cool-down period");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
})();