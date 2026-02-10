import { Router } from 'express';
import { getUserProgressController, getLeaderboardController, getLeaderboardPaginatedController, getUserRankController, getUserRecentActivityController, getUserTasksController } from '../controllers/progressController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.get('/me', authenticate, getUserProgressController);
router.get('/leaderboard', getLeaderboardController);
router.get('/leaderboard/paginated', getLeaderboardPaginatedController);
router.get('/leaderboard/my-rank', authenticate, getUserRankController);
router.get('/recent-activity', authenticate, getUserRecentActivityController);
router.get('/tasks', authenticate, getUserTasksController);

export default router;


