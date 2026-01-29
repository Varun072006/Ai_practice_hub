import { Request, Response } from 'express';
import { login, createDefaultUsers, register, forgotPassword, changePassword } from '../services/authService';
import { verifyGoogleToken, exchangeCodeForToken, findOrCreateGoogleUser } from '../services/googleAuthService';
import logger from '../config/logger';

export const loginController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    // Ensure default users exist before attempting login
    try {
      await createDefaultUsers();
    } catch (userInitError) {
      logger.warn('Could not initialize default users, continuing with login attempt:', userInitError);
    }

    const result = await login({ username, password });
    res.json(result);
  } catch (error: any) {
    logger.error('Login error:', error);
    const errorMessage = error.message || 'Authentication failed';

    // Provide helpful error messages
    if (errorMessage.includes('Invalid credentials')) {
      res.status(401).json({
        error: 'Invalid username or password. Default credentials: USER/123 or ADMIN/123'
      });
    } else {
      res.status(401).json({ error: errorMessage });
    }
  }
};

export const googleLoginController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, code, redirectUri } = req.body;

    let googleUser;

    if (code) {
      // Exchange authorization code for user info
      googleUser = await exchangeCodeForToken(code, redirectUri);
    } else if (token) {
      // Verify ID token directly
      googleUser = await verifyGoogleToken(token);
    } else {
      res.status(400).json({ error: 'Google token or code is required' });
      return;
    }

    // Find or create user
    const result = await findOrCreateGoogleUser(googleUser);

    res.json(result);
  } catch (error: any) {
    logger.error('Google login error:', error);
    res.status(401).json({ error: error.message || 'Google authentication failed' });
  }
};

export const initializeUsers = async (): Promise<void> => {
  await createDefaultUsers();
};

export const registerController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required' });
      return;
    }

    const result = await register({ name, email, password });
    res.json(result);
  } catch (error: any) {
    logger.error('Registration error:', error);
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
};

export const forgotPasswordController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const result = await forgotPassword(email);
    res.json(result);
  } catch (error: any) {
    logger.error('Forgot password error:', error);
    res.status(400).json({ error: error.message || 'Failed to process request' });
  }
};



export const changePasswordController = async (req: any, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current and new password are required' });
      return;
    }

    const result = await changePassword(userId, currentPassword, newPassword);
    res.json(result);
  } catch (error: any) {
    logger.error('Change password error:', error);
    res.status(400).json({ error: error.message || 'Failed to change password' });
  }
};
