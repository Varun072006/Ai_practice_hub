import pool from '../config/database';
import { randomUUID } from 'crypto';
import { getRows } from '../utils/mysqlHelper';

// ============================================
// USER STATS
// ============================================

export interface UserStats {
    totalQuestionsSolved: number;
    totalQuestionsAttempted: number;
    accuracyPercentage: number;
    currentStreak: number;
    longestStreak: number;
    coursesEnrolled: number;
    coursesCompleted: number;
    leaderboardRank: number;
    totalUsers: number;
}

export interface CourseStats {
    courseId: string;
    courseName: string;
    questionsPassed: number;
    questionsAttempted: number;
    mcqPassed: number;
    mcqAttempted: number;
    codingPassed: number;
    codingAttempted: number;
    icon: string;
}

export const getUserStats = async (userId: string): Promise<UserStats> => {
    try {
        // Get coding questions passed (all test cases cleared)
        const codingResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT us.question_id) as attempted,
        COUNT(DISTINCT CASE 
          WHEN us.test_cases_passed = us.total_test_cases AND us.total_test_cases > 0 
          THEN us.question_id 
        END) as passed
      FROM user_submissions us
      JOIN practice_sessions ps ON us.session_id = ps.id
      WHERE us.user_id = ? AND ps.session_type = 'coding'
    `, [userId]);
        const codingRows = getRows(codingResult);
        const codingAttempted = parseInt(codingRows[0]?.attempted || '0');
        const codingPassed = parseInt(codingRows[0]?.passed || '0');

        // Get MCQ sessions passed (>=60% correct in the session)
        const mcqResult = await pool.query(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(CASE WHEN pass_percentage >= 60 THEN questions_in_session ELSE 0 END) as passed_questions,
        SUM(questions_in_session) as attempted_questions
      FROM (
        SELECT 
          ps.id as session_id,
          COUNT(DISTINCT us.question_id) as questions_in_session,
          (SUM(CASE WHEN us.is_correct = 1 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0)) as pass_percentage
        FROM practice_sessions ps
        LEFT JOIN user_submissions us ON ps.id = us.session_id
        WHERE ps.user_id = ? AND ps.session_type = 'mcq' AND ps.status = 'completed'
        GROUP BY ps.id
      ) as session_stats
    `, [userId]);
        const mcqRows = getRows(mcqResult);
        const mcqAttempted = parseInt(mcqRows[0]?.attempted_questions || '0');
        const mcqPassed = parseInt(mcqRows[0]?.passed_questions || '0');

        const totalAttempted = codingAttempted + mcqAttempted;
        const totalPassed = codingPassed + mcqPassed;
        const accuracy = totalAttempted > 0 ? Math.round((totalPassed / totalAttempted) * 100) : 0;

        // Get courses enrolled (distinct courses from practice_sessions)
        const coursesResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT course_id) as enrolled,
        COUNT(DISTINCT CASE WHEN status = 'completed' THEN course_id END) as completed
      FROM practice_sessions
      WHERE user_id = ?
    `, [userId]);
        const coursesRows = getRows(coursesResult);
        const coursesEnrolled = parseInt(coursesRows[0]?.enrolled || '0');
        const coursesCompleted = parseInt(coursesRows[0]?.completed || '0');

        // Calculate streak from user_daily_activity
        const streakData = await calculateStreak(userId);

        // Get leaderboard rank
        const rankData = await getLeaderboardRank(userId);

        return {
            totalQuestionsSolved: totalPassed,
            totalQuestionsAttempted: totalAttempted,
            accuracyPercentage: accuracy,
            currentStreak: streakData.currentStreak,
            longestStreak: streakData.longestStreak,
            coursesEnrolled,
            coursesCompleted,
            leaderboardRank: rankData.rank,
            totalUsers: rankData.totalUsers
        };
    } catch (error) {
        console.error('[getUserStats] Error:', error);
        return {
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
    }
};

// ============================================
// COURSE-WISE STATS
// ============================================

const getCourseIcon = (courseName: string): string => {
    const name = courseName.toLowerCase();
    if (name.includes('html') || name.includes('css')) return 'code';
    if (name.includes('machine learning') || name.includes('ml')) return 'brain';
    if (name.includes('python')) return 'snake';
    if (name.includes('c programming') || name.includes('c ')) return 'terminal';
    if (name.includes('data science')) return 'database';
    if (name.includes('javascript') || name.includes('js')) return 'braces';
    return 'book';
};

export const getCourseWiseStats = async (userId: string): Promise<CourseStats[]> => {
    try {
        // Get all courses and calculate passed questions for each
        // Coding: all test cases passed
        // MCQ: session with >=60% score
        const result = await pool.query(`
      SELECT 
        c.id as course_id,
        c.title as course_name,
        -- Coding: Count questions where all test cases passed
        COUNT(DISTINCT CASE 
          WHEN ps.session_type = 'coding' 
            AND us.test_cases_passed = us.total_test_cases 
            AND us.total_test_cases > 0 
          THEN us.question_id 
        END) as coding_passed,
        -- MCQ: We need to count by session pass rate
        COUNT(DISTINCT CASE WHEN ps.session_type = 'coding' THEN us.question_id END) as coding_attempted,
        COUNT(DISTINCT CASE WHEN ps.session_type = 'mcq' THEN us.question_id END) as mcq_attempted
      FROM courses c
      LEFT JOIN practice_sessions ps ON c.id = ps.course_id AND ps.user_id = ?
      LEFT JOIN user_submissions us ON ps.id = us.session_id
      GROUP BY c.id, c.title
      ORDER BY c.title
    `, [userId]);

        const rows = getRows(result);

        // For MCQ, count only the correctly answered questions (is_correct = 1)
        const mcqPassedResult = await pool.query(`
      SELECT 
        ps.course_id,
        COUNT(DISTINCT CASE WHEN us.is_correct = 1 THEN us.question_id END) as mcq_passed
      FROM practice_sessions ps
      LEFT JOIN user_submissions us ON ps.id = us.session_id
      WHERE ps.user_id = ? AND ps.session_type = 'mcq'
      GROUP BY ps.course_id
    `, [userId]);

        const mcqPassedRows = getRows(mcqPassedResult);
        const mcqPassedMap: Record<string, number> = {};
        mcqPassedRows.forEach((row: any) => {
            mcqPassedMap[row.course_id] = parseInt(row.mcq_passed || '0');
        });

        return rows.map((row: any) => {
            const codingPassed = parseInt(row.coding_passed || '0');
            const mcqPassed = mcqPassedMap[row.course_id] || 0;
            const codingAttempted = parseInt(row.coding_attempted || '0');
            const mcqAttempted = parseInt(row.mcq_attempted || '0');

            return {
                courseId: row.course_id,
                courseName: row.course_name,
                questionsPassed: codingPassed + mcqPassed,
                questionsAttempted: codingAttempted + mcqAttempted,
                mcqPassed: mcqPassed,
                mcqAttempted: mcqAttempted,
                codingPassed: codingPassed,
                codingAttempted: codingAttempted,
                icon: getCourseIcon(row.course_name)
            };
        }).filter((course: CourseStats) => course.questionsAttempted > 0 || course.questionsPassed > 0);
    } catch (error) {
        console.error('[getCourseWiseStats] Error:', error);
        return [];
    }
};

// ============================================
// STREAK CALCULATION
// ============================================

const calculateStreak = async (userId: string): Promise<{ currentStreak: number; longestStreak: number }> => {
    try {
        // Get all activity dates sorted descending
        const activityResult = await pool.query(`
      SELECT DISTINCT DATE(submitted_at) as activity_date
      FROM user_submissions
      WHERE user_id = ?
      ORDER BY activity_date DESC
    `, [userId]);

        const dates = getRows(activityResult).map((row: any) => new Date(row.activity_date));

        if (dates.length === 0) {
            return { currentStreak: 0, longestStreak: 0 };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;
        let checkDate = new Date(today);

        // Check if practiced today or yesterday to start current streak
        const firstDate = dates[0];
        firstDate.setHours(0, 0, 0, 0);

        if (firstDate.getTime() === today.getTime() || firstDate.getTime() === yesterday.getTime()) {
            // Calculate current streak
            for (let i = 0; i < dates.length; i++) {
                const activityDate = dates[i];
                activityDate.setHours(0, 0, 0, 0);

                if (i === 0) {
                    currentStreak = 1;
                    checkDate = new Date(activityDate);
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    if (activityDate.getTime() === checkDate.getTime()) {
                        currentStreak++;
                        checkDate.setDate(checkDate.getDate() - 1);
                    } else {
                        break;
                    }
                }
            }
        }

        // Calculate longest streak
        for (let i = 0; i < dates.length; i++) {
            const activityDate = dates[i];
            activityDate.setHours(0, 0, 0, 0);

            if (i === 0) {
                tempStreak = 1;
                checkDate = new Date(activityDate);
            } else {
                const expectedDate = new Date(checkDate);
                expectedDate.setDate(expectedDate.getDate() - 1);

                if (activityDate.getTime() === expectedDate.getTime()) {
                    tempStreak++;
                } else {
                    longestStreak = Math.max(longestStreak, tempStreak);
                    tempStreak = 1;
                }
                checkDate = new Date(activityDate);
            }
        }
        longestStreak = Math.max(longestStreak, tempStreak);

        // Also check user_statistics table if exists
        try {
            const statsResult = await pool.query(
                'SELECT current_streak, longest_streak FROM user_statistics WHERE user_id = ?',
                [userId]
            );
            const statsRows = getRows(statsResult);
            if (statsRows.length > 0) {
                longestStreak = Math.max(longestStreak, parseInt(statsRows[0].longest_streak || '0'));
            }
        } catch (e) {
            // Table might not exist, ignore
        }

        return { currentStreak, longestStreak };
    } catch (error) {
        console.error('[calculateStreak] Error:', error);
        return { currentStreak: 0, longestStreak: 0 };
    }
};

// ============================================
// LEADERBOARD RANK
// ============================================

export const getLeaderboardRank = async (userId: string): Promise<{ rank: number; totalUsers: number }> => {
    try {
        // Calculate rank based on levels cleared from completed practice sessions (matching leaderboard page logic)
        const rankResult = await pool.query(`
      SELECT 
        u.id as user_id,
        COUNT(DISTINCT CASE WHEN ps.status = 'completed' AND ps.session_type IN ('coding', 'html-css-challenge') THEN ps.level_id END) as levels_cleared,
        COUNT(DISTINCT CASE WHEN us.is_correct = 1 THEN us.question_id END) as problems_solved
      FROM users u
      LEFT JOIN practice_sessions ps ON u.id = ps.user_id
      LEFT JOIN user_submissions us ON u.id = us.user_id
      WHERE u.role = 'student'
      GROUP BY u.id
      HAVING COUNT(DISTINCT CASE WHEN ps.status = 'completed' AND ps.session_type IN ('coding', 'html-css-challenge') THEN ps.level_id END) > 0 
         OR COUNT(DISTINCT CASE WHEN us.is_correct = 1 THEN us.question_id END) > 0
      ORDER BY levels_cleared DESC, problems_solved DESC
    `);

        const rankings = getRows(rankResult);
        const totalUsers = rankings.length;

        let rank = 0;
        for (let i = 0; i < rankings.length; i++) {
            if (rankings[i].user_id === userId) {
                rank = i + 1;
                break;
            }
        }

        // If user not found in rankings, they're unranked
        if (rank === 0 && totalUsers > 0) {
            rank = totalUsers + 1;
        }

        return { rank, totalUsers };
    } catch (error) {
        console.error('[getLeaderboardRank] Error:', error);
        return { rank: 0, totalUsers: 0 };
    }
};

// ============================================
// USER SKILLS
// ============================================

export interface UserSkill {
    id: string;
    skillName: string;
    courseId: string | null;
    progressPercentage: number;
    questionsAttempted: number;
    questionsCorrect: number;
    lastPracticedAt: string | null;
}

export const getUserSkills = async (userId: string): Promise<UserSkill[]> => {
    try {
        // Calculate skills from course-based submissions
        const skillsResult = await pool.query(`
      SELECT 
        c.id as course_id,
        c.title as skill_name,
        COUNT(DISTINCT us.question_id) as questions_attempted,
        SUM(CASE WHEN us.is_correct = 1 THEN 1 ELSE 0 END) as questions_correct,
        MAX(us.submitted_at) as last_practiced_at,
        (SELECT COUNT(*) FROM questions q 
         JOIN levels l ON q.level_id = l.id 
         WHERE l.course_id = c.id) as total_questions
      FROM courses c
      LEFT JOIN practice_sessions ps ON c.id = ps.course_id AND ps.user_id = ?
      LEFT JOIN user_submissions us ON ps.id = us.session_id AND us.user_id = ?
      GROUP BY c.id, c.title
      HAVING questions_attempted > 0
      ORDER BY questions_correct DESC
    `, [userId, userId]);

        const skills = getRows(skillsResult).map((row: any) => {
            const attempted = parseInt(row.questions_attempted || '0');
            const correct = parseInt(row.questions_correct || '0');
            const total = parseInt(row.total_questions || '1');
            const progress = total > 0 ? Math.round((correct / total) * 100) : 0;

            return {
                id: row.course_id,
                skillName: row.skill_name,
                courseId: row.course_id,
                progressPercentage: Math.min(100, progress),
                questionsAttempted: attempted,
                questionsCorrect: correct,
                lastPracticedAt: row.last_practiced_at ? new Date(row.last_practiced_at).toISOString() : null
            };
        });

        return skills;
    } catch (error) {
        console.error('[getUserSkills] Error:', error);
        return [];
    }
};

// ============================================
// USER ACHIEVEMENTS
// ============================================

export interface Achievement {
    id: string;
    type: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: string | null;
    isEarned: boolean;
}

// Define available achievements
const ACHIEVEMENTS = [
    { type: 'questions_10', name: 'Getting Started', description: 'Solve 10 questions', icon: '🎯', threshold: 10 },
    { type: 'questions_50', name: 'Problem Solver', description: 'Solve 50 questions', icon: '💪', threshold: 50 },
    { type: 'questions_100', name: 'Century Club', description: 'Solve 100 questions', icon: '🏆', threshold: 100 },
    { type: 'questions_500', name: 'Code Master', description: 'Solve 500 questions', icon: '👑', threshold: 500 },
    { type: 'streak_3', name: 'Consistent Learner', description: 'Maintain a 3-day streak', icon: '🔥', threshold: 3 },
    { type: 'streak_7', name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: '⚡', threshold: 7 },
    { type: 'streak_30', name: 'Monthly Master', description: 'Maintain a 30-day streak', icon: '🌟', threshold: 30 },
    { type: 'accuracy_80', name: 'Sharp Shooter', description: 'Achieve 80% accuracy', icon: '🎯', threshold: 80 },
    { type: 'accuracy_95', name: 'Perfectionist', description: 'Achieve 95% accuracy', icon: '💎', threshold: 95 },
    { type: 'top_10', name: 'Top 10', description: 'Reach top 10 on leaderboard', icon: '🥇', threshold: 10 },
    { type: 'course_complete', name: 'Course Champion', description: 'Complete a full course', icon: '📚', threshold: 1 },
    { type: 'first_session', name: 'First Steps', description: 'Complete your first session', icon: '🚀', threshold: 1 },
];

export const getUserAchievements = async (userId: string): Promise<Achievement[]> => {
    try {
        // Get earned achievements from database
        const earnedResult = await pool.query(
            'SELECT * FROM user_achievements WHERE user_id = ?',
            [userId]
        );
        const earnedRows = getRows(earnedResult);
        const earnedMap = new Map<string, any>(earnedRows.map((r: any) => [r.achievement_type, r]));

        // Return all achievements with earned status
        return ACHIEVEMENTS.map(achievement => {
            const earned = earnedMap.get(achievement.type) as { id: string; earned_at: string } | undefined;
            return {
                id: earned?.id || achievement.type,
                type: achievement.type,
                name: achievement.name,
                description: achievement.description,
                icon: achievement.icon,
                earnedAt: earned?.earned_at ? new Date(earned.earned_at).toISOString() : null,
                isEarned: !!earned
            };
        });
    } catch (error) {
        console.error('[getUserAchievements] Error:', error);
        // Return achievements with none earned
        return ACHIEVEMENTS.map(a => ({
            id: a.type,
            type: a.type,
            name: a.name,
            description: a.description,
            icon: a.icon,
            earnedAt: null,
            isEarned: false
        }));
    }
};

export const checkAndAwardAchievements = async (userId: string): Promise<string[]> => {
    try {
        const newAchievements: string[] = [];
        const stats = await getUserStats(userId);
        const streak = await calculateStreak(userId);

        // Check each achievement
        const checks = [
            { type: 'questions_10', earned: stats.totalQuestionsSolved >= 10 },
            { type: 'questions_50', earned: stats.totalQuestionsSolved >= 50 },
            { type: 'questions_100', earned: stats.totalQuestionsSolved >= 100 },
            { type: 'questions_500', earned: stats.totalQuestionsSolved >= 500 },
            { type: 'streak_3', earned: streak.longestStreak >= 3 },
            { type: 'streak_7', earned: streak.longestStreak >= 7 },
            { type: 'streak_30', earned: streak.longestStreak >= 30 },
            { type: 'accuracy_80', earned: stats.accuracyPercentage >= 80 && stats.totalQuestionsAttempted >= 10 },
            { type: 'accuracy_95', earned: stats.accuracyPercentage >= 95 && stats.totalQuestionsAttempted >= 20 },
            { type: 'top_10', earned: stats.leaderboardRank > 0 && stats.leaderboardRank <= 10 },
            { type: 'course_complete', earned: stats.coursesCompleted >= 1 },
            { type: 'first_session', earned: stats.coursesEnrolled >= 1 },
        ];

        for (const check of checks) {
            if (check.earned) {
                const achievement = ACHIEVEMENTS.find(a => a.type === check.type);
                if (achievement) {
                    try {
                        await pool.query(`
              INSERT INTO user_achievements (id, user_id, achievement_type, achievement_name, description, icon)
              VALUES (?, ?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE id=id
            `, [randomUUID(), userId, achievement.type, achievement.name, achievement.description, achievement.icon]);
                        newAchievements.push(achievement.name);
                    } catch (e) {
                        // Already exists, ignore
                    }
                }
            }
        }

        return newAchievements;
    } catch (error) {
        console.error('[checkAndAwardAchievements] Error:', error);
        return [];
    }
};

// ============================================
// SECURITY INFO
// ============================================

export interface SecurityInfo {
    lastLoginAt: string | null;
    lastLoginIp: string | null;
    lastLoginDevice: string | null;
    twoFactorEnabled: boolean;
    activeSessions: {
        id: string;
        deviceInfo: string;
        ipAddress: string;
        lastActiveAt: string;
        isCurrent: boolean;
    }[];
}

export const getSecurityInfo = async (userId: string, currentSessionToken?: string): Promise<SecurityInfo> => {
    try {
        // Get profile info
        const profileResult = await pool.query(
            'SELECT * FROM user_profiles WHERE user_id = ?',
            [userId]
        );
        const profileRows = getRows(profileResult);
        const profile = profileRows[0] || {};

        // Get active sessions
        const sessionsResult = await pool.query(
            'SELECT * FROM user_sessions WHERE user_id = ? AND is_active = TRUE ORDER BY last_active_at DESC',
            [userId]
        );
        const sessionsRows = getRows(sessionsResult);

        const sessions = sessionsRows.map((s: any) => ({
            id: s.id,
            deviceInfo: s.device_info || 'Unknown Device',
            ipAddress: s.ip_address || 'Unknown',
            lastActiveAt: s.last_active_at ? new Date(s.last_active_at).toISOString() : '',
            isCurrent: s.session_token === currentSessionToken
        }));

        return {
            lastLoginAt: profile.last_login_at ? new Date(profile.last_login_at).toISOString() : null,
            lastLoginIp: profile.last_login_ip || null,
            lastLoginDevice: profile.last_login_device || null,
            twoFactorEnabled: profile.two_factor_enabled || false,
            activeSessions: sessions
        };
    } catch (error) {
        console.error('[getSecurityInfo] Error:', error);
        return {
            lastLoginAt: null,
            lastLoginIp: null,
            lastLoginDevice: null,
            twoFactorEnabled: false,
            activeSessions: []
        };
    }
};

// ============================================
// PROFILE MANAGEMENT
// ============================================

export interface UserProfile {
    photoUrl: string | null;
    bio: string | null;
    goal: string | null;
}

export const getUserProfile = async (userId: string): Promise<UserProfile> => {
    try {
        const result = await pool.query(
            'SELECT photo_url, bio, goal FROM user_profiles WHERE user_id = ?',
            [userId]
        );
        const rows = getRows(result);
        const profile = rows[0] || {};

        return {
            photoUrl: profile.photo_url || null,
            bio: profile.bio || null,
            goal: profile.goal || null
        };
    } catch (error) {
        console.error('[getUserProfile] Error:', error);
        return { photoUrl: null, bio: null, goal: null };
    }
};

export const updateUserProfile = async (
    userId: string,
    data: { photoUrl?: string; bio?: string; goal?: string }
): Promise<void> => {
    try {
        // Upsert profile
        await pool.query(`
      INSERT INTO user_profiles (id, user_id, photo_url, bio, goal)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        photo_url = COALESCE(VALUES(photo_url), photo_url),
        bio = COALESCE(VALUES(bio), bio),
        goal = COALESCE(VALUES(goal), goal),
        updated_at = CURRENT_TIMESTAMP
    `, [randomUUID(), userId, data.photoUrl || null, data.bio || null, data.goal || null]);
    } catch (error) {
        console.error('[updateUserProfile] Error:', error);
        throw error;
    }
};

// ============================================
// SESSION MANAGEMENT
// ============================================

export const recordLogin = async (
    userId: string,
    sessionToken: string,
    ipAddress?: string,
    userAgent?: string
): Promise<void> => {
    try {
        // Create session record
        await pool.query(`
      INSERT INTO user_sessions (id, user_id, session_token, ip_address, user_agent, device_info)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [randomUUID(), userId, sessionToken, ipAddress || null, userAgent || null, parseDeviceInfo(userAgent)]);

        // Update profile with last login info
        await pool.query(`
      INSERT INTO user_profiles (id, user_id, last_login_at, last_login_ip, last_login_device)
      VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)
      ON DUPLICATE KEY UPDATE
        last_login_at = CURRENT_TIMESTAMP,
        last_login_ip = VALUES(last_login_ip),
        last_login_device = VALUES(last_login_device)
    `, [randomUUID(), userId, ipAddress || null, parseDeviceInfo(userAgent)]);
    } catch (error) {
        console.error('[recordLogin] Error:', error);
    }
};

