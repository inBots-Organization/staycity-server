/*
 * Setup Aqara API Webhooks for Real-time Sensor Events
 * ---------------------------------------------------
 * Configure webhooks to receive real-time notifications
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
  WEBHOOK_URL = "https://open-ger.aqara.com/aqara/webhook"
} = process.env;

const REGION_DOMAIN = (
  /^https?:\/\//i.test(REGION_DOMAIN_RAW)
    ? REGION_DOMAIN_RAW
    : `https://${REGION_DOMAIN_RAW}`
).replace(/\/$/, "");
const BASE_URL = `${REGION_DOMAIN}/v3.0/open/api`;

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
    console.log(`📡 API Call: ${intent}`);
    const res = await axios.post(BASE_URL, body, {
      headers,
      validateStatus: () => true,
    });
    
    console.log(`Status: ${res.status}, Code: ${res.data?.code}`);
    
    if (res.status !== 200) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    if (res.data.code !== 0) {
      throw new Error(`Aqara API Error ${res.data.code}: ${res.data.message}`);
    }
    
    return res.data.result;
  } catch (err) {
    console.error("❌ API call failed:", err.message);
    return null;
  }
}

// Webhook management functions
async function registerWebhook() {
  console.log("📝 Registering webhook...");
  
  try {
    const result = await callApi("config.webhook.create", {
      url: WEBHOOK_URL,
      event: "device.status.change" // Listen for device status changes
    });
    
    if (result) {
      console.log("✅ Webhook registered successfully");
      console.log("Webhook ID:", result.webhookId || "Generated");
      return result;
    }
  } catch (error) {
    console.log("❌ Webhook registration failed:", error.message);
  }
  return null;
}

async function listWebhooks() {
  console.log("📋 Listing existing webhooks...");
  
  try {
    const result = await callApi("query.webhook.info");
    
    if (result && result.data) {
      console.log(`✅ Found ${result.data.length} webhooks:`);
      result.data.forEach((webhook, i) => {
        console.log(`   ${i + 1}. ID: ${webhook.webhookId}`);
        console.log(`      URL: ${webhook.url}`);
        console.log(`      Event: ${webhook.event}`);
        console.log(`      Status: ${webhook.status}`);
      });
      return result.data;
    } else {
      console.log("No webhooks found");
    }
  } catch (error) {
    console.log("❌ Could not list webhooks:", error.message);
  }
  return [];
}

async function deleteWebhook(webhookId) {
  console.log(`🗑️ Deleting webhook ${webhookId}...`);
  
  try {
    const result = await callApi("config.webhook.delete", {
      webhookId: webhookId
    });
    
    if (result !== null) {
      console.log("✅ Webhook deleted successfully");
      return true;
    }
  } catch (error) {
    console.log("❌ Webhook deletion failed:", error.message);
  }
  return false;
}

// Setup device monitoring
async function setupDeviceMonitoring() {
  console.log("🔧 Setting up device monitoring...");
  
  const sensors = [
    "lumi1.54ef447baa7f", // 301m motion sensor
    "lumi1.54ef44666843", // 201 motion sensor
    "lumi1.54ef4474a7be", // Floor 2 gateway
    "lumi1.54ef447e68c6"  // Floor 3 gateway
  ];
  
  for (const deviceId of sensors) {
    try {
      console.log(`📱 Setting up monitoring for ${deviceId}...`);
      
      // Try to subscribe to device events
      const result = await callApi("config.device.subscribe", {
        subjectId: deviceId,
        event: ["status.change", "online.change"]
      });
      
      if (result) {
        console.log(`✅ Monitoring enabled for ${deviceId}`);
      }
    } catch (error) {
      console.log(`❌ Could not setup monitoring for ${deviceId}: ${error.message}`);
    }
  }
}

// Test webhook connectivity
async function testWebhookConnectivity() {
  console.log("🧪 Testing webhook connectivity...");
  
  try {
    // Try to ping our local webhook server
    const response = await axios.get("http://localhost:3000/status", {
      timeout: 5000
    });
    
    console.log("✅ Local webhook server is accessible");
    console.log(`   Monitoring ${response.data.sensors} sensors`);
    console.log(`   ${response.data.changes} changes detected`);
    
    return true;
  } catch (error) {
    console.log("❌ Local webhook server not accessible:", error.message);
    return false;
  }
}

// Main setup process
async function setupWebhooks() {
  console.log("🔗 Aqara Webhook Setup");
  console.log("=".repeat(30));
  console.log(`Target webhook URL: ${WEBHOOK_URL}`);
  console.log(`Base API URL: ${BASE_URL}\n`);
  
  // Test local webhook server first
  const localServerRunning = await testWebhookConnectivity();
  if (!localServerRunning) {
    console.log("⚠️ Local webhook server is not running");
    console.log("Please run: node webhook-sensor-detector.js");
    return;
  }
  
  // List existing webhooks
  const existingWebhooks = await listWebhooks();
  
  // Clean up existing webhooks if needed
  if (existingWebhooks.length > 0) {
    console.log("\n🧹 Cleaning up existing webhooks...");
    for (const webhook of existingWebhooks) {
      await deleteWebhook(webhook.webhookId);
    }
  }
  
  // Register new webhook
  console.log("\n📝 Registering new webhook...");
  const webhookResult = await registerWebhook();
  
  if (webhookResult) {
    console.log("\n🔧 Setting up device monitoring...");
    await setupDeviceMonitoring();
    
    console.log("\n✅ Webhook setup complete!");
    console.log("🎉 Your sensors will now send real-time notifications");
    console.log("\n💡 Next steps:");
    console.log("   • Walk near your motion sensors to test");
    console.log("   • Check http://localhost:3000/changes for updates");
    console.log("   • Monitor the console output for real-time events");
  } else {
    console.log("\n❌ Webhook setup failed");
    console.log("💡 Note: Some Aqara API endpoints may not be available");
    console.log("   Your polling-based change detection is still working!");
  }
}

// Run setup
setupWebhooks().catch(console.error);