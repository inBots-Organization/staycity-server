import * as express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { PERMISSIONS } from '../types/permissions';
import {
  listDevices,
  createDevice,
  addReading,
} from '../controllers/deviceController';
import {
  addReadingValidator,
  createDeviceValidator,
  listDevicesValidator,
} from '../validators/deviceValidators';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Devices
 *   description: Devices management
 */

/**
 * @swagger
 * /api/devices:
 *   get:
 *     summary: List devices
 *     tags: [Devices]
 *     security: [ { bearerAuth: [] } ]
 */
router.get(
  '/',
  authenticate,
  authorize([PERMISSIONS.PROPERTIES_READ]),
  listDevicesValidator,
  listDevices
);

/**
 * @swagger
 * /api/devices:
 *   post:
 *     summary: Create device
 *     tags: [Devices]
 *     security: [ { bearerAuth: [] } ]
 */
router.post(
  '/',
  authenticate,
  authorize([PERMISSIONS.PROPERTIES_UPDATE]),
  createDeviceValidator,
  createDevice
);

/**
 * @swagger
 * /api/devices/{id}/readings:
 *   post:
 *     summary: Add a reading to a device
 *     tags: [Devices]
 *     security: [ { bearerAuth: [] } ]
 */
router.post(
  '/:id/readings',
  authenticate,
  authorize([PERMISSIONS.PROPERTIES_UPDATE]),
  addReadingValidator,
  addReading
);

export default router;
