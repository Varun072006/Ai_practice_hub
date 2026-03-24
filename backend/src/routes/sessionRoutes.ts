import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  startSessionController,
  submitSolutionController,
  completeSessionController,
  runCodeController,
  getAllSessionsController,
  runTestCasesController,
} from '../controllers/sessionController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// ─── Rate Limiters (3-tier) ──────────────────────────────────────────────────

const perUserLimiter = rateLimit({
  windowMs: 10_000,
  max: 5,
  keyGenerator: (req) => (req as any).user?.userId || req.ip || 'unknown',
  message: { error: 'Too many code executions. Please wait a few seconds.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const perIPLimiter = rateLimit({
  windowMs: 10_000,
  max: 20,
  message: { error: 'Too many requests from this network.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const globalLimiter = rateLimit({
  windowMs: 10_000,
  max: 200,
  message: { error: 'System is busy. Please try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Routes ──────────────────────────────────────────────────────────────────

router.get('/', getAllSessionsController);
router.post('/start', authenticate, startSessionController);

// Code execution routes: global → IP → user rate limiting
router.post('/:sessionId/submit', authenticate, globalLimiter, perIPLimiter, perUserLimiter, submitSolutionController);
router.post('/:sessionId/run', authenticate, globalLimiter, perIPLimiter, perUserLimiter, runCodeController);
router.post('/:sessionId/run-tests', authenticate, globalLimiter, perIPLimiter, perUserLimiter, runTestCasesController);

router.post('/:sessionId/complete', authenticate, completeSessionController);

export default router;

