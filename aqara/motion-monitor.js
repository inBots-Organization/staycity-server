/*
 * Motion Sensor Real-time Monitor
 * ------------------------------
 * Monitors your motion sensors in real-time
 * Perfect for testing sensor responsiveness
 */

require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto");

const {
  REGION_DOMAIN: REGION_DOMAIN_RAW = "",
  APP_ID,
  APP_KEY,
  KEY_ID,
  ACCESS_TOKEN,
} = process.env;

const REGION_DOMAIN = (
  /^https?:\/\//i.test(REGION_DOMAIN_RAW)
    ? REGION_DOMAIN_RAW
    : `https://${REGION_DOMAIN_RAW}`
).replace(/\/$/, "");
const BASE_URL = `${REGION_DOMAIN}/v3.0/open/api`;

// Your motion sensors
const SENSORS = [
  { id: "lumi1.54ef447baa7f", name: "301m", location: "Floor 3" },
  { id: "lumi1.54ef44666843", name: "201", location: "Floor 2" }
];

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

async function getSensorData() {
  const sensorIds = SENSORS.map(s => ({ subjectId: s.id }));
  return await callApi("query.resource.value", { resources: sensorIds });
}

function parseSensorData(values, sensor) {
  const sensorValues = values.filter(v => v.subjectId === sensor.id);
  
  return {
    motion: sensorValues.find(v => v.resourceId === "3.51.85"),
    battery: sensorValues.find(v => v.resourceId === "0.4.85"),
    signal: sensorValues.find(v => v.resourceId === "8.0.2116"),
    light: sensorValues.find(v => v.resourceId === "13.27.85"),
    temperature: sensorValues.find(v => v.resourceId === "8.0.2026")
  };
}

function displayStatus(sensor, data) {
  const motion = data.motion?.value == 1 ? "🟢 MOTION" : "🔴 Clear";
  const battery = data.battery ? `${data.battery.value}%` : "N/A";
  const signal = data.signal ? `${data.signal.value}dBm` : "N/A";
  const light = data.light ? `${data.light.value}lux` : "N/A";
  const temp = data.temperature ? `${data.temperature.value}°C` : "N/A";
  
  return `🏠 ${sensor.name} (${sensor.location}) | ${motion} | 🔋${battery} | 📶${signal} | 💡${light} | 🌡️${temp}`;
}

async function monitorMotionSensors() {
  console.log("🚶 Motion Sensor Monitor Started");
  console.log("=".repeat(50));
  console.log("Press Ctrl+C to stop monitoring\n");
  
  let lastStates = {};
  
  const monitor = async () => {
    try {
      const values = await getSensorData();
      if (!values) return;
      
      console.log(`⏰ ${new Date().toLocaleTimeString()}`);
      
      SENSORS.forEach(sensor => {
        const data = parseSensorData(values, sensor);
        const status = displayStatus(sensor, data);
        console.log(status);
        
        // Detect state changes
        const currentMotion = data.motion?.value == 1;
        const lastMotion = lastStates[sensor.id];
        
        if (lastMotion !== undefined && lastMotion !== currentMotion) {
          if (currentMotion) {
            console.log(`🚨 MOTION TRIGGERED: ${sensor.name} (${sensor.location})`);
          } else {
            console.log(`😴 Motion cleared: ${sensor.name} (${sensor.location})`);
          }
        }
        
        lastStates[sensor.id] = currentMotion;
      });
      
      console.log("-".repeat(50));
      
    } catch (error) {
      console.error("Monitor error:", error.message);
    }
    
    setTimeout(monitor, 3000); // Check every 3 seconds
  };
  
  monitor();
}

// Test single read first
async function testSensors() {
  console.log("🔍 Testing sensor connectivity...");
  
  const values = await getSensorData();
  if (!values) {
    console.log("❌ Cannot connect to sensors");
    return false;
  }
  
  console.log("✅ Sensors connected successfully!\n");
  
  SENSORS.forEach(sensor => {
    const data = parseSensorData(values, sensor);
    console.log(displayStatus(sensor, data));
  });
  
  console.log();
  return true;
}

// Main execution
(async () => {
  const connected = await testSensors();
  if (connected) {
    await monitorMotionSensors();
  }
})();