/**
 * @swagger
 * tags:
 *   name: Devices
 *   description: Device management endpoints with room linking capabilities
 */

import { Router } from 'express';
import { body, query, param } from 'express-validator';
import * as deviceController from '../controllers/deviceController';

const router = Router();

// Validation middleware
const validateCreateDevice = [
  body('buildingId')
    .notEmpty()
    .withMessage('Building ID is required')
    .isString()
    .withMessage('Building ID must be a string'),
  body('floorId')
    .optional()
    .isString()
    .withMessage('Floor ID must be a string'),
  body('roomId')
    .optional()
    .isString()
    .withMessage('Room ID must be a string'),
  body('typeId')
    .optional()
    .isString()
    .withMessage('Type ID must be a string'),
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 255 })
    .withMessage('Name must be less than 255 characters'),
  body('externalId')
    .optional()
    .isString()
    .withMessage('External ID must be a string')
    .isLength({ max: 255 })
    .withMessage('External ID must be less than 255 characters'),
  body('provider')
    .notEmpty()
    .withMessage('Provider is required')
    .isString()
    .withMessage('Provider must be a string')
    .isLength({ max: 64 })
    .withMessage('Provider must be less than 64 characters'),
  body('status')
    .optional()
    .isIn(['ONLINE', 'OFFLINE', 'MAINTENANCE'])
    .withMessage('Status must be ONLINE, OFFLINE, or MAINTENANCE'),
  body('payload')
    .optional()
    .custom((value) => {
      if (value !== undefined && typeof value !== 'object') {
        throw new Error('Payload must be an object');
      }
      return true;
    }),
];

const validateUpdateDevice = [
  body('name')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Name must be less than 255 characters'),
  body('externalId')
    .optional()
    .isString()
    .withMessage('External ID must be a string')
    .isLength({ max: 255 })
    .withMessage('External ID must be less than 255 characters'),
  body('status')
    .optional()
    .isIn(['ONLINE', 'OFFLINE', 'MAINTENANCE'])
    .withMessage('Status must be ONLINE, OFFLINE, or MAINTENANCE'),
  body('floorId')
    .optional()
    .isString()
    .withMessage('Floor ID must be a string'),
  body('roomId')
    .optional()
    .isString()
    .withMessage('Room ID must be a string'),
  body('typeId')
    .optional()
    .isString()
    .withMessage('Type ID must be a string'),
  body('payload')
    .optional()
    .custom((value) => {
      if (value !== undefined && typeof value !== 'object') {
        throw new Error('Payload must be an object');
      }
      return true;
    }),
];

