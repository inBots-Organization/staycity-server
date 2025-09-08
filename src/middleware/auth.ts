import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { RoleName, Permission, getRolePermissions } from '../types/permissions';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
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
export function generateToken(user: IUser): string {
  const permissions = getRolePermissions(user.role);
  
  const payload: JWTPayload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    permissions: [...permissions], // Convert readonly array to regular array
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Authentication middleware
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as JWTPayload;

    // Get fresh user data
    const user = await User.findById(decoded.id).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    // Attach user and permissions to request
    req.user = user;
    req.permissions = decoded.permissions;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }
}

// Authorization middleware with TypeScript intellisense
export function authorize(requiredPermissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.permissions) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Please authenticate first.'
      });
    }

    // Check if user has at least one of the required permissions
    const hasPermission = requiredPermissions.some(permission => 
      req.permissions!.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
        required: requiredPermissions,
        userPermissions: req.permissions
      });
    }

    next();
  };
}

// Helper middleware to require all permissions (AND logic)
export function authorizeAll(requiredPermissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.permissions) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Please authenticate first.'
      });
    }

    // Check if user has ALL required permissions
    const hasAllPermissions = requiredPermissions.every(permission => 
      req.permissions!.includes(permission)
    );

    if (!hasAllPermissions) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
        required: requiredPermissions,
        userPermissions: req.permissions
      });
    }

    next();
  };
}