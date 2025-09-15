import { prisma } from '../config/prisma';

export interface CreateFloorData {
  buildingId: string;
  name: string;
  level: number;
  note?: string | null;
}

export interface UpdateFloorData {
  name?: string;
  level?: number;
  note?: string;
}

export interface ListFloorsParams {
  buildingId?: string;
  page?: number;
  pageSize?: number;
}

export class FloorService {
  static async create(data: CreateFloorData) {
    // Verify building exists
    const building = await prisma.building.findUnique({
      where: { id: data.buildingId }
    });
    if (!building) {
      throw new Error('Building not found');
    }

    const floor = await prisma.floor.create({
      data: {
        buildingId: data.buildingId,
        name: data.name,
        level: data.level,
        note: data.note ?? null
      },
      include: {
        building: {
          select: { id: true, name: true }
        },
        rooms: {
          orderBy: { name: 'asc' }
        },
        _count: {
          select: { rooms: true }
        }
      }
    });

    // Update building's floor count
    await this.updateBuildingFloorCount(data.buildingId);

    return floor;
  }

  static async list(params: ListFloorsParams = {}) {
    const take = params.pageSize ? Math.min(params.pageSize, 100) : undefined;
    const skip = params.page && take ? (params.page - 1) * take : undefined;

    const where = {
      ...(params.buildingId && { buildingId: params.buildingId })
    };

    const [items, total] = await Promise.all([
      prisma.floor.findMany({
        where,
        ...(skip !== undefined && { skip }),
        ...(take && { take }),
        orderBy: { level: 'asc' },
        include: {
          building: {
            select: { id: true, name: true }
          },
          rooms: {
            orderBy: { name: 'asc' }
          },
          _count: {
            select: { rooms: true }
          }
        }
      }),
      prisma.floor.count({ where })
    ]);

    return {
      items,
      total,
      page: params.page || 1,
      pageSize: take || total,
      totalPages: take ? Math.ceil(total / take) : 1
    };
  }

  static async getById(id: string) {
    return prisma.floor.findUnique({
      where: { id },
      include: {
        building: {
          select: { id: true, name: true, address: true }
        },
        rooms: {
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: { devices: true }
            }
          }
        },
        _count: {
          select: { rooms: true }
        }
      }
    });
  }

  static async getByBuildingId(buildingId: string) {
    return prisma.floor.findMany({
      where: { buildingId },
      orderBy: { level: 'asc' },
      include: {
        rooms: {
          orderBy: { name: 'asc' }
        },
        _count: {
          select: { rooms: true }
        }
      }
    });
  }

  static async update(id: string, data: UpdateFloorData) {
    const floor = await prisma.floor.findUnique({
      where: { id },
      select: { buildingId: true }
    });

    if (!floor) {
      throw new Error('Floor not found');
    }

    const updated = await prisma.floor.update({
      where: { id },
      data,
      include: {
        building: {
          select: { id: true, name: true }
        },
        rooms: {
          orderBy: { name: 'asc' }
        },
        _count: {
          select: { rooms: true }
        }
      }
    });

    // Update building's floor count if needed
    if (data.level !== undefined) {
      await this.updateBuildingFloorCount(floor.buildingId);
    }

    return updated;
  }

  static async delete(id: string) {
    const floor = await prisma.floor.findUnique({
      where: { id },
      select: { buildingId: true }
    });

    if (!floor) {
      throw new Error('Floor not found');
    }

    // Check if floor has rooms
    const roomCount = await prisma.room.count({
      where: { floorId: id }
    });

    if (roomCount > 0) {
      throw new Error('Cannot delete floor with existing rooms');
    }

    await prisma.floor.delete({
      where: { id }
    });

    // Update building's floor count
    await this.updateBuildingFloorCount(floor.buildingId);

    return { success: true };
  }

  private static async updateBuildingFloorCount(buildingId: string) {
    const floorCount = await prisma.floor.count({
      where: { buildingId }
    });

    await prisma.building.update({
      where: { id: buildingId },
      data: { floorsCount: floorCount }
    });
  }
}