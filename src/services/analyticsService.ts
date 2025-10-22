import { prisma } from '../config/prisma';
import { BuildingStatus, RoomType, RoomStatus, DeviceStatus } from '../generated/prisma';
import AranetDataService, { SensorData, SensorDevice } from './aranetDataService';
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

    const processedBuildings: BuildingWithMetrics[] = [];

    for (const building of buildings) {
      const processedFloors: FloorWithMetrics[] = [];

      for (const floor of building.floors) {
        const processedRooms: RoomWithMetrics[] = [];

        for (const room of floor.rooms) {
          const processedDevices: DeviceWithMetrics[] = [];

          // Group devices by provider for efficient batch processing
          const aranetDevices = room.devices.filter(d => d.provider === 'aranet');
          const aqaraDevices = room.devices.filter(d => d.provider === 'aqara');

          // Fetch sensor data for Aranet devices
          let aranetSensorData: SensorData[] = [];
          if (aranetDevices.length > 0) {
            try {
              // Include both deviceIds array (legacy) and device externalIds with part info
              const aranetSensors: SensorDevice[] = [
                ...room.deviceIds.map(id => ({ id })), // Legacy deviceIds array
                ...aranetDevices
                  .filter(d => d.externalId)
                  .map(d => ({ id: d.externalId!, part: d.part }))
              ];

              if (aranetSensors.length > 0) {
                aranetSensorData = await this.aranetService.getMultipleSensorsData(aranetSensors);
              }
            } catch (error) {
              console.error(`Error fetching Aranet data for room ${room.name}:`, error);
            }
          }

          // Fetch sensor data for Aqara devices
          let aqaraSensorData: SensorData[] = [];
          if (aqaraDevices.length > 0) {
            try {
              const aqaraIds = aqaraDevices.map(d => d.externalId).filter(Boolean) as string[];
              if (aqaraIds.length > 0) {
                aqaraSensorData = await this.aqaraService.getMultipleSensorsData(aqaraIds);
              }
            } catch (error) {
              console.error(`Error fetching Aqara data for room ${room.name}:`, error);
            }
          }

          // Process each device and match with sensor data
          for (const device of room.devices) {
            let sensorData: SensorData | null = null;

            if (device.provider === 'aranet') {
              sensorData = aranetSensorData.find(data => 
                data.sensorId === device.externalId || 
                room.deviceIds.includes(device.externalId || '')
              ) || null;
            } else if (device.provider === 'aqara') {
              sensorData = aqaraSensorData.find(data => 
                data.sensorId === device.externalId
              ) || null;
            }

            processedDevices.push({
              id: device.id,
              name: device.name,
              externalId: device.externalId,
              provider: device.provider,
              status: device.status,
              sensorData,
            });
          }

          // Calculate room metrics
          const totalDevices = processedDevices.length;
          const onlineDevices = processedDevices.filter(d => d.status === 'ONLINE').length;
          const offlineDevices = processedDevices.filter(d => d.status === 'OFFLINE').length;
          console.log("room",room)
          const powerDevices = await prisma.device.findMany({
            where: {
              roomId: room.id,
              provider: 'aranet',
              deviceType: "POWER"
            },
          })
          let currentPower = 0
          if(powerDevices.length > 0){
            const powerDevice = powerDevices[0]
            const currentEnergy = await this.aranetService.getSensorData(powerDevice.externalId || '', powerDevice.part);
            console.log("currentEnergy",currentEnergy)
            currentPower =currentEnergy.readings.filter((el)=>el.metricId ===process.env.POWER_METRES_ID )[0]?.value || 0
          }
          
          console.log(currentPower)
          processedRooms.push({
            id: room.id,
            name: room.name,
            type: room.type,
            status: room.status,
            capacity: room.capacity,
            devices: processedDevices,
            currentPower:currentPower || 0,
            totalDevices,
            onlineDevices,
            offlineDevices,
          });
        }
       

        // Calculate floor metrics
        const totalRooms = processedRooms.length;
        const availableRooms = processedRooms.filter(r => r.status === 'AVAILABLE').length;
        const occupiedRooms = processedRooms.filter(r => r.status === 'OCCUPIED').length;
        const totalDevices = processedRooms.reduce((sum, room) => sum + room.totalDevices, 0);
        const onlineDevices = processedRooms.reduce((sum, room) => sum + room.onlineDevices, 0);
        const offlineDevices = processedRooms.reduce((sum, room) => sum + room.offlineDevices, 0);

        processedFloors.push({
          id: floor.id,
          name: floor.name,
          level: floor.level,
          rooms: processedRooms,
          totalRooms,
          availableRooms,
          occupiedRooms,
          totalDevices,
          onlineDevices,
          offlineDevices,
        });
      }

      // Calculate building metrics
      const totalFloors = processedFloors.length;
      const totalRooms = processedFloors.reduce((sum, floor) => sum + floor.totalRooms, 0);
      const availableRooms = processedFloors.reduce((sum, floor) => sum + floor.availableRooms, 0);
      const occupiedRooms = processedFloors.reduce((sum, floor) => sum + floor.occupiedRooms, 0);
      const totalDevices = processedFloors.reduce((sum, floor) => sum + floor.totalDevices, 0);
      const onlineDevices = processedFloors.reduce((sum, floor) => sum + floor.onlineDevices, 0);
      const offlineDevices = processedFloors.reduce((sum, floor) => sum + floor.offlineDevices, 0);

      processedBuildings.push({
        id: building.id,
        name: building.name,
        address: building.address,
        rating: building.rating ? Number(building.rating) : null,
        status: building.status,
        slug: building.slug,
        city: building.city,
        country: building.country,
        floors: processedFloors,
        totalFloors,
        totalRooms,
        availableRooms,
        occupiedRooms,
        totalDevices,
        onlineDevices,
        offlineDevices,
      });
    }
    //get the average energy for the app

    //get the aranet devises
    const aranetDevises =await prisma.device.findMany({
      where: {
        provider: 'aranet',
      }
    })
    const aranetDevisesIds=aranetDevises.map((d)=>({ id: d.externalId!, part: d.part }))
    let total = 0;
  let count = 0;
    if(aranetDevisesIds.length>0){
      const data = await this.aranetService.getMultipleSensorsData(aranetDevisesIds)    
      const reading = data.map((el)=>el.readings)
      
      

  reading.forEach(deviceMetrics => {
    deviceMetrics.forEach(metric => {
      if (metric.metricId === process.env.POWER_METRES_ID ) {
        total += metric.value;
        count++;
      }
    });
  });
       
        
    }
    const averageEnergy = total/count || 0;
    const totalEnergy = total;
    //calculate the last [day - week - month] energy and energy cost
    const powerDevises = await prisma.device.findMany({
      where: {
        deviceType: "POWER",
      }
    })
    const from = new Date();

