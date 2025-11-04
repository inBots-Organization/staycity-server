import prisma from '../config/prisma';
import { getCurrentPresence } from './getPrecenceNumber';

/**
 * Fetch presence numbers for all MOTION devices and persist into PresenceLog.
 * Returns a summary with counts of successes and failures.
 */
export async function logAllPresence() {
  // 1) Find all motion sensors that have an externalId and are linked to a room/floor/property
  const motionDevices = await prisma.device.findMany({
    where: {
      deviceType: 'MOTION',
      externalId: { not: null },
      roomId: { not: null },
      floorId: { not: null },
    },
    select: {
      id: true,
      name: true,
      externalId: true,
      roomId: true,
      floorId: true,
      buildingId: true,
    },
  });

  if (motionDevices.length === 0) {
    return { inserted: 0, failed: 0, total: 0, details: [] as any[] };
  }

  // 2) Query presence for each sensor in parallel
  const presenceResults = await Promise.allSettled(
    motionDevices.map(async (d) => {
      const sensorId = d.externalId as string;
      const value = await getCurrentPresence(sensorId);
      return {
        roomId: d.roomId as string,
        floorId: d.floorId as string,
        propertyId: d.buildingId as string,
        externalId: sensorId,
        value: Number.isFinite(value) ? Math.trunc(value) : 0,
      };
    })
  );

  // 3) Split successes and failures
  const toInsert: { roomId: string; floorId: string; propertyId: string;  externalId: string; value: number }[] = [];
  const failures: { deviceId: string | null; reason: string }[] = [];

  // Build a temporary collection of candidate rows (fulfilled results only)
  const candidates: { roomId: string; floorId: string; propertyId: string; externalId: string; value: number }[] = [];
  presenceResults.forEach((res, idx) => {
    const dev = motionDevices[idx];
    if (res.status === 'fulfilled') {
      candidates.push(res.value);
    } else {
      failures.push({ deviceId: dev?.id ?? null, reason: String(res.reason) });
    }
  });

  // 3.1) Deduplicate: skip insert if the last stored log for the same externalId has the same value
  for (const row of candidates) {
    try {
      const last = await prisma.presenceLog.findFirst({
        where: { externalId: row.externalId },
        orderBy: { createdAt: 'desc' },
        select: { value: true },
      });
      if (!last || last.value !== row.value) {
        toInsert.push(row);
      }
    } catch (e) {
      failures.push({ deviceId: null, reason: `Lookup failed for ${row.externalId}: ${String(e)}` });
    }
  }

  // 4) Persist presence logs (if any)
  if (toInsert.length > 0) {
    await prisma.presenceLog.createMany({
      data: toInsert.map((r) => ({
        propertyId: r.propertyId,
        floorId: r.floorId,
        roomId: r.roomId,
        externalId: r.externalId,
        value: r.value,
      })),
    });
  }

  return {
    inserted: toInsert.length,
    failed: failures.length,
    total: motionDevices.length,
    details: failures,
  };
}
