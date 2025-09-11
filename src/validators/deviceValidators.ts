import { body, param, query } from 'express-validator';

export const listDevicesValidator = [
  query('propertyId').optional().isString(),
  query('status').optional().isIn(['ONLINE', 'OFFLINE']),
  query('typeKey').optional().isString(),
];

export const createDeviceValidator = [
  body('propertyId').isString().notEmpty(),
  body('roomId').optional().isString(),
  body('typeKey').isString().notEmpty(),
  body('name').isString().notEmpty(),
  body('batteryPct').optional().isInt({ min: 0, max: 100 }).toInt(),
  body('state').optional().isObject(),
];

export const addReadingValidator = [
  param('id').isString().notEmpty(),
  body('metric').isString().notEmpty(),
  body('valueNum').optional().isFloat(),
  body('valueText').optional().isString(),
  body('unit').optional().isString(),
  body('recordedAt').optional().isISO8601(),
];
