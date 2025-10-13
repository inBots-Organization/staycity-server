import { body, param } from 'express-validator';

export const createUserValidator = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('role')
    .optional()
    .isIn(['super_admin', 'admin', 'manager', 'user'])
    .withMessage('Role must be one of: super_admin, admin, manager, user'),
  
  body('image')
    .optional()
    .isURL()
    .withMessage('Image must be a valid URL')
];

export const updateUserValidator = [
  // param('id')
  //   .isMongoId()
  //   .withMessage('Invalid user ID'),
    
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('role')
    .optional()
    .isIn(['super_admin', 'admin', 'manager', 'user'])
    .withMessage('Role must be one of: super_admin, admin, manager, user'),
  
  body('image')
    .optional()
    .isURL()
    .withMessage('Image must be a valid URL')
];

export const getUserValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID')
];

export const deleteUserValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID')
];
export const updatePasswordValidator = [
  // param('id')
  //   .isMongoId()
  //   .withMessage('Invalid user ID'),
  body('currentPassword')
    .isLength({ min: 6 })
    .withMessage('Current password must be at least 6 characters long'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
];