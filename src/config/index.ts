import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env['PORT'] || 3000,
  nodeEnv: process.env['NODE_ENV'] || 'development',
  apiPrefix: process.env['API_PREFIX'] || '/api/v1',
  mongodb: {
    uri: process.env['MONGODB_URI'] || 'mongodb://localhost:27017/staycity',
    dbName: process.env['DB_NAME'] || 'staycity',
  },
  jwt: {
    secret: process.env['JWT_SECRET'] || 'fallback-secret-key',
    expiresIn: process.env['JWT_EXPIRE'] || '7d',
  },
  bcrypt: {
    saltRounds: parseInt(process.env['BCRYPT_SALT_ROUNDS'] || '12'),
  },
  cors: {
    origin: process.env['CORS_ORIGIN'] || 'http://localhost:5173',
  },
  rateLimit: {
    windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000'), // 15 minutes
    max: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100'),
  },
} as const;
