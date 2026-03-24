import express, { Application } from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middlewares/errorHandler';
import logger from './config/logger';
import helmet from 'helmet';
import compression from 'compression';

// Routes
import authRoutes from './routes/authRoutes';
import courseRoutes from './routes/courseRoutes';
import sessionRoutes from './routes/sessionRoutes';
import resultRoutes from './routes/resultRoutes';
import progressRoutes from './routes/progressRoutes';
import adminRoutes from './routes/adminRoutes';
import userRoutes from './routes/userRoutes';
import questionRoutes from './routes/questionRoutes';
import skillRoutes from './routes/skillRoutes';
import onboardingRoutes from './routes/onboardingRoutes';
import skillPracticeRoutes from './routes/skillPracticeRoutes';
import adaptivePathRoutes from './routes/adaptivePathRoutes';
import diagnosticRoutes from './routes/diagnosticRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import intelligenceRoutes from './routes/intelligenceRoutes';
import seedRoutes from './routes/seedRoutes';
import profileRoutes from './routes/profileRoutes';
import assetRoutes from './routes/assetsRoutes';


dotenv.config();

const app: Application = express();

// Security and Optimization Middlewares
app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  contentSecurityPolicy: false, // Disable CSP for easier integration with CDNs/external scripts if needed, or customize it
}));
app.use(compression());

const isDevelopment = process.env.NODE_ENV !== 'production';

// CORS Configuration: Origins must NOT contain paths
const defaultOrigins = ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'https://pcdp.bitsathy.ac.in', 'https://pcdp.bitsathy.ac.in/aiportal', 'https://pcdp.bitsathy.ac.in/aipracticehub'];

const allowedOrigins: string[] = (() => {
  const raw = process.env.FRONTEND_URL;
  if (!raw) return defaultOrigins;

  const origins = raw.split(',').map(s => s.trim()).filter(Boolean).map(entry => {
    if (entry === '*') return entry;
    try {
      const url = new URL(entry);
      return `${url.protocol}//${url.host}`;
    } catch {
      return entry;
    }
  });

  return [...new Set([...origins, 'https://pcdp.bitsathy.ac.in/aiportal/aipracticehub'])];
})();

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    // In development, allow all localhost origins
    if (isDevelopment && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      return callback(null, true);
    }
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In development, be permissive; in production, be strict
      if (isDevelopment) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging (Enabled in production for initial routing diagnostics)
app.use((req, res, next) => {
  logger.info(`[Router] ${req.method} ${req.originalUrl} -> ${req.url}`);
  next();
});

// Create a combined API router
const apiRouter = express.Router();

// Root sub-route
apiRouter.get('/', (req, res) => {
  res.json({
    message: 'AI Practice Hub API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users'
    }
  });
});

// Health check
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount all feature routes on the apiRouter
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/questions', questionRoutes);
apiRouter.use('/courses', courseRoutes);
apiRouter.use('/sessions', sessionRoutes);
apiRouter.use('/results', resultRoutes);
apiRouter.use('/progress', progressRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/skills', skillRoutes);
apiRouter.use('/onboarding', onboardingRoutes);
apiRouter.use('/practice', skillPracticeRoutes);
apiRouter.use('/learning-path', adaptivePathRoutes);
apiRouter.use('/diagnostic', diagnosticRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/intelligence', intelligenceRoutes);
apiRouter.use('/seed', seedRoutes);
apiRouter.use('/profile', profileRoutes);
apiRouter.use('/assets', assetRoutes);

// Queue monitoring endpoint (admin only)
apiRouter.get('/admin/queue-stats', async (req, res) => {
  try {
    const { getQueueStats } = await import('./services/codeExecutionQueue');
    const stats = await getQueueStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mounting Strategy: 
// 1. Mount at /api to support standard /api/... calls
// 2. Mount at / as a fallback if Nginx strips the prefix entirely
app.use('/api', apiRouter);
app.use('/', apiRouter);


// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;

