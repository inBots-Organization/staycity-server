import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import {
  DeviceService,
  ListDevicesParams,
  CreateDeviceData,
  UpdateDeviceData,
} from '../services/deviceService';
import { DeviceStatus } from '../generated/prisma';
import { responseSuccess, responseError } from '../utils/responseHelper';

export const listDevices = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      responseError(res, 'Validation failed', 400, errors.array());
      return;
    }

    const { buildingId, floorId, roomId, provider, status, typeId, page, pageSize } = req.query;

    const listParams: ListDevicesParams = {
      ...(buildingId && { buildingId: String(buildingId) }),
      ...(floorId && { floorId: String(floorId) }),
      ...(roomId && { roomId: String(roomId) }),
      ...(provider && { provider: String(provider) }),
      ...(status && { status: status as DeviceStatus }),
      ...(typeId && { typeId: String(typeId) }),
      ...(page && { page: Number(page) }),
      ...(pageSize && { pageSize: Number(pageSize) }),
    };

    const result = await DeviceService.list(listParams);

    responseSuccess(res, 'Devices retrieved successfully', result);
  } catch (error) {
    responseError(res, 'Internal server error');
  }
};

export const getDeviceById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      responseError(res, 'Device ID is required', 400);
      return;
    }

    const device = await DeviceService.getById(id);
    if (!device) {
      responseError(res, 'Device not found', 404);
      return;
    }

    responseSuccess(res, 'Device retrieved successfully', device);
  } catch (error) {
    responseError(res, 'Internal server error');
  }
};

export const getDevicesByBuildingId = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { buildingId } = req.params;
    if (!buildingId) {
      responseError(res, 'Building ID is required', 400);
      return;
    }

    const devices = await DeviceService.getByBuildingId(buildingId);
    responseSuccess(res, 'Devices retrieved successfully', devices);
  } catch (error) {
    responseError(res, 'Internal server error');
  }
};

export const getDevicesByRoomId = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { roomId } = req.params;
    if (!roomId) {
      responseError(res, 'Room ID is required', 400);
      return;
    }

    const devices = await DeviceService.getByRoomId(roomId);
    responseSuccess(res, 'Devices retrieved successfully', devices);
  } catch (error) {
    responseError(res, 'Internal server error');
  }
};

export const getUnlinkedDevices = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { buildingId } = req.params;
    if (!buildingId) {
      responseError(res, 'Building ID is required', 400);
      return;
    }

    const devices = await DeviceService.getUnlinkedDevices(buildingId);
    responseSuccess(res, 'Unlinked devices retrieved successfully', devices);
  } catch (error) {
    responseError(res, 'Internal server error');
  }
};

export const createDevice = async (
  req: Request<any, any, CreateDeviceData>,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      responseError(res, 'Validation failed', 400, errors.array());
      return;
    }

    const device = await DeviceService.create(req.body);
    responseSuccess(res, 'Device created successfully', device, 201);
  } catch (error: any) {
    if (error.message === 'Building not found') {
      responseError(res, 'Building not found', 404);
      return;
    }
    if (error.message === 'Floor not found') {
      responseError(res, 'Floor not found', 404);
      return;
    }
    if (error.message === 'Room not found') {
      responseError(res, 'Room not found', 404);
      return;
    }
    if (error.message.includes('does not belong to')) {
      responseError(res, error.message, 400);
      return;
    }
    responseError(res, 'Internal server error');
  }
};

export const updateDevice = async (
  req: Request<{ id: string }, any, UpdateDeviceData>,
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
      responseError(res, 'Device ID is required', 400);
      return;
    }

    const device = await DeviceService.update(id, req.body);
    responseSuccess(res, 'Device updated successfully', device);
  } catch (error: any) {
    if (error.message === 'Device not found') {
      responseError(res, 'Device not found', 404);
      return;
    }
    if (error.message.includes('not found or does not belong')) {
      responseError(res, error.message, 400);
      return;
    }
    responseError(res, 'Internal server error');
  }
};

export const deleteDevice = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      responseError(res, 'Device ID is required', 400);
      return;
    }

    await DeviceService.delete(id);
    responseSuccess(res, 'Device deleted successfully');
  } catch (error: any) {
    if (error.message === 'Device not found') {
      responseError(res, 'Device not found', 404);
      return;
    }
    responseError(res, 'Internal server error');
  }
};

export const linkDeviceToRoom = async (
  req: Request<{ deviceId: string }, any, { roomId: string }>,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      responseError(res, 'Validation failed', 400, errors.array());
      return;
    }

    const { deviceId } = req.params;
    const { roomId } = req.body;

    if (!deviceId || !roomId) {
      responseError(res, 'Device ID and Room ID are required', 400);
      return;
    }

    const device = await DeviceService.linkToRoom(deviceId, roomId);
    responseSuccess(res, 'Device linked to room successfully', device);
  } catch (error: any) {
    if (error.message === 'Device not found' || error.message === 'Room not found') {
      responseError(res, error.message, 404);
      return;
    }
    if (error.message.includes('must belong to the same building')) {
      responseError(res, error.message, 400);
      return;
    }
    responseError(res, 'Internal server error');
  }
};

export const unlinkDeviceFromRoom = async (
  req: Request<{ deviceId: string }>,
  res: Response
): Promise<void> => {
  try {
    const { deviceId } = req.params;
    if (!deviceId) {
      responseError(res, 'Device ID is required', 400);
      return;
    }

    const device = await DeviceService.unlinkFromRoom(deviceId);
    responseSuccess(res, 'Device unlinked from room successfully', device);
  } catch (error: any) {
    if (error.message === 'Device not found') {
      responseError(res, 'Device not found', 404);
      return;
    }
    responseError(res, 'Internal server error');
  }
};