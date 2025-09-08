import { Request, Response } from 'express';
import { User, IUser } from '../models/User';
import { validationResult } from 'express-validator';
import { PERMISSIONS } from '../types/permissions';

// Get all users
export const getAllUsersController = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find().select('-password');
    
    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get user by ID
export const getUserByIdController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id).select('-password');
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: user
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Create new user
export const createUserController = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
      return;
    }

    const { name, email, password, role = 'user', image } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
      return;
    }

    // Create new user (password will be hashed automatically)
    const newUser = new User({
      name,
      email,
      password,
      role,
      image
    });

    await newUser.save();

    // Return user without password
    const userResponse = await User.findById(newUser._id).select('-password');

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update user by ID
export const updateUserController = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
      return;
    }

    const { id } = req.params;
    const { name, email, role, image } = req.body;

    // Check if user exists
    const existingUser = await User.findById(id);
    if (!existingUser) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Check if email is being changed and already exists
    if (email !== existingUser.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: id } });
      if (emailExists) {
        res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
        return;
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { name, email, role, image },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete user by ID
export const deleteUserController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Prevent deleting super_admin users (optional security measure)
    if (user.role === 'super_admin') {
      res.status(403).json({
        success: false,
        message: 'Cannot delete super admin user'
      });
      return;
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: { id }
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};