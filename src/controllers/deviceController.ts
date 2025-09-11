import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { DeviceService } from '../services/deviceService';

export const listDevices = async (req: Request, res: Response): Promise<void> => {
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

    const { propertyId, status, typeKey } = req.query as any;
    const items = await DeviceService.list({ propertyId, status, typeKey });
    res.json({
      success: true,
      message: 'Devices retrieved successfully',
      data: items,
    });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const createDevice = async (req: Request, res: Response): Promise<void> => {
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

    const created = await DeviceService.create(req.body);
    res
      .status(201)
      .json({
        success: true,
        message: 'Device created successfully',
        data: created,
      });
  } catch (e: any) {
    res
      .status(e.statusCode ?? 500)
      .json({ success: false, message: e.message ?? 'Internal server error' });
  }
};

export const addReading = async (req: Request, res: Response): Promise<void> => {
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
        message: 'Device ID is required'
      });
    }

    const created = await DeviceService.addReading(id, {
      metric: req.body.metric,
      valueNum: req.body.valueNum,
      valueText: req.body.valueText || null,
      unit: req.body.unit || null,
      recordedAt: req.body.recordedAt
        ? new Date(req.body.recordedAt)
        : new Date(),
    });
    res
      .status(201)
      .json({
        success: true,
        message: 'Reading added successfully',
        data: created,
      });
  } catch {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
