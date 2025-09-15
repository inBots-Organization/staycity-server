/**
 * @swagger
 * tags:
 *   name: Buildings
 *   description: Building management endpoints
 */

import { Router } from 'express';
import { body, query, param } from 'express-validator';
import * as buildingController from '../controllers/buildingController';

const router = Router();

// Validation middleware
const validateCreateBuilding = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 255 })
    .withMessage('Name must be less than 255 characters'),
  body('address')
    .notEmpty()
    .withMessage('Address is required'),
  body('rating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Rating must be between 0 and 5'),
  body('slug')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Slug must be less than 255 characters'),
  body('contactEmail')
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),
  body('contactPhone')
    .optional()
    .isString(),
  body('city')
    .optional()
    .isString(),
  body('country')
    .optional()
    .isString(),
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 }),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 }),
  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array')
];

const validateUpdateBuilding = [
  body('name')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Name must be less than 255 characters'),
  body('address')
    .optional()
    .isString(),
  body('rating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Rating must be between 0 and 5'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'MAINTENANCE', 'INACTIVE'])
    .withMessage('Invalid status'),
  body('contactEmail')
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),
  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array')
];

const validateListBuildings = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page size must be between 1 and 100'),
  query('search')
    .optional()
    .isString(),
  query('status')
    .optional()
    .isIn(['ACTIVE', 'MAINTENANCE', 'INACTIVE'])
    .withMessage('Invalid status'),
  query('city')
    .optional()
    .isString(),
  query('country')
    .optional()
    .isString()
];

const validateId = [
  param('id')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Invalid building ID')
];

const validateSlug = [
  param('slug')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Invalid building slug')
];

// Routes

/**
 * @swagger
 * /api/buildings:
 *   get:
 *     summary: List buildings
 *     tags: [Buildings]
 *     parameters:
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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or address
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, MAINTENANCE, INACTIVE]
 *         description: Filter by status
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Filter by country
 *     responses:
 *       200:
 *         description: Buildings retrieved successfully
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
 *                         $ref: '#/components/schemas/Building'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get('/', validateListBuildings, buildingController.listBuildings);

/**
 * @swagger
 * /api/buildings/{id}:
 *   get:
 *     summary: Get building by ID
 *     tags: [Buildings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Building ID
 *     responses:
 *       200:
 *         description: Building retrieved successfully
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
 *                   $ref: '#/components/schemas/Building'
 *       404:
 *         description: Building not found
 */
router.get('/:id', validateId, buildingController.getBuildingById);

/**
 * @swagger
 * /api/buildings/slug/{slug}:
 *   get:
 *     summary: Get building by slug
 *     tags: [Buildings]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Building slug
 *     responses:
 *       200:
 *         description: Building retrieved successfully
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
 *                   $ref: '#/components/schemas/Building'
 *       404:
 *         description: Building not found
 */
router.get('/slug/:slug', validateSlug, buildingController.getBuildingBySlug);

/**
 * @swagger
 * /api/buildings:
 *   post:
 *     summary: Create a new building
 *     tags: [Buildings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - address
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               rating:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 5
 *               slug:
 *                 type: string
 *               contactEmail:
 *                 type: string
 *                 format: email
 *               contactPhone:
 *                 type: string
 *               city:
 *                 type: string
 *               country:
 *                 type: string
 *               latitude:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *               longitude:
 *                 type: number
 *                 minimum: -180
 *                 maximum: 180
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [WIFI, PARKING, RESTAURANT, SPA, GYM, POOL, BAR, LAUNDRY]
 *     responses:
 *       201:
 *         description: Building created successfully
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
 *                   $ref: '#/components/schemas/Building'
 *       400:
 *         description: Validation failed
 *       409:
 *         description: Building with this slug already exists
 */
router.post('/', validateCreateBuilding, buildingController.createBuilding);

/**
 * @swagger
 * /api/buildings/{id}:
 *   put:
 *     summary: Update building
 *     tags: [Buildings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Building ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *               rating:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 5
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, MAINTENANCE, INACTIVE]
 *               contactEmail:
 *                 type: string
 *                 format: email
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [WIFI, PARKING, RESTAURANT, SPA, GYM, POOL, BAR, LAUNDRY]
 *     responses:
 *       200:
 *         description: Building updated successfully
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
 *                   $ref: '#/components/schemas/Building'
 *       404:
 *         description: Building not found
 */
router.put('/:id', validateId, validateUpdateBuilding, buildingController.updateBuilding);

/**
 * @swagger
 * /api/buildings/{id}:
 *   delete:
 *     summary: Delete building
 *     tags: [Buildings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Building ID
 *     responses:
 *       200:
 *         description: Building deleted successfully
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
 *         description: Building not found
 */
router.delete('/:id', validateId, buildingController.deleteBuilding);

export default router;