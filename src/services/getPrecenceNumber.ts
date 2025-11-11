import axios, { AxiosResponse } from "axios";
import crypto from "crypto";
import prisma from "../config/prisma";
import { refreshAqaraToken } from "./aqaraDataService";
require("dotenv").config();

// -------- Config --------
const REGION_DOMAIN_RAW = "open-ger.aqara.com";
const APP_ID: string = process.env.APP_ID as string;
const APP_KEY: string = process.env.APP_KEY as string;
const KEY_ID: string = process.env.KEY_ID as string;
// const SENSOR_ID = "lumi1.54ef447baa7f"; // Room 201b

const REGION_DOMAIN = (
  /^https?:\/\//i.test(REGION_DOMAIN_RAW)
    ? REGION_DOMAIN_RAW
    : `https://${REGION_DOMAIN_RAW}`
).replace(/\/$/, "");
const BASE_URL = `${REGION_DOMAIN}/v3.0/open/api`;

// -------- Helpers --------
const nonce = (): string => crypto.randomBytes(8).toString("hex");
const md5 = (s: string): string => crypto.createHash("md5").update(s).digest("hex");

// -------- Types --------
interface AqaraHeader {
  "Content-Type": string;
  Accesstoken: string;
  Appid: string;
  Keyid: string;
  Nonce: string;
  Time: string;
  Lang: string;
  Sign?: string;
}

interface AqaraApiResponse<T> {
  code: number;
  message: string;
  result: T;
}

interface AqaraResourceValue {
  subjectId: string;
  resourceId: string;
  value: string;
  timeStamp: number;
}

interface PresenceTarget {
  id: string;
  state: string;
  x: number;
  y: number;
  rangeId?: string;
}

// -------- Build Headers --------
async function buildHeaders(): Promise<AqaraHeader> {
  const now = Date.now().toString();
  const n = nonce();
  // Get a fresh access token using the refreshAqaraToken function
  // const result = await refreshAqaraToken();
  // const accessToken = result.accessToken
  const user = await prisma.user.findUnique({
    where: {
      id: "cmffdevpf0001ijp5xxxe85pf",
    },
  });

  const accessToken = user?.accessToken;
  const headers: AqaraHeader = {
    "Content-Type": "application/json",
    Accesstoken: accessToken,
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

// -------- Call API --------
async function callApi<T>(intent: string, data: Record<string, any> = {}): Promise<T | null> {
  const body = { intent, data };
  const headers = await buildHeaders();

  try {
    const res: AxiosResponse<AqaraApiResponse<T>> = await axios.post(BASE_URL, body, {
      headers,
      validateStatus: () => true,
    });
    console.log("res",res)
    if (res.status !== 200 || res.data.code !== 0) {
      // console.log("res",res)
      throw new Error(`API Error ${res.data.code}: ${res.data.message}`);
    }

    return res.data.result;
  } catch (err: any) {
    console.error("❌ API Error:", err.message);
    return null;
  }
}

// -------- Main Function --------
export async function getCurrentPresence(sensorId: string): Promise<number> {
  console.log(`🔍 Fetching presence data for sensor: ${sensorId}\n`);

  // Query the sensor values
  const values = await callApi<AqaraResourceValue[]>("query.resource.value", {
    resources: [{ subjectId: sensorId }],
  });
  console.log("values",values)
  if (!values) {
    console.log("❌ Failed to fetch sensor data");
    return 0;
  }

  // Find presence count resources
  const presenceCount1 = values.find(v => v.subjectId === sensorId && v.resourceId === "0.60.85");
  const presenceCount2 = values.find(v => v.subjectId === sensorId && v.resourceId === "0.61.85");
  const presenceDetail = values.find(v => v.subjectId === sensorId && v.resourceId === "4.22.700");

  console.log("📊 Presence Information:");
  console.log("━".repeat(50));

  // Display both resources
  if (presenceCount1) {
    console.log(`👥 Presence Count (0.60.85): ${presenceCount1.value}`);
    console.log(`   Updated: ${new Date(presenceCount1.timeStamp).toLocaleString()}`);
  }

  if (presenceCount2) {
    console.log(`👥 Presence Count (0.61.85): ${presenceCount2.value}`);
    console.log(`   Updated: ${new Date(presenceCount2.timeStamp).toLocaleString()}`);
  }

  // Parse detailed tracking data
  let activeTargetCount = 0;
  if (presenceDetail) {
    try {
      const targets: PresenceTarget[] = JSON.parse(presenceDetail.value);
      const activeTargets = targets.filter(t => t.state === "1");
      activeTargetCount = activeTargets.length;
      console.log(`👥 Active Targets Detected: ${activeTargetCount}`);
      console.log(`   Updated: ${new Date(presenceDetail.timeStamp).toLocaleString()}`);

      if (activeTargets.length > 0) {
        console.log("\n📍 Target Details:");
        activeTargets.forEach(t => {
          console.log(`   • Target ID ${t.id}: Position (${t.x}, ${t.y}), Range: ${t.rangeId || 'default'}`);
        });
      }
    } catch (e) {
      console.log(`⚠️  Could not parse detailed tracking data`);
    }
  }

  console.log(`\n🆔 Sensor ID: ${sensorId}`);

  // Return the most accurate count - prioritize active targets from detailed tracking
  // Then fall back to resource values 0.61.85 and 0.60.85
  const finalCount = activeTargetCount > 0
    ? activeTargetCount
    : parseInt(presenceCount2?.value || presenceCount1?.value || "0", 10);

  console.log(`\n✅ Current presence count: ${finalCount}`);
  return finalCount;
}

// -------- Example Run --------
// (async () => {
//   const presence = await getCurrentPresence();
//   // ممكن تستخدم presence هنا في أي مكان
// })();
