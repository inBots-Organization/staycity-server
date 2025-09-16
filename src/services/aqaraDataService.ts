import { SensorReading, SensorData } from './aranetDataService';

interface AqaraDevice {
  id: string;
  name: string;
  location: string;
  type: string;
  model: string;
  status: string;
  data: {
    motion: boolean | null;
    battery: number | null;
    rssi: number | null;
    lux: number | null;
    temperatureC: number | null;
  } | null;
}

interface AqaraResponse {
  timestamp: string;
  devices: AqaraDevice[];
}

export default class AqaraDataService {
  private regionDomain: string;
  private appId: string;
  private appKey: string;
  private keyId: string;
  private accessToken: string;
  private baseUrl: string;

  constructor() {
    this.regionDomain = this.normalizeRegionDomain(process.env['REGION_DOMAIN'] || '');
    this.appId = process.env['APP_ID'] || '';
    this.appKey = process.env['APP_KEY'] || '';
    this.keyId = process.env['KEY_ID'] || '';
    this.accessToken = process.env['ACCESS_TOKEN'] || '';
    this.baseUrl = `${this.regionDomain}/v3.0/open/api`;

    if (!this.appId || !this.appKey || !this.keyId || !this.accessToken || !this.regionDomain) {
      throw new Error('Missing Aqara environment variables. Need REGION_DOMAIN, APP_ID, APP_KEY, KEY_ID, ACCESS_TOKEN.');
    }
  }

  private normalizeRegionDomain(domain: string): string {
    if (!domain) return '';
    return (/^https?:\/\//i.test(domain) ? domain : `https://${domain}`).replace(/\/$/, '');
  }

  private nonce(): string {
    return Array.from(Array(8), () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  private md5(s: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(s).digest('hex');
  }

  private buildHeaders(): Record<string, string> {
    const now = Date.now().toString();
    const n = this.nonce();
    const headers = {
      'Content-Type': 'application/json',
      Accesstoken: this.accessToken,
      Appid: this.appId,
      Keyid: this.keyId,
      Nonce: n,
      Time: now,
      Lang: 'en',
    };

    const signStr = Object.entries({
      Accesstoken: headers.Accesstoken,
      Appid: headers.Appid,
      Keyid: headers.Keyid,
      Nonce: headers.Nonce,
      Time: headers.Time,
    })
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&') + this.appKey;

    return {
      ...headers,
      Sign: this.md5(signStr.toLowerCase()),
    };
  }

  private async callApi(intent: string, data: Record<string, any> = {}): Promise<any> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({ intent, data }),
    });

    const result = await response.json();

    if (response.status !== 200 || result?.code !== 0) {
      throw new Error(`Aqara API ${intent} failed: ${result?.code} ${result?.message || ''}`.trim());
    }

    return result.result;
  }

  private readonly DEVICES = [
    { id: 'lumi1.54ef4474a7be', name: 'Exch Floor 2', location: 'Floor 2', model: 'lumi.gateway.agl004', type: 'hub' },
    { id: 'lumi1.54ef447e68c6', name: 'Exch Floor 3', location: 'Floor 3', model: 'lumi.gateway.agl004', type: 'hub' },
    { id: 'matt.685618ce136bcf6fc6add000', name: 'DR201', location: 'Floor 2', model: 'aqara.matter.4447_8194', type: 'sensor' },
    { id: 'matt.685618ce138abbe8bd043000', name: 'SW201', location: 'Floor 2', model: 'aqara.matter.4897_2', type: 'switch' },
    { id: 'lumi1.54ef447baa7f', name: '301m', location: 'Floor 3', model: 'lumi.motion.agl001', type: 'motion' },
    { id: 'lumi1.54ef44666843', name: '201', location: 'Floor 2', model: 'lumi.motion.agl001', type: 'motion' },
  ];

  private readonly READABLE_IDS = new Set(
    this.DEVICES.filter(d => d.type === 'motion').map(d => d.id)
  );

  private readonly RID = {
    MOTION: '3.51.85',
    BATTERY: '0.4.85',
    RSSI: '8.0.2116',
    LUX: '13.27.85',
    TEMP_C: '8.0.2026',
  };