export const logoutAllSessions = async (userId: string, exceptToken?: string): Promise<void> => {
    try {
        if (exceptToken) {
            await pool.query(
                'UPDATE user_sessions SET is_active = FALSE WHERE user_id = ? AND session_token != ?',
                [userId, exceptToken]
            );
        } else {
            await pool.query(
                'UPDATE user_sessions SET is_active = FALSE WHERE user_id = ?',
                [userId]
            );
        }
    } catch (error) {
        console.error('[logoutAllSessions] Error:', error);
        throw error;
    }
};

export const logoutSession = async (userId: string, sessionId: string): Promise<void> => {
    try {
        await pool.query(
            'UPDATE user_sessions SET is_active = FALSE WHERE id = ? AND user_id = ?',
            [sessionId, userId]
        );
    } catch (error) {
        console.error('[logoutSession] Error:', error);
        throw error;
    }
};

// Helper to parse device info from user agent
const parseDeviceInfo = (userAgent?: string): string => {
    if (!userAgent) return 'Unknown Device';

    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Macintosh')) return 'Mac';
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('Linux')) return 'Linux';

    return 'Unknown Device';
};

// ============================================
// 2FA MANAGEMENT (Placeholder - would need full implementation)
// ============================================

export const enable2FA = async (userId: string): Promise<{ secret: string; qrCode: string }> => {
    // This would generate a TOTP secret and QR code
    // For now, return placeholder
    const secret = 'PLACEHOLDER_SECRET_' + randomUUID().substring(0, 8);

    await pool.query(`
    INSERT INTO user_profiles (id, user_id, two_factor_enabled, two_factor_secret)
    VALUES (?, ?, FALSE, ?)
    ON DUPLICATE KEY UPDATE two_factor_secret = VALUES(two_factor_secret)
  `, [randomUUID(), userId, secret]);

    return {
        secret,
        qrCode: `otpauth://totp/PracticeHub:user?secret=${secret}`
    };
};

export const confirm2FA = async (userId: string, code: string): Promise<boolean> => {
    // This would verify the TOTP code
    // For now, just enable 2FA
    await pool.query(`
    UPDATE user_profiles SET two_factor_enabled = TRUE WHERE user_id = ?
  `, [userId]);

    return true;
};

export const disable2FA = async (userId: string): Promise<void> => {
    await pool.query(`
    UPDATE user_profiles SET two_factor_enabled = FALSE, two_factor_secret = NULL WHERE user_id = ?
  `, [userId]);
};
