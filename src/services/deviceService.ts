import { prisma } from '../config/prisma';

export class DeviceService {
  static async list(q: {
    propertyId?: string;
    status?: 'ONLINE' | 'OFFLINE';
    typeKey?: string;
  }) {
    return prisma.device.findMany({
      where: {
        ...(q.propertyId ? { propertyId: q.propertyId } : {}),
        ...(q.status ? { status: q.status } : {}),
        ...(q.typeKey ? { type: { key: q.typeKey } } : {}),
      },
      include: { type: true, room: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  static async create(data: {
    propertyId: string;
    roomId?: string | null;
    typeKey: string;
    name: string;
    batteryPct?: number;
    state?: Record<string, unknown>;
  }) {
    const type = await prisma.deviceType.findUnique({
      where: { key: data.typeKey },
    });
    if (!type)
      throw Object.assign(
        new Error(`Unknown device typeKey: ${data.typeKey}`),
        { statusCode: 400 }
      );

    return prisma.device.create({
      data: {
        propertyId: data.propertyId,
        roomId: data.roomId ?? null,
        typeId: type.id,
        name: data.name,
        batteryPct: data.batteryPct,
        state: data.state ?? {},
        status: 'ONLINE',
        lastSeenAt: new Date(),
      },
    });
  }

  static async addReading(
    deviceId: string,
    data: {
      metric: string;
      valueNum?: number | null;
      valueText?: string | null;
      unit?: string | null;
      recordedAt: Date;
    }
  ) {
    const created = await prisma.deviceReading.create({
      data: {
        deviceId,
        metric: data.metric as any,
        valueNum: data.valueNum as any,
        valueText: data.valueText ?? null,
        unit: data.unit ?? null,
        recordedAt: data.recordedAt,
      },
    });
    await prisma.device.update({
      where: { id: deviceId },
      data: { updatedAt: new Date(), lastSeenAt: new Date() },
    });
    return created;
  }
}
