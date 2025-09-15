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
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 *   schemas:
 *     BuildingStatus:
 *       type: string
 *       enum: [ACTIVE, MAINTENANCE, INACTIVE]
 *     RoomType:
 *       type: string
 *       enum: [ROOM, SUITE]
 *     RoomStatus:
 *       type: string
 *       enum: [AVAILABLE, OCCUPIED, MAINTENANCE]
 *     Amenity:
 *       type: string
 *       enum: [WIFI, PARKING, RESTAURANT, SPA, GYM, POOL, BAR, LAUNDRY]
 *
 *     # Input-only reference for creating/patching device links
 *     DeviceRef:
 *       type: object
 *       required: [id, provider]
 *       properties:
 *         id:
 *           type: string
 *           example: "boiler-1"
 *           description: "Provider-specific device identifier"
 *         provider:
 *           type: string
 *           example: "iot-hub"
 *           description: "Upstream provider key/name"
 *
 *     StatsInput:
 *       type: object
 *       properties:
 *         currentGuests: { type: integer, minimum: 0 }
 *         totalCapacity: { type: integer, minimum: 0 }
 *         totalRooms: { type: integer, minimum: 0 }
 *         availableRooms: { type: integer, minimum: 0 }
 *
 *     PropertyCreate:
 *       type: object
 *       required: [name, slug]
 *       properties:
 *         name: { type: string, example: "StayCity Downtown" }
 *         slug: { type: string, example: "staycity-downtown" }
 *         status: { $ref: "#/components/schemas/BuildingStatus" }
 *         rating:
 *           type: number
 *           format: float
 *           minimum: 0
 *           maximum: 9.9
 *           example: 8.3
 *         monthlySavingsUSD:
 *           type: number
 *           format: float
 *           minimum: 0
 *           example: 2450.5
 *         energyKwh:
 *           type: number
 *           format: float
 *           minimum: 0
 *           example: 1200.5
 *         floorsCount: { type: integer, minimum: 0, example: 3 }
 *         address1: { type: string, example: "123 Main St" }
 *         address2: { type: string, nullable: true }
 *         city: { type: string, example: "Dublin" }
 *         country: { type: string, example: "IE" }
 *         latitude: { type: number, format: float, example: 53.3498 }
 *         longitude: { type: number, format: float, example: -6.2603 }
 *         contactEmail: { type: string, example: "gm@staycity.com" }
 *         contactPhone: { type: string, example: "+353 1 234 5678" }
 *         amenities:
 *           type: array
 *           items: { $ref: "#/components/schemas/Amenity" }
 *         stats: { $ref: "#/components/schemas/StatsInput" }
 *         devices:
 *           type: array
 *           description: "Building-level devices to attach on create"
 *           items: { $ref: "#/components/schemas/DeviceRef" }
 *
 *     PropertyPatch:
 *       type: object
 *       properties:
 *         name: { type: string }
 *         slug: { type: string }
 *         status: { $ref: "#/components/schemas/BuildingStatus" }
 *         rating: { type: number, format: float, minimum: 0, maximum: 9.9 }
 *         monthlySavings:
 *           type: integer
 *           minimum: 0
 *           description: "Amount in **cents** (server accepts either this or monthlySavingsUSD)"
 *         monthlySavingsUSD:
 *           type: number
 *           format: float
 *           minimum: 0
 *           description: "Amount in **USD** (service converts to cents)"
 *         energyKwh: { type: number, format: float, minimum: 0 }
 *         floorsCount: { type: integer, minimum: 0 }
 *         address1: { type: string }
 *         address2: { type: string, nullable: true }
 *         city: { type: string }
 *         country: { type: string }
 *         latitude: { type: number, format: float }
 *         longitude: { type: number, format: float }
 *         contactEmail: { type: string }
 *         contactPhone: { type: string }
 *         amenities:
 *           type: array
 *           items: { $ref: "#/components/schemas/Amenity" }
 *         devices:
 *           type: array
 *           description: "If provided, replaces all building-level devices with these"
 *           items: { $ref: "#/components/schemas/DeviceRef" }
 *
 *     FloorCreate:
 *       type: object
 *       required: [name, level]
 *       properties:
 *         name: { type: string, example: "Level 2" }
 *         level: { type: integer, example: 2 }
 *         note: { type: string, nullable: true, example: "Executive floor" }
 *         devices:
 *           type: array
 *           description: "Optional: devices to attach to this new floor"
 *           items: { $ref: "#/components/schemas/DeviceRef" }
 *
 *     RoomCreate:
 *       type: object
 *       required: [floorId, name, type]
 *       properties:
 *         floorId: { type: string, example: "cly8y9u2p0000abcd12345678" }
 *         name: { type: string, example: "201" }
 *         type: { $ref: "#/components/schemas/RoomType" }
 *         status: { $ref: "#/components/schemas/RoomStatus" }
 *         capacity: { type: integer, minimum: 1, example: 2 }
 *         devices:
 *           type: array
 *           description: "Optional: devices to attach to this new room"
 *           items: { $ref: "#/components/schemas/DeviceRef" }
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
 *         schema: { $ref: "#/components/schemas/BuildingStatus" }
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
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, minimum: 1, maximum: 100 }
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
 *     responses:
 *       200:
 *         description: OK
 *       404: { description: Not Found }
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/PropertyCreate"
 *           example:
 *             name: "StayCity Downtown"
 *             slug: "staycity-downtown"
 *             status: "ACTIVE"
 *             rating: 8.3
 *             monthlySavingsUSD: 2450.5
 *             energyKwh: 1200.5
 *             floorsCount: 3
 *             address1: "123 Main St"
 *             city: "Dublin"
 *             country: "IE"
 *             latitude: 53.3498
 *             longitude: -6.2603
 *             contactEmail: "gm@staycity.com"
 *             amenities: ["WIFI", "PARKING", "GYM"]
 *             stats:
 *               currentGuests: 0
 *               totalCapacity: 200
 *               totalRooms: 100
 *               availableRooms: 75
 *             devices:
 *               - id: "boiler-1"
 *                 provider: "iot-hub"
 *               - id: "meter-22"
 *                 provider: "grid"
 *     responses:
 *       201: { description: Created }
 *       400: { description: Validation failed }
 *       409: { description: Duplicate slug }
 */
