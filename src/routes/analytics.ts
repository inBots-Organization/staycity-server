/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Comprehensive analytics endpoints for buildings, floors, rooms, and sensor data
 */

import { Router } from 'express';
import { param } from 'express-validator';
import * as analyticsController from '../controllers/analyticsController';

const router = Router();

// Validation middleware
const validateBuildingId = [
  param('buildingId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Invalid building ID'),
];

const validateBuildingAndFloorId = [
  param('buildingId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Invalid building ID'),
  param('floorId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Invalid floor ID'),
];

// Routes

/**
 * @swagger
 * /api/analytics/comprehensive:
 *   get:
 *     summary: Get comprehensive analytics for all buildings
 *     tags: [Analytics]
 *     description: |
 *       Returns complete analytics data including:
 *       - All buildings with their floors, rooms, and devices
 *       - Live sensor readings from both Aranet and Aqara devices
 *       - Occupancy statistics and device status metrics
 *       - Summary statistics across all properties
 *       
 *       This endpoint is designed for dashboard analytics and comprehensive reporting.
 *     responses:
 *       200:
 *         description: Comprehensive analytics retrieved successfully
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
 *                   example: "Comprehensive analytics retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       description: When the data was collected
 *                       example: "2025-09-16T10:30:00.000Z"
 *                     buildings:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "cm123building"
 *                           name:
 *                             type: string
 *                             example: "Grand Hotel Downtown"
 *                           address:
 *                             type: string
 *                             example: "123 Main Street"
 *                           rating:
 *                             type: number
 *                             example: 4.5
 *                           status:
 *                             type: string
 *                             enum: [ACTIVE, MAINTENANCE, INACTIVE]
 *                             example: "ACTIVE"
 *                           city:
 *                             type: string
 *                             example: "New York"
 *                           country:
 *                             type: string
 *                             example: "USA"
 *                           totalFloors:
 *                             type: integer
 *                             example: 5
 *                           totalRooms:
 *                             type: integer
 *                             example: 120
 *                           availableRooms:
 *                             type: integer
 *                             example: 45
 *                           occupiedRooms:
 *                             type: integer
 *                             example: 75
 *                           totalDevices:
 *                             type: integer
 *                             example: 240
 *                           onlineDevices:
 *                             type: integer
 *                             example: 235
 *                           offlineDevices:
 *                             type: integer
 *                             example: 5
 *                           floors:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                   example: "cm123floor"
 *                                 name:
 *                                   type: string
 *                                   example: "Floor 1"
 *                                 level:
 *                                   type: integer
 *                                   example: 1
 *                                 totalRooms:
 *                                   type: integer
 *                                   example: 24
 *                                 availableRooms:
 *                                   type: integer
 *                                   example: 9
 *                                 occupiedRooms:
 *                                   type: integer
 *                                   example: 15
 *                                 totalDevices:
 *                                   type: integer
 *                                   example: 48
 *                                 onlineDevices:
 *                                   type: integer
 *                                   example: 47
 *                                 offlineDevices:
 *                                   type: integer
 *                                   example: 1
 *                                 rooms:
 *                                   type: array
 *                                   items:
 *                                     type: object
 *                                     properties:
 *                                       id:
 *                                         type: string
 *                                         example: "cm123room"
 *                                       name:
 *                                         type: string
 *                                         example: "Room 101"
 *                                       type:
 *                                         type: string
 *                                         enum: [ROOM, SUITE]
 *                                         example: "ROOM"
 *                                       status:
 *                                         type: string
 *                                         enum: [AVAILABLE, OCCUPIED, MAINTENANCE]
 *                                         example: "OCCUPIED"
 *                                       capacity:
 *                                         type: integer
 *                                         example: 2
 *                                       totalDevices:
 *                                         type: integer
 *                                         example: 2
 *                                       onlineDevices:
 *                                         type: integer
 *                                         example: 2
 *                                       offlineDevices:
 *                                         type: integer
 *                                         example: 0
 *                                       devices:
 *                                         type: array
 *                                         items:
 *                                           type: object
 *                                           properties:
 *                                             id:
 *                                               type: string
 *                                               example: "cm123device"
 *                                             name:
 *                                               type: string
 *                                               example: "Environmental Sensor"
 *                                             externalId:
 *                                               type: string
 *                                               example: "4227764"
 *                                             provider:
 *                                               type: string
 *                                               example: "aranet"
 *                                             status:
 *                                               type: string
 *                                               enum: [ONLINE, OFFLINE, MAINTENANCE]
 *                                               example: "ONLINE"
 *                                             sensorData:
 *                                               type: object
 *                                               properties:
 *                                                 sensorId:
 *                                                   type: string
 *                                                   example: "4227764"
 *                                                 sensorName:
 *                                                   type: string
 *                                                   example: "Environmental Sensor 1"
 *                                                 sensorType:
 *                                                   type: string
 *                                                   example: "S4V1"
 *                                                 lastUpdate:
 *                                                   type: string
 *                                                   format: date-time
 *                                                   example: "2025-09-16T10:25:00.000Z"
 *                                                 readings:
 *                                                   type: array
 *                                                   items:
 *                                                     type: object
 *                                                     properties:
 *                                                       metricId:
 *                                                         type: string
 *                                                         example: "1"
 *                                                       metricName:
 *                                                         type: string
 *                                                         example: "Temperature"
 *                                                       value:
 *                                                         type: number
 *                                                         example: 22.5
 *                                                       unit:
 *                                                         type: string
 *                                                         example: "°C"
 *                                                       timestamp:
 *                                                         type: string
 *                                                         format: date-time
 *                                                         example: "2025-09-16T10:25:00.000Z"
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalBuildings:
 *                           type: integer
 *                           example: 3
 *                         totalFloors:
 *                           type: integer
 *                           example: 15
 *                         totalRooms:
 *                           type: integer
 *                           example: 350
 *                         availableRooms:
 *                           type: integer
 *                           example: 125
 *                         occupiedRooms:
 *                           type: integer
 *                           example: 225
 *                         totalDevices:
 *                           type: integer
 *                           example: 700
 *                         onlineDevices:
 *                           type: integer
 *                           example: 685
 *                         offlineDevices:
 *                           type: integer
 *                           example: 15
 *                         aranetDevices:
 *                           type: integer
 *                           example: 450
 *                         aqaraDevices:
 *                           type: integer
 *                           example: 250
 *       500:
 *         description: Failed to retrieve analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to retrieve analytics data"
 */
