/**
 * @swagger
 * tags:
 *   name: Rooms
 *   description: Room management endpoints with device integration
 */

import { Router } from 'express';
import { body, query, param } from 'express-validator';
import * as roomController from '../controllers/roomController';

const router = Router();

// Validation middleware
const validateCreateRoom = [
  body('buildingId')
    .notEmpty()
    .withMessage('Building ID is required')
    .isString()
    .withMessage('Building ID must be a string'),
  body('floorId')
    .notEmpty()
    .withMessage('Floor ID is required')
    .isString()
    .withMessage('Floor ID must be a string'),
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 255 })
    .withMessage('Name must be less than 255 characters'),
  body('type')
    .optional()
    .isIn(['ROOM', 'SUITE'])
    .withMessage('Type must be ROOM or SUITE'),
  body('status')
    .optional()
    .isIn(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'])
    .withMessage('Invalid status'),
  body('capacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Capacity must be a positive integer'),
  body('deviceIds')
    .optional()
    .isArray()
    .withMessage('Device IDs must be an array')
    .custom((deviceIds) => {
      if (deviceIds.some((id: any) => typeof id !== 'string')) {
        throw new Error('All device IDs must be strings');
      }
      return true;
    })
];

const validateUpdateRoom = [
  body('name')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Name must be less than 255 characters'),
  body('type')
    .optional()
    .isIn(['ROOM', 'SUITE'])
    .withMessage('Type must be ROOM or SUITE'),
  body('status')
    .optional()
    .isIn(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'])
    .withMessage('Invalid status'),
  body('capacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Capacity must be a positive integer'),
  body('deviceIds')
    .optional()
    .isArray()
    .withMessage('Device IDs must be an array')
    .custom((deviceIds) => {
      if (deviceIds.some((id: any) => typeof id !== 'string')) {
        throw new Error('All device IDs must be strings');
      }
      return true;
    })
];

const validateListRooms = [
  query('buildingId')
    .optional()
    .isString()
    .withMessage('Building ID must be a string'),
  query('floorId')
    .optional()
    .isString()
    .withMessage('Floor ID must be a string'),
  query('status')
    .optional()
    .isIn(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'])
    .withMessage('Invalid status'),
  query('type')
    .optional()
    .isIn(['ROOM', 'SUITE'])
    .withMessage('Type must be ROOM or SUITE'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page size must be between 1 and 100')
];

const validateDeviceIds = [
  body('deviceIds')
    .isArray({ min: 1 })
    .withMessage('Device IDs must be a non-empty array')
    .custom((deviceIds) => {
      if (deviceIds.some((id: any) => typeof id !== 'string')) {
        throw new Error('All device IDs must be strings');
      }
      return true;
    })
];

const validateId = [
  param('id')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Invalid room ID')
];

const validateFloorId = [
  param('floorId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Invalid floor ID')
];

const validateBuildingId = [
  param('buildingId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Invalid building ID')
];

// Routes

/**
 * @swagger
 * /api/rooms:
 *   get:
 *     summary: List rooms
 *     tags: [Rooms]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [AVAILABLE, OCCUPIED, MAINTENANCE]
 *         description: Filter by status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [ROOM, SUITE]
 *         description: Filter by room type
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
 *         description: Rooms retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Room'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get('/', validateListRooms, roomController.listRooms);

/**
 * @swagger
 * /api/rooms/{id}:
 *   get:
 *     summary: Get room by ID
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Room retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Room'
 *       404:
 *         description: Room not found
 */
router.get('/:id', validateId, roomController.getRoomById);

/**
 * @swagger
 * /api/rooms/{id}/metrics:
 *   get:
 *     summary: Get room with live Aranet sensor metrics
 *     tags: [Rooms]
 *     description: Retrieves room information along with live environmental data from connected Aranet sensors (temperature, humidity, CO₂, pressure, etc.)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Room with sensor metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/RoomWithMetrics'
 *             example:
 *               success: true
 *               message: "Room with metrics retrieved successfully"
 *               data:
 *                 id: "cmfjlg73z0007ijm5ip7lj2z3"
 *                 name: "Room 101"
 *                 type: "ROOM"
 *                 status: "AVAILABLE"
 *                 capacity: 2
 *                 deviceIds: ["4227764"]
 *                 building:
 *                   id: "cmfjlg1nv0000ijm5cdjy0k6e"
 *                   name: "Test Hotel"
 *                   address: "123 Main St, Test City"
 *                 floor:
 *                   id: "cmfjlg4250003ijm58mrsoqvg"
 *                   name: "Ground Floor"
 *                   level: 0
 *                 deviceMetrics:
 *                   - sensorId: "4227764"
 *                     sensorName: "Test Environmental Sensor 1"
 *                     sensorType: "S4V1"
 *                     readings:
 *                       - metricId: "1"
 *                         metricName: "Temperature"
 *                         value: 18.3
 *                         unit: "°C"
 *                         timestamp: "2025-09-14T11:10:39Z"
 *                       - metricId: "2"
 *                         metricName: "Humidity"
 *                         value: 51
 *                         unit: "%"
 *                         timestamp: "2025-09-14T11:10:39Z"
 *                       - metricId: "3"
 *                         metricName: "CO₂"
 *                         value: 464
 *                         unit: "ppm"
 *                         timestamp: "2025-09-14T11:10:39Z"
 *                       - metricId: "4"
 *                         metricName: "Atmospheric Pressure"
 *                         value: 997.4
 *                         unit: "hPa"
 *                         timestamp: "2025-09-14T11:10:39Z"
 *                       - metricId: "61"
 *                         metricName: "RSSI"
 *                         value: -14
 *                         unit: "dBm"
 *                         timestamp: "2025-09-14T11:10:39Z"
 *                       - metricId: "62"
 *                         metricName: "Battery voltage"
 *                         value: 59
 *                         unit: "%"
 *                         timestamp: "2025-09-14T11:10:39Z"
 *       404:
 *         description: Room not found
 */
router.get('/:id/metrics', validateId, roomController.getRoomByIdWithMetrics);

/**
 * @swagger
 * /api/rooms/floor/{floorId}:
 *   get:
 *     summary: Get rooms by floor ID
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: floorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Floor ID
 *     responses:
 *       200:
 *         description: Rooms retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Room'
 */
router.get('/floor/:floorId', validateFloorId, roomController.getRoomsByFloorId);

/**
 * @swagger
 * /api/rooms/building/{buildingId}:
 *   get:
 *     summary: Get rooms by building ID
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: buildingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Building ID
 *     responses:
 *       200:
 *         description: Rooms retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Room'
 */
router.get('/building/:buildingId', validateBuildingId, roomController.getRoomsByBuildingId);

/**
 * @swagger
 * /api/rooms:
 *   post:
 *     summary: Create a new room
 *     tags: [Rooms]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - buildingId
 *               - floorId
 *               - name
 *             properties:
 *               buildingId:
 *                 type: string
 *               floorId:
 *                 type: string
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [ROOM, SUITE]
 *                 default: ROOM
 *               status:
 *                 type: string
 *                 enum: [AVAILABLE, OCCUPIED, MAINTENANCE]
 *                 default: AVAILABLE
 *               capacity:
 *                 type: integer
 *                 minimum: 1
 *                 default: 2
 *               deviceIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of Aranet sensor IDs
 *                 example: ["4227764", "5250559"]
 *     responses:
 *       201:
 *         description: Room created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Room'
 *       400:
 *         description: Validation failed or floor does not belong to building
 *       404:
 *         description: Floor not found
 */
router.post('/', validateCreateRoom, roomController.createRoom);

/**
 * @swagger
 * /api/rooms/{id}:
 *   put:
 *     summary: Update room
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [ROOM, SUITE]
 *               status:
 *                 type: string
 *                 enum: [AVAILABLE, OCCUPIED, MAINTENANCE]
 *               capacity:
 *                 type: integer
 *                 minimum: 1
 *               deviceIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of Aranet sensor IDs
 *     responses:
 *       200:
 *         description: Room updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Room'
 *       404:
 *         description: Room not found
 */
router.put('/:id', validateId, validateUpdateRoom, roomController.updateRoom);

/**
 * @swagger
 * /api/rooms/{id}:
 *   delete:
 *     summary: Delete room
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Room deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Room not found
 */
router.delete('/:id', validateId, roomController.deleteRoom);

/**
 * @swagger
 * /api/rooms/{id}/devices:
 *   post:
 *     summary: Add devices to room
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceIds
 *             properties:
 *               deviceIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 description: Array of Aranet sensor IDs to add
 *                 example: ["4227764", "5250559"]
 *     responses:
 *       200:
 *         description: Devices added to room successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Room'
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Room not found
 */
router.post('/:id/devices', validateId, validateDeviceIds, roomController.addDeviceToRoom);

/**
 * @swagger
 * /api/rooms/{id}/devices:
 *   delete:
 *     summary: Remove devices from room
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceIds
 *             properties:
 *               deviceIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 description: Array of Aranet sensor IDs to remove
 *                 example: ["4227764"]
 *     responses:
 *       200:
 *         description: Devices removed from room successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Room'
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Room not found
 */
router.delete('/:id/devices', validateId, validateDeviceIds, roomController.removeDeviceFromRoom);

/**
 * @swagger
 * /api/rooms/{id}/devices:
 *   get:
 *     summary: Get room devices
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Room devices retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Device'
 *       404:
 *         description: Room not found
 */
router.get('/:id/devices', validateId, roomController.getRoomDevices);

/**
 * @swagger
 * /api/rooms/{id}/devices/link:
 *   post:
 *     summary: Link devices to room using relations
 *     tags: [Rooms]
 *     description: Links devices to a room using Prisma relations. Devices must belong to the same building as the room.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceIds
 *             properties:
 *               deviceIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 description: Array of device IDs to link to the room
 *                 example: ["cm123abc", "cm456def"]
 *     responses:
 *       200:
 *         description: Devices linked to room successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/RoomWithDevices'
 *       400:
 *         description: Some devices not found or do not belong to the same building
 *       404:
 *         description: Room not found
 */
router.post('/:id/devices/link', validateId, validateDeviceIds, roomController.linkDevicesToRoom);

/**
 * @swagger
 * /api/rooms/{id}/devices/unlink:
 *   post:
 *     summary: Unlink devices from room using relations
 *     tags: [Rooms]
 *     description: Unlinks devices from a room using Prisma relations. Only devices that belong to this room will be unlinked.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceIds
 *             properties:
 *               deviceIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 description: Array of device IDs to unlink from the room
 *                 example: ["cm123abc", "cm456def"]
 *     responses:
 *       200:
 *         description: Devices unlinked from room successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/RoomWithDevices'
 *       400:
 *         description: Some devices not found or do not belong to this room
 *       404:
 *         description: Room not found
 */
router.post('/:id/devices/unlink', validateId, validateDeviceIds, roomController.unlinkDevicesFromRoom);

/**
 * @swagger
 * /api/rooms/presence-trend:
 *   get:
 *     summary: Get presence trend for a specific room
 *     tags: [Rooms]
 *     description: |
 *       Returns time-series presence data for a specific room, aggregated per minute.
 *       All sensor values within the same minute are summed to avoid double counting.
 *     parameters:
 *       - in: query
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID to get presence trend for
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: ISO start datetime (default: now - 48h)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: ISO end datetime (default: now)
 *     responses:
 *       200:
 *         description: Room presence trend retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Room presence logs retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     from:
 *                       type: string
 *                       format: date-time
 *                     to:
 *                       type: string
 *                       format: date-time
 *                     room:
 *                       type: object
 *                       properties:
 *                         roomId:
 *                           type: string
 *                         name:
 *                           type: string
 *                         type:
 *                           type: string
 *                           enum: [ROOM, SUITE]
 *                         capacity:
 *                           type: integer
 *                         points:
 *                           type: array
 *                           description: Aggregated presence values per minute
 *                           items:
 *                             type: object
 *                             properties:
 *                               value:
 *                                 type: integer
 *                                 description: Total presence count for this minute
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
 *                                 description: Minute timestamp
 *       400:
 *         description: Room ID is required or invalid date format
 *       404:
 *         description: Room not found
 *       500:
 *         description: Internal server error
 */
router.get('/presence-trend', roomController.getPresenceTrendForRoom);

// router.get('/script/logs', roomController.script);

export default router;