/*
 * Aranet Cloud API v1 - Device Query System
 * -----------------------------------------
 * Similar to Aqara device querying but for Aranet sensors
 * 
 * .env requirements:
 *   ARANET_API_KEY=uuvr6tskc5rcevb2xmd39pd3jpede7qz
 *   ARANET_BASE_URL=https://aranet.cloud/api/v1
 */

require("dotenv").config();
const axios = require("axios");

// --- Environment Configuration ---
const {
  ARANET_API_KEY = "uuvr6tskc5rcevb2xmd39pd3jpede7qz",
  ARANET_BASE_URL = "https://aranet.cloud/api/v1"
} = process.env;

if (!ARANET_API_KEY) {
  console.error("❌ Missing ARANET_API_KEY in .env file");
  console.error("Add: ARANET_API_KEY=uuvr6tskc5rcevb2xmd39pd3jpede7qz");
  process.exit(1);
}

// --- API Helper Functions ---
function buildHeaders() {
  return {
    "Content-Type": "application/json",
    "X-API-KEY": ARANET_API_KEY,
    "Accept": "application/json"
  };
}

async function callAranetApi(endpoint, params = {}) {
  const headers = buildHeaders();
  const url = `${ARANET_BASE_URL}${endpoint}`;
  
  try {
    console.log(`📡 Aranet API Call: ${endpoint}`);
    console.log(`   URL: ${url}`);
    
    const res = await axios.get(url, {
      headers,
      params,
      validateStatus: () => true,
    });
    
    console.log(`📥 Response: ${res.status}`);
    
    if (res.status !== 200) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    console.log(`   Data:`, JSON.stringify(res.data, null, 2));
    return res.data;
    
  } catch (err) {
    console.error("❌ Aranet API call failed:", err.message);
    if (err.response) {
      console.error(`   Status: ${err.response.status}`);
      console.error(`   Data:`, err.response.data);
    }
    throw err;
  }
}

// --- Device Management Functions ---

/**
 * Get list of all sensors/devices
 */
async function getSensors() {
  try {
    console.log("📋 Fetching Aranet sensors...");
    
    // Try common endpoint patterns
    const possibleEndpoints = [
      "/sensors",
      "/devices", 
      "/sensor",
      "/device"
    ];
    
    for (const endpoint of possibleEndpoints) {
      try {
        const result = await callAranetApi(endpoint);
        console.log(`✅ Found sensors at endpoint: ${endpoint}`);
        return result;
      } catch (error) {
        console.log(`⚠️ Endpoint ${endpoint} failed: ${error.message}`);
      }
    }
    
    throw new Error("Could not find sensors endpoint");
    
  } catch (error) {
    console.error("❌ Failed to get sensors:", error.message);
    return null;
  }
}

/**
 * Get sensor details by ID
 */
async function getSensorDetails(sensorId) {
  try {
    console.log(`🔍 Getting details for sensor: ${sensorId}`);
    
    const possibleEndpoints = [
      `/sensors/${sensorId}`,
      `/devices/${sensorId}`,
      `/sensor/${sensorId}`,
      `/device/${sensorId}`
    ];
    
    for (const endpoint of possibleEndpoints) {
      try {
        const result = await callAranetApi(endpoint);
        console.log(`✅ Found sensor details at: ${endpoint}`);
        return result;
      } catch (error) {
        console.log(`⚠️ Endpoint ${endpoint} failed: ${error.message}`);
      }
    }
    
    throw new Error(`Could not find details for sensor ${sensorId}`);
    
  } catch (error) {
    console.error(`❌ Failed to get sensor ${sensorId} details:`, error.message);
    return null;
  }
}

/**
 * Get current measurements for a sensor
 */
