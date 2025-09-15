// src/validators/propertyValidators.ts
import { body, param, query } from 'express-validator';

const cuidPattern = /^c[a-z0-9]{24,}$/;
const BUILDING_STATUSES = ['ACTIVE', 'MAINTENANCE', 'INACTIVE'] as const;
const ROOM_TYPES = ['ROOM', 'SUITE'] as const;
const ROOM_STATUSES = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'] as const;
const AMENITIES = [
  'WIFI',
  'PARKING',
  'RESTAURANT',
  'SPA',
  'GYM',
  'POOL',
  'BAR',
  'LAUNDRY',
] as const;

const isDeviceRefArray = (arr: unknown) =>
  Array.isArray(arr) &&
  arr.every(
    (x) =>
      x &&
      typeof x === 'object' &&
      typeof (x as any).id === 'string' &&
      (x as any).id.trim().length > 0 &&
      typeof (x as any).provider === 'string' &&
      (x as any).provider.trim().length > 0
  );

export const listPropertiesValidator = [
  query('status')
    .optional()
    .isIn([...BUILDING_STATUSES]),
  query('city').optional().isString(),
  query('country').optional().isString(),
  query('q').optional().isString(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const createPropertyValidator = [
  body('name').isString().trim().isLength({ min: 2 }),
  body('slug').isString().trim().isSlug(),
  body('status')
    .optional()
    .isIn([...BUILDING_STATUSES]),
  body('rating')
    .optional()
    .isFloat({ min: 0, max: 9.9 })
    .custom((v) => /^\d(?:\.\d)?$/.test(String(v))),
  body('monthlySavingsUSD').optional().isFloat({ min: 0 }),
  body('energyKwh')
    .optional()
    .isFloat({ min: 0 })
    .custom((v) => /^\d+(?:\.\d)?$/.test(String(v))),
  body('floorsCount').optional().isInt({ min: 0 }).toInt(),

  // location/contact (optional)
  body('address1').optional().isString(),
  body('address2').optional().isString(),
  body('city').optional().isString(),
  body('country').optional().isString(),
  body('latitude').optional().isFloat({ min: -90, max: 90 }),
  body('longitude').optional().isFloat({ min: -180, max: 180 }),
  body('contactEmail').optional().isEmail(),
  body('contactPhone').optional().isString(),

  // enums
  body('amenities')
    .optional()
    .isArray()
    .custom((arr) =>
      (arr as unknown[]).every((a) => AMENITIES.includes(String(a) as any))
    )
    .withMessage(`amenities must be subset of: ${AMENITIES.join(', ')}`),

  // stats
  body('stats').optional().isObject(),
  body('stats.currentGuests').optional().isInt({ min: 0 }).toInt(),
  body('stats.totalCapacity').optional().isInt({ min: 0 }).toInt(),
  body('stats.totalRooms').optional().isInt({ min: 0 }).toInt(),
  body('stats.availableRooms').optional().isInt({ min: 0 }).toInt(),

  // NEW: device refs at building level
  body('devices')
    .optional()
    .custom(isDeviceRefArray)
    .withMessage(
      'devices must be an array of { id: string, provider: string }'
    ),
];

export const patchPropertyValidator = [
  param('id').isString().matches(cuidPattern).withMessage('Invalid id (cuid)'),
  body('name').optional().isString(),
  body('slug').optional().isSlug(),
  body('status')
    .optional()
    .isIn([...BUILDING_STATUSES]),
  body('rating')
    .optional()
    .isFloat({ min: 0, max: 9.9 })
    .custom((v) => /^\d(?:\.\d)?$/.test(String(v))),
  body('monthlySavings').optional().isInt({ min: 0 }).toInt(),
  body('monthlySavingsUSD').optional().isFloat({ min: 0 }),
  body('energyKwh')
    .optional()
    .isFloat({ min: 0 })
    .custom((v) => /^\d+(?:\.\d)?$/.test(String(v))),
  body('floorsCount').optional().isInt({ min: 0 }).toInt(),
  body('address1').optional().isString(),
  body('address2').optional().isString(),
  body('city').optional().isString(),
  body('country').optional().isString(),
  body('latitude').optional().isFloat({ min: -90, max: 90 }),
  body('longitude').optional().isFloat({ min: -180, max: 180 }),
  body('contactEmail').optional().isEmail(),
  body('contactPhone').optional().isString(),
  body('amenities')
    .optional()
    .isArray()
    .custom((arr) =>
      (arr as unknown[]).every((a) => AMENITIES.includes(String(a) as any))
    ),
  // NEW: device refs (replace semantics on patch)
  body('devices')
    .optional()
    .custom(isDeviceRefArray)
    .withMessage(
      'devices must be an array of { id: string, provider: string }'
    ),
];

export const addFloorValidator = [
  param('id').isString().matches(cuidPattern).withMessage('Invalid id (cuid)'),
  body('name').isString().trim().notEmpty(),
  body('level').isInt().toInt(),
  body('note').optional().isString(),
  // NEW: device refs for floor create
  body('devices')
    .optional()
    .custom(isDeviceRefArray)
    .withMessage(
      'devices must be an array of { id: string, provider: string }'
    ),
];

export const addRoomValidator = [
  param('propertyId')
    .isString()
    .matches(cuidPattern)
    .withMessage('Invalid propertyId (cuid)'),
  body('floorId')
    .isString()
    .matches(cuidPattern)
    .withMessage('Invalid floorId (cuid)'),
  body('name').isString().trim().notEmpty(),
  body('type').isIn([...ROOM_TYPES]),
  body('status')
    .optional()
    .isIn([...ROOM_STATUSES]),
  body('capacity').optional().isInt({ min: 1 }).toInt(),
  // NEW: device refs for room create
  body('devices')
    .optional()
    .custom(isDeviceRefArray)
    .withMessage(
      'devices must be an array of { id: string, provider: string }'
    ),
];
