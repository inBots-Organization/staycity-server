/*
 * Aqara Open API v3.0 – device listing + value fetch
 * --------------------------------------------------
 * .env requirements (same as before):
 *   REGION_DOMAIN=https://open-ger.aqara.com   # or without protocol
 *   APP_ID=138794703004083814426ba5
 *   APP_KEY=<YOUR_APP_KEY>
 *   KEY_ID=K.1387947030166667268
 *   ACCESS_TOKEN=<YOUR_ACCESS_TOKEN>
 *
 * Run: npm install axios dotenv crypto
 *      node aqara-new.js
 */

require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto");

// --- Env --------------------------------------------------------------------
const {
  REGION_DOMAIN: REGION_DOMAIN_RAW = "",
  APP_ID,
  APP_KEY,
  KEY_ID,
  ACCESS_TOKEN,
} = process.env;
if (!APP_ID || !APP_KEY || !KEY_ID || !ACCESS_TOKEN) {
  console.error(
    "❌ Missing one or more required env vars. Check your .env file."
  );
  process.exit(1);
}

// Ensure protocol + no trailing slash
const REGION_DOMAIN = (
  /^https?:\/\//i.test(REGION_DOMAIN_RAW)
    ? REGION_DOMAIN_RAW
    : `https://${REGION_DOMAIN_RAW}`
).replace(/\/$/, "");
const BASE_URL = `${REGION_DOMAIN}/v3.0/open/api`;

// --- Helpers ----------------------------------------------------------------
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
  
  // Fix: Use full KEY_ID in signature (keep K. prefix)
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
  
  console.log("🔐 Debug - Sign string:", signStr);
  console.log("🔐 Debug - Sign hash:", headers.Sign);
  
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
    if (res.status !== 200) throw new Error(`${res.status} ${res.statusText}`);
    if (res.data.code !== 0)
      throw new Error(`Aqara API Error ${res.data.code}: ${res.data.message}`);
    return res.data.result; // return the juicy part directly
  } catch (err) {
    console.error("❌ API call failed:", err.message);
    throw err;
  }
}

// --- Main -------------------------------------------------------------------
(async () => {
  console.log("Testing API connection…");
  console.log("Base URL:", BASE_URL);

  // 1. List devices
  try {
    console.log("\n📋 Fetching devices...");
    const result = await callApi("query.device.info");
    console.log("Raw result:", JSON.stringify(result, null, 2));
    
    const devices = result?.data || result || [];
    console.log(`Found ${devices.length || 0} devices:`);
    
    if (Array.isArray(devices) && devices.length > 0) {
      devices.forEach((device, i) => {
        console.log(`  ${i + 1}. ${device.deviceName || device.model} [${device.did}]`);
      });
    } else {
      console.log("No devices found or unexpected response format");
    }

    // 2. Get current values
    if (devices.length > 0) {
      console.log("\n📈 Fetching current values...");
      const values = await callApi("query.resource.value", {
        resources: devices.map(d => ({ subjectId: d.did }))
      });
      
      console.log("\n📈 Current Values (latest snapshot):\n");
      values.forEach(({ subjectId, resourceId, value, timeStamp }) => {
        const device = devices.find((d) => d.did === subjectId);
        const name = device ? device.deviceName || device.model : "Unknown";
        const ts = new Date(timeStamp).toLocaleString();
        console.log(
          `▶ ${name} [${subjectId}]  |  ${resourceId} = ${value} @ ${ts}`
        );
      });
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
})();