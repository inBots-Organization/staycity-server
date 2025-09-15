// src/controllers/propertyController.ts
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { PropertyService } from '../services/propertyService';

// Helpers
const toUSD = (cents?: number | null) => Math.round(cents ?? 0) / 100;

export const listProperties = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
      return;
    }

    const { q, status, city, country, page, pageSize } = req.query as any;

    // Delegates to service: should translate filters to Building/BuildingStatus
    const result = await PropertyService.list({
      q,
      status, // Expecting one of: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'
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
        items: result.items.map((p: any) => ({
          ...p,
          // keep client contract: expose USD from integer cents
          monthlySavingsUSD: toUSD(p.monthlySavings),
          // make amenities a simple array of enum strings
          amenities: Array.isArray(p.amenities)
            ? p.amenities.map((a: any) => a.amenity)
            : [],
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getPropertyBySlug = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { slug } = req.params;
    if (!slug) {
      res
        .status(400)
        .json({ success: false, message: 'Property slug is required' });
      return;
    }

    // Service should include related data: amenities, stats, floors? (as needed)
    const property = await PropertyService.bySlug(slug);
    if (!property) {
      res.status(404).json({ success: false, message: 'Property not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Property retrieved successfully',
      data: {
        ...property,
        amenities: Array.isArray(property.amenities)
          ? property.amenities.map((a: any) => a.amenity)
          : [],
        monthlySavingsUSD: toUSD(property.monthlySavings),
      },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const createProperty = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
      return;
    }

    // Expect Building fields in body: name, slug, status, rating, monthlySavings, etc.
    // Service should create a Building (and optionally related rows if you support that)
    const created = await PropertyService.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: created,
    });
  } catch (e: any) {
    // P2002 -> unique constraint violation (e.g., duplicate slug)
    if (e?.code === 'P2002') {
      res.status(409).json({ success: false, message: 'Duplicate slug' });
      return;
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const patchProperty = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
      return;
    }

    const { id } = req.params;
    if (!id) {
      res
        .status(400)
        .json({ success: false, message: 'Property ID is required' });
      return;
    }

    // Service should patch a Building by id (CUID)
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
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
      return;
    }

    const { id } = req.params; // Building id
    if (!id) {
      res
        .status(400)
        .json({ success: false, message: 'Property ID is required' });
      return;
    }

    // Body expects: { name: string, level: number, note?: string }
    // Service should enforce @@unique([buildingId, level])
    const created = await PropertyService.addFloor(id, req.body);

    res.status(201).json({
      success: true,
      message: 'Floor created successfully',
      data: created,
    });
  } catch (e: any) {
    // Optional: handle uniqueness on (buildingId, level)
    if (e?.code === 'P2002') {
      res
        .status(409)
        .json({
          success: false,
          message: 'A floor with this level already exists for this property',
        });
      return;
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const addRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
      return;
    }

    const { propertyId } = req.params; // Building id (still required to keep route shape)
    if (!propertyId) {
      res
        .status(400)
        .json({ success: false, message: 'Property ID is required' });
      return;
    }

    // New schema requires a floor relation.
    // Require floorId in body; service will also verify floor belongs to this building.
    const { floorId } = req.body || {};
    if (!floorId) {
      res.status(400).json({
        success: false,
        message: 'floorId is required to create a room',
      });
      return;
    }

    // Body can also include: name, type ('ROOM' | 'SUITE'), status ('AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE'), capacity
    const created = await PropertyService.addRoom(propertyId, req.body);

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: created,
    });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
