import { Request, Response } from 'express';
import { getUserProgress, getLeaderboard, getLeaderboardPaginated, getUserRank, getUserRecentActivity, getUserTasks } from '../services/progressService';
import { AuthRequest } from '../middlewares/auth';
import logger from '../config/logger';

export const getUserProgressController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const progress = await getUserProgress(userId);
    res.json(progress);
  } catch (error: any) {
    logger.error('Get user progress error:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
};

export const getLeaderboardController = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const leaderboard = await getLeaderboard(limit);
    res.json(leaderboard);
  } catch (error: any) {
    logger.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};

export const getLeaderboardPaginatedController = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || '';
    const result = await getLeaderboardPaginated(page, limit, search);
    res.json(result);
  } catch (error: any) {
    logger.error('Get paginated leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};

export const getUserRankController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const rank = await getUserRank(userId);
    res.json(rank);
  } catch (error: any) {
    logger.error('Get user rank error:', error);
    res.status(500).json({ error: 'Failed to fetch user rank' });
  }
};

export const getUserRecentActivityController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const limit = parseInt(req.query.limit as string) || 20;
    const activity = await getUserRecentActivity(userId, limit);
    res.json(activity);
  } catch (error: any) {
    logger.error('Get user recent activity error:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
};

export const getUserTasksController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId; if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    } const tasks = await getUserTasks(userId);
    res.json(tasks);
  } catch (error: any) {
    logger.error('Get user tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};
