import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import AranetDataService from '../services/aranetDataService';
import { responseSuccess, responseError } from '../utils/responseHelper';

export const getAranetLogs = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    responseError(res, 'Validation failed', 400, JSON.stringify(errors.array()));
    return;
  }

  try {
    type LogsQuery = { sensorId: string; metric: string; from: string; to: string; limit?: string };
    const { sensorId, metric, from, to, limit } = req.query as unknown as LogsQuery;
    const service = new AranetDataService();
    const data = await service.getSensorHistory(sensorId, metric, from, to, limit ?? '10000');
    responseSuccess(res, 'Historical readings retrieved successfully', data);
  } catch (error: any) {
    responseError(res, 'Failed to fetch historical readings', 500, error.message);
  }
};


