import app from './app';
import logger from './config/logger';
import { initializeUsers } from './controllers/authController';
import pool from './config/database';
import { hashPassword } from './utils/password';
import { getRows } from './utils/mysqlHelper';
import { initializePistonLanguages, warmupPiston } from './utils/codeExecutor';
import { startHealthChecks } from './utils/pistonLoadBalancer';

const PORT = process.env.PORT || 5000;

// Initialize default users on startup (non-blocking)
// This will retry on first request if database is not ready
initializeUsers().catch((error) => {
  logger.warn('Default users initialization deferred. Server will continue to start.');
  logger.debug('Initialization error:', error);
});

// Initialize Piston + Queue Worker
(async () => {
  // Start load balancer health checks
  startHealthChecks();

  // Initialize Piston languages (retry up to 5 times)
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await initializePistonLanguages();
      logger.info('Piston language map initialized successfully.');

      // Warm up Piston instances (cold-start prevention)
      warmupPiston().catch(err =>
        logger.warn(`Piston warmup failed (non-critical): ${err.message}`)
      );

      break;
    } catch (err: any) {
      logger.warn(`Piston language init attempt ${attempt}/5 failed, retrying in ${attempt * 3}s...`);
      if (attempt < 5) await new Promise(r => setTimeout(r, attempt * 3000));
    }
  }
})();

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

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  try {
    const { shutdownQueue } = await import('./services/codeExecutionQueue');
    await shutdownQueue();
  } catch {}
  server.close(() => process.exit(0));
});

