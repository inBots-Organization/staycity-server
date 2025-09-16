import { prisma } from '../config/prisma';
import { DeviceStatus } from '../generated/prisma';

export interface CreateDeviceData {
  buildingId: string;
  floorId?: string;
  roomId?: string;
  typeId?: string;
  name: string;
  externalId?: string;
  provider: string;
  status?: DeviceStatus;
  payload?: any;
}

export interface UpdateDeviceData {
  name?: string;
  externalId?: string;
  status?: DeviceStatus;
  payload?: any;
  floorId?: string;
  roomId?: string;
  typeId?: string;
}

export interface ListDevicesParams {
  buildingId?: string;
  floorId?: string;
  roomId?: string;
  provider?: string;
  status?: DeviceStatus;
  typeId?: string;
  page?: number;
  pageSize?: number;
}

export class DeviceService {
  static async create(data: CreateDeviceData) {
    // Verify building exists
    const building = await prisma.building.findUnique({
      where: { id: data.buildingId },
      select: { id: true },
    });

    if (!building) {
      throw new Error('Building not found');
    }

    // Verify floor exists and belongs to building (if provided)
    if (data.floorId) {
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
    }

    // Verify room exists and belongs to building (if provided)
    if (data.roomId) {
      const room = await prisma.room.findUnique({
        where: { id: data.roomId },
        select: { id: true, buildingId: true, floorId: true },
      });

      if (!room) {
        throw new Error('Room not found');
      }

      if (room.buildingId !== data.buildingId) {
        throw new Error('Room does not belong to the specified building');
      }

      // If floorId is not provided but room is provided, use room's floor
      if (!data.floorId && room.floorId) {
        data.floorId = room.floorId;
      }
    }

    const device = await prisma.device.create({
      data: {
        buildingId: data.buildingId,
        floorId: data.floorId ? data.floorId : null,
        roomId: data.roomId ? data.roomId : null,
        // typeId: data.typeId,
        name: data.name,
        externalId: data.externalId || null,
        provider: data.provider,
        status: data.status || 'OFFLINE',
        payload: data.payload,
      },
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

    return device;
  }

  static async list(params: ListDevicesParams = {}) {
    const take = params.pageSize ? Math.min(params.pageSize, 100) : undefined;
    const skip = params.page && take ? (params.page - 1) * take : undefined;

    const where = {
      ...(params.buildingId && { buildingId: params.buildingId }),
      ...(params.floorId && { floorId: params.floorId }),
      ...(params.roomId && { roomId: params.roomId }),
      ...(params.provider && { provider: params.provider }),
      ...(params.status && { status: params.status }),
      ...(params.typeId && { typeId: params.typeId }),
    };

    const [items, total] = await Promise.all([
      prisma.device.findMany({
        where,
        ...(skip !== undefined && { skip }),
        ...(take && { take }),
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
      }),
      prisma.device.count({ where }),
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
    return prisma.device.findUnique({
      where: { id },
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

  static async update(id: string, data: UpdateDeviceData) {
    const existingDevice = await prisma.device.findUnique({
      where: { id },
      select: { buildingId: true },
    });

    if (!existingDevice) {
      throw new Error('Device not found');
    }

    // Verify floor belongs to the same building (if provided)
    if (data.floorId) {
      const floor = await prisma.floor.findUnique({
        where: { id: data.floorId },
        select: { buildingId: true },
      });

      if (!floor || floor.buildingId !== existingDevice.buildingId) {
        throw new Error(
          'Floor not found or does not belong to the same building'
        );
      }
    }

    // Verify room belongs to the same building (if provided)
    if (data.roomId) {
      const room = await prisma.room.findUnique({
        where: { id: data.roomId },
        select: { buildingId: true },
      });

      if (!room || room.buildingId !== existingDevice.buildingId) {
        throw new Error(
          'Room not found or does not belong to the same building'
        );
      }
    }

    return prisma.device.update({
      where: { id },
      data,
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

  static async delete(id: string) {
    const device = await prisma.device.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!device) {
      throw new Error('Device not found');
    }

    await prisma.device.delete({
      where: { id },
    });

    return { success: true };
  }

  static async linkToRoom(deviceId: string, roomId: string) {
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: { buildingId: true },
    });

    if (!device) {
      throw new Error('Device not found');
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { buildingId: true, floorId: true },
    });

    if (!room) {
      throw new Error('Room not found');
    }

    if (device.buildingId !== room.buildingId) {
      throw new Error('Device and room must belong to the same building');
    }

    return prisma.device.update({
      where: { id: deviceId },
      data: {
        roomId: roomId,
        floorId: room.floorId, // Also update the floor to match the room's floor
      },
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

  static async unlinkFromRoom(deviceId: string) {
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: { id: true },
    });

    if (!device) {
      throw new Error('Device not found');
    }

    return prisma.device.update({
      where: { id: deviceId },
      data: {
        roomId: null,
      },
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

  static async getByBuildingId(buildingId: string) {
    return prisma.device.findMany({
      where: { buildingId },
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

  static async getByRoomId(roomId: string) {
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

  static async getUnlinkedDevices(buildingId: string) {
    return prisma.device.findMany({
      where: {
        buildingId,
        roomId: null,
      },
      orderBy: [{ name: 'asc' }],
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
}