  private sanitizeTempC(val: any): number | null {
    if (val === undefined || val === null || val === '') return null;
    const n = Number(val);
    if (!Number.isFinite(n)) return null;
    if (n < -20 || n > 60) return null;
    return n;
  }

  private toBool01(v: any): boolean | null {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return n === 1;
  }

  private toNum(v: any): number | null {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private indexValues(rows: any[]): Record<string, Record<string, any>> {
    const bySubject: Record<string, Record<string, any>> = {};
    for (const r of rows || []) {
      if (r?.subjectId && r?.resourceId !== undefined) {
        if (!bySubject[r.subjectId]) bySubject[r.subjectId] = {};
        bySubject[r.subjectId][r.resourceId] = r.value;
      }
    }
    return bySubject;
  }

  async getAqaraData(): Promise<AqaraResponse> {
    const resources = Array.from(this.READABLE_IDS).map(id => ({ subjectId: id }));
    const result = await this.callApi('query.resource.value', { resources });

    const rows = Array.isArray(result) ? result : Array.isArray(result?.values) ? result.values : [];
    const map = this.indexValues(rows);

    const devices = this.DEVICES.map(d => {
      if (!this.READABLE_IDS.has(d.id)) {
        return {
          id: d.id,
          name: d.name,
          location: d.location,
          type: d.type,
          model: d.model,
          status: 'unsupported',
          data: null,
        };
      }

      const ridMap = map[d.id] || {};
      const motion = this.toBool01(ridMap[this.RID.MOTION]);
      const battery = this.toNum(ridMap[this.RID.BATTERY]);
      const rssi = this.toNum(ridMap[this.RID.RSSI]);
      const lux = this.toNum(ridMap[this.RID.LUX]);
      const temperatureC = this.sanitizeTempC(ridMap[this.RID.TEMP_C]);

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

  async getSensorData(sensorId: string): Promise<SensorData> {
    const device = this.DEVICES.find(d => d.id === sensorId);
    if (!device) {
      throw new Error(`Device with ID ${sensorId} not found`);
    }

    const aqaraData = await this.getAqaraData();
    const deviceData = aqaraData.devices.find(d => d.id === sensorId);

    if (!deviceData || deviceData.status !== 'ok' || !deviceData.data) {
      return {
        sensorId,
        sensorName: device.name,
        sensorType: device.type,
        readings: [],
        lastUpdate: new Date().toISOString(),
      };
    }

    const readings: SensorReading[] = [];

    if (deviceData.data.motion !== null) {
      readings.push({
        metricId: 'motion',
        metricName: 'Motion',
        value: deviceData.data.motion ? 1 : 0,
        unit: 'boolean',
        timestamp: aqaraData.timestamp,
      });
    }

    if (deviceData.data.battery !== null) {
      readings.push({
        metricId: 'battery',
        metricName: 'Battery',
        value: deviceData.data.battery,
        unit: '%',
        timestamp: aqaraData.timestamp,
      });
    }

    if (deviceData.data.rssi !== null) {
      readings.push({
        metricId: 'rssi',
        metricName: 'RSSI',
        value: deviceData.data.rssi,
        unit: 'dBm',
        timestamp: aqaraData.timestamp,
      });
    }

    if (deviceData.data.lux !== null) {
      readings.push({
        metricId: 'lux',
        metricName: 'Illuminance',
        value: deviceData.data.lux,
        unit: 'lux',
        timestamp: aqaraData.timestamp,
      });
    }

    if (deviceData.data.temperatureC !== null) {
      readings.push({
        metricId: 'temperature',
        metricName: 'Temperature',
        value: deviceData.data.temperatureC,
        unit: '°C',
        timestamp: aqaraData.timestamp,
      });
    }

    return {
      sensorId,
      sensorName: device.name,
      sensorType: device.type,
      readings,
      lastUpdate: aqaraData.timestamp,
    };
  }

  async getMultipleSensorsData(sensorIds: string[]): Promise<SensorData[]> {
    const results = await Promise.allSettled(
      sensorIds.map(id => this.getSensorData(id))
    );

    return results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<SensorData>).value);
  }
}