async function getSensorMeasurements(sensorId, options = {}) {
  try {
    console.log(`📊 Getting measurements for sensor: ${sensorId}`);
    
    const params = {
      // Common parameters for measurements
      limit: options.limit || 100,
      ...options
    };
    
    const possibleEndpoints = [
      `/sensors/${sensorId}/measurements`,
      `/devices/${sensorId}/measurements`,
      `/measurements`,
      `/measurements/latest`,
      `/measurements/current`
    ];
    
    for (const endpoint of possibleEndpoints) {
      try {
        const result = await callAranetApi(endpoint, 
          endpoint.includes(sensorId) ? params : { ...params, sensor_id: sensorId }
        );
        console.log(`✅ Found measurements at: ${endpoint}`);
        return result;
      } catch (error) {
        console.log(`⚠️ Measurements endpoint ${endpoint} failed: ${error.message}`);
      }
    }
    
    throw new Error(`Could not find measurements for sensor ${sensorId}`);
    
  } catch (error) {
    console.error(`❌ Failed to get measurements for sensor ${sensorId}:`, error.message);
    return null;
  }
}

/**
 * Get measurement history for a sensor
 */
async function getSensorHistory(sensorId, fromDate, toDate) {
  try {
    console.log(`📈 Getting history for sensor: ${sensorId}`);
    
    const params = {
      from: fromDate || new Date(Date.now() - 24*60*60*1000).toISOString(), // Last 24h
      to: toDate || new Date().toISOString(),
      sensor_id: sensorId
    };
    
    const possibleEndpoints = [
      "/measurements/history",
      `/sensors/${sensorId}/history`,
      `/devices/${sensorId}/history`,
      "/history"
    ];
    
    for (const endpoint of possibleEndpoints) {
      try {
        const result = await callAranetApi(endpoint, params);
        console.log(`✅ Found history at: ${endpoint}`);
        return result;
      } catch (error) {
        console.log(`⚠️ History endpoint ${endpoint} failed: ${error.message}`);
      }
    }
    
    throw new Error(`Could not find history for sensor ${sensorId}`);
    
  } catch (error) {
    console.error(`❌ Failed to get history for sensor ${sensorId}:`, error.message);
    return null;
  }
}

// --- Display Functions ---

function displaySensorInfo(sensors) {
  if (!sensors) {
    console.log("No sensor data available");
    return;
  }
  
  console.log("\n📱 Aranet Sensors:");
  console.log("=".repeat(50));
  
  // Handle different response formats
  const sensorList = sensors.data || sensors.sensors || sensors || [];
  
  if (Array.isArray(sensorList)) {
    sensorList.forEach((sensor, index) => {
      console.log(`\n${index + 1}. ${sensor.name || sensor.sensor_name || 'Unnamed Sensor'}`);
      console.log(`   ID: ${sensor.id || sensor.sensor_id || 'N/A'}`);
      console.log(`   Type: ${sensor.type || sensor.sensor_type || 'Unknown'}`);
      console.log(`   Location: ${sensor.location || sensor.room || 'N/A'}`);
      console.log(`   Status: ${sensor.status || sensor.online_status || 'Unknown'}`);
      
      if (sensor.last_measurement || sensor.latest_data) {
        const measurement = sensor.last_measurement || sensor.latest_data;
        console.log(`   Last Reading: ${measurement.timestamp || measurement.time || 'N/A'}`);
        
        // Display common measurement values
        if (measurement.temperature) console.log(`   Temperature: ${measurement.temperature}°C`);
        if (measurement.humidity) console.log(`   Humidity: ${measurement.humidity}%`);
        if (measurement.co2) console.log(`   CO2: ${measurement.co2} ppm`);
        if (measurement.pressure) console.log(`   Pressure: ${measurement.pressure} hPa`);
      }
    });
  } else {
    console.log("Sensors data structure:");
    console.log(JSON.stringify(sensorList, null, 2));
  }
}

