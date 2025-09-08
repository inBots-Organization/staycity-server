import swaggerJSDoc from 'swagger-jsdoc';
import { config } from './index';
import { User } from '../models/User';
import {
  generateSwaggerFromSchema,
  generateCreateRequestSchema,
} from '../utils/swaggerGenerator';

// Generate schemas from Mongoose models
const userSchemas = {
  ...generateSwaggerFromSchema(User.schema, 'User'),
  ...generateCreateRequestSchema(User.schema, 'User'),
};

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
        ...userSchemas,
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
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/app.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
