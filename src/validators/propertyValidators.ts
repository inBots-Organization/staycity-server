import { body, param, query } from 'express-validator';

export const listPropertiesValidator = [
  query('status').optional().isIn(['ACTIVE', 'MAINTENANCE', 'INACTIVE']),
  query('city').optional().isString(),
  query('country').optional().isString(),
  query('q').optional().isString(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const createPropertyValidator = [
  body('name').isString().notEmpty(),
  body('slug').isString().notEmpty(),
  body('status').optional().isIn(['ACTIVE', 'MAINTENANCE', 'INACTIVE']),
  body('rating').optional().isFloat({ min: 0, max: 5 }),
  body('monthlySavingsUSD').optional().isFloat({ min: 0 }),
  body('energyKwh').optional().isFloat({ min: 0 }),
  body('floorsCount').optional().isInt({ min: 0 }).toInt(),
  body('amenities').optional().isArray(),
];

export const patchPropertyValidator = [
  param('id').isString().notEmpty(),
  body('name').optional().isString(),
  body('status').optional().isIn(['ACTIVE', 'MAINTENANCE', 'INACTIVE']),
  body('rating').optional().isFloat({ min: 0, max: 5 }),
  body('monthlySavings').optional().isInt({ min: 0 }).toInt(), // cents
  body('amenities').optional().isArray(),
];

export const addFloorValidator = [
  param('id').isString().notEmpty(),
  body('name').isString().notEmpty(),
  body('level').isInt().toInt(),
  body('note').optional().isString(),
];

export const addRoomValidator = [
  param('propertyId').isString().notEmpty(),
  body('floorId').isString().notEmpty(),
  body('name').isString().notEmpty(),
  body('type').isIn(['ROOM', 'SUITE']),
  body('status').optional().isIn(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE']),
  body('capacity').optional().isInt({ min: 1 }).toInt(),
];
