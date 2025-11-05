import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { FloorService } from '../services/floorService';
import { responseSuccess, responseError } from '../utils/responseHelper';
import prisma from '../config/prisma';
import AranetDataService from '../services/aranetDataService';

export const listFloors = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      responseError(res, 'Validation failed', 400, errors.array());
      return;
    }

    const { buildingId, page, pageSize } = req.query;

    const params: any = {
      buildingId: buildingId as string,
    };

    if (page) {
      params.page = Number(page);
    }

    if (pageSize) {
      params.pageSize = Number(pageSize);
    }

    const result = await FloorService.list(params);

    responseSuccess(res, 'Floors retrieved successfully', result);
  } catch (error) {
    responseError(res, 'Internal server error');
  }
};

export const getFloorById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      responseError(res, 'Floor ID is required', 400);
      return;
    }

    const floor = await FloorService.getById(id);
    if (!floor) {
      responseError(res, 'Floor not found', 404);
      return;
    }

    responseSuccess(res, 'Floor retrieved successfully', floor);
  } catch (error) {
    responseError(res, 'Internal server error');
  }
};

export const getFloorsByBuildingId = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { buildingId } = req.params;
    if (!buildingId) {
      responseError(res, 'Building ID is required', 400);
      return;
    }

    const floors = await FloorService.getByBuildingId(buildingId);
    responseSuccess(res, 'Floors retrieved successfully', floors);
  } catch (error) {
    responseError(res, 'Internal server error');
  }
};

export const createFloor = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      responseError(res, 'Validation failed', 400, errors.array());
      return;
    }

    const floor = await FloorService.create(req.body);
    responseSuccess(res, 'Floor created successfully', floor, 201);
  } catch (error: any) {
    if (error.message === 'Building not found') {
      responseError(res, 'Building not found', 404);
      return;
    }
    if (error.code === 'P2002') {
      responseError(
        res,
        'A floor with this level already exists in this building',
        409
      );
      return;
    }
    responseError(res, 'Internal server error');
  }
};

export const updateFloor = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      responseError(res, 'Validation failed', 400, errors.array());
      return;
    }

    const { id } = req.params;
    if (!id) {
      responseError(res, 'Floor ID is required', 400);
      return;
    }
    const floor = await FloorService.update(id, req.body);

    responseSuccess(res, 'Floor updated successfully', floor);
  } catch (error: any) {
    if (error.message === 'Floor not found') {
      responseError(res, 'Floor not found', 404);
      return;
    }
    responseError(res, 'Internal server error');
  }
};

export const deleteFloor = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      responseError(res, 'Floor ID is required', 400);
      return;
    }

    await FloorService.delete(id);
    responseSuccess(res, 'Floor deleted successfully');
  } catch (error: any) {
    if (error.message === 'Floor not found') {
      responseError(res, 'Floor not found', 404);
      return;
    }
    if (error.message === 'Cannot delete floor with existing rooms') {
      responseError(res, 'Cannot delete floor with existing rooms', 400);
      return;
    }
    responseError(res, 'Internal server error');
  }
};

