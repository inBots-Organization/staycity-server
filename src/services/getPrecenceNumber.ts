import axios, { AxiosResponse } from "axios";
import crypto from "crypto";
require("dotenv").config();

// -------- Config --------
const REGION_DOMAIN_RAW = "open-ger.aqara.com";
const APP_ID: string = process.env.APP_ID as string;
const APP_KEY: string = process.env.APP_KEY as string;
const KEY_ID: string = process.env.KEY_ID as string;
const ACCESS_TOKEN: string = process.env.AQARA_ACCESS_TOKEN as string;
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

// -------- Build Headers --------
function buildHeaders(): AqaraHeader {
  const now = Date.now().toString();
  const n = nonce();
  const headers: AqaraHeader = {
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

// -------- Call API --------
async function callApi<T>(intent: string, data: Record<string, any> = {}): Promise<T | null> {
  const body = { intent, data };
  const headers = buildHeaders();

  try {
    const res: AxiosResponse<AqaraApiResponse<T>> = await axios.post(BASE_URL, body, {
      headers,
      validateStatus: () => true,
    });

    if (res.status !== 200 || res.data.code !== 0) {
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
  console.log(`🔍 Fetching presence data for sensor: ${sensorId}`);

  const values = await callApi<AqaraResourceValue[]>("query.resource.value", {
    resources: [{ subjectId: sensorId }],
  });

  if (!values) {
    console.log("❌ Failed to fetch sensor data");
    return 0;
  }

  const presenceCount1 = values.find(
    (v) => v.subjectId === sensorId && v.resourceId === "0.60.85"
  );
  const presenceCount2 = values.find(
    (v) => v.subjectId === sensorId && v.resourceId === "0.61.85"
  );

  const finalCount = presenceCount2?.value || presenceCount1?.value || "0";
  const count = parseInt(finalCount, 10);

  console.log(`✅ Current presence count: ${count}`);
  return count;
}

// -------- Example Run --------
// (async () => {
//   const presence = await getCurrentPresence();
//   // ممكن تستخدم presence هنا في أي مكان
// })();
