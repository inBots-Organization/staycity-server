import { Request, Response, NextFunction } from 'express';
import { logger } from '@config/logger';
import { ApiResponse } from '../types';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Error caught by error handler:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
  });

  const response: ApiResponse = {
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
  };

  const statusCode = error.statusCode || 500;
  res.status(statusCode).json(response);
};