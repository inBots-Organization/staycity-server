import { prisma } from '../config/prisma';
import { RoomType, RoomStatus } from '../generated/prisma';
import AranetDataService, { SensorData } from './aranetDataService';
import AqaraDataService from './aqaraDataService';

export interface CreateRoomData {
  buildingId: string;
  floorId: string;
  name: string;
  type?: RoomType;
  status?: RoomStatus;
  capacity?: number;
  deviceIds?: string[]; // Aranet sensor IDs
}

export interface UpdateRoomData {
  name?: string;
  type?: RoomType;
  status?: RoomStatus;
  capacity?: number;
  deviceIds?: string[]; // Aranet sensor IDs
}

export interface ListRoomsParams {
  buildingId?: string | undefined;
  floorId?: string | undefined;
  status?: RoomStatus | undefined;
  type?: RoomType | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}

export class RoomService {
  private static aranetService = new AranetDataService();
  private static aqaraService = new AqaraDataService();

  static async create(data: CreateRoomData) {
    // Verify floor exists and belongs to building
    const floor = await prisma.floor.findUnique({
      where: { id: data.floorId },
      select: { id: true, buildingId: true },
    });

    if (!floor) {
      throw new Error('Floor not found');
    }

    if (floor.buildingId !== data.buildingId) {
      throw new Error('Floor does not belong to the specified building');
    }

    const room = await prisma.room.create({
      data: {
        buildingId: data.buildingId,
        floorId: data.floorId,
        name: data.name,
        type: data.type || 'ROOM',
        status: data.status || 'AVAILABLE',
        capacity: data.capacity || 2,
        deviceIds: data.deviceIds || [],
      },
      include: {
        building: {
          select: { id: true, name: true },
        },
        floor: {
          select: { id: true, name: true, level: true },
        },
      },
    });

    // Update building statistics
    await this.updateBuildingStats(data.buildingId);

    return room;
  }

  static async list(params: ListRoomsParams = {}) {
    const take = params.pageSize ? Math.min(params.pageSize, 100) : undefined;
    const skip = params.page && take ? (params.page - 1) * take : undefined;

    const where = {
      ...(params.buildingId && { buildingId: params.buildingId }),
      ...(params.floorId && { floorId: params.floorId }),
      ...(params.status && { status: params.status }),
      ...(params.type && { type: params.type }),
    };

    const [items, total] = await Promise.all([
      prisma.room.findMany({
        where,
        ...(skip !== undefined && { skip }),
        ...(take && { take }),
        orderBy: { name: 'asc' },
        include: {
          building: {
            select: { id: true, name: true },
          },
          floor: {
            select: { id: true, name: true, level: true },
          },
        },
      }),
      prisma.room.count({ where }),
    ]);

    return {
      items,
      total,
      page: params.page || 1,
      pageSize: take || total,
      totalPages: take ? Math.ceil(total / take) : 1,
    };
  }

  static async getById(id: string) {
    return prisma.room.findUnique({
      where: { id },
      include: {
        building: {
          select: { id: true, name: true, address: true },
        },
        floor: {
          select: { id: true, name: true, level: true },
        },
      },
    });
  }

