import { Device, Metric } from './../generated/prisma/index.d';
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import AranetDataService from '../services/aranetDataService';
import { responseSuccess, responseError } from '../utils/responseHelper';
import prisma from '../config/prisma';
type Log = {
  metric?: string;
  sensor?: string;
  unit?: string;
  time?: string;
  value?: number;
};

export const aggregateLogsByDay = (logs: Log[]): Log[] => {
  const grouped: Record<string, { total: number; count: number; sample: Log }> = {};

  for (const log of logs) {
    if (!log || !log.time || typeof log.time !== "string") continue; // ✅ skip invalid entries

    const day = log.time.split("T")[0];

    if (!grouped[day]) {
      grouped[day] = { total: 0, count: 0, sample: log };
    }

    grouped[day].total += log.value ?? 0;
    grouped[day].count += 1;
  }

  const aggregated: Log[] = Object.entries(grouped).map(([day, data]) => ({
    metric: data.sample.metric ?? "",
    sensor: data.sample.sensor ?? "",
    unit: data.sample.unit ?? "",
    time: `${day}T00:00:00Z`,
    value: parseFloat((data.total ).toFixed(2)), // average for the day
  }));

  aggregated.sort((a, b) => new Date(a.time!).getTime() - new Date(b.time!).getTime());

  return aggregated;
};



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
    const data = await service.getHestory(sensorId, metric, from, to);
    responseSuccess(res, 'Historical readings retrieved successfully', data);
  } catch (error: any) {
    responseError(res, 'Failed to fetch historical readings', 500, error.message);
  }
};
export const getHomeLogs = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    responseError(res, 'Validation failed', 400, JSON.stringify(errors.array()));
    return;
  }

  try {
    type LogsQuery = { type: string;  from: string; to: string; };
     const { type, from, to } = req.query as unknown as LogsQuery;
     let deviseType = "";
     let metricId=""
     if(type === "power"){
        deviseType = "POWER";
     }else{
        deviseType = "ENVIRONMENT";
     }
     if (type === "power") {
      metricId="360"
     }else if(type === "temperature"){
      metricId="1"
     }else if(type === "humidity"){
      metricId="2"
     }else if(type === "co2"){
      metricId="3"
     }
     
    const devises =await prisma.device.findMany({
      where: {
        deviceType: deviseType,
      },
    })


   
    const service = new AranetDataService();
    const data = await Promise.all(devises.map(async (de) => {
      console.log("de",de)
  
          const logs = await service.getHestory(de.externalId, metricId, from, to);
          
        
          return  logs.readings;
    }))
    const realAggregate = aggregateLogsByDay(data.flat())
    responseSuccess(res, 'Historical readings retrieved successfully', realAggregate);
  } catch (error: any) {
    responseError(res, 'Failed to fetch historical readings', 500, error.message);
  }
};


