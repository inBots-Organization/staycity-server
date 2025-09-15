// src/services/propertyService.ts
import { prisma } from '../config/prisma';
import {
  Amenity,
  Building,
  BuildingStatus,
  RoomStatus,
  DeviceStatus,
} from '../generated/prisma';

type DeviceRefInput = { id: string; provider: string };

export type ListPropsParams = {
  q?: string;
  status?: BuildingStatus;
  city?: string;
  country?: string;
  page?: number;
  pageSize?: number;
};

export class PropertyService {
  // ----------------- internal helpers -----------------
  private static async syncBuildingDeviceRefs(
    buildingId: string,
    refs: DeviceRefInput[]
  ) {
    await prisma.$transaction([
      prisma.device.deleteMany({
        where: { buildingId, floorId: null, roomId: null },
      }),
      prisma.device.createMany({
        data: refs.map((r) => ({
          buildingId,
          floorId: null,
          roomId: null,
          name: `${r.provider}:${r.id}`,
          externalId: r.id,
          provider: r.provider,
          status: 'OFFLINE' as DeviceStatus,
        })),
      }),
    ]);
  }

  private static async addFloorDeviceRefs(
    buildingId: string,
    floorId: string,
    refs: DeviceRefInput[]
  ) {
    if (!refs.length) return;
    await prisma.device.createMany({
      data: refs.map((r) => ({
        buildingId,
        floorId,
        roomId: null,
        name: `${r.provider}:${r.id}`,
        externalId: r.id,
        provider: r.provider,
        status: 'OFFLINE' as DeviceStatus,
      })),
    });
  }

  private static async addRoomDeviceRefs(
    buildingId: string,
    floorId: string,
    roomId: string,
    refs: DeviceRefInput[]
  ) {
    if (!refs.length) return;
    await prisma.device.createMany({
      data: refs.map((r) => ({
        buildingId,
        floorId,
        roomId,
        name: `${r.provider}:${r.id}`,
        externalId: r.id,
        provider: r.provider,
        status: 'OFFLINE' as DeviceStatus,
      })),
    });
  }