export const floorComparision = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Time window: from/to via query params, fallback to last 30 days
    const qFrom = (req.query.from as string) || '';
    const qTo = (req.query.to as string) || '';

    let from: string;
    let to: string;

    if (qFrom && qTo) {
      const fromMs = Date.parse(qFrom);
      const toMs = Date.parse(qTo);
      if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
        responseError(res, 'Invalid from/to date format. Use ISO 8601.', 400);
        return;
      }
      from = new Date(fromMs).toISOString();
      to = new Date(toMs).toISOString();
    } else {
      const now = new Date();
      const fromDate = new Date(now);
      fromDate.setDate(fromDate.getDate() - 30);
      from = fromDate.toISOString();
      to = now.toISOString();
    }
     const systemSettings = await prisma.systemSettings.findFirst();
    // const PRICE_PER_KWH = 0.16;
    const PRICE_PER_KWH = systemSettings?.pricePerKwh || 0;
    const POWER_METRIC = process.env.POWER_METRES_ID as string | undefined;

    if (!POWER_METRIC) {
      responseError(res, 'POWER_METRES_ID env variable is not configured', 500);
      return;
    }

    // Load floors with only POWER devices
    const floors = await prisma.floor.findMany({
      orderBy: { level: 'asc' },
      include: {
        devices: {
          where: { deviceType: 'POWER' },
          select: { id: true, name: true, externalId: true },
        },
        _count: {
          select: { rooms: true },
        },
      },
    });

    const aranet = new AranetDataService();

    const floorSummaries = await Promise.all(
      floors.map(async (floor) => {
        const devices = floor.devices || [];

        const deviceSummaries = await Promise.all(
          devices.map(async (device) => {
            if (!device.externalId) {
              return {
                deviceId: device.id,
                name: device.name,
                sensor: null as string | null,
                energyKwh: 0,
                cost: 0,
              };
            }

            // Fetch last month's history from Aranet for this power metric
            const history = await aranet.getHestory(
              device.externalId,
              POWER_METRIC,
              from,
              to
            );
            let energyKwh = 0;
            let cost = 0;
            if (Array.isArray((history as any)?.readings)) {
              const energyWh = ((history as any)?.readings || []).reduce(
                (acc: number, r: any) => acc + (Number(r.value) || 0),
                0
              );
              energyKwh = energyWh / 1000;
              cost = energyKwh * PRICE_PER_KWH;
            } else if ((history as any)?.month?.energy) {
              energyKwh = Number((history as any).month.energy) || 0;
              // Prefer provided cost if present; otherwise compute
              cost = (history as any)?.month?.cost
                ? Number((history as any).month.cost) || 0
                : energyKwh * PRICE_PER_KWH;
            }

            return {
              deviceId: device.id,
              name: device.name,
              sensor: device.externalId,
              energyKwh,
              cost,
            };
          })
        );

        const totalEnergyKwh = deviceSummaries.reduce(
          (acc, d) => acc + d.energyKwh,
          0
        );
        const totalCost = deviceSummaries.reduce((acc, d) => acc + d.cost, 0);

        return {
          floorId: floor.id,
          name: floor.name,
          level: floor.level,
          roomsCount: floor._count?.rooms || 0,
          devicesCount: devices.length,
          totalEnergyKwh,
          totalCost,
          devices: deviceSummaries,
        };
      })
    );

    // Compute overall totals and percentage per floor
    const grandTotalEnergyKwh = floorSummaries.reduce(
      (acc, f) => acc + f.totalEnergyKwh,
      0
    );
    const grandTotalCost = floorSummaries.reduce(
      (acc, f) => acc + f.totalCost,
      0
    );

    const floorsWithPercentage = floorSummaries.map((f) => ({
      ...f,
      percentage:
        grandTotalEnergyKwh > 0
          ? (f.totalEnergyKwh / grandTotalEnergyKwh) * 100
          : 0,
    }));

    // Sort by lowest energy first
    const sortedFloors = [...floorsWithPercentage].sort(
      (a, b) => a.totalEnergyKwh - b.totalEnergyKwh
    );

    // Build public analyses for two-floor comparison
    const sortedByEnergy = [...floorSummaries].sort(
      (a, b) => a.totalEnergyKwh - b.totalEnergyKwh
    );
    const lowest = sortedByEnergy[0];
    const highest = sortedByEnergy[sortedByEnergy.length - 1];
    const energyDifference =
      sortedByEnergy.length >= 2
        ? Math.abs((highest?.totalEnergyKwh || 0) - (lowest?.totalEnergyKwh || 0))
        : 0;
    const costDifference =
      sortedByEnergy.length >= 2
        ? Math.abs((highest?.totalCost || 0) - (lowest?.totalCost || 0))
        : 0;

    responseSuccess(res, 'Floor energy comparison calculated', {
      period: { from, to },
      pricePerKwh: PRICE_PER_KWH,
      metric: POWER_METRIC,
      totals: {
        energyKwh: grandTotalEnergyKwh,
        cost: grandTotalCost,
      },
     
        puplecAnalses: {
          energeDeffrense: energyDifference, // kWh
          costDeffrense: costDifference,
          topFloor: lowest
            ? {
                floorId: lowest.floorId,
                name: lowest.name,
                level: lowest.level,
                totalEnergy: lowest.totalEnergyKwh, // kWh
                totalCost: lowest.totalCost,
              }
            : null,
          totalEnergy: grandTotalEnergyKwh, // kWh
        },
      floors: sortedFloors,
    });
  } catch (error) {
    responseError(res, 'Internal server error');
  }
};

