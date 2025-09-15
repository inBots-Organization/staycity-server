import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { FloorService } from '../services/floorService';
import { responseSuccess, responseError } from '../utils/responseHelper';

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
