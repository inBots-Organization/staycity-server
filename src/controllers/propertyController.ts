import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { PropertyService } from '../services/propertyService';

export const listProperties = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res
        .status(400)
        .json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });

    const { q, status, city, country, page, pageSize } = req.query as any;
    const result = await PropertyService.list({
      q,
      status,
      city,
      country,
      ...(page ? { page: Number(page) } : {}),
      ...(pageSize ? { pageSize: Number(pageSize) } : {}),
    });

    res.json({
      success: true,
      message: 'Properties retrieved successfully',
      data: {
        ...result,
        items: result.items.map((p) => ({
          ...p,
          monthlySavingsUSD: Math.round(p.monthlySavings || 0) / 100,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getPropertyBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    if (!slug) {
      return res.status(400).json({
        success: false,
        message: 'Property slug is required'
      });
    }
    
    const property = await PropertyService.bySlug(slug);
    if (!property)
      return res
        .status(404)
        .json({ success: false, message: 'Property not found' });

    res.json({
      success: true,
      message: 'Property retrieved successfully',
      data: {
        ...property,
        amenities: property.amenities.map((a) => a.amenity),
        monthlySavingsUSD: Math.round(property.monthlySavings) / 100,
      },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const createProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res
        .status(400)
        .json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });

    const created = await PropertyService.create(req.body);
    res
      .status(201)
      .json({
        success: true,
        message: 'Property created successfully',
        data: created,
      });
  } catch (e: any) {
    if (e.code === 'P2002') {
      return res
        .status(409)
        .json({ success: false, message: 'Duplicate slug' });
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const patchProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res
        .status(400)
        .json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Property ID is required'
      });
    }

    const updated = await PropertyService.patch(id, req.body);
    res.json({
      success: true,
      message: 'Property updated successfully',
      data: updated,
    });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const addFloor = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res
        .status(400)
        .json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Property ID is required'
      });
    }

    const created = await PropertyService.addFloor(id, req.body);
    res
      .status(201)
      .json({
        success: true,
        message: 'Floor created successfully',
        data: created,
      });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const addRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res
        .status(400)
        .json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });

    const { propertyId } = req.params;
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: 'Property ID is required'
      });
    }

    const created = await PropertyService.addRoom(propertyId, req.body);
    res
      .status(201)
      .json({
        success: true,
        message: 'Room created successfully',
        data: created,
      });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
