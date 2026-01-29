import pool from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import logger from '../config/logger';
import { getRows, getFirstRow } from '../utils/mysqlHelper';
import { randomUUID } from 'crypto';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface UserData {
  id: string;
  username: string;
  role: string;
  name: string | null;
  email: string | null;
}

export const login = async (credentials: LoginCredentials) => {
  const { username, password } = credentials;

  let result;
  let retries = 3;

  // Retry logic for connection errors with case-insensitive username matching
  while (retries > 0) {
    try {
      result = await pool.query(
        'SELECT id, username, password_hash, role, name, email FROM users WHERE LOWER(username) = LOWER(?)',
        [username]
      );
      break; // Success, exit retry loop
    } catch (error: any) {
      retries--;

      // If it's a connection error and we have retries left, wait and retry
      if ((error.code === 'ECONNRESET' || error.code === 'PROTOCOL_CONNECTION_LOST' || error.code === 'ETIMEDOUT') && retries > 0) {
        logger.warn(`Database connection error, retrying... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        continue;
      }

      // If no retries left or different error, throw
      logger.error('Login database query error:', error);
      throw new Error('Database connection failed. Please try again.');
    }
  }

  const rows = getRows(result);
  if (rows.length === 0) {
    logger.warn(`Login attempt with non-existent username: ${username}`);
    throw new Error('Invalid credentials');
  }

  const user = rows[0];

  if (!user.password_hash) {
    logger.error(`User ${username} has no password hash`);
    throw new Error('Invalid credentials');
  }

  const isValid = await comparePassword(password, user.password_hash);

  if (!isValid) {
    logger.warn(`Invalid password attempt for username: ${username}`);
    throw new Error('Invalid credentials');
  }

  logger.info(`Successful login for user: ${username} (${user.role})`);

  const token = generateToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      email: user.email,
    },
  };
};


export const register = async (userData: any) => {
  const { name, email, password } = userData;

  // Check if user exists
  const existingUser = await pool.query(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );

  if (getRows(existingUser).length > 0) {
    throw new Error('User already exists with this email');
  }

  const userId = randomUUID();
  const hashedPassword = await hashPassword(password);
  const username = email.split('@')[0]; // Simple username generation

  // Insert new user
  await pool.query(
    'INSERT INTO users (id, username, password_hash, role, name, email) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, username, hashedPassword, 'student', name, email]
  );

  // Auto-login after register
  const token = generateToken({
    userId,
    username,
    role: 'student',
  });

  return {
    token,
    user: {
      id: userId,
      username,
      role: 'student',
      name,
      email,
    },
  };
};

export const forgotPassword = async (email: string) => {
  // Check if user exists
  const userResult = await pool.query(
    'SELECT id, name FROM users WHERE email = ?',
    [email]
  );

  const rows = getRows(userResult);
  if (rows.length === 0) {
    // Don't reveal user existence security-wise, but for now we will just return success
    // In a real app, you might want to send a generic "If an account exists..." email
    logger.info(`Forgot password attempt for non-existent email: ${email}`);
    return { success: true };
  }

  const user = rows[0];
  const resetToken = randomUUID();

  // In a real app, store this token in DB with expiry and send email
  // For now, we'll just log it
  logger.info(`[MOCK EMAIL] Password reset requested for ${email}. Reset Token: ${resetToken}`);
  console.log(`[MOCK EMAIL] Password reset link: http://localhost:5173/reset-password?token=${resetToken}`);

  return { success: true, message: 'Password reset instructions sent' };
};

export const createDefaultUsers = async () => {
  try {
    // Test database connection first with a simple query
    await pool.query('SELECT 1');

    // Check if users already exist
    const userCheck = await pool.query('SELECT id FROM users WHERE username IN (?, ?)', ['USER', 'ADMIN']);

    const userCheckRows = getRows(userCheck);
    if (userCheckRows.length === 0) {
      const { hashPassword } = await import('../utils/password');

      const userPassword = await hashPassword('123');
      const adminPassword = await hashPassword('123');

      const userId = randomUUID();
      const adminId = randomUUID();

      await pool.query(
        'INSERT INTO users (id, username, password_hash, role, name) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=id',
        [userId, 'USER', userPassword, 'student', 'Student User']
      );

      await pool.query(
        'INSERT INTO users (id, username, password_hash, role, name) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=id',
        [adminId, 'ADMIN', adminPassword, 'admin', 'Admin User']
      );

      logger.info('Default users created');
    } else {
      logger.info('Default users already exist');
    }
  } catch (error: any) {
    // Handle timeout errors gracefully
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      logger.warn('Database connection timeout or refused. Default users will be created on first request.');
    } else {
      logger.error('Error creating default users:', error);
      if (error instanceof Error) {
        logger.error('Stack trace:', error.stack);
      }
    }
    // Don't throw - allow server to start even if user creation fails
  }
};

export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  // Get user's current password hash
  const userResult = await pool.query(
    'SELECT password_hash FROM users WHERE id = ?',
    [userId]
  );

  const rows = getRows(userResult);
  if (rows.length === 0) {
    throw new Error('User not found');
  }

  const user = rows[0];

  // Verify current password
  const isValid = await comparePassword(currentPassword, user.password_hash);
  if (!isValid) {
    throw new Error('Invalid current password');
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password in DB
  await pool.query(
    'UPDATE users SET password_hash = ? WHERE id = ?',
    [hashedPassword, userId]
  );

  return { success: true, message: 'Password updated successfully' };
};

