import { Request, Response } from 'express';
import { startSession, submitSolution, completeSession, runCode, getAllSessions, runTestCases } from '../services/sessionService';
import { AuthRequest } from '../middlewares/auth';
import logger from '../config/logger';

export const startSessionController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { courseId, levelId, sessionType } = req.body;
    const userId = req.user?.userId;

    logger.info(`[startSessionController] Request received - userId: ${userId}, courseId: ${courseId}, levelId: ${levelId}, sessionType: ${sessionType}`);

    if (!userId) {
      logger.warn('[startSessionController] Unauthorized - no userId');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!courseId || !levelId) {
      logger.warn('[startSessionController] Bad request - missing courseId or levelId');
      res.status(400).json({ error: 'Course ID and Level ID are required' });
      return;
    }

    logger.info(`[startSessionController] Starting session for user ${userId}`);
    const session = await startSession(
      userId,
      courseId,
      levelId,
      sessionType === 'coding' || sessionType === 'mcq' || sessionType === 'html-css-challenge' ? sessionType : undefined
    );

    logger.info(`[startSessionController] Session created successfully: ${session.id}`);
    res.json(session);
  } catch (error: any) {
    logger.error('[startSessionController] Start session error:', error);
    logger.error('[startSessionController] Error stack:', error.stack);
    logger.error('[startSessionController] Error message:', error.message);
    logger.error('[startSessionController] Error code:', error.code);

    // Return detailed error message for debugging
    const errorMessage = error.message || 'Failed to start session';
    const errorResponse: any = {
      error: errorMessage,
      code: error.code,
    };

    // Include more details in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = error.stack;
      errorResponse.sqlMessage = error.sqlMessage;
      errorResponse.sqlState = error.sqlState;
      errorResponse.sqlCode = error.sqlCode;
    }

    res.status(500).json(errorResponse);
  }
};

export const submitSolutionController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { questionId, code, language, selected_option_id, isPassed } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await submitSolution(sessionId, questionId, userId, {
      code,
      language,
      selected_option_id,
      isPassed
    });

    res.json(result);
  } catch (error: any) {
    logger.error('Submit solution error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit solution' });
  }
};

export const completeSessionController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await completeSession(sessionId, userId);
    res.json({ message: 'Session completed successfully' });
  } catch (error: any) {
    logger.error('Complete session error:', error);
    res.status(500).json({ error: error.message || 'Failed to complete session' });
  }
};

export const runCodeController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { code, language, customInput } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await runCode(sessionId, code, language, customInput);
    res.json(result);
  } catch (error: any) {
    logger.error('Run code error:', error);
    res.status(500).json({ error: error.message || 'Failed to run code' });
  }
};

export const runTestCasesController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { questionId, code, language } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await runTestCases(sessionId, questionId, code, language);
    res.json(result);
  } catch (error: any) {
    logger.error('Run test cases error:', error);
    res.status(500).json({ error: error.message || 'Failed to run tests' });
  }
};

/**
 * Get all sessions
 * GET /api/sessions
 */
export const getAllSessionsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessions = await getAllSessions();
    res.json({
      success: true,
      data: sessions,
    });
  } catch (error: any) {
    logger.error('Get all sessions error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch sessions',
    });
  }
};
