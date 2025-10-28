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
  private static calculateDeviceMetrics(devices: DeviceWithMetrics[]) {
    return {
      totalDevices: devices.length,
      onlineDevices: devices.filter(d => d.status === 'ONLINE').length,
      offlineDevices: devices.filter(d => d.status === 'OFFLINE').length,
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
        const currentPower = sensorData?.readings.find(r => r.metricId === process.env.POWER_METRES_ID)?.value || 0;
        return [roomId, currentPower];
      } catch (error) {
        console.error(`Error fetching power data for room ${roomId}:`, error);
        return [roomId, 0];
      }
    });

    const powerDataResults = await Promise.all(powerDataPromises);
    const powerDataMap = new Map<string, number>(powerDataResults);

    // Process buildings with cached data
    const processedBuildings: BuildingWithMetrics[] = buildings.map(building => {
      const processedFloors: FloorWithMetrics[] = building.floors.map(floor => {
        const processedRooms: RoomWithMetrics[] = floor.rooms.map(room => {
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

          const deviceMetrics = this.calculateDeviceMetrics(processedDevices);
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
        });

        const floorMetrics = this.calculateRoomMetrics(processedRooms);

        return {
          id: floor.id,
          name: floor.name,
          level: floor.level,
          rooms: processedRooms,
          ...floorMetrics,
        };
      });

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
    });
    // Calculate energy metrics using already fetched data
    const aranetDevices = allDevices.filter(d => d.provider === 'aranet' && d.externalId);
    let total = 0;
    let count = 0;

    // Use already fetched aranet data for energy calculations
    aranetDevices.forEach(device => {
      const sensorData = aranetDataMap.get(device.externalId);
      if (sensorData?.readings) {
        sensorData.readings.forEach(metric => {
          if (metric.metricId === process.env.POWER_METRES_ID) {
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
    // Get all power devices
    const powerDevices = await prisma.device.findMany({
      where: {
        deviceType: "POWER",
        externalId: { not: null }
      }
    });

    const powerDeviceIds = powerDevices.map(d => d.externalId).filter(Boolean) as string[];

    // Calculate date range for analytics
    const from = new Date();
    const toDate = new Date(from);
    toDate.setMonth(toDate.getMonth() - 1);
    const toStr = from.toISOString().split('.')[0] + 'Z';
    const fromStr = toDate.toISOString().split('.')[0] + 'Z';

    // Batch process electricity analytics in parallel
    const electricityAnalyticsPromises = powerDeviceIds.map(async (deviceId) => {
      try {
        return await this.aranetService.getElectricityAnalytics(
          deviceId,
          process.env.POWER_METRES_ID!,
          fromStr,
          toStr
        );
      } catch (error) {
        console.error(`Error fetching electricity analytics for device ${deviceId}:`, error);
        return {
          month: { energy: "0", cost: "0", saving: "0" },
          week: { energy: "0", cost: "0", saving: "0" },
          day: { energy: "0", cost: "0", saving: "0" }
        };
      }
    });

    const electricityResults = await Promise.all(electricityAnalyticsPromises);

    // Aggregate electricity analytics
    const totalElectricityAnalytics = electricityResults.reduce((acc, analytics) => {
      ['month', 'week', 'day'].forEach(period => {
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