router.post(
  '/',
  authenticate,
  // authorize([PERMISSIONS.PROPERTIES_CREATE]),
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/PropertyPatch"
 *           example:
 *             name: "StayCity Docklands"
 *             status: "MAINTENANCE"
 *             monthlySavingsUSD: 1999.99
 *             amenities: ["WIFI", "SPA"]
 *             devices:
 *               - id: "boiler-2"
 *                 provider: "iot-hub"
 *     responses:
 *       200: { description: Updated }
 *       400: { description: Validation failed }
 *       404: { description: Not Found }
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
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/FloorCreate"
 *           example:
 *             name: "Level 2"
 *             level: 2
 *             note: "Executive floor"
 *             devices:
 *               - id: "cam-201"
 *                 provider: "cctv"
 *     responses:
 *       201: { description: Created }
 *       400: { description: Validation failed }
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
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/RoomCreate"
 *           example:
 *             floorId: "cly8y9u2p0000abcd12345678"
 *             name: "201"
 *             type: "SUITE"
 *             status: "AVAILABLE"
 *             capacity: 3
 *             devices:
 *               - id: "lock-201"
 *                 provider: "salto"
 *               - id: "thermo-201"
 *                 provider: "nest"
 *     responses:
 *       201: { description: Created }
 *       400: { description: Validation failed }
 */
router.post(
  '/:propertyId/rooms',
  authenticate,
  authorize([PERMISSIONS.PROPERTIES_UPDATE]),
  addRoomValidator,
  addRoom
);

export default router;
