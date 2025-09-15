import { Response } from 'express';
import { ApiResponse } from '@/types';

export const sendSuccessResponse = <T>(
  res: Response,
  data?: T,
  message = 'Success',
  statusCode = 200
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  };
  return res.status(statusCode).json(response);
};

export const sendErrorResponse = (
  res: Response,
  message = 'Error occurred',
  statusCode = 400,
  error?: string
): Response => {
  const response: ApiResponse = {
    success: false,
    message,
    error,
  };
  return res.status(statusCode).json(response);
};

// Aliases for consistency
export const responseSuccess = <T>(
  res: Response,
  message = 'Success',
  data?: T,
  statusCode = 200
): Response => {
  return sendSuccessResponse(res, data, message, statusCode);
};

export const responseError = (
  res: Response,
  message = 'Error occurred',
  statusCode = 400,
  error?: any
): Response => {
  return sendErrorResponse(res, message, statusCode, error);
};
