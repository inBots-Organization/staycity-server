/*
 * Aqara Open API v3.0 – Token Refresh and Authentication Fix
 * ---------------------------------------------------------
 * This script handles token refresh and fixes authentication issues
 */

require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto");
const fs = require("fs");

// --- Env --------------------------------------------------------------------
const {
  REGION_DOMAIN: REGION_DOMAIN_RAW = "",
  APP_ID,
  APP_KEY,
  KEY_ID,
  ACCESS_TOKEN,
  REFRESH_TOKEN,
  ACCOUNT,
  ACCOUNT_TYPE = "0"
} = process.env;

if (!APP_ID || !APP_KEY || !KEY_ID) {
  console.error("❌ Missing required env vars (APP_ID, APP_KEY, KEY_ID)");
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

function buildHeaders(accessToken = ACCESS_TOKEN) {
  const now = Date.now().toString();
  const n = nonce();
  const headers = {
    "Content-Type": "application/json",
    Accesstoken: accessToken,
    Appid: APP_ID,
    Keyid: KEY_ID,
    Nonce: n,
    Time: now,
    Lang: "en",
  };
  
  // Build signature string - order matters!
  const signParams = {
    Accesstoken: headers.Accesstoken,
    Appid: headers.Appid,
    Keyid: headers.Keyid,
    Nonce: headers.Nonce,
    Time: headers.Time,
  };
  
  const signStr = Object.entries(signParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&") + APP_KEY;
  
  headers.Sign = md5(signStr.toLowerCase());
  
  console.log("🔐 Auth Debug:");
  console.log("  Sign string:", signStr);
  console.log("  Sign hash:", headers.Sign);
  
  return headers;
}

async function callApi(intent, data = {}, accessToken = ACCESS_TOKEN) {
  const body = { intent, data };
  const headers = buildHeaders(accessToken);

  try {
    console.log(`📡 API Call: ${intent}`);
    console.log(`   URL: ${BASE_URL}`);
    console.log(`   Headers:`, JSON.stringify(headers, null, 2));
    console.log(`   Body:`, JSON.stringify(body, null, 2));
    
    const res = await axios.post(BASE_URL, body, {
      headers,
      validateStatus: () => true,
    });
    
    console.log(`📥 Response: ${res.status}`);
    console.log(`   Data:`, JSON.stringify(res.data, null, 2));
    
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

// Token refresh function
async function refreshAccessToken() {
  if (!REFRESH_TOKEN) {
    console.error("❌ No REFRESH_TOKEN available");
    return null;
  }
  
  try {
    console.log("🔄 Refreshing access token...");
    
    // Use refresh token to get new access token
    const result = await callApi("config.auth.refreshToken", {
      refreshToken: REFRESH_TOKEN
    });
    
    const newAccessToken = result.accessToken;
    const newRefreshToken = result.refreshToken;
    
    // Update .env file
    let envContent = fs.readFileSync(".env", "utf8");
    envContent = envContent.replace(
      /ACCESS_TOKEN=.*/,
      `ACCESS_TOKEN=${newAccessToken}`
    );
    envContent = envContent.replace(
      /REFRESH_TOKEN=.*/,
      `REFRESH_TOKEN=${newRefreshToken}`
    );
    
    fs.writeFileSync(".env", envContent);
    
    console.log("✅ Token refreshed successfully");
    console.log("   New ACCESS_TOKEN:", newAccessToken);
    
    return newAccessToken;
    
  } catch (error) {
    console.error("❌ Token refresh failed:", error.message);
    return null;
  }
}

// Alternative: Get new token via account login
async function getNewToken() {
  if (!ACCOUNT) {
    console.error("❌ No ACCOUNT specified");
    return null;
  }
  
  try {
    console.log("🔑 Getting new token via account login...");
    
    // First, get auth code (this might require manual intervention)
    console.log("📧 You may need to check your email/SMS for verification code");
    
    const result = await callApi("config.auth.getToken", {
      account: ACCOUNT,
      accountType: parseInt(ACCOUNT_TYPE),
      // authCode: "123456" // You'll need to get this from email/SMS
    });
    
    console.log("✅ New token obtained:", result);
    return result.accessToken;
    
  } catch (error) {
    console.error("❌ New token request failed:", error.message);
    return null;
  }
}

// Test current token
async function testCurrentToken() {
  try {
    console.log("🧪 Testing current token...");
    const result = await callApi("query.device.info");
    console.log("✅ Current token works!");
    return true;
  } catch (error) {
    console.log("❌ Current token failed:", error.message);
    return false;
  }
}

// --- Main -------------------------------------------------------------------
(async () => {
  console.log("🔧 Aqara Authentication Troubleshooter");
  console.log("Base URL:", BASE_URL);
  console.log("App ID:", APP_ID);
  console.log("Key ID:", KEY_ID);
  
  // Test current token first
  const currentTokenWorks = await testCurrentToken();
  
  if (!currentTokenWorks) {
    console.log("\n🔄 Attempting token refresh...");
    const newToken = await refreshAccessToken();
    
    if (newToken) {
      // Test with new token
      console.log("🧪 Testing refreshed token...");
      const refreshedTokenWorks = await testCurrentToken();
      
      if (refreshedTokenWorks) {
        console.log("✅ Token refresh successful! You can now run aqara-new.js");
      } else {
        console.log("❌ Refreshed token still doesn't work");
      }
    } else {
      console.log("❌ Token refresh failed");
      console.log("💡 You may need to:");
      console.log("   1. Check your Aqara Developer Console");
      console.log("   2. Regenerate tokens manually");
      console.log("   3. Verify your app credentials");
    }
  }
})();