import { Response } from 'express';
import { getSessionResults, getSessionResultsForAdmin } from '../services/resultService';
import { AuthRequest } from '../middlewares/auth';
import logger from '../config/logger';

export const getSessionResultsController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const results = await getSessionResults(sessionId, userId);
    res.json(results);
  } catch (error: any) {
    logger.error('Get session results error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch results' });
  }
};

// Admin controller - can view any session's results
export const getSessionResultsForAdminController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const results = await getSessionResultsForAdmin(sessionId);
    res.json(results);
  } catch (error: any) {
    logger.error('Admin get session results error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch results' });
  }
};
