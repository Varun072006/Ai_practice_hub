import express from 'express';
import * as profileService from '../services/profileService';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

// Apply authenticate middleware to all routes
router.use(authenticate);

// ============================================
// GET /api/profile/stats
// Get learning summary statistics
// ============================================
router.get('/stats', async (req, res) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const stats = await profileService.getUserStats(userId);

        // Also check and award any new achievements
        const newAchievements = await profileService.checkAndAwardAchievements(userId);

        res.json({
            ...stats,
            newAchievements
        });
    } catch (error) {
        console.error('[Profile Stats] Error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// ============================================
// GET /api/profile/skills
// Get skill progress data
// ============================================
router.get('/skills', async (req, res) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const skills = await profileService.getUserSkills(userId);
        res.json(skills);
    } catch (error) {
        console.error('[Profile Skills] Error:', error);
        res.status(500).json({ error: 'Failed to fetch skills' });
    }
});

// ============================================
// GET /api/profile/course-stats
// Get per-course question statistics
// ============================================
router.get('/course-stats', async (req, res) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const courseStats = await profileService.getCourseWiseStats(userId);
        res.json(courseStats);
    } catch (error) {
        console.error('[Profile Course Stats] Error:', error);
        res.status(500).json({ error: 'Failed to fetch course stats' });
    }
});

// ============================================
// GET /api/profile/achievements
// Get user achievements/badges
// ============================================
router.get('/achievements', async (req, res) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const achievements = await profileService.getUserAchievements(userId);
        res.json(achievements);
    } catch (error) {
        console.error('[Profile Achievements] Error:', error);
        res.status(500).json({ error: 'Failed to fetch achievements' });
    }
});

// ============================================
// GET /api/profile/security
// Get security information
// ============================================
router.get('/security', async (req, res) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const sessionToken = req.headers.authorization?.replace('Bearer ', '');
        const security = await profileService.getSecurityInfo(userId, sessionToken);
        res.json(security);
    } catch (error) {
        console.error('[Profile Security] Error:', error);
        res.status(500).json({ error: 'Failed to fetch security info' });
    }
});

// ============================================
// GET /api/profile/extended
// Get extended profile (bio, goal, photo)
// ============================================
router.get('/extended', async (req, res) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const profile = await profileService.getUserProfile(userId);
        res.json(profile);
    } catch (error) {
        console.error('[Profile Extended] Error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// ============================================
// PUT /api/profile/update
// Update profile (bio, goal, photo)
// ============================================
router.put('/update', async (req, res) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { bio, goal, photoUrl } = req.body;
        await profileService.updateUserProfile(userId, { bio, goal, photoUrl });
        res.json({ success: true });
    } catch (error) {
        console.error('[Profile Update] Error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// ============================================
// POST /api/profile/logout-all
// Logout from all devices
// ============================================
router.post('/logout-all', async (req, res) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const sessionToken = req.headers.authorization?.replace('Bearer ', '');
        const { keepCurrent } = req.body;

        await profileService.logoutAllSessions(userId, keepCurrent ? sessionToken : undefined);
        res.json({ success: true });
    } catch (error) {
        console.error('[Profile Logout All] Error:', error);
        res.status(500).json({ error: 'Failed to logout sessions' });
    }
});

// ============================================
// POST /api/profile/logout-session/:sessionId
// Logout a specific session
// ============================================
router.post('/logout-session/:sessionId', async (req, res) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        await profileService.logoutSession(userId, req.params.sessionId);
        res.json({ success: true });
    } catch (error) {
        console.error('[Profile Logout Session] Error:', error);
        res.status(500).json({ error: 'Failed to logout session' });
    }
});

// ============================================
// POST /api/profile/enable-2fa
// Enable two-factor authentication
// ============================================
router.post('/enable-2fa', async (req, res) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const result = await profileService.enable2FA(userId);
        res.json(result);
    } catch (error) {
        console.error('[Profile Enable 2FA] Error:', error);
        res.status(500).json({ error: 'Failed to enable 2FA' });
    }
});

// ============================================
// POST /api/profile/confirm-2fa
// Confirm 2FA setup with code
// ============================================
router.post('/confirm-2fa', async (req, res) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { code } = req.body;
        const success = await profileService.confirm2FA(userId, code);
        res.json({ success });
    } catch (error) {
        console.error('[Profile Confirm 2FA] Error:', error);
        res.status(500).json({ error: 'Failed to confirm 2FA' });
    }
});

// ============================================
// POST /api/profile/disable-2fa
// Disable two-factor authentication
// ============================================
router.post('/disable-2fa', async (req, res) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        await profileService.disable2FA(userId);
        res.json({ success: true });
    } catch (error) {
        console.error('[Profile Disable 2FA] Error:', error);
        res.status(500).json({ error: 'Failed to disable 2FA' });
    }
});

// ============================================
// GET /api/profile/dashboard
// Get all dashboard data in one call
// ============================================
router.get('/dashboard', async (req, res) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const sessionToken = req.headers.authorization?.replace('Bearer ', '');

        // Default values in case of errors
        const defaultStats = {
            totalQuestionsSolved: 0,
            totalQuestionsAttempted: 0,
            accuracyPercentage: 0,
            currentStreak: 0,
            longestStreak: 0,
            coursesEnrolled: 0,
            coursesCompleted: 0,
            leaderboardRank: 0,
            totalUsers: 0
        };

        const defaultSecurity = {
            lastLoginAt: null,
            lastLoginIp: null,
            lastLoginDevice: null,
            twoFactorEnabled: false,
            activeSessions: []
        };

        const defaultProfile = {
            photoUrl: null,
            bio: null,
            goal: null
        };

        // Fetch each piece of data with individual error handling
        let stats: profileService.UserStats = defaultStats;
        let skills: profileService.UserSkill[] = [];
        let achievements: profileService.Achievement[] = [];
        let security: profileService.SecurityInfo = defaultSecurity as profileService.SecurityInfo;
        let profile: profileService.UserProfile = defaultProfile as profileService.UserProfile;
        let newAchievements: string[] = [];
        let courseStats: profileService.CourseStats[] = [];

        try {
            stats = await profileService.getUserStats(userId);
        } catch (e) {
            console.error('[Dashboard] Stats error:', e);
        }

        try {
            skills = await profileService.getUserSkills(userId);
        } catch (e) {
            console.error('[Dashboard] Skills error:', e);
        }

        try {
            achievements = await profileService.getUserAchievements(userId);
        } catch (e) {
            console.error('[Dashboard] Achievements error:', e);
        }

        try {
            security = await profileService.getSecurityInfo(userId, sessionToken);
        } catch (e) {
            console.error('[Dashboard] Security error:', e);
        }

        try {
            profile = await profileService.getUserProfile(userId);
        } catch (e) {
            console.error('[Dashboard] Profile error:', e);
        }

        try {
            newAchievements = await profileService.checkAndAwardAchievements(userId);
        } catch (e) {
            console.error('[Dashboard] Award achievements error:', e);
        }

        try {
            courseStats = await profileService.getCourseWiseStats(userId);
        } catch (e) {
            console.error('[Dashboard] Course stats error:', e);
        }

        res.json({
            stats,
            skills,
            achievements,
            security,
            profile,
            newAchievements,
            courseStats
        });
    } catch (error) {
        console.error('[Profile Dashboard] Error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

export default router;
