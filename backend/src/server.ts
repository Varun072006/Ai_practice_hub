import app from './app';
import logger from './config/logger';
import { initializeUsers } from './controllers/authController';
import pool from './config/database';
import { hashPassword } from './utils/password';
import { getRows } from './utils/mysqlHelper';
import { initializeJudge0Languages } from './utils/codeExecutor';

const PORT = process.env.PORT || 5000;

// Initialize default users on startup (non-blocking)
// This will retry on first request if database is not ready
initializeUsers().catch((error) => {
  logger.warn('Default users initialization deferred. Server will continue to start.');
  logger.debug('Initialization error:', error);
});

// Initialize Judge0 Language Map
initializeJudge0Languages();

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle port already in use error gracefully
server.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use. Please:`);
    logger.error(`1. Stop the process using port ${PORT}`);
    logger.error(`2. Or set a different PORT in your .env file`);
    logger.error(`3. On Windows, run: netstat -ano | findstr ":${PORT}" to find the process`);
    process.exit(1);
  } else {
    logger.error('Server error:', error);
    process.exit(1);
  }
});

