import { prisma } from '../config/prisma';
import { BuildingStatus, RoomType, RoomStatus, DeviceStatus } from '../generated/prisma';
import AranetDataService, { SensorData } from './aranetDataService';
import AqaraDataService from './aqaraDataService';
import {getCurrentPresence} from './getPrecenceNumber';
interface DeviceWithMetrics {
  id: string;
  name: string;
  externalId: string | null;
  provider: string;
  status: DeviceStatus;
  sensorData: SensorData | null;
}

interface RoomWithMetrics {
  id: string;
  name: string;
  type: RoomType;
  status: RoomStatus;
  capacity: number;
  devices: DeviceWithMetrics[];
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
}

interface FloorWithMetrics {
  id: string;
  name: string;
  level: number;
  rooms: RoomWithMetrics[];
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
}

interface BuildingWithMetrics {
  id: string;
  name: string;
  address: string | null;
  rating: number | null;
  status: BuildingStatus;
  slug: string;
  city: string | null;
  country: string | null;
  floors: FloorWithMetrics[];
  totalFloors: number;
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
}

export interface AnalyticsData {
  timestamp: string;
  buildings: BuildingWithMetrics[];
  summary: {
    totalBuildings: number;
    totalFloors: number;
    totalRooms: number;
    availableRooms: number;
    occupiedRooms: number;
    totalDevices: number;
    onlineDevices: number;
    offlineDevices: number;
    aranetDevices: number;
    aqaraDevices: number;
  };
}

export class AnalyticsService {
  private static aranetService = new AranetDataService();
  private static aqaraService = new AqaraDataService();

  // Helper method to calculate metrics for a collection of rooms
  private static calculateRoomMetrics(rooms: any[]) {
    return {
      totalRooms: rooms.length,
      availableRooms: rooms.filter(r => r.status === 'AVAILABLE').length,
      occupiedRooms: rooms.filter(r => r.status === 'OCCUPIED').length,
      totalDevices: rooms.reduce((sum, room) => sum + room.totalDevices, 0),
      onlineDevices: rooms.reduce((sum, room) => sum + room.onlineDevices, 0),
      offlineDevices: rooms.reduce((sum, room) => sum + room.offlineDevices, 0),
    };
  }

  // Helper method to calculate device metrics
  private static async calculateDeviceMetrics(devices: DeviceWithMetrics[]) {
    // Filter devices by provider
    const aranetDevices = devices.filter(d => d.provider === 'aranet' && d.externalId);
    const aqaraDevices = devices.filter(d => d.provider === 'aqara' && d.externalId);
    
    let onlineSensorsCount = 0;
    
    // Fetch Aranet data if there are Aranet devices
    if (aranetDevices.length > 0) {
      try {
        const sensorIds = aranetDevices.map(d => d.externalId).join(',');
        const response = await this.aranetService.fetchLastMeasurements(sensorIds);
        
        // Count unique sensor IDs in the response (these are online devices)
        const uniqueSensors = new Set(response.readings.map(reading => reading.sensor));
        onlineSensorsCount = uniqueSensors.size;
        
      } catch (error) {
        console.error('Error fetching Aranet measurements:', error);
        onlineSensorsCount = 0;
      }
    }
    
    // Calculate offline devices: all Aqara devices + (Aranet devices - online sensors)
    const offlineDevices = aqaraDevices.length + (aranetDevices.length - onlineSensorsCount);
    
    return {
      totalDevices: devices.length,
      onlineDevices: onlineSensorsCount,
      offlineDevices: offlineDevices,
    };
  }

  // Helper method to batch fetch all sensor data
  private static async fetchAllSensorData(allDevices: any[]) {
    const aranetDevices = allDevices.filter(d => d.provider === 'aranet' && d.externalId);
    const aqaraDevices = allDevices.filter(d => d.provider === 'aqara' && d.externalId);

    const [aranetData, aqaraData] = await Promise.all([
      aranetDevices.length > 0 
        ? this.aranetService.getMultipleSensorsData(
            aranetDevices.map(d => ({ id: d.externalId, part: d.part }))
          ).catch(error => {
            console.error('Error fetching Aranet data:', error);
            return [];
          })
        : Promise.resolve([]),
      aqaraDevices.length > 0
        ? this.aqaraService.getMultipleSensorsData(
            aqaraDevices.map(d => d.externalId)
          ).catch(error => {
            console.error('Error fetching Aqara data:', error);
            return [];
          })
        : Promise.resolve([])
    ]);

    // Create lookup maps for faster access
    const aranetDataMap = new Map(aranetData.map(data => [data.sensorId, data]));
    const aqaraDataMap = new Map(aqaraData.map(data => [data.sensorId, data]));

    return { aranetDataMap, aqaraDataMap };
  }