function displayMeasurements(measurements, sensorId) {
  if (!measurements) {
    console.log(`No measurements available for sensor ${sensorId}`);
    return;
  }
  
  console.log(`\n📊 Current Measurements for Sensor ${sensorId}:`);
  console.log("=".repeat(50));
  
  const data = measurements.data || measurements.measurements || measurements || [];
  
  if (Array.isArray(data)) {
    data.slice(-10).forEach((measurement, index) => { // Show last 10
      console.log(`\n${index + 1}. ${new Date(measurement.timestamp || measurement.time).toLocaleString()}`);
      
      Object.entries(measurement).forEach(([key, value]) => {
        if (key !== 'timestamp' && key !== 'time' && key !== 'id') {
          console.log(`   ${key}: ${value} ${getUnit(key)}`);
        }
      });
    });
  } else {
    console.log("Measurements data:");
    console.log(JSON.stringify(data, null, 2));
  }
}

function getUnit(measurementType) {
  const units = {
    'temperature': '°C',
    'humidity': '%',
    'co2': 'ppm',
    'pressure': 'hPa',
    'battery': '%',
    'rssi': 'dBm'
  };
  
  return units[measurementType.toLowerCase()] || '';
}

// --- Main Execution ---
async function main() {
  console.log("🌐 Aranet Cloud API - Device Query System");
  console.log("=".repeat(50));
  console.log("Base URL:", ARANET_BASE_URL);
  console.log("API Key:", ARANET_API_KEY``);
  
  // Step 1: Validate API key format
  console.log("\n🔍 Step 1: Validating API key format...");
  const keyValidation = validateApiKey(ARANET_API_KEY);
  
  if (!keyValidation.valid) {
    console.error(`❌ ${keyValidation.message}`);
    console.log("\n💡 API Key Requirements:");
    console.log("   • Should be exactly 32 characters long");
    console.log("   • Should contain only letters and numbers");
    console.log("   • Can be generated in Aranet Cloud → Settings → API");
    return;
  }
  
  console.log(`✅ ${keyValidation.message}`);
  
  // Step 2: Test basic connectivity
  console.log("\n🔍 Step 2: Testing connectivity...");
  const isConnected = await testConnection();
  
  if (!isConnected) {
    console.log("\n💡 Connectivity issues:");
    console.log("   • Check your internet connection");
    console.log("   • Verify the base URL is correct");
    console.log("   • Check for firewall/proxy issues");
    return;
  }

  try {
    // Step 3: Attempt to get sensors with multiple auth methods
    console.log("\n🔍 Step 3: Discovering available sensors...");
    const sensors = await getSensors();
    
    if (sensors) {
      displaySensorInfo(sensors);
      
      // 4. Get details and measurements for first sensor
      const sensorList = sensors.data || sensors.sensors || sensors || [];
      
      if (Array.isArray(sensorList) && sensorList.length > 0) {
        const firstSensor = sensorList[0];
        const sensorId = firstSensor.id || firstSensor.sensor_id;
        
        if (sensorId) {
          console.log(`\n🔍 Step 4: Getting details for sensor ${sensorId}...`);
          const details = await getSensorDetails(sensorId);
          
          console.log(`\n📊 Step 5: Getting current measurements...`);
          const measurements = await getSensorMeasurements(sensorId);
          
          if (measurements) {
            displayMeasurements(measurements, sensorId);
          }
          
          console.log(`\n📈 Step 6: Getting measurement history...`);
          const history = await getSensorHistory(sensorId);
          
          if (history) {
            console.log("✅ History data retrieved (structure varies by sensor)");
            console.log("Sample history data:");
            console.log(JSON.stringify(history, null, 2).substring(0, 500) + "...");
          }
        }
      }
    }
    
    console.log("\n✅ Aranet device query completed!");
    
  } catch (error) {
    console.error("❌ Main execution failed:", error.message);
    
    // Provide troubleshooting tips
    console.log("\n💡 Troubleshooting tips:");
    console.log("   • Check your API key is correct and active");
    console.log("   • Ensure you have sensors configured in Aranet Cloud");
    console.log("   • Verify API permissions in your Aranet Cloud account");
    console.log("   • Try generating a new API key");
    console.log("   • Contact Aranet support if the issue persists");
    console.log(`   • Support email: support@aranet.com`);
  }
}

// Export functions for use in other modules
module.exports = {
  getSensors,
  getSensorDetails,
  getSensorMeasurements,
  getSensorHistory,
  callAranetApi
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}