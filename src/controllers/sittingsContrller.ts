import { Request, Response } from 'express';
import { responseSuccess, responseError } from '../utils/responseHelper';
import { prisma } from '../config/prisma';
export const create = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
        
        
         
          const settings = await prisma.systemSettings.create({
            data: req.body,
          });
        responseSuccess(res,"Settings saved successfully",201)
     
    } catch (error: any) {
     
      console.error('Error in getBuildingAnalytics:', error);
      responseError(res, 'Failed to retrieve building analytics', 500, error.message);
    }
  };
export const updateSittings = async (
    req: Request,
    res: Response
  ): Promise<void> => {
   try {
    const data= req.body
     if (!data || Object.keys(data).length === 0) {
     responseError(res, 'Failed to update settings', 500, 'No data provided');
    }
    const settings = await prisma.systemSettings.update({
      where: { id:"cmg4wmea00002vlscrtjpu5bl" },
      data,
    });

    responseSuccess(res,"Settings updated successfully",201)
    } catch (error: any) {
     
      console.error('Error in getBuildingAnalytics:', error);
      responseError(res, 'Failed to retrieve building analytics', 500, error.message);
    }
  };
export const getSittings = async (
    req: Request,
    res: Response
  ): Promise<void> => {
   try {
   
   const settings = await prisma.systemSettings.findUnique({
      where: { id:"cmg4wmea00002vlscrtjpu5bl" },
    });

    responseSuccess(res,"get Settings successfully",settings)
    } catch (error: any) {
     
      console.error('Error in getBuildingAnalytics:', error);
      responseError(res, 'Failed to retrieve building analytics', 500, error.message);
    }
  };