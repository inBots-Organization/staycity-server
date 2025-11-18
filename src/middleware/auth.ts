import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { UserService } from '../services/userService';
import { User } from '../generated/prisma';
import { RoleName, Permission, getRolePermissions } from '../types/permissions';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      permissions?: Permission[];
    }
  }
}

interface JWTPayload {
  id: string;
  email: string;
  role: RoleName;
  permissions: Permission[];
  iat?: number;
  exp?: number;
}

// Generate JWT token
export function generateToken(user: User): string {
  const permissions = getRolePermissions(user.role);
  
  const payload: JWTPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    permissions: [...permissions], // Convert readonly array to regular array
  };

  const secret = process.env['JWT_SECRET'] || 'your-secret-key';
  
  // Issue a token without expiration (no expiresIn) so it does not expire
  return jwt.sign(payload, secret);
}

// Authentication middleware
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
      return;
    }

    const secret = process.env['JWT_SECRET'] || 'your-secret-key';
    const decoded = jwt.verify(token, secret) as JWTPayload;

    // Get fresh user data
    const user = await UserService.findByIdWithPassword(decoded.id);
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
      return;
    }

    // Attach user and permissions to request
    req.user = user;
    req.permissions = decoded.permissions;

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
    return;
  }
}

// Authorization middleware with TypeScript intellisense
export function authorize(requiredPermissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !req.permissions) {
      res.status(401).json({
        success: false,
        message: 'Access denied. Please authenticate first.'
      });
      return;
    }

    // Check if user has at least one of the required permissions
    const hasPermission = requiredPermissions.some(permission => 
      req.permissions!.includes(permission)
    );

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
        required: requiredPermissions,
        userPermissions: req.permissions
      });
      return;
    }

    next();
  };
}

// Helper middleware to require all permissions (AND logic)
export function authorizeAll(requiredPermissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !req.permissions) {
      res.status(401).json({
        success: false,
        message: 'Access denied. Please authenticate first.'
      });
      return;
    }

    // Check if user has ALL required permissions
    const hasAllPermissions = requiredPermissions.every(permission => 
      req.permissions!.includes(permission)
    );

    if (!hasAllPermissions) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
        required: requiredPermissions,
        userPermissions: req.permissions
      });
      return;
    }

    next();
  };
}