import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import { User } from '../generated/prisma';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface JwtUser extends JwtPayload {
  id: string;
  email: string;
  role: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}