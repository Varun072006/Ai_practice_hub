import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { getAllUsers, getUserById } from '../services/userService';
import logger from '../config/logger';

/**
 * Get all users
 * GET /api/users
 */
export const getAllUsersController = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await getAllUsers();
    res.json({
      success: true,
      data: users,
    });
  } catch (error: any) {
    logger.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch users',
    });
  }
};

/**
 * Get a single user by ID
 * GET /api/users/:id
 */
export const getUserByIdController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
      return;
    }

    const user = await getUserById(id);
    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    logger.error('Get user by ID error:', error);

    if (error.message === 'User not found') {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch user',
      });
    }
  }
};

/**
 * Update user profile
 * PUT /api/users/:id
 */
export const updateUserController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, department, year, roll_number } = req.body;
    const requestUserId = req.user?.userId;

    if (!id) {
      res.status(400).json({ success: false, error: 'User ID is required' });
      return;
    }

    // Authorization check: Users can only update their own profile unless admin (logic can be expanded)
    // For now assuming the route middleware handles generic auth, but we should ensure users don't update others
    if (requestUserId !== id && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Unauthorized to update this profile' });
      return;
    }

    const updatedUser = await import('../services/userService').then(s => s.updateUser(id, { name, department, year, roll_number }));

    res.json({
      success: true,
      data: updatedUser,
    });
  } catch (error: any) {
    logger.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update user',
    });
  }
};




