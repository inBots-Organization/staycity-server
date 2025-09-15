import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import {
  BuildingService,
  ListBuildingsParams,
  CreateBuildingData,
  UpdateBuildingData,
} from '../services/buildingService';
import { BuildingStatus } from '../generated/prisma';
import { responseSuccess, responseError } from '../utils/responseHelper';

export const listBuildings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      responseError(res, 'Validation failed', 400, errors.array());
      return;
    }

    const { page, pageSize, search, status, city, country } = req.query;

    const params: ListBuildingsParams = {
      ...(page && { page: Number(page) }),
      ...(pageSize && { pageSize: Number(pageSize) }),
      ...(search && { search: String(search) }),
      ...(status && { status: status as BuildingStatus }),
      ...(city && { city: String(city) }),
      ...(country && { country: String(country) }),
    };

    const result = await BuildingService.list(params);

    responseSuccess(res, 'Buildings retrieved successfully', result);
  } catch (error) {
    responseError(res, 'Internal server error');
  }
};

export const getBuildingById = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      responseError(res, 'Building ID is required', 400);
      return;
    }

    const building = await BuildingService.getById(id);
    if (!building) {
      responseError(res, 'Building not found', 404);
      return;
    }

    responseSuccess(res, 'Building retrieved successfully', building);
  } catch (error) {
    responseError(res, 'Internal server error');
  }
};

export const getBuildingBySlug = async (
  req: Request<{ slug: string }>,
  res: Response
): Promise<void> => {
  try {
    const { slug } = req.params;
    if (!slug) {
      responseError(res, 'Building slug is required', 400);
      return;
    }

    const building = await BuildingService.getBySlug(slug);
    if (!building) {
      responseError(res, 'Building not found', 404);
      return;
    }

    responseSuccess(res, 'Building retrieved successfully', building);
  } catch (error) {
    responseError(res, 'Internal server error');
  }
};

export const createBuilding = async (
  req: Request<any, any, CreateBuildingData>,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      responseError(res, 'Validation failed', 400, errors.array());
      return;
    }

    const building = await BuildingService.create(req.body);
    responseSuccess(res, 'Building created successfully', building, 201);
  } catch (error: any) {
    if (error.code === 'P2002') {
      responseError(res, 'Building with this slug already exists', 409);
      return;
    }
    responseError(res, 'Internal server error');
  }
};

export const updateBuilding = async (
  req: Request<{ id: string }, any, UpdateBuildingData>,
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
      responseError(res, 'Building ID is required', 400);
      return;
    }

    const building = await BuildingService.update(id, req.body);

    responseSuccess(res, 'Building updated successfully', building);
  } catch (error: any) {
    if (error.code === 'P2025') {
      responseError(res, 'Building not found', 404);
      return;
    }
    responseError(res, 'Internal server error');
  }
};

export const deleteBuilding = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      responseError(res, 'Building ID is required', 400);
      return;
    }

    await BuildingService.delete(id);
    responseSuccess(res, 'Building deleted successfully');
  } catch (error: any) {
    if (error.code === 'P2025') {
      responseError(res, 'Building not found', 404);
      return;
    }
    responseError(res, 'Internal server error');
  }
};
