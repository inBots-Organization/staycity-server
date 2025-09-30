import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { config } from '@config/index';
import { logger } from '@config/logger';
import { errorHandler } from '@middleware/errorHandler';
import { swaggerSpec } from '@config/swagger';
import usersRoutes from './routes/users';
import authRoutes from './routes/auth';
import propertiesRoutes from './routes/properties';
import buildingsRoutes from './routes/buildings';
import floorsRoutes from './routes/floors';
import roomsRoutes from './routes/rooms';
import devicesRoutes from './routes/devices';
import analyticsRoutes from './routes/analytics';
import aranetRoutes from './routes/aranet';
import sittingsRoutes from './routes/sittings';

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
});
// app.use(limiter);

// General middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP request logging
app.use(
  morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// API Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the server
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
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
 *                   example: "Server is healthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-09-08T11:18:01.189Z"
 */
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/properties', propertiesRoutes);
app.use('/api/buildings', buildingsRoutes);
app.use('/api/floors', floorsRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/aranet', aranetRoutes);
app.use('/api/sittings', sittingsRoutes);


// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
