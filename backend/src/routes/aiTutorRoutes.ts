import { Router } from 'express';
import {
  chatWithTutor,
  getInitialHintController,
  freeChatWithTutor,
  healthCheckController,
  getMCQHintController,
  getCodingHintController,
  getAnalysisController
} from '../controllers/aiTutorController';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Health check (public)
router.get('/health', healthCheckController);

// Session-aware tutor used from the Results page
router.post('/chat', authenticate, chatWithTutor);
router.get('/hint/:sessionId', authenticate, getInitialHintController);

// Hint endpoints for practice pages
router.post('/mcq-hint', authenticate, getMCQHintController);
router.post('/coding-hint', authenticate, getCodingHintController);

// Performance Analysis
router.get('/analysis/:sessionId', authenticate, getAnalysisController);

// General AI Coach chat (no session required)
router.post('/free-chat', authenticate, freeChatWithTutor);

export default router;

