/**
 * @swagger
 * tags:
 *   name: Aranet
 *   description: Aranet sensor data endpoints
 */

import { Router } from 'express';
import { query } from 'express-validator';
import { getAranetLogs } from '../controllers/aranetController';

const router = Router();

const validateLogsQuery = [
  query('sensorId').isString().notEmpty().withMessage('sensorId is required'),
  query('metric').isString().notEmpty().withMessage('metric is required'),
  query('from')
    .isISO8601()
    .withMessage('from must be a valid ISO 8601 date-time'),
  query('to')
    .isISO8601()
    .withMessage('to must be a valid ISO 8601 date-time'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('limit must be an integer between 1 and 10000'),
];

/**
 * @swagger
 * /api/aranet/logs:
 *   get:
 *     summary: Get historical sensor readings (logs) from Aranet
 *     tags: [Aranet]
 *     parameters:
 *       - in: query
 *         name: sensorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Aranet sensor ID
 *         example: "4227764"
 *       - in: query
 *         name: metric
 *         required: true
 *         schema:
 *           type: string
 *         description: Metric ID to fetch history for
 *         example: "4"
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: ISO 8601 start datetime (UTC)
 *         example: "2025-09-10T12:40:48Z"
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: ISO 8601 end datetime (UTC)
 *         example: "2025-09-16T12:40:48Z"
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10000
 *         description: Max number of readings to return (default 10000)
 *     responses:
 *       200:
 *         description: Historical readings retrieved successfully
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
 *                   example: "Historical readings retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     readings:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SensorReading'
 *                     self:
 *                       type: string
 *                       example: "/api/v1/telemetry/history?from=...&to=...&metric=4&sensor=4227764"
 *       400:
 *         description: Validation error
 *       500:
 *         description: Failed to fetch historical readings
 */
router.get('/logs', validateLogsQuery, getAranetLogs);

export default router;


