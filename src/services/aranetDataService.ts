export interface SensorReading {
  metricId: string;
  metricName: string;
  value: number;
  unit: string;
  timestamp: string;
}

export interface SensorDevice {
  id: string;
  part?: string;
}

export interface SensorData {
  sensorId: string;
  sensorName: string;
  sensorType: string;
  readings: SensorReading[];
  lastUpdate: string;
  part?: string;
}

export default class AranetDataService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env['ARANET_API_KEY'] || '';
    this.baseUrl = 'https://aranet.cloud/api/v1';
  }

  private async makeRequest(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<any> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `ApiKey ${this.apiKey}`,
        Accept: 'application/json',
        'User-Agent': 'StayCity-Server/1.0',
      },
    });

    if (!response.ok) {
      console.log("response",response)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async getSensorMetrics(
    sensorId: string
  ): Promise<{ metrics: string[]; sensorName: string; sensorType: string }> {
    const data = await this.makeRequest(`/sensors/sensor/${sensorId}`);

    const sensor = data.sensor;
    const metrics = sensor.skills
      .filter((skill: any) => skill.active)
      .map((skill: any) => skill.metric);

    return {
      metrics,
      sensorName: sensor.name,
      sensorType: sensor.type,
    };
  }

  async getSensorReadings(sensorId: string, metrics: string[]): Promise<any[]> {
    const metricString = metrics.join(',');
    const data = await this.makeRequest('/telemetry/last', {
      sensor: sensorId,
      metric: metricString,
    });

    return data.readings || [];
  }

  async getUnitDetails(
    unitId: string
  ): Promise<{ name: string; precision: number }> {
    const data = await this.makeRequest(`/units/unit/${unitId}`);
    return {
      name: data.unit.name,
      precision: data.unit.precision,
    };
  }

  async getSensorData(sensorId: string, part?: string): Promise<SensorData> {
    const { metrics, sensorName, sensorType } =
      await this.getSensorMetrics(sensorId);

    const readings = await this.getSensorReadings(sensorId, metrics);

    const unitCache = new Map<string, { name: string; precision: number }>();

    const processedReadings: SensorReading[] = await Promise.all(
      readings.map(async (reading) => {
        let unitDetails = unitCache.get(reading.unit);
        if (!unitDetails) {
          unitDetails = await this.getUnitDetails(reading.unit);
          unitCache.set(reading.unit, unitDetails);
        }

        const metricNames: Record<string, string> = {
          '1': 'Temperature',
          '2': 'Humidity',
          '3': 'CO₂',
          '4': 'Atmospheric Pressure',
          '61': 'RSSI',
          '62': 'Battery voltage',
        };

        return {
          metricId: reading.metric,
          metricName: metricNames[reading.metric] || `Metric ${reading.metric}`,
          value: reading.value,
          unit: unitDetails.name,
          timestamp: reading.time,
        };
      })
    );

    return {
      sensorId,
      sensorName,
      sensorType,
      readings: processedReadings,
      lastUpdate: new Date().toISOString(),
      ...(part && { part }),
    };
  }

  async getMultipleSensorsData(sensors: SensorDevice[]): Promise<SensorData[]> {
    const results = await Promise.allSettled(
      sensors.map((sensor) => this.getSensorData(sensor.id, sensor.part))
    );
    return results
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<SensorData>).value);
  }

  async getSensorHistory(
    sensorId: string,
    metric: string,
    from: string,
    to: string,
    limit: string = '10000'
  ): Promise<{ readings: SensorReading[]; self?: string }> {
    const data = await this.makeRequest('/telemetry/history', {
      sensor: sensorId,
      metric,
      from,
      to,
      limit,
    });
    // console.log("data",data)
    const unitCache = new Map<string, { name: string; precision: number }>();

    const metricNames: Record<string, string> = {
      '1': 'Temperature',
      '2': 'Humidity',
      '3': 'CO₂',
      '4': 'Atmospheric Pressure',
      '61': 'RSSI',
      '62': 'Battery voltage',
    };

    const processedReadings: SensorReading[] = await Promise.all(
      (data.readings || []).map(async (reading: any) => {
        let unitDetails = unitCache.get(reading.unit);
        if (!unitDetails) {
          unitDetails = await this.getUnitDetails(reading.unit);
          unitCache.set(reading.unit, unitDetails);
        }

        return {
          metricId: reading.metric,
          metricName: metricNames[reading.metric] || `Metric ${reading.metric}`,
          value: reading.value,
          unit: unitDetails.name,
          timestamp: reading.time,
        } as SensorReading;
      })
    );

    return {
      readings: processedReadings,
      self: data.self,
    };
  }
  async getElectricityAnalytics(
  sensorId: string,
  metric: string,
  from: string,
  to: string
): Promise<{ 
  month:{energy: string; 
  cost: string; }
  week:{energy: string; 
  cost: string; }
  day:{energy: string; 
  cost: string; }
}> {
  const PRICE_PER_KWH = 0.16;

  const data = await this.makeRequest('/telemetry/history', {
    sensor: sensorId,
    metric,
    from,
    to,
  });

  const now = new Date();

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(now.getDate() - 7);

  const oneDayAgo = new Date();
  oneDayAgo.setDate(now.getDate() - 1);

  // 🟢 Total Energy (Month)
  const lastMonthEnergyWh = data.readings.reduce((acc, cur) => acc + cur.value, 0);
  const lastMonthEnergyKwh = (lastMonthEnergyWh / 1000)
  const totalPrice = (Number(lastMonthEnergyKwh) * PRICE_PER_KWH)

  // 🟡 Last Week Energy
  const lastWeekEnergyWh = data.readings
    .filter(log => {
      const logTime = new Date(log.time);
      return logTime >= oneWeekAgo && logTime <= now;
    })
    .reduce((acc, cur) => acc + cur.value, 0);
  const lastWeekEnergyKwh = (lastWeekEnergyWh / 1000)
  const lastWeekPrice = (Number(lastWeekEnergyKwh) * PRICE_PER_KWH)

  // 🔵 Last Day Energy
  const lastDayEnergyWh = data.readings
    .filter(log => {
      const logTime = new Date(log.time);
      return logTime >= oneDayAgo && logTime <= now;
    })
    .reduce((acc, cur) => acc + cur.value, 0);
  const lastDayEnergyKwh = (lastDayEnergyWh / 1000)
  const lastDayPrice = (Number(lastDayEnergyKwh) * PRICE_PER_KWH)

  return {
    month:{energy:lastMonthEnergyKwh,
    cost:totalPrice},
    week:{energy:lastWeekEnergyKwh,
    cost:lastWeekPrice},
    day:{energy:lastDayEnergyKwh,
    cost:lastDayPrice}
  };
}
  async getHestory(
  sensorId: string,
  metric: string,
  from: string,
  to: string
): Promise<{ 
  month:{energy: string; 
  cost: string; }
  week:{energy: string; 
  cost: string; }
  day:{energy: string; 
  cost: string; }
}> {
  const PRICE_PER_KWH = 0.16;

  const data = await this.makeRequest('/telemetry/history', {
    sensor: sensorId,
    metric,
    from,
    to,
  });

  

  return data
}


}
