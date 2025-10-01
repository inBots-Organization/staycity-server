import axios from "axios";
import crypto from "crypto";

const REGION_DOMAIN_RAW = "open-ger.aqara.com";
const APP_ID = "138794703004083814426ba5";
const APP_KEY = "qcpn2fk3z3lgp5vteodkpt8h2oirnvil";
const KEY_ID = "K.1387947030166667268";
const ACCESS_TOKEN = "f5ef12f1a8bbd92953c527411b963397";

const REGION_DOMAIN = (
  /^https?:\/\//i.test(REGION_DOMAIN_RAW)
    ? REGION_DOMAIN_RAW
    : `https://${REGION_DOMAIN_RAW}`
).replace(/\/$/, "");
const BASE_URL = `${REGION_DOMAIN}/v3.0/open/api`;

// Your motion sensor ID - update this with your room's sensor
const SENSOR_ID = "lumi1.54ef447baa7f"; // Room 201b

// ---------- Helpers ----------
const nonce = () => crypto.randomBytes(8).toString("hex");
const md5 = (s) => crypto.createHash("md5").update(s).digest("hex");

// ---------- Functions ----------
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

async function getPresenceNumber(sensorId = SENSOR_ID) {
  console.log(`🔍 Fetching presence data for sensor: ${sensorId}\n`);

  const values = await callApi("query.resource.value", {
    resources: [{ subjectId: sensorId }],
  });

  if (!values) {
    console.log("❌ Failed to fetch sensor data");
    return null;
  }

  const presenceCount1 = values.find(
    (v) => v.subjectId === sensorId && v.resourceId === "0.60.85"
  );
  const presenceCount2 = values.find(
    (v) => v.subjectId === sensorId && v.resourceId === "0.61.85"
  );
  const presenceDetail = values.find(
    (v) => v.subjectId === sensorId && v.resourceId === "4.22.700"
  );

  console.log("📊 Presence Information:");
  console.log("━".repeat(50));

  if (presenceCount1) {
    console.log(`👥 Presence Count (0.60.85): ${presenceCount1.value}`);
    console.log(
      `   Updated: ${new Date(presenceCount1.timeStamp).toLocaleString()}`
    );
  }

  if (presenceCount2) {
    console.log(`👥 Presence Count (0.61.85): ${presenceCount2.value}`);
    console.log(
      `   Updated: ${new Date(presenceCount2.timeStamp).toLocaleString()}`
    );
  }

  if (presenceDetail) {
    try {
      const targets = JSON.parse(presenceDetail.value);
      const activeTargets = targets.filter((t) => t.state === "1");
      console.log(`👥 Active Targets Detected: ${activeTargets.length}`);
      console.log(
        `   Updated: ${new Date(presenceDetail.timeStamp).toLocaleString()}`
      );

      if (activeTargets.length > 0) {
        console.log("\n📍 Target Details:");
        activeTargets.forEach((t) => {
          console.log(
            `   • Target ID ${t.id}: Position (${t.x}, ${t.y}), Range: ${
              t.rangeId || "default"
            }`
          );
        });
      }
    } catch (e) {
      console.log(`⚠️ Could not parse detailed tracking data`);
    }
  }

  console.log(`\n🆔 Sensor ID: ${sensorId}`);

  const finalCount = presenceCount2?.value || presenceCount1?.value || "0";
  return parseInt(finalCount, 10);
}

// ---------- Main ----------
(async () => {
  const count = await getPresenceNumber();

  if (count !== null) {
    console.log(`\n✅ Current presence count: ${count}`);
  }
})();
