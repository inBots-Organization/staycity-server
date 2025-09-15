/*
 * Aranet API Test - Override Example Key Check
 * ===========================================
 * Test your actual Aranet API key without the example key validation
 */

require("dotenv").config();
const axios = require("axios");

// Configuration
const {
  ARANET_API_KEY = "uuvr6tskc5rcevb2xmd39pd3jpede7qz",
  ARANET_BASE_URL = "https://aranet.cloud/api/v1"
} = process.env;

console.log("🔍 Aranet API Direct Test");
console.log("=".repeat(50));
console.log(`API Key: ${ARANET_API_KEY.substring(0, 8)}...${ARANET_API_KEY.substring(-4)}`);
console.log(`Base URL: ${ARANET_BASE_URL}`);

// Build headers for different auth methods
function buildAuthHeaders(method, apiKey) {
  const base = {
    "User-Agent": "Aranet-Test/1.0",
    "Accept": "application/json"
  };

  switch (method) {
    case 'X-API-KEY':
      return { ...base, "X-API-KEY": apiKey };
    case 'Authorization-Bearer':
      return { ...base, "Authorization": `Bearer ${apiKey}` };
    case 'Authorization-ApiKey':
      return { ...base, "Authorization": `ApiKey ${apiKey}` };
    default:
      return { ...base, "X-API-KEY": apiKey };
  }
}

// Test authentication methods
async function testAllMethods() {
  console.log("\n🔐 Testing Authentication Methods");
  console.log("=".repeat(40));
  
  const authMethods = ['X-API-KEY', 'Authorization-Bearer', 'Authorization-ApiKey'];
  const testEndpoints = ['/sensors', '/devices', '/sensor', '/device'];
  
  for (const method of authMethods) {
    console.log(`\n🧪 Testing: ${method}`);
    
    for (const endpoint of testEndpoints) {
      try {
        const headers = buildAuthHeaders(method, ARANET_API_KEY);
        console.log(`   Trying: ${endpoint}`);
        console.log(`   Headers:`, JSON.stringify(headers, null, 4));
        
        const response = await axios.get(`${ARANET_BASE_URL}${endpoint}`, {
          headers,
          timeout: 15000,
          validateStatus: () => true
        });
        
        console.log(`   Response: ${response.status}`);
        
        if (response.status === 200) {
          console.log(`   ✅ SUCCESS: ${endpoint} with ${method}`);
          console.log(`   Data:`, JSON.stringify(response.data, null, 2));
          return { method, endpoint, success: true, data: response.data };
        } else if (response.status === 401) {
          console.log(`   ❌ AUTH FAILED: ${response.status} - ${response.statusText}`);
          if (response.data) {
            console.log(`   Error details:`, response.data);
          }
        } else if (response.status === 404) {
          console.log(`   📍 NOT FOUND: ${response.status} - endpoint doesn't exist`);
        } else if (response.status === 403) {
          console.log(`   🚫 FORBIDDEN: ${response.status} - no permission`);
        } else {
          console.log(`   ⚠️  OTHER: ${response.status} - ${response.statusText}`);
          if (response.data) {
            console.log(`   Details:`, response.data);
          }
        }
        
      } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
        if (error.response) {
          console.log(`   Status: ${error.response.status}`);
          console.log(`   Data:`, error.response.data);
        }
      }
    }
  }
  
  return { success: false };
}

// Test different base URLs
async function testAlternativeUrls() {
  console.log("\n🌐 Testing Alternative URLs");
  console.log("=".repeat(40));
  
  const urls = [
    "https://aranet.cloud/api/v1",
    "https://aranet.cloud/api",
    "https://api.aranet.cloud/v1", 
    "https://api.aranet.cloud",
    "https://aranet.cloud/v1",
    "https://cloud.aranet.com/api/v1"
  ];
  
  for (const url of urls) {
    console.log(`\n🧪 Testing URL: ${url}`);
    
    try {
      const response = await axios.get(`${url}/sensors`, {
        headers: buildAuthHeaders('X-API-KEY', ARANET_API_KEY),
        timeout: 10000,
        validateStatus: () => true
      });
      
      console.log(`   Status: ${response.status}`);
      
      if (response.status === 200) {
        console.log(`   ✅ WORKING URL FOUND: ${url}`);
        console.log(`   Data:`, JSON.stringify(response.data, null, 2));
        return url;
      } else if (response.status === 401) {
        console.log(`   🔐 API exists but auth failed`);
      }
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
  }
  
  return null;
}

// Manual curl test commands
function showCurlCommands() {
  console.log("\n📋 Manual Test Commands");
  console.log("=".repeat(40));
  console.log("Copy and paste these in your terminal:");
  
  console.log(`\n1. X-API-KEY method:`);
  console.log(`curl -v -H "X-API-KEY: ${ARANET_API_KEY}" "${ARANET_BASE_URL}/sensors"`);
  
  console.log(`\n2. Authorization Bearer method:`);
  console.log(`curl -v -H "Authorization: Bearer ${ARANET_API_KEY}" "${ARANET_BASE_URL}/sensors"`);
  
  console.log(`\n3. Test basic connectivity:`);
  console.log(`curl -v "${ARANET_BASE_URL}"`);
  
  console.log(`\n4. Test with different endpoint:`);
  console.log(`curl -v -H "X-API-KEY: ${ARANET_API_KEY}" "${ARANET_BASE_URL}/devices"`);
}

// Main test function
async function runTest() {
  try {
    // Test basic connectivity first
    console.log("\n🔗 Testing Basic Connectivity");
    console.log("=".repeat(40));
    
    const baseResponse = await axios.get(ARANET_BASE_URL, {
      timeout: 10000,
      validateStatus: () => true
    });
    
    console.log(`Base URL Status: ${baseResponse.status}`);
    if (baseResponse.status === 200) {
      console.log("✅ Base URL is reachable");
    } else {
      console.log("⚠️  Base URL responded but with non-200 status");
    }
    
    // Test all authentication methods
    const result = await testAllMethods();
    
    if (result.success) {
      console.log("\n🎉 SUCCESS! Working configuration:");
      console.log(`   Method: ${result.method}`);
      console.log(`   Endpoint: ${result.endpoint}`);
      console.log(`   Full URL: ${ARANET_BASE_URL}${result.endpoint}`);
      console.log("\n✅ Update your code to use this configuration!");
      return;
    }
    
    // Try alternative URLs
    console.log("\n🔍 Trying alternative base URLs...");
    const workingUrl = await testAlternativeUrls();
    
    if (workingUrl) {
      console.log(`\n🎉 Found working URL: ${workingUrl}`);
      console.log(`Update your .env: ARANET_BASE_URL=${workingUrl}`);
      return;
    }
    
    // Show manual test commands
    showCurlCommands();
    
    // Final troubleshooting
    console.log("\n❌ No working configuration found");
    console.log("\n🆘 Next steps:");
    console.log("   1. Try the curl commands above manually");
    console.log("   2. Check Aranet Cloud dashboard for API status");
    console.log("   3. Verify your API key permissions");
    console.log("   4. Contact Aranet support with your API key");
    
  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

// Run the test
runTest();