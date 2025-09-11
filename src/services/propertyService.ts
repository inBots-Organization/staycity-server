import { prisma } from '../config/prisma';
import {
  Amenity,
  DeviceStatus,
  Property,
  PropertyStatus,
  RoomStatus,
} from '../generated/prisma';

export type ListPropsParams = {
  q?: string;
  status?: PropertyStatus;
  city?: string;
  country?: string;
  page?: number;
  pageSize?: number;
};

export class PropertyService {
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
      prisma.property.findMany({
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
      prisma.property.count({ where }),
    ]);

    return { items, total, page: params.page ?? 1, pageSize: take };
  }

  static async bySlug(slug: string) {
    return prisma.property.findUnique({
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
          include: { type: true, room: { select: { id: true, name: true } } },
        },
      },
    });
  }

  static async create(data: {
    name: string;
    slug: string;
    status?: PropertyStatus;
    rating?: number;
    monthlySavingsUSD?: number;
    energyKwh?: number;
    floorsCount?: number;
    address1?: string;
    address2?: string;
    city?: string;
    country?: string;
    contactEmail?: string;
    contactPhone?: string;
    amenities?: Amenity[];
    stats?: {
      currentGuests: number;
      totalCapacity: number;
      totalRooms: number;
      availableRooms: number;
    };
  }) {
    return prisma.property.create({
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
        contactEmail: data.contactEmail ?? null,
        contactPhone: data.contactPhone ?? null,
        amenities: {
          create: (data.amenities ?? []).map((a) => ({ amenity: a })),
        },
        ...(data.stats ? { stats: { create: data.stats } } : {}),
      },
    });
  }

  static async patch(
    id: string,
    data: Partial<Property> & { amenities?: Amenity[] }
  ) {
    const { amenities, monthlySavings, ...rest } = data as any;

    const updated = await prisma.property.update({
      where: { id },
      data: {
        ...rest,
        ...(monthlySavings !== undefined ? { monthlySavings } : {}),
        ...(Array.isArray(amenities)
          ? {
              amenities: {
                deleteMany: {},
                create: amenities.map((a) => ({ amenity: a })),
              },
            }
          : {}),
      },
    });

    return updated;
  }

  static async addFloor(
    propertyId: string,
    data: { name: string; level: number; note?: string | null }
  ) {
    const created = await prisma.floor.create({
      data: {
        propertyId,
        name: data.name,
        level: data.level,
        note: data.note ?? null,
      },
    });
    const count = await prisma.floor.count({ where: { propertyId } });
    await prisma.property.update({
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
    }
  ) {
    const created = await prisma.room.create({
      data: {
        propertyId,
        floorId: data.floorId,
        name: data.name,
        type: data.type,
        status: data.status ?? 'AVAILABLE',
        capacity: data.capacity ?? 2,
      },
    });

    const [totalRooms, availableRooms] = await Promise.all([
      prisma.room.count({ where: { propertyId } }),
      prisma.room.count({ where: { propertyId, status: 'AVAILABLE' } }),
    ]);

    await prisma.propertyStats.upsert({
      where: { propertyId },
      create: {
        propertyId,
        currentGuests: 0,
        totalCapacity: 0,
        totalRooms,
        availableRooms,
      },
      update: { totalRooms, availableRooms },
    });

    return created;
  }

  static async propertyDeviceCounts(propertyId: string) {
    const [online, offline] = await Promise.all([
      prisma.device.count({
        where: { propertyId, status: 'ONLINE' as DeviceStatus },
      }),
      prisma.device.count({
        where: { propertyId, status: 'OFFLINE' as DeviceStatus },
      }),
    ]);
    return { online, offline };
  }
}