  static async getComprehensiveAnalytics(): Promise<AnalyticsData> {
    const timestamp = new Date().toISOString();

    // Fetch all buildings with their complete hierarchy
    const buildings = await prisma.building.findMany({
      orderBy: { name: 'asc' },
      include: {
        floors: {
          orderBy: { level: 'asc' },
          include: {
            rooms: {
              orderBy: { name: 'asc' },
              include: {
                devices: {
                  orderBy: { name: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    // Collect all devices for batch processing
    const allDevices: any[] = [];
    const roomDeviceMap = new Map<string, any[]>();
    const powerDevicesByRoom = new Map<string, any>();

    // First pass: collect all devices and power devices
    for (const building of buildings) {
      for (const floor of building.floors) {
        for (const room of floor.rooms) {
          allDevices.push(...room.devices);
          roomDeviceMap.set(room.id, room.devices);
          
          // Find power device for this room
          const powerDevice = room.devices.find(d => 
            d.provider === 'aranet' && d.deviceType === 'POWER'
          );
          if (powerDevice) {
            powerDevicesByRoom.set(room.id, powerDevice);
          }
        }
      }
    }

    // Batch fetch all sensor data
    const { aranetDataMap, aqaraDataMap } = await this.fetchAllSensorData(allDevices);

    // Get power data for all power devices in parallel
    const powerDataPromises = Array.from(powerDevicesByRoom.entries()).map(async ([roomId, device]): Promise<[string, number]> => {
      try {
        const sensorData = aranetDataMap.get(device.externalId);
        const currentPower = sensorData?.readings.find(r => r.metricId === process.env['POWER_METRES_ID'])?.value || 0;
        return [roomId, currentPower];
      } catch (error) {
        console.error(`Error fetching power data for room ${roomId}:`, error);
        return [roomId, 0];
      }
    });

    const powerDataResults = await Promise.all(powerDataPromises);
    const powerDataMap = new Map<string, number>(powerDataResults);

    // Process buildings with cached data
    const processedBuildings: BuildingWithMetrics[] = await Promise.all(
      buildings.map(async (building) => {
        const processedFloors = await Promise.all(
          building.floors.map(async (floor) => {
            const processedRooms = await Promise.all(
              floor.rooms.map(async (room) => {
                const devices = roomDeviceMap.get(room.id) || [];
                
                // Process devices with cached sensor data
                const processedDevices: DeviceWithMetrics[] = devices.map(device => {
                  let sensorData: SensorData | null = null;

                  if (device.provider === 'aranet') {
                    sensorData = aranetDataMap.get(device.externalId) || null;
                  } else if (device.provider === 'aqara') {
                    sensorData = aqaraDataMap.get(device.externalId) || null;
                  }

                  return {
                    id: device.id,
                    name: device.name,
                    externalId: device.externalId,
                    provider: device.provider,
                    status: device.status,
                    sensorData,
                  };
                });

                const deviceMetrics = await this.calculateDeviceMetrics(processedDevices);
                const currentPower = powerDataMap.get(room.id) || 0;

                return {
                  id: room.id,
                  name: room.name,
                  type: room.type,
                  status: room.status,
                  capacity: room.capacity,
                  devices: processedDevices,
                  currentPower,
                  ...deviceMetrics,
                };
              })
            );

            const floorMetrics = this.calculateRoomMetrics(processedRooms);

            return {
              id: floor.id,
              name: floor.name,
              level: floor.level,
              rooms: processedRooms,
              ...floorMetrics,
            };
          })
        );

        const buildingMetrics = this.calculateRoomMetrics(
          processedFloors.flatMap(f => f.rooms)
        );

        return {
          id: building.id,
          name: building.name,
          address: building.address,
          rating: building.rating ? Number(building.rating) : null,
          status: building.status,
          slug: building.slug,
          city: building.city,
          country: building.country,
          floors: processedFloors,
          totalFloors: processedFloors.length,
          ...buildingMetrics,
        };
      })
    );
    // Calculate energy metrics using already fetched data
    const aranetDevices = allDevices.filter(d => d.provider === 'aranet' && d.externalId);
    let total = 0;
    let count = 0;

    // Use already fetched aranet data for energy calculations
    aranetDevices.forEach(device => {
      const sensorData = aranetDataMap.get(device.externalId);
      if (sensorData?.readings) {
        sensorData.readings.forEach(metric => {
          if (metric.metricId === process.env['POWER_METRES_ID']) {
            total += metric.value;
            count++;
          }
        });
      }
    });

    const averageEnergy = count > 0 ? total / count : 0;
    const totalEnergy = total;


    // Get motion devices for presence calculation (parallel processing)
    const motionDevices = allDevices.filter(d => d.deviceType === 'MOTION' && d.externalId);
    const motionDeviceIds = motionDevices.map(d => d.externalId).filter(Boolean);
    
    const presencePromises = motionDeviceIds.map(async (id) => {
      try {
        return await getCurrentPresence(id);
      } catch (error) {
        console.error(`Error getting presence for device ${id}:`, error);
        return 0;
      }
    });
    
    const presenceNumbers = await Promise.all(presencePromises);
    const totalPresence = presenceNumbers.reduce((sum, num) => sum + num, 0);
    console.log("presenceNumber", totalPresence);
    const summary = {
      totalBuildings: processedBuildings.length,
      totalFloors: processedBuildings.reduce((sum, building) => sum + building.totalFloors, 0),
      totalRooms: processedBuildings.reduce((sum, building) => sum + building.totalRooms, 0),
      availableRooms: processedBuildings.reduce((sum, building) => sum + building.availableRooms, 0),
      occupiedRooms: totalPresence,
      totalDevices: processedBuildings.reduce((sum, building) => sum + building.totalDevices, 0),
      onlineDevices: processedBuildings.reduce((sum, building) => sum + building.onlineDevices, 0),
      offlineDevices: processedBuildings.reduce((sum, building) => sum + building.offlineDevices, 0),
      aranetDevices: this.countDevicesByProvider(processedBuildings, 'aranet'),
      aqaraDevices: this.countDevicesByProvider(processedBuildings, 'aqara'),
      averageEnergy: averageEnergy.toFixed(2),
      totalEnergy: totalEnergy.toFixed(2),
      // electricityAnalytics: totalElectricityAnalytics
     
    
    };
    
    return {
      timestamp,
      buildings: processedBuildings,
      summary,
    };
  }

  static async getElectricityAnalytics() {
    // Get pricing from system settings
    const systemSettings = await prisma.systemSettings.findFirst();
    const DAY_PRICE_PER_KWH = systemSettings?.dayPricePerKwh || 0.24;
    const NIGHT_PRICE_PER_KWH = systemSettings?.nightPricePerKwh || 0.16;

    // Get all power devices, excluding room "242"
    const powerDevices = await prisma.device.findMany({
      where: {
        deviceType: "POWER",
        externalId: { not: null },
        room: {
          NOT: {
            name: '242'
          }
        }
      }
    });

    const powerDeviceIds = powerDevices.map(d => d.externalId).filter(Boolean) as string[];

    // Calculate date range for analytics
    const from = new Date();
    const toDate = new Date(from);
    toDate.setMonth(toDate.getMonth() - 1);
    const toStr = from.toISOString().split('.')[0] + 'Z';
    const fromStr = toDate.toISOString().split('.')[0] + 'Z';

    // Batch process electricity analytics with day/night pricing while preserving saving logic
    const electricityAnalyticsPromises = powerDeviceIds.map(async (deviceId) => {
      try {
        // Get the original analytics for saving calculation
        const originalAnalytics = await this.aranetService.getElectricityAnalytics(
          deviceId,
          process.env['POWER_METRES_ID']!,
          fromStr,
          toStr
        );

        // Get raw sensor history data for day/night pricing
        const history = await this.aranetService.getHestory(
          deviceId,
          process.env['POWER_METRES_ID']!,
          fromStr,
          toStr
        );

        // Calculate day/night energy consumption for different periods
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const calculateEnergyAndCost = (readings: any[], fromDate: Date, toDate: Date) => {
          let dayEnergyKwh = 0;
          let nightEnergyKwh = 0;

          if (Array.isArray(readings)) {
            for (const reading of readings) {
              const timestamp = new Date(reading.time);
              if (timestamp >= fromDate && timestamp <= toDate) {
                const hour = timestamp.getHours();
                const energyWh = Number(reading.value) || 0;

                // Day period: 8am (8) to 11pm (23) - 0.24 per kWh
                // Night period: 11pm (23) to 8am (8) - 0.16 per kWh
                //devide here by 1000 if you want convert to kwh
                if (hour >= 8 && hour < 23) {
                  dayEnergyKwh += energyWh ;
                } else {
                  nightEnergyKwh += energyWh ;
                }
              }
            }
          }

          const totalEnergy = dayEnergyKwh + nightEnergyKwh;
          const totalCost = (dayEnergyKwh * DAY_PRICE_PER_KWH) + (nightEnergyKwh * NIGHT_PRICE_PER_KWH);

          return {
            energy: totalEnergy.toFixed(2),
            cost: totalCost.toFixed(2)
          };
        };

        const readings = (history as any)?.readings || [];

        // Calculate new costs with day/night pricing
        const monthData = calculateEnergyAndCost(readings, toDate, from);
        const weekData = calculateEnergyAndCost(readings, oneWeekAgo, from);
        const dayData = calculateEnergyAndCost(readings, oneDayAgo, from);

        return {
          month: {
            energy: monthData.energy,
            cost: monthData.cost,
            persintage: originalAnalytics.month.persintage,
            saving: originalAnalytics.month.saving // Preserve original saving logic
          },
          week: {
            energy: weekData.energy,
            cost: weekData.cost,
            persintage: originalAnalytics.week.persintage,
            saving: originalAnalytics.week.saving // Preserve original saving logic
          },
          day: {
            energy: dayData.energy,
            cost: dayData.cost,
            persintage: originalAnalytics.day.persintage,
            saving: originalAnalytics.day.saving // Preserve original saving logic
          }
        };

      } catch (error) {
        console.error(`Error fetching electricity analytics for device ${deviceId}:`, error);
        return {
          month: { energy: "0", cost: "0", saving: "0", persintage: "0" },
          week: { energy: "0", cost: "0", saving: "0", persintage: "0" },
          day: { energy: "0", cost: "0", saving: "0", persintage: "0" }
        };
      }
    });

    const electricityResults = await Promise.all(electricityAnalyticsPromises);

    // Aggregate electricity analytics (sum energy, cost, and saving)
    const aggregatedData = electricityResults.reduce((acc, analytics) => {
      (['month', 'week', 'day'] as const).forEach(period => {
        acc[period].energy = (parseFloat(acc[period].energy) + parseFloat(analytics[period].energy)).toFixed(2);
        acc[period].cost = (parseFloat(acc[period].cost) + parseFloat(analytics[period].cost)).toFixed(2);
        acc[period].saving = (parseFloat(acc[period].saving) + parseFloat(analytics[period].saving)).toFixed(2);
      });
      return acc;
    }, {
      month: { energy: "0", cost: "0", saving: "0" },
      week: { energy: "0", cost: "0", saving: "0" },
      day: { energy: "0", cost: "0", saving: "0" }
    });

    // Calculate percentage based on total cost
    // Week percentage = (current week cost / previous week cost) * 100
    // Previous week cost = current week cost + week saving
    const weekPreviousCost = parseFloat(aggregatedData.week.cost) + parseFloat(aggregatedData.week.saving);
    const weekPersintage = weekPreviousCost > 0
      ? ((parseFloat(aggregatedData.week.cost) / weekPreviousCost) * 100).toFixed(2)
      : "0";

    // Day percentage = (current day cost / previous day cost) * 100
    // Previous day cost = current day cost + day saving
    const dayPreviousCost = parseFloat(aggregatedData.day.cost) + parseFloat(aggregatedData.day.saving);
    const dayPersintage = dayPreviousCost > 0
      ? ((parseFloat(aggregatedData.day.cost) / dayPreviousCost) * 100).toFixed(2)
      : "0";

    // Month percentage is 0 (no previous month comparison)
    const monthPersintage = "0";

    // Build final result with percentages
    const totalElectricityAnalytics = {
      month: {
        energy: aggregatedData.month.energy,
        cost: aggregatedData.month.cost,
        saving: aggregatedData.month.saving,
        persintage: monthPersintage
      },
      week: {
        energy: aggregatedData.week.energy,
        cost: aggregatedData.week.cost,
        saving: aggregatedData.week.saving,
        persintage: weekPersintage
      },
      day: {
        energy: aggregatedData.day.energy,
        cost: aggregatedData.day.cost,
        saving: aggregatedData.day.saving,
        persintage: dayPersintage
      }
    };

    return {
      timestamp: new Date().toISOString(),
      totalDevices: powerDeviceIds.length,
      electricityAnalytics: totalElectricityAnalytics
    };
  }

  static async getBuildingAnalytics(buildingId: string): Promise<BuildingWithMetrics> {
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: {
        floors: {
          orderBy: { level: 'asc' },
          include: {
            rooms: {
              orderBy: { name: 'asc' },
              include: {
                devices: {
                  orderBy: { name: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!building) {
      throw new Error('Building not found');
    }

    const analytics = await this.getComprehensiveAnalytics();
    const buildingAnalytics = analytics.buildings.find(b => b.id === buildingId);

    if (!buildingAnalytics) {
      throw new Error('Building analytics not found');
    }

    return buildingAnalytics;
  }

  static async getCurrentSensorDataByFloor(buildingId: string, floorId: string) {
    const timestamp = new Date().toISOString();

    // Fetch the specific building and floor with all rooms and devices
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: {
        floors: {
          where: { id: floorId },
          include: {
            rooms: {
              orderBy: { name: 'asc' },
              include: {
                devices: {
                  orderBy: { name: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!building) {
      throw new Error('Building not found');
    }

    if (!building.floors || building.floors.length === 0) {
      throw new Error('Floor not found');
    }

    const floor = building.floors[0];
    if (!floor) {
      throw new Error('Floor not found');
    }
    
    // Collect all devices from all rooms in this floor
    const allDevices: any[] = [];
    const roomDeviceMap = new Map<string, any[]>();

    for (const room of floor.rooms) {
      allDevices.push(...room.devices);
      roomDeviceMap.set(room.id, room.devices);
    }

    // Batch fetch all sensor data using the optimized approach
    const { aranetDataMap, aqaraDataMap } = await this.fetchAllSensorData(allDevices);

    // Process rooms with current sensor data
    const roomsWithSensorData: any[] = [];
    
    floor.rooms.forEach(room => {
      const devices = roomDeviceMap.get(room.id) || [];
      
      if (room.type === 'SUITE') {
        // For suites, split into two rooms based on environment sensor parts
        const environmentSensors = devices.filter(d => d.deviceType === 'ENVIRONMENT');
        const powerSensor = devices.find(d => d.deviceType === 'POWER');
        
        // Get unique parts from environment sensors
        const parts = [...new Set(environmentSensors.map(d => d.part).filter(Boolean))];
        
        if (parts.length > 0) {
          parts.forEach((part) => {
            const partDevices = environmentSensors.filter(d => d.part === part);
            
            // Extract sensor readings for this part
            const currentReadings = {
              power: null as number | null,
              temperature: null as number | null,
              humidity: null as number | null,
              pressure: null as number | null,
              co2: null as number | null,
            };

            // Process environment sensors for this part
            partDevices.forEach(device => {
              let sensorData: SensorData | null = null;

              if (device.provider === 'aranet' && device.externalId) {
                sensorData = aranetDataMap.get(device.externalId) || null;
              } else if (device.provider === 'aqara' && device.externalId) {
                sensorData = aqaraDataMap.get(device.externalId) || null;
              }

              if (sensorData?.readings) {
                sensorData.readings.forEach(reading => {
                  console.log("metricName", reading.metricName);
                  switch (reading.metricName?.toLowerCase()) {
                    case 'temperature':
                      currentReadings.temperature = reading.value;
                      break;
                    case 'humidity':
                      currentReadings.humidity = reading.value;
                      break;
                    case 'atmospheric pressure':
                      currentReadings.pressure = reading.value;
                      break;
                    case 'co₂':
                    case 'carbon dioxide':
                      currentReadings.co2 = reading.value;
                      break;
                  }
                });
              }
            });

            // Add power data (split between rooms if multiple parts)
            if (powerSensor) {
              const powerSensorData = aranetDataMap.get(powerSensor.externalId) || null;
              if (powerSensorData?.readings) {
                const powerReading = powerSensorData.readings.find(r => r.metricId === process.env['POWER_METRES_ID']);
                if (powerReading) {
                  // Divide power equally between suite rooms
                  currentReadings.power = (powerReading.value / 1000) / parts.length;
                }
              }
            }

            roomsWithSensorData.push({
              id: `${room.id}_${part}`,
              name: `${room.name} - ${part}`,
              type: room.type,
              status: room.status,
              capacity: Math.ceil(room.capacity / parts.length),
              sensorReadings: currentReadings,
              deviceCount: partDevices.length + (powerSensor ? 1 : 0),
              onlineDevices: partDevices.filter(d => d.status === 'ONLINE').length + (powerSensor?.status === 'ONLINE' ? 1 : 0),
              lastUpdate: timestamp,
              originalRoomId: room.id,
              part: part,
            });
          });
        } else {
          // Fallback for suites without parts - treat as single room
          const currentReadings = {
            power: null as number | null,
            temperature: null as number | null,
            humidity: null as number | null,
            pressure: null as number | null,
            co2: null as number | null,
          };

          devices.forEach(device => {
            let sensorData: SensorData | null = null;

            if (device.provider === 'aranet' && device.externalId) {
              sensorData = aranetDataMap.get(device.externalId) || null;
            } else if (device.provider === 'aqara' && device.externalId) {
              sensorData = aqaraDataMap.get(device.externalId) || null;
            }

            if (sensorData?.readings) {
              sensorData.readings.forEach(reading => {
                console.log("metricName", reading.metricName);
                switch (reading.metricName?.toLowerCase()) {
                  case 'temperature':
                    currentReadings.temperature = reading.value;
                    break;
                  case 'humidity':
                    currentReadings.humidity = reading.value;
                    break;
                  case 'atmospheric pressure':
                    currentReadings.pressure = reading.value;
                    break;
                  case 'co₂':
                  case 'carbon dioxide':
                    currentReadings.co2 = reading.value;
                    break;
                  default:
                    if (reading.metricId === process.env['POWER_METRES_ID']) {
                      currentReadings.power = reading.value / 1000;
                    }
                    break;
                }
              });
            }
          });

          roomsWithSensorData.push({
            id: room.id,
            name: room.name,
            type: room.type,
            status: room.status,
            capacity: room.capacity,
            sensorReadings: currentReadings,
            deviceCount: devices.length,
            onlineDevices: devices.filter(d => d.status === 'ONLINE').length,
            lastUpdate: timestamp,
          });
        }
      } else {
        // For regular rooms, process normally
        const currentReadings = {
          power: null as number | null,
          temperature: null as number | null,
          humidity: null as number | null,
          pressure: null as number | null,
          co2: null as number | null,
        };

        devices.forEach(device => {
          let sensorData: SensorData | null = null;

          if (device.provider === 'aranet' && device.externalId) {
            sensorData = aranetDataMap.get(device.externalId) || null;
          } else if (device.provider === 'aqara' && device.externalId) {
            sensorData = aqaraDataMap.get(device.externalId) || null;
          }

          if (sensorData?.readings) {
            sensorData.readings.forEach(reading => {
              console.log("metricName", reading.metricName);
              switch (reading.metricName?.toLowerCase()) {
                case 'temperature':
                  currentReadings.temperature = reading.value;
                  break;
                case 'humidity':
                  currentReadings.humidity = reading.value;
                  break;
                case 'atmospheric pressure':
                  currentReadings.pressure = reading.value;
                  break;
                case 'co₂':
                case 'carbon dioxide':
                  currentReadings.co2 = reading.value;
                  break;
                default:
                  if (reading.metricId === process.env['POWER_METRES_ID']) {
                    currentReadings.power = reading.value / 1000;
                  }
                  break;
              }
            });
          }
        });

        roomsWithSensorData.push({
          id: room.id,
          name: room.name,
          type: room.type,
          status: room.status,
          capacity: room.capacity,
          sensorReadings: currentReadings,
          deviceCount: devices.length,
          onlineDevices: devices.filter(d => d.status === 'ONLINE').length,
          lastUpdate: timestamp,
        });
      }
    });

    return {
      timestamp,
      building: {
        id: building.id,
        name: building.name,
      },
      floor: {
        id: floor.id,
        name: floor.name,
        level: floor.level,
      },
      rooms: roomsWithSensorData,
      summary: {
        totalRooms: roomsWithSensorData.length,
        roomsWithData: roomsWithSensorData.filter(r => 
          Object.values(r.sensorReadings).some(v => v !== null)
        ).length,
        totalDevices: roomsWithSensorData.reduce((sum, r) => sum + r.deviceCount, 0),
        onlineDevices: roomsWithSensorData.reduce((sum, r) => sum + r.onlineDevices, 0),
      },
    };
  }

  private static countDevicesByProvider(buildings: BuildingWithMetrics[], provider: string): number {
    return buildings.reduce((total, building) => 
      total + building.floors.reduce((floorTotal, floor) =>
        floorTotal + floor.rooms.reduce((roomTotal, room) =>
          roomTotal + room.devices.filter(device => device.provider === provider).length, 0
        ), 0
      ), 0
    );
  }
}