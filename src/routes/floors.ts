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