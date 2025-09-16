/**
 * Aqara Clean Data Reader
 * -----------------------
 * Fetches CLEAN, normalized data for the readable devices (motion sensors).
 * Other devices are returned with status: "unsupported".
 *
 * Usage:
 *   REGION_DOMAIN=... APP_ID=... APP_KEY=... KEY_ID=... ACCESS_TOKEN=... node clean.js
 */

require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');

/** ======== ENV & API ======== */
const {
  REGION_DOMAIN: REGION_DOMAIN_RAW = '',
  APP_ID,
  APP_KEY,
  KEY_ID,
  ACCESS_TOKEN,
} = process.env;

if (!APP_ID || !APP_KEY || !KEY_ID || !ACCESS_TOKEN || !REGION_DOMAIN_RAW) {
  console.error(
    'Missing env vars. Need REGION_DOMAIN, APP_ID, APP_KEY, KEY_ID, ACCESS_TOKEN.'
  );
  process.exit(1);
}

const REGION_DOMAIN = (
  /^https?:\/\//i.test(REGION_DOMAIN_RAW)
    ? REGION_DOMAIN_RAW
    : `https://${REGION_DOMAIN_RAW}`
).replace(/\/$/, '');
const BASE_URL = `${REGION_DOMAIN}/v3.0/open/api`;

const nonce = () => crypto.randomBytes(8).toString('hex');
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');

function buildHeaders() {
  const now = Date.now().toString();
  const n = nonce();
  const headers = {
    'Content-Type': 'application/json',
    Accesstoken: ACCESS_TOKEN,
    Appid: APP_ID,
    Keyid: KEY_ID,
    Nonce: n,
    Time: now,
    Lang: 'en',
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
      .join('&') + APP_KEY;

  headers.Sign = md5(signStr.toLowerCase());
  return headers;
}

async function callApi(intent, data = {}) {
  try {
    const res = await axios.post(
      BASE_URL,
      { intent, data },
      {
        headers: buildHeaders(),
        validateStatus: () => true,
      }
    );
    if (res.status !== 200 || res.data?.code !== 0) {
      throw new Error(
        `API ${intent} failed: ${res.data?.code} ${res.data?.message || ''}`.trim()
      );
    }
    return res.data.result;
  } catch (e) {
    throw new Error(e.message || String(e));
  }
}

/** ======== YOUR DEVICES ========
 * Keep all 6 so output includes unsupported ones too.
 */
const DEVICES = [
  // hubs (not cleanly readable; will be marked unsupported)
  {
    id: 'lumi1.54ef4474a7be',
    name: 'Exch Floor 2',
    location: 'Floor 2',
    model: 'lumi.gateway.agl004',
    type: 'hub',
  },
  {
    id: 'lumi1.54ef447e68c6',
    name: 'Exch Floor 3',
    location: 'Floor 3',
    model: 'lumi.gateway.agl004',
    type: 'hub',
  },

  // matter devices (not readable via Aqara Cloud in your account; will be marked unsupported)
  {
    id: 'matt.685618ce136bcf6fc6add000',
    name: 'DR201',
    location: 'Floor 2',
    model: 'aqara.matter.4447_8194',
    type: 'sensor',
  },
  {
    id: 'matt.685618ce138abbe8bd043000',
    name: 'SW201',
    location: 'Floor 2',
    model: 'aqara.matter.4897_2',
    type: 'switch',
  },

  // motion sensors (fully readable)
  {
    id: 'lumi1.54ef447baa7f',
    name: '301m',
    location: 'Floor 3',
    model: 'lumi.motion.agl001',
    type: 'motion',
  },
  {
    id: 'lumi1.54ef44666843',
    name: '201',
    location: 'Floor 2',
    model: 'lumi.motion.agl001',
    type: 'motion',
  },
];

/** Only query the readable motion sensors */
const READABLE_IDS = new Set(
  DEVICES.filter((d) => d.type === 'motion').map((d) => d.id)
);

/** Resource IDs for motion model (verified by your dumps) */
const RID = {
  MOTION: '3.51.85',
  BATTERY: '0.4.85',
  RSSI: '8.0.2116',
  LUX: '13.27.85',
  TEMP_C: '8.0.2026',
};

/** Helpers */
function sanitizeTempC(val) {
  if (val === undefined || val === null || val === '') return null;
  const n = Number(val);
  if (!Number.isFinite(n)) return null;
  // Filter obviously bogus values you saw (-29 / -35)
  if (n < -20 || n > 60) return null;
  return n;
}

function toBool01(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n === 1;
}

function toNum(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Build {subjectId -> {rid:value}} from a mixed values array */
function indexValues(rows) {
  const bySubject = {};
  for (const r of rows || []) {
    if (!bySubject[r.subjectId]) bySubject[r.subjectId] = {};
    // If duplicates exist, last one wins
    bySubject[r.subjectId][r.resourceId] = r.value;
  }
  return bySubject;
}

/** Fetch & return CLEAN data */
async function getCleanData() {
  // 1) Query only readable subjects
  const resources = Array.from(READABLE_IDS).map((id) => ({ subjectId: id }));
  const result = await callApi('query.resource.value', { resources });

  const rows = Array.isArray(result)
    ? result
    : Array.isArray(result?.values)
      ? result.values
      : [];
  const map = indexValues(rows);

  // 2) Construct clean device outputs
  const devices = DEVICES.map((d) => {
    if (!READABLE_IDS.has(d.id)) {
      return {
        id: d.id,
        name: d.name,
        location: d.location,
        type: d.type,
        model: d.model,
        status: 'unsupported', // not cleanly readable via Aqara Cloud for your account
        data: null,
      };
    }

    const ridMap = map[d.id] || {};
    const motion = toBool01(ridMap[RID.MOTION]);
    const battery = toNum(ridMap[RID.BATTERY]);
    const rssi = toNum(ridMap[RID.RSSI]);
    const lux = toNum(ridMap[RID.LUX]);
    const temperatureC = sanitizeTempC(ridMap[RID.TEMP_C]);

    return {
      id: d.id,
      name: d.name,
      location: d.location,
      type: d.type,
      model: d.model,
      status: 'ok',
      data: { motion, battery, rssi, lux, temperatureC },
    };
  });

  return {
    timestamp: new Date().toISOString(),
    devices,
  };
}

/** CLI */
(async () => {
  try {
    const payload = await getCleanData();
    console.log(JSON.stringify(payload, null, 2));
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
