// File: aqara/aranet-integration-fixed.js
// Scope-safe wrapper to avoid global re-declarations when multiple files are open.
(function main() {
  'use strict';

  // TL;DR: You were calling /metrics/{id} (metadata only). Switch to /measurements/last (+/history) and /telemetry/last, fetch per-sensor, then map readings to metric IDs.

  require('dotenv').config();
  const axios = require('axios');
  const express = require('express');

  // ── Config ─────────────────────────────────────────────────────────────────
  const {
    ARANET_API_KEY = '',
    ARANET_BASE_URL = 'https://aranet.cloud/api/v1',
    ARANET_PORT = 3001,
    ARANET_POLL_INTERVAL = 30000,
    ARANET_REQUEST_TIMEOUT = 15000,
    ARANET_INCLUDE_HISTORY_FALLBACK = 'true', // if last fails/empty, try 24h history
  } = process.env;

  // ── State ──────────────────────────────────────────────────────────────────
  let discoveredSensors = [];
  let latestValues = {}; // { [sensorId]: { sensor, measurements: { [metricId]: Parsed }, timestamp } }
  const systemStats = {
    startTime: Date.now(),
    totalRequests: 0,
    successfulRequests: 0,
    errors: 0,
    lastUpdate: null,
  };

  // ── Metric Definitions ─────────────────────────────────────────────────────
  const METRIC_DEFINITIONS = {
    1: { name: 'Temperature', unit: '°C', type: 'environmental' },
    2: { name: 'Humidity', unit: '%', type: 'environmental' },
    3: { name: 'CO₂', unit: 'ppm', type: 'environmental' },
    4: { name: 'Atmospheric Pressure', unit: 'hPa', type: 'environmental' },
    15: { name: 'Pulses', unit: 'pulses', type: 'power' },
    16: { name: 'Pulses Cumulative', unit: 'pulses', type: 'power' },
    61: { name: 'RSSI', unit: 'dBm', type: 'system' },
    62: { name: 'Battery voltage', unit: '%', type: 'system' },
  };

  // ── API Client ─────────────────────────────────────────────────────────────
  class AranetClient {
    constructor(apiKey, baseUrl) {
      this.apiKey = apiKey;
      this.baseUrl = baseUrl.replace(/\/$/, '');
    }
    buildHeaders() {
      // Some clients expect ApiKey in Authorization, others accept ApiKey header directly.
      return {
        Authorization: `ApiKey ${this.apiKey}`,
        ApiKey: this.apiKey,
        Accept: 'application/json',
        'User-Agent': 'Aranet-Enhanced-Display/1.1',
      };
    }
    async call(endpoint, params = {}) {
      const url = `${this.baseUrl}${endpoint}`;
      systemStats.totalRequests++;
      try {
        const res = await axios.get(url, {
          headers: this.buildHeaders(),
          params,
          timeout: Number(ARANET_REQUEST_TIMEOUT) || 15000,
          validateStatus: () => true,
        });
        if (res.status !== 200) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        systemStats.successfulRequests++;
        systemStats.lastUpdate = new Date().toISOString();
        return res.data;
      } catch (err) {
        systemStats.errors++;
        console.error(`❌ API Error for ${endpoint}:`, err.message);
        throw err;
      }
    }
  }
  const aranetClient = new AranetClient(ARANET_API_KEY, ARANET_BASE_URL);

  // ── Parsing helpers ────────────────────────────────────────────────────────
  function toStr(x) {
    return x === undefined || x === null ? undefined : String(x);
  }
  function toNum(x) {
    if (x === undefined || x === null) return undefined;
    const n = typeof x === 'number' ? x : Number(x);
    return Number.isFinite(n) ? n : undefined;
  }

  // Robustly unwrap list of readings from various shapes seen in Cloud API
  function normalizeReadings(payload) {
    if (!payload || typeof payload !== 'object') return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.readings)) return payload.readings; // common
    if (Array.isArray(payload.measurements)) return payload.measurements;
    if (payload.data) {
      if (Array.isArray(payload.data)) return payload.data;
      if (Array.isArray(payload.data.readings)) return payload.data.readings;
      if (Array.isArray(payload.data.measurements))
        return payload.data.measurements;
    }
    if (Array.isArray(payload.items)) return payload.items;
    return [];
  }

  // Extract fields from one reading; handle multiple variants.
  function extractReading(item) {
    const metricId = toStr(
      item?.metric?.id ??
        item?.metricId ??
        item?.metric_id ??
        item?.mId ??
        item?.m
    );
    const unit =
      item?.unit ||
      item?.units?.[0]?.name ||
      item?.metric?.unit?.name ||
      (metricId && METRIC_DEFINITIONS[metricId]?.unit) ||
      item?.u; // SenML-like
    const value =
      toNum(item?.value) ??
      toNum(item?.val) ??
      toNum(item?.measurement?.value) ??
      toNum(item?.y) ??
      toNum(item?.v); // SenML-like
    const timestamp =
      item?.time ||
      item?.timestamp ||
      item?.t ||
      item?.ts ||
      new Date().toISOString();
    const sensorId = toStr(
      item?.sensor?.id ?? item?.sensorId ?? item?.sId ?? item?.s
    );
    const name =
      item?.metric?.name ||
      (metricId && METRIC_DEFINITIONS[metricId]?.name) ||
      item?.name;
    return { metricId, unit, value, timestamp, sensorId, name, raw: item };
  }

  // Map readings array -> { metricId: parsed }
  function mapReadingsToMetrics(readings, sensorIdFilter) {
    const out = {};
    for (const it of readings) {
      const r = extractReading(it);
      if (!r.metricId) continue;
      if (sensorIdFilter && r.sensorId && toStr(sensorIdFilter) !== r.sensorId)
        continue;
      if (r.value === undefined || r.value === null) continue;
      const def = METRIC_DEFINITIONS[r.metricId] || {
        name: r.name || `Metric ${r.metricId}`,
        unit: r.unit || '',
        type: 'unknown',
      };
      out[r.metricId] = {
        metricId: r.metricId,
        name: def.name,
        unit: r.unit || def.unit,
        type: def.type,
        value: r.value,
        timestamp: r.timestamp,
        rawData: r.raw,
      };
    }
    return out;
  }

  // ── Core data fetch ────────────────────────────────────────────────────────
  async function fetchLatestForSensor(sensor) {
    // Why: fetching per-sensor avoids hitting metadata-only /metrics endpoints and reduces roundtrips.
    const params = { sensor: sensor.id, links: false };
    const results = await Promise.allSettled([
      aranetClient.call('/measurements/last', params), // measured metrics (1,2,3,4,15,16,...)
      aranetClient.call('/telemetry/last', params), // telemetry metrics (61,62)
    ]);

    let readings = [];
    if (results[0].status === 'fulfilled')
      readings.push(...normalizeReadings(results[0].value));
    if (results[1].status === 'fulfilled')
      readings.push(...normalizeReadings(results[1].value));

    // Fallback: try 24h history and take last points if /last returns empty
    if (
      readings.length === 0 &&
      String(ARANET_INCLUDE_HISTORY_FALLBACK).toLowerCase() === 'true'
    ) {
      const now = new Date();
      const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const histParams = {
        sensor: sensor.id,
        from: from.toISOString(),
        to: now.toISOString(),
        links: false,
      };
      const h = await Promise.allSettled([
        aranetClient.call('/measurements/history', histParams),
        aranetClient.call('/telemetry/history', histParams),
      ]);
      const hReadings = [];
      if (h[0].status === 'fulfilled')
        hReadings.push(...normalizeReadings(h[0].value));
      if (h[1].status === 'fulfilled')
        hReadings.push(...normalizeReadings(h[1].value));
      // Prefer the last occurrence per metric
      const byMetric = new Map();
      for (const item of hReadings) {
        const r = extractReading(item);
        if (!r.metricId || toStr(sensor.id) !== r.sensorId) continue;
        const prev = byMetric.get(r.metricId);
        if (!prev || new Date(r.timestamp) > new Date(prev.timestamp)) {
          byMetric.set(r.metricId, r);
        }
      }
      readings = Array.from(byMetric.values());
    }

    return mapReadingsToMetrics(readings, toStr(sensor.id));
  }

  // ── Discover sensors ───────────────────────────────────────────────────────
  async function discoverSensors() {
    try {
      console.log('🔍 Discovering Aranet sensors...');
      const result = await aranetClient.call('/sensors', { links: false });
      const sensors = result.sensors || result.items || result.data || [];
      discoveredSensors = sensors.map((sensor) => ({
        id: sensor.id,
        sensorId: sensor.sensorId || sensor.id,
        name: sensor.name,
        type: sensor.type,
        skills: sensor.skills || [],
        bases: sensor.bases || [],
        _raw: sensor,
      }));

      console.log(`✅ Discovered ${discoveredSensors.length} sensors`);
      discoveredSensors.forEach((sensor, i) => {
        console.log(`
${i + 1}. ${sensor.name} [ID: ${sensor.id}, Type: ${sensor.type}]`);
        const active = (sensor.skills || []).filter((s) => s.active);
        active.forEach((s) => {
          const md = METRIC_DEFINITIONS[String(s.metric)] || {
            name: `Metric ${s.metric}`,
            unit: '?',
          };
          console.log(`   • ${md.name} (${md.unit})`);
        });
      });
      return discoveredSensors;
    } catch (error) {
      console.error('❌ Sensor discovery failed:', error.message);
      return [];
    }
  }

  // ── Value formatting ───────────────────────────────────────────────────────
  function formatValue(m) {
    if (!m || m.value === null || m.value === undefined) return '—';
    const val = typeof m.value === 'number' ? m.value : Number(m.value);
    const unit = m.unit || '';
    switch (String(m.metricId)) {
      case '1':
      case '2':
      case '4':
        return `${val.toFixed(1)} ${unit}`;
      case '3':
      case '15':
      case '16':
      case '61':
      case '62':
        return `${Math.round(val)} ${unit}`;
      default:
        return `${val} ${unit}`;
    }
  }

  // ── Periodic update ───────────────────────────────────────────────────────
  async function updateCurrentValues() {
    try {
      console.log(`
👁️  [${new Date().toLocaleTimeString()}] Updating current values...`);
      for (const sensor of discoveredSensors) {
        console.log(`
📱 ${sensor.name} [${sensor.id}]:`);
        try {
          const measurements = await fetchLatestForSensor(sensor);
          const count = Object.keys(measurements).length;
          if (count > 0) {
            latestValues[sensor.id] = {
              sensor,
              measurements,
              timestamp: new Date().toISOString(),
            };
            console.log(`   ✅ Updated ${count} measurements`);
          } else {
            console.log('   ❌ No measurements available');
          }
        } catch (e) {
          console.log(`   ❌ Failed to update: ${e.message}`);
        }
      }
      const successCount = Object.keys(latestValues).length;
      console.log(`
📊 Summary: ${successCount}/${discoveredSensors.length} sensors have current values`);
    } catch (error) {
      console.error('❌ Update error:', error.message);
    }
  }

  // ── Web server ─────────────────────────────────────────────────────────────
  function setupWebServer() {
    const app = express();
    app.use(express.json());
    app.use((_, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      next();
    });

    app.get('/', (req, res) => {
      res.type('html').send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Aranet Sensor Dashboard</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;margin:0;padding:20px;background:#f5f7fa}
    .header{text-align:center;margin-bottom:30px}
    .sensor-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:20px}
    .sensor-card{background:#fff;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,.1);border:1px solid #e1e5e9}
    .sensor-title{font-size:18px;font-weight:600;margin-bottom:15px;color:#1a1a1a}
    .metrics-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px}
    .metric{text-align:center;padding:12px;background:#f8f9fa;border-radius:8px}
    .metric-name{font-size:12px;color:#666;margin-bottom:4px}
    .metric-value{font-size:16px;font-weight:600;color:#1a1a1a}
    .environmental{border-left:4px solid #4CAF50}
    .power{border-left:4px solid #FF9800}
    .system{border-left:4px solid #2196F3}
    .status{text-align:center;margin-bottom:20px;font-size:14px;color:#666}
    .refresh{text-align:center;margin-top:20px}
    .refresh button{background:#007bff;color:#fff;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-size:14px}
    .refresh button:hover{background:#0056b3}
  </style>
  <script>
    function refreshData(){window.location.reload();}
    setTimeout(refreshData,30000);
  </script>
</head>
<body>
  <div class="header">
    <h1>🌐 Aranet Sensor Dashboard</h1>
    <div class="status">Last update: ${new Date().toLocaleString()}</div>
  </div>
  <div class="sensor-grid" id="sensors">
    <div class="sensor-card"><div class="sensor-title">Loading sensors...</div></div>
  </div>
  <div class="refresh"><button onclick="refreshData()">🔄 Refresh</button></div>

  <script>
    fetch('/api/current').then(function(r){return r.json()}).then(function(data){
      var c = document.getElementById('sensors');
      if (!data.sensors || data.sensors.length === 0) {
        c.innerHTML = '<div class="sensor-card"><div class="sensor-title">No sensors found</div></div>';
        return;
      }
      c.innerHTML = data.sensors.map(function(s){
        var items = Object.values(s.measurements).map(function(m){
          return '<div class="metric ' + m.type + '\"><div class=\"metric-name\">' + m.name + '</div><div class=\"metric-value\">' + m.formatted + '</div></div>';
        }).join('');
        return '<div class="sensor-card"><div class="sensor-title">' + s.name + ' (' + s.type + ')</div><div class="metrics-grid">' + items + '</div></div>';
      }).join('');
    }).catch(function(){
      document.getElementById('sensors').innerHTML = '<div class="sensor-card"><div class="sensor-title">Error loading data</div></div>';
    });
  </script>
</body>
</html>`);
    });

    app.get('/api/current', (req, res) => {
      const response = {
        timestamp: new Date().toISOString(),
        sensors: Object.values(latestValues).map((s) => ({
          id: s.sensor.id,
          name: s.sensor.name,
          type: s.sensor.type,
          measurements: Object.fromEntries(
            Object.entries(s.measurements).map(([metricId, m]) => [
              metricId,
              { ...m, formatted: formatValue(m) },
            ])
          ),
          timestamp: s.timestamp,
        })),
      };
      res.json(response);
    });

    app.get('/status', (req, res) => {
      res.json({
        system: 'Aranet Enhanced Display',
        status: 'running',
        uptime: Math.floor((Date.now() - systemStats.startTime) / 1000),
        sensors: discoveredSensors.length,
        sensorsWithData: Object.keys(latestValues).length,
        lastUpdate: systemStats.lastUpdate,
        stats: systemStats,
      });
    });

    app.get('/measurements', (req, res) => res.json(latestValues));

    // attach debug route
    attachDebug(app);

    app.listen(ARANET_PORT, () => {
      console.log(
        `\n🌐 Aranet Dashboard running on http://localhost:${ARANET_PORT}`
      );
      console.log(`   Dashboard: http://localhost:${ARANET_PORT}/`);
      console.log(`   API: http://localhost:${ARANET_PORT}/api/current`);
      console.log(`   Status: http://localhost:${ARANET_PORT}/status`);
      console.log(
        `   Debug:  http://localhost:${ARANET_PORT}/debug/raw?sensor=<id>`
      );
    });
  }

  // ── Debug endpoints (optional) ─────────────────────────────────────────────
  // Exposes raw payloads from Cloud API so you can verify shapes quickly.
  function attachDebug(app) {
    app.get('/debug/raw', async (req, res) => {
      try {
        const sensor =
          req.query.sensor || (discoveredSensors[0] && discoveredSensors[0].id);
        if (!sensor)
          return res.status(400).json({ error: 'no sensor id available' });
        const params = { sensor, links: false };
        const [m, t] = await Promise.all([
          aranetClient.call('/measurements/last', params),
          aranetClient.call('/telemetry/last', params),
        ]);
        res.json({ measurements_last: m, telemetry_last: t });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  }

  // ── Main ───────────────────────────────────────────────────────────────────
  async function initialize() {
    console.log('🌐 Aranet Enhanced Display - Current Values');
    console.log('='.repeat(60));
    console.log(
      'API Key:',
      ARANET_API_KEY ? `${ARANET_API_KEY.substring(0, 8)}...` : 'Not set'
    );

    try {
      await discoverSensors();
      if (discoveredSensors.length === 0) {
        console.log('⚠️  No sensors found');
        return;
      }
      await updateCurrentValues();
      setupWebServer();
      console.log(`
👁️  Starting periodic updates every ${ARANET_POLL_INTERVAL / 1000} seconds...
`);
      setInterval(updateCurrentValues, ARANET_POLL_INTERVAL);
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      process.exit(1);
    }
  }

  if (require.main === module) {
    initialize().catch(console.error);
  }
})();
