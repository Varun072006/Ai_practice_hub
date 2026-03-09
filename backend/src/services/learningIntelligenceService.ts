import pool from '../config/database';
import { getRows, getFirstRow } from '../utils/mysqlHelper';
import { v4 as uuidv4 } from 'uuid';
import {
    LearningMetrics,
    SkillRecommendation,
    PersonalizedRecommendations,
    MasteryForecast,
    UserForecast,
    LearningInsight,
    UserInsights,
    FacultyAlert,
    FacultyAlertsResponse,
    InterventionRecommendation,
} from '../types/intelligenceTypes';

// ============================================================================
// Metrics Computation
// ============================================================================

/**
 * Compute and update learning metrics for a user-skill pair
 */
export const computeUserSkillMetrics = async (
    userId: string,
    skillId: string
): Promise<LearningMetrics> => {
    // Get mastery data
    const masteryResult = await pool.query(
        `SELECT mastery_score, total_practice_count, successful_practice_count, last_practiced_at
     FROM user_skill_mastery WHERE user_id = ? AND skill_id = ?`,
        [userId, skillId]
    );
    const mastery = getFirstRow(masteryResult);

    // Get recent attempts
    const attemptsResult = await pool.query(
        `SELECT created_at, is_correct, time_taken
     FROM skill_practice_attempts
     WHERE user_id = ? AND skill_id = ? AND completed_at IS NOT NULL
     ORDER BY created_at DESC LIMIT 50`,
        [userId, skillId]
    );
    const attempts = getRows(attemptsResult);

    // Get mastery history for velocity
    const historyResult = await pool.query(
        `SELECT new_score, created_at FROM skill_mastery_history
     WHERE user_id = ? AND skill_id = ?
     ORDER BY created_at DESC LIMIT 30`,
        [userId, skillId]
    );
    const history = getRows(historyResult);

    // Calculate metrics
    const totalAttempts = mastery?.total_practice_count || 0;
    const successfulAttempts = mastery?.successful_practice_count || 0;
    const successRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0;

    // Recent success rate (last 10)
    const recent10 = attempts.slice(0, 10);
    const recentCorrect = recent10.filter((a: any) => a.is_correct).length;
    const recentSuccessRate = recent10.length > 0 ? (recentCorrect / recent10.length) * 100 : 0;

    // Average time per attempt
    const timeTaken = attempts.filter((a: any) => a.time_taken).map((a: any) => a.time_taken);
    const avgTime = timeTaken.length > 0 ? timeTaken.reduce((a: number, b: number) => a + b, 0) / timeTaken.length : 0;

    // Days active (last 30 days)
    const uniqueDays = new Set(
        attempts.map((a: any) => new Date(a.created_at).toDateString())
    ).size;

    // Attempt frequency (attempts per day, rolling 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentAttempts = attempts.filter((a: any) => new Date(a.created_at) > sevenDaysAgo);
    const attemptFrequency = recentAttempts.length / 7;

    // Improvement velocity
    let velocity = 0;
    if (history.length >= 2) {
        const newest = history[0];
        const oldest = history[history.length - 1];
        const daysDiff = (new Date(newest.created_at).getTime() - new Date(oldest.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff > 0) {
            velocity = (newest.new_score - oldest.new_score) / daysDiff;
        }
    }

    // Engagement score (0-100)
    const engagementScore = Math.min(100, Math.round(
        (attemptFrequency * 20) +
        (recentSuccessRate * 0.3) +
        (uniqueDays * 2)
    ));

    // Consistency score
    const consistencyScore = Math.min(100, uniqueDays * 10);

    // Simplified metrics - Removed AI predictions
    const currentMastery = mastery?.mastery_score || 0;

    // Risk assessment based on basic heuristics
    const riskFactors: string[] = [];
    if (recentSuccessRate < 40) riskFactors.push('struggling');
    if (!mastery?.last_practiced_at || Date.now() - new Date(mastery.last_practiced_at).getTime() > 14 * 24 * 60 * 60 * 1000) {
        riskFactors.push('inactive');
    }
    const isAtRisk = riskFactors.length >= 2;

    const metrics: LearningMetrics = {
        userId,
        skillId,
        avgTimePerAttempt: avgTime,
        totalTimeSpent: timeTaken.reduce((a: number, b: number) => a + b, 0),
        attemptFrequency,
        daysActive: uniqueDays,
        lastAttemptAt: mastery?.last_practiced_at || null,
        successRate,
        recentSuccessRate,
        currentStreak: 0,
        bestStreak: 0,
        improvementVelocity: velocity,
        acceleration: 0,
        engagementScore,
        consistencyScore,
        predictedMastery7d: currentMastery, // Static
        predictedMastery14d: currentMastery, // Static
        predictedMastery30d: currentMastery, // Static
        estimatedMasteryDate: null, // Removed
        isAtRisk,
        riskFactors,
        computedAt: new Date(),
    };

    // Upsert metrics
    await pool.query(
        `INSERT INTO learning_metrics (id, user_id, skill_id, avg_time_per_attempt, attempt_frequency,
       success_rate, recent_success_rate, improvement_velocity, engagement_score, consistency_score,
       predicted_mastery_7d, predicted_mastery_14d, predicted_mastery_30d, estimated_mastery_date,
       is_at_risk, risk_factors, computed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       avg_time_per_attempt = VALUES(avg_time_per_attempt),
       attempt_frequency = VALUES(attempt_frequency),
       success_rate = VALUES(success_rate),
       recent_success_rate = VALUES(recent_success_rate),
       improvement_velocity = VALUES(improvement_velocity),
       engagement_score = VALUES(engagement_score),
       consistency_score = VALUES(consistency_score),
       predicted_mastery_7d = VALUES(predicted_mastery_7d),
       predicted_mastery_14d = VALUES(predicted_mastery_14d),
       predicted_mastery_30d = VALUES(predicted_mastery_30d),
       estimated_mastery_date = VALUES(estimated_mastery_date),
       is_at_risk = VALUES(is_at_risk),
       risk_factors = VALUES(risk_factors),
       computed_at = NOW()`,
        [uuidv4(), userId, skillId, avgTime, attemptFrequency, successRate, recentSuccessRate,
            velocity, engagementScore, consistencyScore, currentMastery, currentMastery, currentMastery,
            null, isAtRisk, JSON.stringify(riskFactors)]
    );

    return metrics;
};

// ============================================================================
// Recommendations
// ============================================================================

/**
 * Get personalized recommendations for a user
 */
export const getPersonalizedRecommendations = async (
    userId: string
): Promise<PersonalizedRecommendations> => {
    // Get all user skills with mastery
    const result = await pool.query(
        `SELECT s.id, s.name, s.category, usm.mastery_score,
            usm.total_practice_count, usm.last_practiced_at
     FROM user_skill_mastery usm
     JOIN skills s ON usm.skill_id = s.id
     WHERE usm.user_id = ?
     ORDER BY usm.mastery_score ASC`,
        [userId]
    );
    const skills = getRows(result);

    // Focus skills: low mastery, recently active
    const focusSkills: SkillRecommendation[] = skills
        .filter((s: any) => s.mastery_score < 50)
        .slice(0, 3)
        .map((s: any) => ({
            skillId: s.id,
            skillName: s.name,
            reason: `Mastery at ${s.mastery_score}% - needs practice`,
            priority: s.mastery_score < 30 ? 'high' : 'medium',
            estimatedTimeMinutes: 15,
            currentMastery: s.mastery_score,
            targetMastery: 70,
            recommendationType: 'weakness' as const,
        }));

    // Review skills: good mastery but haven't practiced recently
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const reviewSkills: SkillRecommendation[] = skills
        .filter((s: any) => s.mastery_score >= 60 && s.mastery_score < 80 &&
            (!s.last_practiced_at || new Date(s.last_practiced_at) < oneWeekAgo))
        .slice(0, 2)
        .map((s: any) => ({
            skillId: s.id,
            skillName: s.name,
            reason: 'Review to maintain mastery',
            priority: 'low' as const,
            estimatedTimeMinutes: 10,
            currentMastery: s.mastery_score,
            targetMastery: 85,
            recommendationType: 'review' as const,
        }));

    // Challenge skills: ready for advancement
    const challengeSkills: SkillRecommendation[] = skills
        .filter((s: any) => s.mastery_score >= 80)
        .slice(0, 2)
        .map((s: any) => ({
            skillId: s.id,
            skillName: s.name,
            reason: 'Ready for advanced challenges',
            priority: 'low' as const,
            estimatedTimeMinutes: 20,
            currentMastery: s.mastery_score,
            targetMastery: 95,
            recommendationType: 'challenge' as const,
        }));

    // Daily goal
    const topFocus = focusSkills[0];
    const dailyGoal = topFocus ? {
        skillId: topFocus.skillId,
        skillName: topFocus.skillName,
        exercisesRemaining: 5,
        estimatedMinutes: 15,
    } : null;

    return {
        userId,
        generatedAt: new Date(),
        focusSkills,
        reviewSkills,
        challengeSkills,
        dailyGoal,
    };
};

// ============================================================================
// Forecasts
// ============================================================================

/**
 * Get mastery forecasts for a user
 */
export const getUserForecast = async (userId: string): Promise<UserForecast> => {
    const result = await pool.query(
        `SELECT s.id, s.name, usm.mastery_score,
            lm.improvement_velocity, lm.predicted_mastery_7d, lm.predicted_mastery_14d,
            lm.predicted_mastery_30d, lm.estimated_mastery_date
     FROM user_skill_mastery usm
     JOIN skills s ON usm.skill_id = s.id
     LEFT JOIN learning_metrics lm ON usm.user_id = lm.user_id AND usm.skill_id = lm.skill_id
     WHERE usm.user_id = ?`,
        [userId]
    );
    const skills = getRows(result);

    const skillForecasts: MasteryForecast[] = skills.map((s: any) => {
        const velocity = s.improvement_velocity || 0;
        const current = s.mastery_score;

        return {
            skillId: s.id,
            skillName: s.name,
            currentMastery: current,
            predicted7d: s.predicted_mastery_7d || Math.min(100, current + velocity * 7),
            predicted14d: s.predicted_mastery_14d || Math.min(100, current + velocity * 14),
            predicted30d: s.predicted_mastery_30d || Math.min(100, current + velocity * 30),
            estimatedMasteryDate: s.estimated_mastery_date,
            velocity,
            confidence: velocity > 0.5 ? 'high' : velocity > 0 ? 'medium' : 'low',
            trend: velocity > 0.5 ? 'improving' : velocity < -0.5 ? 'declining' : 'stable',
        };
    });

    const avgVelocity = skillForecasts.length > 0
        ? skillForecasts.reduce((sum, s) => sum + s.velocity, 0) / skillForecasts.length
        : 0;

    return {
        userId,
        generatedAt: new Date(),
        overallTrend: avgVelocity > 0.5 ? 'improving' : avgVelocity < -0.5 ? 'declining' : 'stable',
        averageVelocity: avgVelocity,
        skillForecasts,
        projectedCompletionDate: null,
    };
};

// ============================================================================
// Insights
// ============================================================================

/**
 * Get learning insights for a user
 */
export const getUserInsights = async (userId: string): Promise<UserInsights> => {
    const result = await pool.query(
        `SELECT s.name, usm.mastery_score, lm.engagement_score, lm.consistency_score,
            lm.attempt_frequency, lm.improvement_velocity, lm.success_rate
     FROM user_skill_mastery usm
     JOIN skills s ON usm.skill_id = s.id
     LEFT JOIN learning_metrics lm ON usm.user_id = lm.user_id AND usm.skill_id = lm.skill_id
     WHERE usm.user_id = ?`,
        [userId]
    );
    const skills = getRows(result);

    const insights: LearningInsight[] = [];
    const strengths: string[] = [];
    const areasForImprovement: string[] = [];

    // Analyze patterns
    const highMastery = skills.filter((s: any) => s.mastery_score >= 80);
    const lowMastery = skills.filter((s: any) => s.mastery_score < 40);
    const improving = skills.filter((s: any) => s.improvement_velocity > 0.5);

    if (highMastery.length > 0) {
        strengths.push(...highMastery.map((s: any) => s.name));
        insights.push({
            type: 'strength',
            title: 'Strong Skills',
            description: `You've mastered ${highMastery.length} skill(s): ${highMastery.map((s: any) => s.name).join(', ')}`,
            actionable: false,
        });
    }

    if (lowMastery.length > 0) {
        areasForImprovement.push(...lowMastery.map((s: any) => s.name));
        insights.push({
            type: 'weakness',
            title: 'Focus Areas',
            description: `${lowMastery.length} skill(s) need more practice`,
            actionable: true,
            suggestedAction: 'Spend 15 minutes daily on these skills',
        });
    }

    if (improving.length > 0) {
        insights.push({
            type: 'pattern',
            title: 'Great Progress!',
            description: `You're improving rapidly in ${improving.length} skill(s)`,
            actionable: false,
        });
    }

    // Calculate averages
    const avgEngagement = skills.length > 0
        ? skills.reduce((sum: number, s: any) => sum + (s.engagement_score || 0), 0) / skills.length
        : 0;
    const avgConsistency = skills.length > 0
        ? skills.reduce((sum: number, s: any) => sum + (s.consistency_score || 0), 0) / skills.length
        : 0;

    // Learning style based on attempt frequency
    const avgFrequency = skills.length > 0
        ? skills.reduce((sum: number, s: any) => sum + (s.attempt_frequency || 0), 0) / skills.length
        : 0;
    const learningStyle = avgFrequency > 2 ? 'fast' : avgFrequency > 0.5 ? 'steady' : 'methodical';

    return {
        userId,
        generatedAt: new Date(),
        engagementScore: Math.round(avgEngagement),
        consistencyScore: Math.round(avgConsistency),
        learningStyle,
        insights,
        strengths,
        areasForImprovement,
    };
};

// ============================================================================
// Faculty Features
// ============================================================================

/**
 * Get faculty alerts
 */
export const getFacultyAlerts = async (): Promise<FacultyAlertsResponse> => {
    // Get at-risk students
    const atRiskResult = await pool.query(
        `SELECT DISTINCT u.id, u.name, u.username, u.email,
            COUNT(*) as risk_skill_count
     FROM users u
     JOIN learning_metrics lm ON u.id = lm.user_id
     WHERE lm.is_at_risk = TRUE AND u.role = 'student'
     GROUP BY u.id, u.name, u.username, u.email
     ORDER BY risk_skill_count DESC`,
        []
    );
    const atRiskStudents = getRows(atRiskResult);

    const alerts: FacultyAlert[] = atRiskStudents.map((s: any) => ({
        id: uuidv4(),
        userId: s.id,
        userName: s.name || s.username,
        skillId: null,
        skillName: null,
        courseId: null,
        alertType: 'at_risk' as const,
        severity: s.risk_skill_count >= 3 ? 'critical' : s.risk_skill_count >= 2 ? 'high' : 'medium',
        title: `${s.name || s.username} is at risk`,
        description: `Student is struggling in ${s.risk_skill_count} skill(s)`,
        recommendedAction: 'Schedule a 1-on-1 session to discuss learning challenges',
        status: 'new' as const,
        createdAt: new Date(),
    }));

    return {
        totalAlerts: alerts.length,
        newAlerts: alerts.filter(a => a.status === 'new').length,
        alerts,
        summary: {
            atRisk: alerts.filter(a => a.alertType === 'at_risk').length,
            declining: 0,
            inactive: 0,
            struggling: 0,
        },
    };
};

/**
 * Get intervention recommendations
 */
export const getInterventionRecommendations = async (): Promise<InterventionRecommendation[]> => {
    const result = await pool.query(
        `SELECT u.id, u.name, u.username, s.name as skill_name,
            lm.risk_factors, lm.engagement_score, lm.success_rate
     FROM learning_metrics lm
     JOIN users u ON lm.user_id = u.id
     JOIN skills s ON lm.skill_id = s.id
     WHERE lm.is_at_risk = TRUE AND u.role = 'student'
     ORDER BY lm.engagement_score ASC
     LIMIT 20`,
        []
    );

    return getRows(result).map((r: any) => {
        const riskFactors = typeof r.risk_factors === 'string' ? JSON.parse(r.risk_factors) : (r.risk_factors || []);

        let issue = 'General struggle';
        let intervention = 'Monitor progress';

        if (riskFactors.includes('inactive')) {
            issue = 'Inactive for over a week';
            intervention = 'Send encouragement email and check in personally';
        } else if (riskFactors.includes('declining_mastery')) {
            issue = 'Mastery is declining';
            intervention = 'Offer easier remedial exercises';
        } else if (riskFactors.includes('struggling')) {
            issue = 'Low success rate on recent attempts';
            intervention = 'Provide additional hints and simpler examples';
        }

        return {
            studentId: r.id,
            studentName: r.name || r.username,
            priority: (r.engagement_score < 20 ? 'critical' : r.engagement_score < 40 ? 'high' : 'medium') as any,
            issue,
            suggestedIntervention: intervention,
            estimatedImpact: 'medium' as const,
            affectedSkills: [r.skill_name],
        };
    });
};