const validateListDevices = [
  query('buildingId')
    .optional()
    .isString()
    .withMessage('Building ID must be a string'),
  query('floorId')
    .optional()
    .isString()
    .withMessage('Floor ID must be a string'),
  query('roomId')
    .optional()
    .isString()
    .withMessage('Room ID must be a string'),
  query('provider')
    .optional()
    .isString()
    .withMessage('Provider must be a string'),
  query('status')
    .optional()
    .isIn(['ONLINE', 'OFFLINE', 'MAINTENANCE'])
    .withMessage('Status must be ONLINE, OFFLINE, or MAINTENANCE'),
  query('typeId')
    .optional()
    .isString()
    .withMessage('Type ID must be a string'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page size must be between 1 and 100'),
];

const validateLinkDevice = [
  body('roomId')
    .notEmpty()
    .withMessage('Room ID is required')
    .isString()
    .withMessage('Room ID must be a string'),
];

const validateId = [
  param('id')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Invalid device ID'),
];

const validateBuildingId = [
  param('buildingId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Invalid building ID'),
];

const validateRoomId = [
  param('roomId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Invalid room ID'),
];

// Routes

/**
 * @swagger
 * /api/devices:
 *   get:
 *     summary: List devices
 *     tags: [Devices]
 *     parameters:
 *       - in: query
 *         name: buildingId
 *         schema:
 *           type: string
 *         description: Filter by building ID
 *       - in: query
 *         name: floorId
 *         schema:
 *           type: string
 *         description: Filter by floor ID
 *       - in: query
 *         name: roomId
 *         schema:
 *           type: string
 *         description: Filter by room ID
 *       - in: query
 *         name: provider
 *         schema:
 *           type: string
 *         description: Filter by provider (aranet, aqara, etc.)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ONLINE, OFFLINE, MAINTENANCE]
 *         description: Filter by status
 *       - in: query
 *         name: typeId
 *         schema:
 *           type: string
 *         description: Filter by device type ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Devices retrieved successfully
 */
router.get('/', validateListDevices, deviceController.listDevices);

/**
 * @swagger
 * /api/devices/{id}:
 *   get:
 *     summary: Get device by ID
 *     tags: [Devices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 *     responses:
 *       200:
 *         description: Device retrieved successfully
 *       404:
 *         description: Device not found
 */
router.get('/:id', validateId, deviceController.getDeviceById);

/**
 * @swagger
 * /api/devices/building/{buildingId}:
 *   get:
 *     summary: Get devices by building ID
 *     tags: [Devices]
 *     parameters:
 *       - in: path
 *         name: buildingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Building ID
 *     responses:
 *       200:
 *         description: Devices retrieved successfully
 */
router.get('/building/:buildingId', validateBuildingId, deviceController.getDevicesByBuildingId);

/**
 * @swagger
 * /api/devices/room/{roomId}:
 *   get:
 *     summary: Get devices by room ID
 *     tags: [Devices]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Devices retrieved successfully
 */
router.get('/room/:roomId', validateRoomId, deviceController.getDevicesByRoomId);

/**
 * @swagger
 * /api/devices/building/{buildingId}/unlinked:
 *   get:
 *     summary: Get unlinked devices in a building
 *     tags: [Devices]
 *     description: Get devices that are not linked to any room in the specified building
 *     parameters:
 *       - in: path
 *         name: buildingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Building ID
 *     responses:
 *       200:
 *         description: Unlinked devices retrieved successfully
 */
router.get('/building/:buildingId/unlinked', validateBuildingId, deviceController.getUnlinkedDevices);

/**
 * @swagger
 * /api/devices:
 *   post:
 *     summary: Create a new device
 *     tags: [Devices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - buildingId
 *               - name
 *               - provider
 *             properties:
 *               buildingId:
 *                 type: string
 *               floorId:
 *                 type: string
 *               roomId:
 *                 type: string
 *               typeId:
 *                 type: string
 *               name:
 *                 type: string
 *               externalId:
 *                 type: string
 *                 description: External sensor ID (e.g., Aranet or Aqara device ID)
 *               provider:
 *                 type: string
 *                 description: Device provider (aranet, aqara, etc.)
 *               status:
 *                 type: string
 *                 enum: [ONLINE, OFFLINE, MAINTENANCE]
 *                 default: OFFLINE
 *               payload:
 *                 type: object
 *                 description: Additional device data
 *     responses:
 *       201:
 *         description: Device created successfully
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Building, floor, or room not found
 */
router.post('/', validateCreateDevice, deviceController.createDevice);

/**
 * @swagger
 * /api/devices/{id}:
 *   put:
 *     summary: Update device
 *     tags: [Devices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               externalId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ONLINE, OFFLINE, MAINTENANCE]
 *               floorId:
 *                 type: string
 *               roomId:
 *                 type: string
 *               typeId:
 *                 type: string
 *               payload:
 *                 type: object
 *     responses:
 *       200:
 *         description: Device updated successfully
 *       404:
 *         description: Device not found
 */
router.put('/:id', validateId, validateUpdateDevice, deviceController.updateDevice);

/**
 * @swagger
 * /api/devices/{id}:
 *   delete:
 *     summary: Delete device
 *     tags: [Devices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 *     responses:
 *       200:
 *         description: Device deleted successfully
 *       404:
 *         description: Device not found
 */
router.delete('/:id', validateId, deviceController.deleteDevice);

/**
 * @swagger
 * /api/devices/{deviceId}/link:
 *   post:
 *     summary: Link device to room
 *     tags: [Devices]
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomId
 *             properties:
 *               roomId:
 *                 type: string
 *                 description: Room ID to link the device to
 *     responses:
 *       200:
 *         description: Device linked to room successfully
 *       400:
 *         description: Device and room must belong to the same building
 *       404:
 *         description: Device or room not found
 */
router.post('/:deviceId/link', param('deviceId').isString().notEmpty(), validateLinkDevice, deviceController.linkDeviceToRoom);

/**
 * @swagger
 * /api/devices/{deviceId}/unlink:
 *   post:
 *     summary: Unlink device from room
 *     tags: [Devices]
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 *     responses:
 *       200:
 *         description: Device unlinked from room successfully
 *       404:
 *         description: Device not found
 */
router.post('/:deviceId/unlink', param('deviceId').isString().notEmpty(), deviceController.unlinkDeviceFromRoom);

export default router;