router.get('/comprehensive', analyticsController.getComprehensiveAnalytics);

/**
 * @swagger
 * /api/analytics/buildings/{buildingId}:
 *   get:
 *     summary: Get analytics for a specific building
 *     tags: [Analytics]
 *     description: |
 *       Returns comprehensive analytics data for a specific building including:
 *       - Building details and metrics
 *       - All floors with their rooms and devices
 *       - Live sensor readings from both Aranet and Aqara devices
 *       - Occupancy statistics and device status metrics
 *     parameters:
 *       - in: path
 *         name: buildingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Building ID
 *         example: "cm123building"
 *     responses:
 *       200:
 *         description: Building analytics retrieved successfully
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
 *                   example: "Building analytics retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "cm123building"
 *                     name:
 *                       type: string
 *                       example: "Grand Hotel Downtown"
 *                     address:
 *                       type: string
 *                       example: "123 Main Street"
 *                     rating:
 *                       type: number
 *                       example: 4.5
 *                     status:
 *                       type: string
 *                       enum: [ACTIVE, MAINTENANCE, INACTIVE]
 *                       example: "ACTIVE"
 *                     city:
 *                       type: string
 *                       example: "New York"
 *                     country:
 *                       type: string
 *                       example: "USA"
 *                     totalFloors:
 *                       type: integer
 *                       example: 5
 *                     totalRooms:
 *                       type: integer
 *                       example: 120
 *                     availableRooms:
 *                       type: integer
 *                       example: 45
 *                     occupiedRooms:
 *                       type: integer
 *                       example: 75
 *                     totalDevices:
 *                       type: integer
 *                       example: 240
 *                     onlineDevices:
 *                       type: integer
 *                       example: 235
 *                     offlineDevices:
 *                       type: integer
 *                       example: 5
 *                     floors:
 *                       type: array
 *                       description: Array of floors with complete room and device data (same structure as comprehensive endpoint)
 *       404:
 *         description: Building not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Building not found"
 *       500:
 *         description: Failed to retrieve building analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to retrieve building analytics"
 */
router.get('/buildings/:buildingId', validateBuildingId, analyticsController.getBuildingAnalytics);

/**
 * @swagger
 * /api/analytics/electricity:
 *   get:
 *     summary: Get electricity analytics for all power devices
 *     tags: [Analytics]
 *     description: |
 *       Returns electricity consumption analytics including:
 *       - Energy consumption data for the last month, week, and day
 *       - Cost calculations based on energy usage
 *       - Savings information
 *       - Total number of power devices monitored
 *     responses:
 *       200:
 *         description: Electricity analytics retrieved successfully
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
 *                   example: "Electricity analytics retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       description: When the data was collected
 *                       example: "2025-10-28T10:30:00.000Z"
 *                     totalDevices:
 *                       type: integer
 *                       description: Total number of power devices monitored
 *                       example: 15
 *                     electricityAnalytics:
 *                       type: object
 *                       properties:
 *                         month:
 *                           type: object
 *                           properties:
 *                             energy:
 *                               type: string
 *                               description: Energy consumption for the month in kWh
 *                               example: "1250.75"
 *                             cost:
 *                               type: string
 *                               description: Cost for the month in currency units
 *                               example: "187.61"
 *                             saving:
 *                               type: string
 *                               description: Savings for the month
 *                               example: "25.40"
 *                         week:
 *                           type: object
 *                           properties:
 *                             energy:
 *                               type: string
 *                               description: Energy consumption for the week in kWh
 *                               example: "312.50"
 *                             cost:
 *                               type: string
 *                               description: Cost for the week in currency units
 *                               example: "46.88"
 *                             saving:
 *                               type: string
 *                               description: Savings for the week
 *                               example: "6.35"
 *                         day:
 *                           type: object
 *                           properties:
 *                             energy:
 *                               type: string
 *                               description: Energy consumption for the day in kWh
 *                               example: "44.64"
 *                             cost:
 *                               type: string
 *                               description: Cost for the day in currency units
 *                               example: "6.70"
 *                             saving:
 *                               type: string
 *                               description: Savings for the day
 *                               example: "0.91"
 *       500:
 *         description: Failed to retrieve electricity analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to retrieve electricity analytics"
 */
