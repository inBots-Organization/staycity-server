import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import {
  RoomService,
  ListRoomsParams,
  CreateRoomData,
  UpdateRoomData,
} from '../services/roomService';
import { RoomStatus, RoomType } from '../generated/prisma';
import { responseSuccess, responseError } from '../utils/responseHelper';

export const listRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      responseError(res, 'Validation failed', 400, errors.array());
      return;
    }

    const { buildingId, floorId, status, type, page, pageSize } = req.query;

    const listParams: ListRoomsParams = {
      ...(buildingId && { buildingId: String(buildingId) }),
      ...(floorId && { floorId: String(floorId) }),
      ...(status && { status: status as RoomStatus }),
      ...(type && { type: type as RoomType }),
      ...(page && { page: Number(page) }),
      ...(pageSize && { pageSize: Number(pageSize) }),
    };

    const result = await RoomService.list(listParams);

    responseSuccess(res, 'Rooms retrieved successfully', result);
  } catch (error) {
    responseError(res, 'Internal server error');
  }
};

export const getRoomById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      responseError(res, 'Room ID is required', 400);
      return;
    }

    const room = await RoomService.getById(id);
    if (!room) {
      responseError(res, 'Room not found', 404);
      return;
    }

    responseSuccess(res, 'Room retrieved successfully', room);
  } catch (error) {
    responseError(res, 'Internal server error');
  }
};

export const getRoomByIdWithMetrics = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      responseError(res, 'Room ID is required', 400);
      return;
    }

    const room = await RoomService.getByIdWithMetrics(id);
    if (!room) {
      responseError(res, 'Room not found', 404);
      return;
    }

    responseSuccess(res, 'Room with metrics retrieved successfully', room);
  } catch (error) {
    console.error('Error in getRoomByIdWithMetrics:', error);
    responseError(res, 'Internal server error');
  }
};

export const getRoomsByFloorId = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { floorId } = req.params;
    if (!floorId) {
      responseError(res, 'Floor ID is required', 400);
      return;
    }

    const rooms = await RoomService.getByFloorId(floorId);
    responseSuccess(res, 'Rooms retrieved successfully', rooms);
  } catch (error) {
    responseError(res, 'Internal server error');
  }
};

export const getRoomsByBuildingId = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { buildingId } = req.params;
    if (!buildingId) {
      responseError(res, 'Building ID is required', 400);
      return;
    }

    const rooms = await RoomService.getByBuildingId(buildingId);
    responseSuccess(res, 'Rooms retrieved successfully', rooms);
  } catch (error) {
    responseError(res, 'Internal server error');
  }
};

export const createRoom = async (
  req: Request<any, any, CreateRoomData>,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      responseError(res, 'Validation failed', 400, errors.array());
      return;
    }

    const room = await RoomService.create(req.body);
    responseSuccess(res, 'Room created successfully', room, 201);
  } catch (error: any) {
    if (error.message === 'Floor not found') {
      responseError(res, 'Floor not found', 404);
      return;
    }
    if (error.message === 'Floor does not belong to the specified building') {
      responseError(
        res,
        'Floor does not belong to the specified building',
        400
      );
      return;
    }
    responseError(res, 'Internal server error');
  }
};

export const updateRoom = async (
  req: Request<{ id: string }, any, UpdateRoomData>,
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
      responseError(res, 'Room ID is required', 400);
      return;
    }

    const room = await RoomService.update(id, req.body);

    responseSuccess(res, 'Room updated successfully', room);
  } catch (error: any) {
    if (error.message === 'Room not found') {
      responseError(res, 'Room not found', 404);
      return;
    }
    responseError(res, 'Internal server error');
  }
};

export const deleteRoom = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      responseError(res, 'Room ID is required', 400);
      return;
    }

    await RoomService.delete(id);
    responseSuccess(res, 'Room deleted successfully');
  } catch (error: any) {
    if (error.message === 'Room not found') {
      responseError(res, 'Room not found', 404);
      return;
    }
    responseError(res, 'Internal server error');
  }
};

export const addDeviceToRoom = async (
  req: Request<{ id: string }, any, { deviceIds: string[] }>,
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
      responseError(res, 'Room ID is required', 400);
      return;
    }

    const { deviceIds } = req.body;
    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
      responseError(res, 'deviceIds must be a non-empty array', 400);
      return;
    }

    const room = await RoomService.addDeviceIds(id, deviceIds);
    responseSuccess(res, 'Devices added to room successfully', room);
  } catch (error: any) {
    if (error.message === 'Room not found') {
      responseError(res, 'Room not found', 404);
      return;
    }
    responseError(res, 'Internal server error');
  }
};

export const removeDeviceFromRoom = async (
  req: Request<{ id: string }, any, { deviceIds: string[] }>,
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
      responseError(res, 'Room ID is required', 400);
      return;
    }

    const { deviceIds } = req.body;
    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
      responseError(res, 'deviceIds must be a non-empty array', 400);
      return;
    }

    const room = await RoomService.removeDeviceIds(id, deviceIds);
    responseSuccess(res, 'Devices removed from room successfully', room);
  } catch (error: any) {
    if (error.message === 'Room not found') {
      responseError(res, 'Room not found', 404);
      return;
    }
    responseError(res, 'Internal server error');
  }
};

export const linkDevicesToRoom = async (
  req: Request<{ id: string }, any, { deviceIds: string[] }>,
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
      responseError(res, 'Room ID is required', 400);
      return;
    }

    const { deviceIds } = req.body;
    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
      responseError(res, 'deviceIds must be a non-empty array', 400);
      return;
    }

    const room = await RoomService.linkDevicesToRoom(id, deviceIds);
    responseSuccess(res, 'Devices linked to room successfully', room);
  } catch (error: any) {
    if (error.message === 'Room not found') {
      responseError(res, 'Room not found', 404);
      return;
    }
    if (error.message.includes('not found or do not belong')) {
      responseError(res, error.message, 400);
      return;
    }
    responseError(res, 'Internal server error');
  }
};

export const unlinkDevicesFromRoom = async (
  req: Request<{ id: string }, any, { deviceIds: string[] }>,
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
      responseError(res, 'Room ID is required', 400);
      return;
    }

    const { deviceIds } = req.body;
    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
      responseError(res, 'deviceIds must be a non-empty array', 400);
      return;
    }

    const room = await RoomService.unlinkDevicesFromRoom(id, deviceIds);
    responseSuccess(res, 'Devices unlinked from room successfully', room);
  } catch (error: any) {
    if (error.message === 'Room not found') {
      responseError(res, 'Room not found', 404);
      return;
    }
    if (error.message.includes('not found or do not belong')) {
      responseError(res, error.message, 400);
      return;
    }
    responseError(res, 'Internal server error');
  }
};

export const getRoomDevices = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      responseError(res, 'Room ID is required', 400);
      return;
    }

    const devices = await RoomService.getRoomDevices(id);
    responseSuccess(res, 'Room devices retrieved successfully', devices);
  } catch (error: any) {
    if (error.message === 'Room not found') {
      responseError(res, 'Room not found', 404);
      return;
    }
    responseError(res, 'Internal server error');
  }
};
