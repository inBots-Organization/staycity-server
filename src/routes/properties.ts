import * as express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { PERMISSIONS } from '../types/permissions';
import {
  listPropertiesValidator,
  createPropertyValidator,
  patchPropertyValidator,
  addFloorValidator,
  addRoomValidator,
} from '../validators/propertyValidators';
import {
  addFloor,
  addRoom,
  createProperty,
  getPropertyBySlug,
  listProperties,
  patchProperty,
} from '../controllers/propertyController';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Properties
 *   description: Property management
 */

/**
 * @swagger
 * /api/properties:
 *   get:
 *     summary: List properties
 *     tags: [Properties]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ACTIVE, MAINTENANCE, INACTIVE] }
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: country
 *         schema: { type: string }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer }
 *     responses:
 *       200: { description: OK }
 */
router.get(
  '/',
  authenticate,
  authorize([PERMISSIONS.PROPERTIES_READ]),
  listPropertiesValidator,
  listProperties
);

/**
 * @swagger
 * /api/properties/{slug}:
 *   get:
 *     summary: Get a property by slug (full detail)
 *     tags: [Properties]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 */
router.get(
  '/:slug',
  authenticate,
  authorize([PERMISSIONS.PROPERTIES_READ]),
  getPropertyBySlug
);

/**
 * @swagger
 * /api/properties:
 *   post:
 *     summary: Create a property
 *     tags: [Properties]
 *     security: [ { bearerAuth: [] } ]
 */
router.post(
  '/',
  authenticate,
  authorize([PERMISSIONS.PROPERTIES_CREATE]),
  createPropertyValidator,
  createProperty
);

/**
 * @swagger
 * /api/properties/{id}:
 *   patch:
 *     summary: Update a property
 *     tags: [Properties]
 *     security: [ { bearerAuth: [] } ]
 */
router.patch(
  '/:id',
  authenticate,
  authorize([PERMISSIONS.PROPERTIES_UPDATE]),
  patchPropertyValidator,
  patchProperty
);

/**
 * @swagger
 * /api/properties/{id}/floors:
 *   post:
 *     summary: Add a floor
 *     tags: [Properties]
 *     security: [ { bearerAuth: [] } ]
 */
router.post(
  '/:id/floors',
  authenticate,
  authorize([PERMISSIONS.PROPERTIES_UPDATE]),
  addFloorValidator,
  addFloor
);

/**
 * @swagger
 * /api/properties/{propertyId}/rooms:
 *   post:
 *     summary: Add a room
 *     tags: [Properties]
 *     security: [ { bearerAuth: [] } ]
 */
router.post(
  '/:propertyId/rooms',
  authenticate,
  authorize([PERMISSIONS.PROPERTIES_UPDATE]),
  addRoomValidator,
  addRoom
);

export default router;
