import { prisma } from '../config/prisma';
import { Building, BuildingStatus, Amenity } from '../generated/prisma';

export interface CreateBuildingData {
  name: string;
  address: string;
  rating?: number;
  slug?: string;
  amenities?: Amenity[];
  // Contact info
  contactEmail?: string;
  contactPhone?: string;
  // Location
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface UpdateBuildingData extends Partial<CreateBuildingData> {
  status?: BuildingStatus;
}

export interface ListBuildingsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: BuildingStatus;
  city?: string;
  country?: string;
}

export class BuildingService {
  static async create(data: CreateBuildingData) {
    const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-');
    
    return prisma.building.create({
      data: {
        name: data.name,
        address: data.address,
        rating: data.rating ?? null,
        slug,
        contactEmail: data.contactEmail ?? null,
        contactPhone: data.contactPhone ?? null,
        city: data.city ?? null,
        country: data.country ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        amenities: {
          create: (data.amenities || []).map(amenity => ({ amenity }))
        },
        stats: {
          create: {
            currentGuests: 0,
            totalCapacity: 0,
            totalRooms: 0,
            availableRooms: 0
          }
        }
      },
      include: {
        amenities: true,
        stats: true,
        floors: true,
        _count: {
          select: {
            floors: true,
            rooms: true
          }
        }
      }
    });
  }

  static async list(params: ListBuildingsParams = {}) {
    const take = Math.min(params.pageSize || 20, 100);
    const skip = ((params.page || 1) - 1) * take;

    const where = {
      ...(params.search && {
        OR: [
          { name: { contains: params.search, mode: 'insensitive' as const } },
          { address: { contains: params.search, mode: 'insensitive' as const } }
        ]
      }),
      ...(params.status && { status: params.status }),
      ...(params.city && { city: { contains: params.city, mode: 'insensitive' as const } }),
      ...(params.country && { country: { contains: params.country, mode: 'insensitive' as const } })
    };

    const [items, total] = await Promise.all([
      prisma.building.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: {
          amenities: true,
          stats: true,
          _count: {
            select: {
              floors: true,
              rooms: true
            }
          }
        }
      }),
      prisma.building.count({ where })
    ]);

    // Update noOfRooms based on actual room count
    for (const building of items) {
      if (building._count.rooms !== building.noOfRooms) {
        await prisma.building.update({
          where: { id: building.id },
          data: { noOfRooms: building._count.rooms }
        });
        building.noOfRooms = building._count.rooms;
      }
    }

    return {
      items,
      total,
      page: params.page || 1,
      pageSize: take,
      totalPages: Math.ceil(total / take)
    };
  }

  static async getById(id: string) {
    return prisma.building.findUnique({
      where: { id },
      include: {
        amenities: true,
        stats: true,
        floors: {
          orderBy: { level: 'asc' },
          include: {
            rooms: {
              orderBy: { name: 'asc' }
            },
            _count: {
              select: { rooms: true }
            }
          }
        },
        _count: {
          select: {
            floors: true,
            rooms: true
          }
        }
      }
    });
  }

  static async getBySlug(slug: string) {
    return prisma.building.findUnique({
      where: { slug },
      include: {
        amenities: true,
        stats: true,
        floors: {
          orderBy: { level: 'asc' },
          include: {
            rooms: {
              orderBy: { name: 'asc' }
            }
          }
        }
      }
    });
  }

  static async update(id: string, data: UpdateBuildingData) {
    const { amenities, ...updateData } = data;

    return prisma.building.update({
      where: { id },
      data: {
        ...updateData,
        rating: updateData.rating as any,
        latitude: updateData.latitude as any,
        longitude: updateData.longitude as any,
        ...(amenities && {
          amenities: {
            deleteMany: {},
            create: amenities.map(amenity => ({ amenity }))
          }
        })
      },
      include: {
        amenities: true,
        stats: true,
        floors: true
      }
    });
  }

  static async delete(id: string) {
    return prisma.building.delete({
      where: { id }
    });
  }

  static async updateStats(buildingId: string) {
    const [totalRooms, availableRooms, capacitySum] = await Promise.all([
      prisma.room.count({ where: { buildingId } }),
      prisma.room.count({ where: { buildingId, status: 'AVAILABLE' } }),
      prisma.room.aggregate({
        where: { buildingId },
        _sum: { capacity: true }
      })
    ]);

    const totalCapacity = capacitySum._sum.capacity || 0;
    const currentGuests = totalCapacity - availableRooms; // Simplified calculation

    await Promise.all([
      prisma.buildingStats.upsert({
        where: { buildingId },
        create: {
          buildingId,
          currentGuests,
          totalCapacity,
          totalRooms,
          availableRooms
        },
        update: {
          currentGuests,
          totalCapacity,
          totalRooms,
          availableRooms
        }
      }),
      prisma.building.update({
        where: { id: buildingId },
        data: { 
          noOfRooms: totalRooms,
          floorsCount: await prisma.floor.count({ where: { buildingId } })
        }
      })
    ]);

    return { totalRooms, availableRooms, totalCapacity, currentGuests };
  }
}