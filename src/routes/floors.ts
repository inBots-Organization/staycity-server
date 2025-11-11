/**
 * @swagger
 * tags:
 *   name: Floors
 *   description: Floor management endpoints
 */

import { Router } from 'express';
import { body, query, param } from 'express-validator';
import * as floorController from '../controllers/floorController';

const router = Router();

// Validation middleware
const validateCreateFloor = [
  body('buildingId')
    .notEmpty()
    .withMessage('Building ID is required')
    .isString()
    .withMessage('Building ID must be a string'),
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 255 })
    .withMessage('Name must be less than 255 characters'),
  body('level')
    .isInt()
    .withMessage('Level must be an integer'),
  body('note')
    .optional()
    .isString()
    .withMessage('Note must be a string')
];

const validateUpdateFloor = [
  body('name')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Name must be less than 255 characters'),
  body('level')
    .optional()
    .isInt()
    .withMessage('Level must be an integer'),
  body('note')
    .optional()
    .isString()
    .withMessage('Note must be a string')
];

const validateListFloors = [
  query('buildingId')
    .optional()
    .isString()
    .withMessage('Building ID must be a string'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page size must be between 1 and 100')
];

const validateId = [
  param('id')
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
 * /api/floors:
 *   get:
 *     summary: List floors
 *     tags: [Floors]
 *     parameters:
 *       - in: query
 *         name: buildingId
 *         schema:
 *           type: string
 *         description: Filter by building ID
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
 *         description: Floors retrieved successfully
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
 *                         $ref: '#/components/schemas/Floor'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get('/', validateListFloors, floorController.listFloors);
// Energy comparison for floors (last month) - must be BEFORE '/:id'
router.get('/floorComparision', floorController.floorComparision);

/**
 * @swagger
 * /api/floors/presence-trend:
 *   get:
 *     summary: Get presence trends for floors
 *     tags: [Floors]
 *     description: |
 *       Returns raw presence logs per floor within a time window as point arrays.
 *       Each point contains the sensor reading value and its createdAt timestamp.
 *     parameters:
 *       - in: query
 *         name: buildingId
 *         schema:
 *           type: string
 *         description: Optional building ID to filter floors
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: ISO start datetime (default: now - 24h)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: ISO end datetime (default: now)
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [hour, day]
 *         description: Bucket interval (default: hour)
 *     responses:
 *       200:
 *         description: Presence trends retrieved successfully
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
 *                   example: "Presence trends retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     from:
 *                       type: string
 *                       format: date-time
 *                     to:
 *                       type: string
 *                       format: date-time
 *                     interval:
 *                       type: string
 *                       enum: [hour, day]
 *                     floors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           floorId:
 *                             type: string
 *                           name:
 *                             type: string
 *                           level:
 *                             type: integer
 *                           points:
 *                             type: array
 *                             description: Raw presence log points for this floor (merged from all devices)
 *                             items:
 *                               type: object
 *                               properties:
 *                                 value:
 *                                   type: integer
 *                                   description: Presence value captured by a motion sensor
 *                                 createdAt:
 *                                   type: string
 *                                   format: date-time
 *                                   description: Log creation timestamp
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.get('/presence-trend', floorController.getPresenceTrendForComparisonFloores);

/**
 * @swagger
 * /api/floors/energy-trend:
 *   get:
 *     summary: Get energy consumption trends for multiple floors
 *     tags: [Floors]
 *     description: |
 *       Returns time-series energy consumption data for floors, aggregated by hour or day.
 *       Perfect for creating charts comparing energy usage across floors.
 *     parameters:
 *       - in: query
 *         name: buildingId
 *         schema:
 *           type: string
 *         description: Filter by building ID (optional)
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: ISO start datetime (default: now - 24h)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: ISO end datetime (default: now)
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [hour, day]
 *           default: hour
 *         description: Time bucket interval for aggregation
 *     responses:
 *       200:
 *         description: Energy trends retrieved successfully
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
 *                   example: "Energy trends retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     from:
 *                       type: string
 *                       format: date-time
 *                     to:
 *                       type: string
 *                       format: date-time
 *                     interval:
 *                       type: string
 *                       enum: [hour, day]
 *                     floors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           floorId:
 *                             type: string
 *                           name:
 *                             type: string
 *                           level:
 *                             type: integer
 *                           points:
 *                             type: array
 *                             description: Energy consumption data points
 *                             items:
 *                               type: object
 *                               properties:
 *                                 timestamp:
 *                                   type: string
 *                                   format: date-time
 *                                   description: Time bucket timestamp
 *                                 energyKwh:
 *                                   type: number
 *                                   description: Energy consumption in kWh for this time period
 *       400:
 *         description: Invalid date format
 *       500:
 *         description: Internal server error or POWER_METRES_ID not configured
 */
router.get('/energy-trend', floorController.getEnergyTrendForComparisonFloors);

/**
 * @swagger
 * /api/floors/combined-trend:
 *   get:
 *     summary: Get combined presence and energy trends for multiple floors
 *     tags: [Floors]
 *     description: |
 *       Returns time-series data combining both presence and energy consumption for floors.
 *       Perfect for creating dual-axis charts with presence on right axis, energy on left axis, and time on bottom.
 *       Each floor has two curves: one for presence count and one for energy consumption per minute.
 *     parameters:
 *       - in: query
 *         name: buildingId
 *         schema:
 *           type: string
 *         description: Filter by building ID (optional)
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: ISO start datetime (default: now - 24h)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: ISO end datetime (default: now)
 *     responses:
 *       200:
 *         description: Combined trends retrieved successfully
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
 *                   example: "Combined presence and energy trends retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     from:
 *                       type: string
 *                       format: date-time
 *                     to:
 *                       type: string
 *                       format: date-time
 *                     chartConfig:
 *                       type: object
 *                       properties:
 *                         axes:
 *                           type: object
 *                           properties:
 *                             left:
 *                               type: object
 *                               properties:
 *                                 label:
 *                                   type: string
 *                                   example: "Energy (kW)"
 *                                 type:
 *                                   type: string
 *                                   example: "energy"
 *                             right:
 *                               type: object
 *                               properties:
 *                                 label:
 *                                   type: string
 *                                   example: "Presence Count"
 *                                 type:
 *                                   type: string
 *                                   example: "presence"
 *                             bottom:
 *                               type: object
 *                               properties:
 *                                 label:
 *                                   type: string
 *                                   example: "Time"
 *                                 type:
 *                                   type: string
 *                                   example: "time"
 *                     floors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           floorId:
 *                             type: string
 *                           name:
 *                             type: string
 *                           level:
 *                             type: integer
 *                           presenceLogs:
 *                             type: array
 *                             description: Presence data aggregated by minute (one entry per minute)
 *                             items:
 *                               type: object
 *                               properties:
 *                                 timestamp:
 *                                   type: string
 *                                   format: date-time
 *                                   description: Minute-level timestamp
 *                                 totalValue:
 *                                   type: number
 *                                   description: Total presence count for this minute
 *                           energyLogs:
 *                             type: array
 *                             description: Energy consumption data aggregated by day (one entry per day)
 *                             items:
 *                               type: object
 *                               properties:
 *                                 timestamp:
 *                                   type: string
 *                                   format: date-time
 *                                   description: Day-level timestamp (start of day)
 *                                 totalValue:
 *                                   type: number
 *                                   description: Total energy consumption in kW for this day (sum of all power devices)
 *       400:
 *         description: Invalid date format
 *       500:
 *         description: Internal server error or POWER_METRES_ID not configured
 */
router.get('/combined-trend', floorController.getCombinedTrendForComparisonFloors);

/**
 * @swagger
 * /api/floors/{id}:
 *   get:
 *     summary: Get floor by ID
 *     tags: [Floors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Floor ID
 *     responses:
 *       200:
 *         description: Floor retrieved successfully
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
 *                   $ref: '#/components/schemas/Floor'
 *       404:
 *         description: Floor not found
 */
router.get('/:id', validateId, floorController.getFloorById);

/**
 * @swagger
 * /api/floors/building/{buildingId}:
 *   get:
 *     summary: Get floors by building ID
 *     tags: [Floors]
 *     parameters:
 *       - in: path
 *         name: buildingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Building ID
 *     responses:
 *       200:
 *         description: Floors retrieved successfully
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
 *                     $ref: '#/components/schemas/Floor'
 */
router.get('/building/:buildingId', validateBuildingId, floorController.getFloorsByBuildingId);

/**
 * @swagger
 * /api/floors:
 *   post:
 *     summary: Create a new floor
 *     tags: [Floors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - buildingId
 *               - name
 *               - level
 *             properties:
 *               buildingId:
 *                 type: string
 *               name:
 *                 type: string
 *               level:
 *                 type: integer
 *               note:
 *                 type: string
 *     responses:
 *       201:
 *         description: Floor created successfully
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
 *                   $ref: '#/components/schemas/Floor'
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Building not found
 *       409:
 *         description: A floor with this level already exists in this building
 */
router.post('/', validateCreateFloor, floorController.createFloor);

/**
 * @swagger
 * /api/floors/{id}:
 *   put:
 *     summary: Update floor
 *     tags: [Floors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Floor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               level:
 *                 type: integer
 *               note:
 *                 type: string
 *     responses:
 *       200:
 *         description: Floor updated successfully
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
 *                   $ref: '#/components/schemas/Floor'
 *       404:
 *         description: Floor not found
 */
router.put('/:id', validateId, validateUpdateFloor, floorController.updateFloor);

/**
 * @swagger
 * /api/floors/{id}:
 *   delete:
 *     summary: Delete floor
 *     tags: [Floors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Floor ID
 *     responses:
 *       200:
 *         description: Floor deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Cannot delete floor with existing rooms
 *       404:
 *         description: Floor not found
 */
router.delete('/:id', validateId, floorController.deleteFloor);

export default router;