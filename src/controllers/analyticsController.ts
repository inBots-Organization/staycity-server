import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analyticsService';
import { responseSuccess, responseError } from '../utils/responseHelper';

export const getComprehensiveAnalytics = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const analytics = await AnalyticsService.getComprehensiveAnalytics();
    responseSuccess(res, 'Comprehensive analytics retrieved successfully', analytics);
  } catch (error: any) {
    console.error('Error in getComprehensiveAnalytics:', error);
    responseError(res, 'Failed to retrieve analytics data', 500, error.message);
  }
};

export const getBuildingAnalytics = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { buildingId } = req.params;
    
    if (!buildingId) {
      responseError(res, 'Building ID is required', 400);
      return;
    }

    const buildingAnalytics = await AnalyticsService.getBuildingAnalytics(buildingId);
    responseSuccess(res, 'Building analytics retrieved successfully', buildingAnalytics);
  } catch (error: any) {
    if (error.message === 'Building not found' || error.message === 'Building analytics not found') {
      responseError(res, error.message, 404);
      return;
    }
    console.error('Error in getBuildingAnalytics:', error);
    responseError(res, 'Failed to retrieve building analytics', 500, error.message);
  }
};

export const getElectricityAnalytics = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const electricityAnalytics = await AnalyticsService.getElectricityAnalytics();
    responseSuccess(res, 'Electricity analytics retrieved successfully', electricityAnalytics);
  } catch (error: any) {
    console.error('Error in getElectricityAnalytics:', error);
    responseError(res, 'Failed to retrieve electricity analytics', 500, error.message);
  }
};

export const getCurrentSensorDataByFloor = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { buildingId, floorId } = req.params;
    
    if (!buildingId || !floorId) {
      responseError(res, 'Building ID and Floor ID are required', 400);
      return;
    }

    const sensorData = await AnalyticsService.getCurrentSensorDataByFloor(buildingId, floorId);
    responseSuccess(res, 'Current sensor data retrieved successfully', sensorData);
  } catch (error: any) {
    if (error.message === 'Building not found' || error.message === 'Floor not found') {
      responseError(res, error.message, 404);
      return;
    }
    console.error('Error in getCurrentSensorDataByFloor:', error);
    responseError(res, 'Failed to retrieve current sensor data', 500, error.message);
  }
};