/*
 * Check Available Actions for Aqara Devices
 * -----------------------------------------
 * Discover what actions are available for scene automation
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
    console.log(`📡 Calling: ${intent}`);
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

(async () => {
  console.log("🔍 Checking Available Actions for Scene Creation");
  console.log("=".repeat(50));
  
  try {
    // Get available action definitions
    console.log("\n📋 Getting action definitions...");
    const actions = await callApi("query.ifttt.action");
    console.log("✅ Actions retrieved");
    console.log(JSON.stringify(actions, null, 2));
    
  } catch (error) {
    console.log("❌ Could not get action definitions:", error.message);
  }
  
  try {
    // Get scene list to see what exists
    console.log("\n📋 Getting existing scenes...");
    const scenes = await callApi("query.scene.info");
    console.log("✅ Scenes retrieved");
    console.log(JSON.stringify(scenes, null, 2));
    
  } catch (error) {
    console.log("❌ Could not get scenes:", error.message);
  }
  
  try {
    // Get positions
    console.log("\n📋 Getting positions...");
    const positions = await callApi("query.position.info");
    console.log("✅ Positions retrieved");
    console.log(JSON.stringify(positions, null, 2));
    
  } catch (error) {
    console.log("❌ Could not get positions:", error.message);
  }
})();