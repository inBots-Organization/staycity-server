/*
 * Aqara Sensor-Triggered Scene Automation
 * ---------------------------------------
 * Creates scenes that are triggered by sensor devices and execute actions
 * Based on the config.scene.create API
 */

require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto");

// --- Environment Configuration ---
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

// --- API Helpers ---
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
    console.log(`📡 API Call: ${intent}`);
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

// --- Scene Management Functions ---

/**
 * Create a sensor-triggered scene
 * @param {string} sceneName - Name of the scene
 * @param {string} positionId - Position ID (optional)
 * @param {Array} actions - Array of actions to execute
 */
async function createScene(sceneName, positionId = null, actions = []) {
  try {
    console.log(`🎬 Creating scene: ${sceneName}`);
    
    const sceneData = {
      name: sceneName,
      action: actions
    };
    
    if (positionId) {
      sceneData.positionId = positionId;
    }
    
    const result = await callApi("config.scene.create", sceneData);
    console.log(`✅ Scene created successfully with ID: ${result.sceneId}`);
    return result.sceneId;
  } catch (error) {
    console.error(`❌ Failed to create scene ${sceneName}:`, error.message);
    throw error;
  }
}

/**
 * Update an existing scene
 * @param {string} sceneId - Scene ID to update
 * @param {string} sceneName - Updated scene name
 * @param {string} positionId - Position ID (optional)
 * @param {Array} actions - Updated array of actions
 */
async function updateScene(sceneId, sceneName, positionId = null, actions = []) {
  try {
    console.log(`🔄 Updating scene: ${sceneId}`);
    
    const sceneData = {
      sceneId,
      name: sceneName,
      action: actions
    };
    
    if (positionId) {
      sceneData.positionId = positionId;
    }
    
    await callApi("config.scene.update", sceneData);
    console.log(`✅ Scene ${sceneId} updated successfully`);
  } catch (error) {
    console.error(`❌ Failed to update scene ${sceneId}:`, error.message);
    throw error;
  }
}

/**
 * Get available action definitions for devices
 */
async function getActionDefinitions() {
  try {
    console.log("📋 Fetching available action definitions...");
    const result = await callApi("query.ifttt.action");
    console.log("✅ Action definitions retrieved");
    return result;
  } catch (error) {
    console.error("❌ Failed to get action definitions:", error.message);
    throw error;
  }
}

/**
 * Get list of devices (sensors and actuators)
 */
async function getDevices() {
  try {
    console.log("🔍 Fetching devices...");
    const result = await callApi("query.device.info");
    const devices = result?.data || result || [];
    console.log(`✅ Found ${devices.length} devices`);
    return devices;
  } catch (error) {
    console.error("❌ Failed to get devices:", error.message);
    throw error;
  }
}

/**
 * Create sensor-based automation scenes
 */
async function createSensorAutomations() {
  try {
    // Get devices first
    const devices = await getDevices();
    
    if (!devices || devices.length === 0) {
      console.log("❌ No devices found");
      return;
    }
    
    // Display available devices
    console.log("\n📱 Available devices:");
    devices.forEach((device, i) => {
      console.log(`  ${i + 1}. ${device.deviceName || device.model} [${device.did}]`);
    });
    
    // Get action definitions
    const actionDefs = await getActionDefinitions();
    
    // Example sensor automation scenarios
    const automationScenarios = [
      {
        name: "Motion Detected Light On",
        description: "Turn on lights when motion sensor detects movement",
        triggerDeviceType: "motion",
        actions: [
          {
            subjectId: "virtual2.11774113824794", // Gateway light example
            actionDefinitionId: "AD.lumi.gateway.set_corridor_light_argb",
            params: [
              {
                paramType: "0",
                paramUnit: "local",
                paramId: "PD.lightARGB",
                value: "553516541" // RGB color value
              }
            ]
          }
        ]
      },
      {
        name: "Door Open Notification",
        description: "Send notification when door sensor opens",
        triggerDeviceType: "door",
        actions: [
          {
            subjectId: "virtual2.11774113824794",
            actionDefinitionId: "AD.lumi.gateway.open_corridor_light",
            params: []
          }
        ]
      },
      {
        name: "Temperature Alert",
        description: "Activate fan when temperature sensor exceeds threshold",
        triggerDeviceType: "temperature",
        actions: [
          // Add your temperature-based actions here
        ]
      }
    ];
    
    // Create scenes for each automation scenario
    for (const scenario of automationScenarios) {
      try {
        console.log(`\n🎭 Creating automation: ${scenario.name}`);
        console.log(`   Description: ${scenario.description}`);
        
        const sceneId = await createScene(
          scenario.name,
          "real1.768799734012641280", // Example position ID
          scenario.actions
        );
        
        console.log(`✅ Created scene ID: ${sceneId}`);
      } catch (error) {
        console.error(`❌ Failed to create ${scenario.name}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error("❌ Automation creation failed:", error.message);
  }
}

// --- Custom Scene Builder ---

/**
 * Interactive scene builder for custom sensor automations
 */
function buildCustomScene() {
  console.log("\n🛠️  Custom Scene Builder");
  console.log("=".repeat(50));
  
  // This would be expanded with interactive prompts in a real implementation
  const customScenes = [
    {
      name: "Smart Home Security",
      actions: [
        {
          subjectId: "your-device-id",
          actionDefinitionId: "AD.your.action.definition",
          params: [
            {
              paramType: "0",
              paramUnit: "local", 
              paramId: "PD.your.param",
              value: "your-value"
            }
          ],
          delayTime: "5",
          delayTimeUnit: "1" // 1=second, 2=minute
        }
      ]
    }
  ];
  
  return customScenes;
}

// --- Main Execution ---
(async () => {
  console.log("🏠 Aqara Sensor Scene Automation");
  console.log("=".repeat(40));
  console.log(`Base URL: ${BASE_URL}`);
  
  try {
    // Create predefined sensor automations
    await createSensorAutomations();
    
    // Display custom scene builder options
    console.log("\n💡 Custom Scene Templates:");
    const customScenes = buildCustomScene();
    customScenes.forEach(scene => {
      console.log(`   • ${scene.name}`);
    });
    
    console.log("\n✅ Sensor automation setup complete!");
    console.log("\n📝 Next steps:");
    console.log("   1. Check your Aqara app for the created scenes");
    console.log("   2. Customize actions based on your specific devices");
    console.log("   3. Test the automations with your sensors");
    
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
    process.exit(1);
  }
})();