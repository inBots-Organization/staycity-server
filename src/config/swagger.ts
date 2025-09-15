import swaggerJSDoc from 'swagger-jsdoc';
import { config } from './index';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'StayCity API',
      version: '1.0.0',
      description: 'API documentation for StayCity server',
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { 
              type: 'string',
              enum: ['super_admin', 'admin', 'manager', 'user']
            },
            image: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        UserCreateRequest: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
            password: { type: 'string' },
            role: { 
              type: 'string',
              enum: ['super_admin', 'admin', 'manager', 'user'],
              default: 'user'
            },
            image: { type: 'string' },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
            },
            message: {
              type: 'string',
            },
            data: {
              type: 'object',
            },
          },
        },
        Building: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            address: { type: 'string' },
            rating: { type: 'number', minimum: 0, maximum: 5 },
            noOfRooms: { type: 'integer', minimum: 0 },
            status: { 
              type: 'string',
              enum: ['ACTIVE', 'MAINTENANCE', 'INACTIVE']
            },
            slug: { type: 'string' },
            city: { type: 'string' },
            country: { type: 'string' },
            contactEmail: { type: 'string', format: 'email' },
            contactPhone: { type: 'string' },
            amenities: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['WIFI', 'PARKING', 'RESTAURANT', 'SPA', 'GYM', 'POOL', 'BAR', 'LAUNDRY']
              }
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Floor: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            buildingId: { type: 'string' },
            name: { type: 'string' },
            level: { type: 'integer' },
            note: { type: 'string' },
            building: { $ref: '#/components/schemas/BuildingBasic' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Room: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            buildingId: { type: 'string' },
            floorId: { type: 'string' },
            name: { type: 'string' },
            type: { 
              type: 'string',
              enum: ['ROOM', 'SUITE']
            },
            status: { 
              type: 'string',
              enum: ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE']
            },
            capacity: { type: 'integer', minimum: 1 },
            deviceIds: {
              type: 'array',
              items: { type: 'string' }
            },
            building: { $ref: '#/components/schemas/BuildingBasic' },
            floor: { $ref: '#/components/schemas/FloorBasic' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        RoomWithMetrics: {
          allOf: [
            { $ref: '#/components/schemas/Room' },
            {
              type: 'object',
              properties: {
                deviceMetrics: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/SensorData' }
                }
              }
            }
          ]
        },
        SensorData: {
          type: 'object',
          properties: {
            sensorId: { type: 'string' },
            sensorName: { type: 'string' },
            sensorType: { type: 'string' },
            readings: {
              type: 'array',
              items: { $ref: '#/components/schemas/SensorReading' }
            },
            lastUpdate: { type: 'string', format: 'date-time' }
          }
        },
        SensorReading: {
          type: 'object',
          properties: {
            metricId: { type: 'string' },
            metricName: { type: 'string' },
            value: { type: 'number' },
            unit: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        BuildingBasic: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            address: { type: 'string' }
          }
        },
        FloorBasic: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            level: { type: 'integer' }
          }
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/app.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