// clone it and subtract one month
const toDate = new Date(from);
toDate.setMonth(toDate.getMonth() - 1);

// convert both to ISO strings (without milliseconds)
const toStr = from.toISOString().split('.')[0] + 'Z';
const  fromStr= toDate.toISOString().split('.')[0] + 'Z';

console.log("from:", fromStr);
console.log("to:", toStr);
const powerDevisesIds = powerDevises.map((d)=>d.externalId)
    
    // Get electricity analytics for all power sensors and combine them
    let totalElectricityAnalytics = {
      month: { energy: "0", cost: "0" },
      week: { energy: "0", cost: "0" },
      day: { energy: "0", cost: "0" }
    };
    
    // Process all power devices
    for (const deviceId of powerDevisesIds) {
      const sensorAnalytics = await this.aranetService.getElectricityAnalytics(
        deviceId,
        process.env.POWER_METRES_ID,
        fromStr,
        toStr
      );
      
      // Add values to the total
      totalElectricityAnalytics.month.energy = (parseFloat(totalElectricityAnalytics.month.energy) + parseFloat(sensorAnalytics.month.energy)).toFixed(2);
      totalElectricityAnalytics.month.cost = (parseFloat(totalElectricityAnalytics.month.cost) + parseFloat(sensorAnalytics.month.cost)).toFixed(2);
      totalElectricityAnalytics.week.energy = (parseFloat(totalElectricityAnalytics.week.energy) + parseFloat(sensorAnalytics.week.energy)).toFixed(2);
      totalElectricityAnalytics.week.cost = (parseFloat(totalElectricityAnalytics.week.cost) + parseFloat(sensorAnalytics.week.cost)).toFixed(2);
      totalElectricityAnalytics.day.energy = (parseFloat(totalElectricityAnalytics.day.energy) + parseFloat(sensorAnalytics.day.energy)).toFixed(2);
      totalElectricityAnalytics.day.cost = (parseFloat(totalElectricityAnalytics.day.cost) + parseFloat(sensorAnalytics.day.cost)).toFixed(2);
    }
    
    const electricityAnalytics = totalElectricityAnalytics;
    
    // Calculate overall summary
    //calculate the personce number
    const motionDevises = await prisma.device.findMany({
      where: {
        deviceType: "MOTION",
      }
    })
    const motionDevisesIds = motionDevises.map((d)=>d.externalId)
    const presenceNumber = await Promise.all(motionDevisesIds.map(async (id)=>await getCurrentPresence(id!)))
    console.log("presenceNumber",presenceNumber.reduce((sum, num) => sum + num, 0))
    const summary = {
      totalBuildings: processedBuildings.length,
      totalFloors: processedBuildings.reduce((sum, building) => sum + building.totalFloors, 0),
      totalRooms: processedBuildings.reduce((sum, building) => sum + building.totalRooms, 0),
      availableRooms: processedBuildings.reduce((sum, building) => sum + building.availableRooms, 0),
      occupiedRooms: presenceNumber.reduce((sum, num) => sum + num, 0),
      totalDevices: processedBuildings.reduce((sum, building) => sum + building.totalDevices, 0),
      onlineDevices: processedBuildings.reduce((sum, building) => sum + building.onlineDevices, 0),
      offlineDevices: processedBuildings.reduce((sum, building) => sum + building.offlineDevices, 0),
      aranetDevices: this.countDevicesByProvider(processedBuildings, 'aranet'),
      aqaraDevices: this.countDevicesByProvider(processedBuildings, 'aqara'),
      averageEnergy: averageEnergy.toFixed(2),
      totalEnergy: totalEnergy.toFixed(2),
      electricityAnalytics
    };
    console.log("summary",summary)
    return {
      timestamp,
      buildings: processedBuildings,
      summary,
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