  // ----------------- existing methods -----------------
  static async list(params: ListPropsParams) {
    const take = Math.min(params.pageSize ?? 20, 100);
    const skip = ((params.page ?? 1) - 1) * take;

    const where = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.city
        ? { city: { contains: params.city, mode: 'insensitive' as const } }
        : {}),
      ...(params.country
        ? {
            country: { contains: params.country, mode: 'insensitive' as const },
          }
        : {}),
      ...(params.q
        ? { name: { contains: params.q, mode: 'insensitive' as const } }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.building.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          rating: true,
          monthlySavings: true,
          energyKwh: true,
          floorsCount: true,
          city: true,
          country: true,
          stats: true,
        },
      }),
      prisma.building.count({ where }),
    ]);

    return { items, total, page: params.page ?? 1, pageSize: take };
  }

  static async bySlug(slug: string) {
    return prisma.building.findUnique({
      where: { slug },
      include: {
        stats: true,
        amenities: true,
        floors: {
          orderBy: { level: 'asc' },
          include: { rooms: { orderBy: { name: 'asc' } } },
        },
        devices: {
          orderBy: { updatedAt: 'desc' },
          include: {
            type: true,
            floor: { select: { id: true, name: true, level: true } },
            room: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  static async create(data: {
    name: string;
    slug: string;
    status?: BuildingStatus;
    rating?: number;
    monthlySavingsUSD?: number;
    energyKwh?: number;
    floorsCount?: number;
    address1?: string | null;
    address2?: string | null;
    city?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    amenities?: Amenity[];
    stats?: {
      currentGuests: number;
      totalCapacity: number;
      totalRooms: number;
      availableRooms: number;
    };
    devices?: DeviceRefInput[]; // <— NEW
  }) {
    const created = await prisma.building.create({
      data: {
        name: data.name,
        slug: data.slug,
        status: data.status ?? 'ACTIVE',
        rating: data.rating as any,
        monthlySavings: Math.round((data.monthlySavingsUSD ?? 0) * 100),
        energyKwh: data.energyKwh as any,
        floorsCount: data.floorsCount ?? 0,
        address1: data.address1 ?? null,
        address2: data.address2 ?? null,
        city: data.city ?? null,
        country: data.country ?? null,
        latitude: (data.latitude as any) ?? null,
        longitude: (data.longitude as any) ?? null,
        contactEmail: data.contactEmail ?? null,
        contactPhone: data.contactPhone ?? null,
        amenities: {
          create: (data.amenities ?? []).map((a) => ({ amenity: a })),
        },
        ...(data.stats ? { stats: { create: data.stats } } : {}),
      },
    });

    if (Array.isArray(data.devices) && data.devices.length) {
      await this.syncBuildingDeviceRefs(created.id, data.devices);
    }

    return created;
  }

  static async patch(
    id: string,
    data: Partial<Building> & {
      amenities?: Amenity[];
      monthlySavingsUSD?: number;
      devices?: DeviceRefInput[]; // <— NEW (replace semantics)
    }
  ) {
    const { amenities, monthlySavingsUSD, monthlySavings, devices, ...rest } =
      data as any;

    const updated = await prisma.building.update({
      where: { id },
      data: {
        ...rest,
        ...(monthlySavingsUSD !== undefined
          ? { monthlySavings: Math.round((monthlySavingsUSD ?? 0) * 100) }
          : {}),
        ...(monthlySavings !== undefined ? { monthlySavings } : {}),
        ...(Array.isArray(amenities)
          ? {
              amenities: {
                deleteMany: {},
                create: amenities.map((a: Amenity) => ({ amenity: a })),
              },
            }
          : {}),
      },
    });

    if (Array.isArray(devices)) {
      await this.syncBuildingDeviceRefs(id, devices);
    }

    return updated;
  }

  static async addFloor(
    propertyId: string,
    data: {
      name: string;
      level: number;
      note?: string | null;
      devices?: DeviceRefInput[];
    } // <— NEW
  ) {
    const created = await prisma.floor.create({
      data: {
        buildingId: propertyId,
        name: data.name,
        level: data.level,
        note: data.note ?? null,
      },
    });

    if (Array.isArray(data.devices) && data.devices.length) {
      await this.addFloorDeviceRefs(propertyId, created.id, data.devices);
    }

    const count = await prisma.floor.count({
      where: { buildingId: propertyId },
    });
    await prisma.building.update({
      where: { id: propertyId },
      data: { floorsCount: count },
    });

    return created;
  }

  static async addRoom(
    propertyId: string,
    data: {
      floorId: string;
      name: string;
      type: 'ROOM' | 'SUITE';
      status?: RoomStatus;
      capacity?: number;
      devices?: DeviceRefInput[]; // <— NEW
    }
  ) {
    const floor = await prisma.floor.findUnique({
      where: { id: data.floorId },
      select: { id: true, buildingId: true },
    });
    if (!floor || floor.buildingId !== propertyId)
      throw new Error('FLOOR_NOT_IN_BUILDING');

    const created = await prisma.room.create({
      data: {
        buildingId: propertyId,
        floorId: data.floorId,
        name: data.name,
        type: data.type,
        status: data.status ?? 'AVAILABLE',
        capacity: data.capacity ?? 2,
      },
    });

    if (Array.isArray(data.devices) && data.devices.length) {
      await this.addRoomDeviceRefs(
        propertyId,
        data.floorId,
        created.id,
        data.devices
      );
    }

    // Update stats
    const [totalRooms, availableRooms, capacityAgg] = await Promise.all([
      prisma.room.count({ where: { buildingId: propertyId } }),
      prisma.room.count({
        where: { buildingId: propertyId, status: 'AVAILABLE' },
      }),
      prisma.room.aggregate({
        where: { buildingId: propertyId },
        _sum: { capacity: true },
      }),
    ]);
    const totalCapacity = capacityAgg._sum.capacity ?? 0;

    await prisma.buildingStats.upsert({
      where: { buildingId: propertyId },
      create: {
        buildingId: propertyId,
        currentGuests: 0,
        totalCapacity,
        totalRooms,
        availableRooms,
      },
      update: { totalRooms, availableRooms, totalCapacity },
    });

    return created;
  }

  static async propertyDeviceCounts(propertyId: string) {
    const [online, offline] = await Promise.all([
      prisma.device.count({
        where: { buildingId: propertyId, status: 'ONLINE' as DeviceStatus },
      }),
      prisma.device.count({
        where: { buildingId: propertyId, status: 'OFFLINE' as DeviceStatus },
      }),
    ]);
    return { online, offline };
  }
}
