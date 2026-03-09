import express, { Application } from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middlewares/errorHandler';
import logger from './config/logger';

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

// Middleware - CORS Configuration
const isDevelopment = process.env.NODE_ENV !== 'production';
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

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

// Request logging (only in development)
if (process.env.NODE_ENV === 'development' || process.env.LOG_LEVEL === 'debug') {
  app.use((req, res, next) => {
    logger.debug(`Incoming Request ${req.method} ${req.url}`);
    next();
  });
}

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'AI Practice Hub API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      questions: '/api/questions',
      courses: '/api/courses',
      sessions: '/api/sessions',
      results: '/api/results',
      progress: '/api/progress',
      admin: '/api/admin',
      skills: '/api/skills',
      onboarding: '/api/onboarding',
      practice: '/api/practice',
      learningPath: '/api/learning-path',
      diagnostic: '/api/diagnostic',
      analytics: '/api/analytics',
      intelligence: '/api/intelligence',
      profile: '/api/profile'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/practice', skillPracticeRoutes);
app.use('/api/learning-path', adaptivePathRoutes);
app.use('/api/diagnostic', diagnosticRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/seed', seedRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/assets', assetRoutes);


// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;