export const getPresenceTrendForComparisonFloores = async (
  req: Request,
  res: Response
) => {
  try {
    const { buildingId } = req.query as { buildingId?: string };
    const qFrom = typeof req.query['from'] === 'string' ? (req.query['from'] as string) : '';
    const qTo = typeof req.query['to'] === 'string' ? (req.query['to'] as string) : '';

    // Resolve time range
    const now = new Date();
    let fromDate: Date;
    let toDate: Date;
    if (qFrom && qTo) {
      const fromMs = Date.parse(qFrom);
      const toMs = Date.parse(qTo);
      if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
        responseError(res, 'Invalid from/to date format. Use ISO 8601.', 400);
        return;
      }
      fromDate = new Date(fromMs);
      toDate = new Date(toMs);
    } else {
      toDate = now;
      fromDate = new Date(now.getTime() - 48 * 60 * 60 * 1000); // default last 24h
    }

    // Bucketing is not used in the raw logs response

    // Load floors (optionally filter by building)
    const floorWhere: { buildingId?: string } = {};
    if (buildingId) floorWhere.buildingId = String(buildingId);
    const floors = await prisma.floor.findMany({
      where: floorWhere,
      orderBy: { level: 'asc' },
      select: { id: true, name: true, level: true, buildingId: true },
    });

    if (floors.length === 0) {
      responseSuccess(res, 'No floors found', { from: fromDate.toISOString(), to: toDate.toISOString(), floors: [] });
      return;
    }

    // Fetch all presence logs in range for these floors
    const logs = await prisma.presenceLog.findMany({
      where: {
        floorId: { in: floors.map(f => f.id) },
        createdAt: { gte: fromDate, lte: toDate },
      },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, value: true, externalId: true, floorId: true },
    });
    

    // Aggregate logs per floor per minute: sum values across sensors for the same minute
    // Use key `${floorId}|${minuteEpoch}` where minuteEpoch is timestamp rounded to the minute
    const perFloorMinute = new Map<string, number>();
    logs.forEach((l) => {
      const d = new Date(l.createdAt);
      d.setSeconds(0, 0); // truncate to minute
      const key = `${l.floorId}|${d.getTime()}`;
      const prev = perFloorMinute.get(key) || 0;
      perFloorMinute.set(key, prev + (Number.isFinite(l.value) ? l.value : 0));
    });

    // Group back by floor and produce points array
    const logsByFloor = new Map<string, { value: number; createdAt: string }[]>();
    perFloorMinute.forEach((sum, key) => {
      const parts = key.split('|');
      if (parts.length !== 2) return;
      const floorId = parts[0] || '';
      const epoch = Number(parts[1]);
      if (!floorId || !Number.isFinite(epoch)) return;
      const createdAt = new Date(epoch).toISOString();
      const arr = logsByFloor.get(floorId) ?? [];
      arr.push({ value: sum, createdAt });
      logsByFloor.set(floorId, arr);
    });

    const resultFloors = floors.map((f) => ({
      floorId: f.id,
      name: f.name,
      level: f.level,
      points: (logsByFloor.get(f.id) || []).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    }));

    responseSuccess(res, 'Presence logs retrieved successfully', {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      floors: resultFloors,
    });
  } catch (error) {
    console.error('getPresenceTrendForComparisonFloores error:', error);
    responseError(res, 'Internal server error');
  }
};

  