  static async getByIdWithMetrics(id: string): Promise<{
    id: string;
    name: string;
    buildingId: string;
    floorId: string;
    type: RoomType;
    status: RoomStatus;
    capacity: number;
    deviceIds: string[];
    building: { id: string; name: string; address: string | null };
    floor: { id: string; name: string; level: number };
    deviceMetrics: SensorData[];
  } | null> {
    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        building: {
          select: { id: true, name: true, address: true },
        },
        floor: {
          select: { id: true, name: true, level: true },
        },
        devices: {
          select: { id: true, externalId: true, provider: true, name: true },
        },
      },
    });

    if (!room) {
      return null;
    }

    // Group devices by provider
    const aranetDevices = room.devices.filter((d) => d.provider === 'aranet');
    const aqaraDevices = room.devices.filter((d) => d.provider === 'aqara');

    // Fetch device metrics from both providers
    const deviceMetrics: SensorData[] = [];

    // Fetch Aranet data
    if (aranetDevices.length > 0) {
      try {
        const aranetIds = [
          ...room.deviceIds, // Keep backward compatibility with existing deviceIds array
          ...(aranetDevices
            .map((d) => d.externalId)
            .filter(Boolean) as string[]),
        ];

        if (aranetIds.length > 0) {
          const aranetDataList =
            await this.aranetService.getMultipleSensorsData(aranetIds);
          deviceMetrics.push(...aranetDataList);
        }
      } catch (error) {
        console.error('Error fetching Aranet sensor data:', error);
      }
    }

    // Fetch Aqara data
    if (aqaraDevices.length > 0) {
      
      try {
        const aqaraIds = aqaraDevices
          .map((d) => d.externalId)
          .filter(Boolean) as string[];
        if (aqaraIds.length > 0) {
          const aqaraDataList =
            await this.aqaraService.getMultipleSensorsData(aqaraIds);
            console.log("aqaraDataList",aqaraDataList)
          deviceMetrics.push(...aqaraDataList);
        }

      } catch (error) {
        console.error('Error fetching Aqara sensor data:', error);
      }
    }
   
    return {
      ...room,
      deviceMetrics,
    };
  }

  static async getByFloorId(floorId: string) {
    return prisma.room.findMany({
      where: { floorId },
      orderBy: { name: 'asc' },
      include: {
        building: {
          select: { id: true, name: true },
        },
        floor: {
          select: { id: true, name: true, level: true },
        },
      },
    });
  }

  static async getByBuildingId(buildingId: string) {
    return prisma.room.findMany({
      where: { buildingId },
      orderBy: [{ floor: { level: 'asc' } }, { name: 'asc' }],
      include: {
        building: {
          select: { id: true, name: true },
        },
        floor: {
          select: { id: true, name: true, level: true },
        },
      },
    });
  }

  static async update(id: string, data: UpdateRoomData) {
    const room = await prisma.room.findUnique({
      where: { id },
      select: { buildingId: true },
    });

    if (!room) {
      throw new Error('Room not found');
    }

    const updated = await prisma.room.update({
      where: { id },
      data,
      include: {
        building: {
          select: { id: true, name: true },
        },
        floor: {
          select: { id: true, name: true, level: true },
        },
      },
    });

    // Update building statistics if status or capacity changed
    if (data.status !== undefined || data.capacity !== undefined) {
      await this.updateBuildingStats(room.buildingId);
    }

    return updated;
  }

  static async delete(id: string) {
    const room = await prisma.room.findUnique({
      where: { id },
      select: { buildingId: true },
    });

    if (!room) {
      throw new Error('Room not found');
    }

    await prisma.room.delete({
      where: { id },
    });

    // Update building statistics
    await this.updateBuildingStats(room.buildingId);

    return { success: true };
  }

  static async addDeviceIds(roomId: string, deviceIds: string[]) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { deviceIds: true },
    });

    if (!room) {
      throw new Error('Room not found');
    }

    const updatedDeviceIds = [...new Set([...room.deviceIds, ...deviceIds])];

    return prisma.room.update({
      where: { id: roomId },
      data: { deviceIds: updatedDeviceIds },
      include: {
        building: {
          select: { id: true, name: true },
        },
        floor: {
          select: { id: true, name: true, level: true },
        },
      },
    });
  }

  static async removeDeviceIds(roomId: string, deviceIds: string[]) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { deviceIds: true },
    });

    if (!room) {
      throw new Error('Room not found');
    }

    const updatedDeviceIds = room.deviceIds.filter(
      (id) => !deviceIds.includes(id)
    );

    return prisma.room.update({
      where: { id: roomId },
      data: { deviceIds: updatedDeviceIds },
      include: {
        building: {
          select: { id: true, name: true },
        },
        floor: {
          select: { id: true, name: true, level: true },
        },
      },
    });
  }

  static async linkDevicesToRoom(roomId: string, deviceIds: string[]) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, buildingId: true, floorId: true },
    });

    if (!room) {
      throw new Error('Room not found');
    }

    // Verify devices exist and belong to the same building
    const devices = await prisma.device.findMany({
      where: {
        id: { in: deviceIds },
        buildingId: room.buildingId,
      },
      select: { id: true },
    });

    if (devices.length !== deviceIds.length) {
      throw new Error(
        'Some devices not found or do not belong to the same building as the room'
      );
    }

    // Update devices to link them to the room
    await prisma.device.updateMany({
      where: { id: { in: deviceIds } },
      data: {
        roomId: roomId,
        floorId: room.floorId, // Also update floor to match room's floor
      },
    });

    // Return updated room with devices
    return prisma.room.findUnique({
      where: { id: roomId },
      include: {
        building: {
          select: { id: true, name: true },
        },
        floor: {
          select: { id: true, name: true, level: true },
        },
        devices: true,
      },
    });
  }

  static async unlinkDevicesFromRoom(roomId: string, deviceIds: string[]) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true },
    });

    if (!room) {
      throw new Error('Room not found');
    }

    // Verify devices belong to this room
    const devices = await prisma.device.findMany({
      where: {
        id: { in: deviceIds },
        roomId: roomId,
      },
      select: { id: true },
    });

    if (devices.length !== deviceIds.length) {
      throw new Error('Some devices not found or do not belong to this room');
    }

    // Update devices to unlink them from the room
    await prisma.device.updateMany({
      where: { id: { in: deviceIds } },
      data: { roomId: null },
    });

    // Return updated room with devices
    return prisma.room.findUnique({
      where: { id: roomId },
      include: {
        building: {
          select: { id: true, name: true },
        },
        floor: {
          select: { id: true, name: true, level: true },
        },
        devices: true,
      },
    });
  }

  static async getRoomDevices(roomId: string) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true },
    });

    if (!room) {
      throw new Error('Room not found');
    }

    return prisma.device.findMany({
      where: { roomId },
      orderBy: [{ name: 'asc' }],
      include: {
        building: {
          select: { id: true, name: true },
        },
        floor: {
          select: { id: true, name: true, level: true },
        },
        room: {
          select: { id: true, name: true },
        },
      },
    });
  }

  private static async updateBuildingStats(buildingId: string) {
    const [totalRooms, availableRooms, capacitySum] = await Promise.all([
      prisma.room.count({ where: { buildingId } }),
      prisma.room.count({ where: { buildingId, status: 'AVAILABLE' } }),
      prisma.room.aggregate({
        where: { buildingId },
        _sum: { capacity: true },
      }),
    ]);

    const totalCapacity = capacitySum._sum.capacity || 0;
    const occupiedRooms = totalRooms - availableRooms;

    await Promise.all([
      prisma.buildingStats.upsert({
        where: { buildingId },
        create: {
          buildingId,
          currentGuests: occupiedRooms * 2, // Simplified assumption
          totalCapacity,
          totalRooms,
          availableRooms,
        },
        update: {
          currentGuests: occupiedRooms * 2,
          totalCapacity,
          totalRooms,
          availableRooms,
        },
      }),
      prisma.building.update({
        where: { id: buildingId },
        data: { noOfRooms: totalRooms },
      }),
    ]);
  }
}