router.get('/electricity', analyticsController.getElectricityAnalytics);

/**
 * @swagger
 * /api/analytics/buildings/{buildingId}/floors/{floorId}/current-sensors:
 *   get:
 *     summary: Get current sensor data for all rooms in a specific floor
 *     tags: [Analytics]
 *     description: |
 *       Returns current sensor readings (power, temperature, humidity, pressure, CO2) 
 *       for each room in the specified floor of a building.
 *       
 *       This endpoint provides real-time sensor data optimized for floor-level monitoring
 *       and room-by-room environmental tracking.
 *     parameters:
 *       - in: path
 *         name: buildingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Building ID
 *         example: "cm123building"
 *       - in: path
 *         name: floorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Floor ID
 *         example: "cm123floor"
 *     responses:
 *       200:
 *         description: Current sensor data retrieved successfully
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
 *                   example: "Current sensor data retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       description: When the data was collected
 *                       example: "2025-11-02T07:48:58.000Z"
 *                     building:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "cm123building"
 *                         name:
 *                           type: string
 *                           example: "Grand Hotel Downtown"
 *                     floor:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "cm123floor"
 *                         name:
 *                           type: string
 *                           example: "Floor 1"
 *                         level:
 *                           type: integer
 *                           example: 1
 *                     rooms:
 *                       type: array
 *                       description: |
 *                         Array of rooms. For SUITE type rooms, each suite will be split into 
 *                         multiple rooms based on environment sensor parts (e.g., "bedroom", "living room").
 *                         Power consumption is divided equally between suite rooms.
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: Room ID. For suite parts, format is "{roomId}_{part}"
 *                             example: "cm123room_bedroom"
 *                           name:
 *                             type: string
 *                             description: Room name. For suite parts, format is "{roomName} - {part}"
 *                             example: "Suite 101 - bedroom"
 *                           type:
 *                             type: string
 *                             enum: [ROOM, SUITE]
 *                             example: "SUITE"
 *                           originalRoomId:
 *                             type: string
 *                             description: Original room ID (only present for suite parts)
 *                             example: "cm123room"
 *                           part:
 *                             type: string
 *                             description: Suite part identifier (only present for suite parts)
 *                             example: "bedroom"
 *                           status:
 *                             type: string
 *                             enum: [AVAILABLE, OCCUPIED, MAINTENANCE]
 *                             example: "OCCUPIED"
 *                           capacity:
 *                             type: integer
 *                             example: 2
 *                           sensorReadings:
 *                             type: object
 *                             properties:
 *                               power:
 *                                 type: number
 *                                 nullable: true
 *                                 description: Current power consumption in watts
 *                                 example: 1014.8
 *                               temperature:
 *                                 type: number
 *                                 nullable: true
 *                                 description: Current temperature in Celsius
 *                                 example: 24.0
 *                               humidity:
 *                                 type: number
 *                                 nullable: true
 *                                 description: Current humidity percentage
 *                                 example: 55.0
 *                               pressure:
 *                                 type: number
 *                                 nullable: true
 *                                 description: Current pressure in hPa
 *                                 example: 1013.25
 *                               co2:
 *                                 type: number
 *                                 nullable: true
 *                                 description: Current CO2 level in ppm
 *                                 example: 520
 *                           deviceCount:
 *                             type: integer
 *                             description: Total number of devices in the room
 *                             example: 2
 *                           onlineDevices:
 *                             type: integer
 *                             description: Number of online devices in the room
 *                             example: 2
 *                           lastUpdate:
 *                             type: string
 *                             format: date-time
 *                             description: When this room data was last updated
 *                             example: "2025-11-02T07:48:58.000Z"
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalRooms:
 *                           type: integer
 *                           description: Total number of rooms on this floor
 *                           example: 24
 *                         roomsWithData:
 *                           type: integer
 *                           description: Number of rooms with at least one sensor reading
 *                           example: 20
 *                         totalDevices:
 *                           type: integer
 *                           description: Total number of devices on this floor
 *                           example: 48
 *                         onlineDevices:
 *                           type: integer
 *                           description: Number of online devices on this floor
 *                           example: 47
 *       404:
 *         description: Building or floor not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Building not found"
 *       500:
 *         description: Failed to retrieve current sensor data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to retrieve current sensor data"
 */
router.get('/buildings/:buildingId/floors/:floorId/current-sensors', validateBuildingAndFloorId, analyticsController.getCurrentSensorDataByFloor);

export default router;