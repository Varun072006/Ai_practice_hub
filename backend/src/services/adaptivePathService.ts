import pool from '../config/database';
import { getRows, getFirstRow } from '../utils/mysqlHelper';
import * as skillMasteryService from './skillMasteryService';
import * as skillService from './skillService';
import {
    PathType,
    PathSubType,
    AdaptivePathDecision,
    LevelRecommendation,
    UserLearningPath,
    CourseLearningPath,
    NextSteps,
    DEFAULT_PATH_THRESHOLDS,
} from '../types/adaptivePathTypes';

// ============================================================================
// Path Determination
// ============================================================================

/**
 * Determine path type - Refactored: Always returns standard
 */
const getPathType = (mastery: number): { pathType: PathType; pathSubType: PathSubType } => {
    return { pathType: 'standard', pathSubType: 'normal' };
};

/**
 * Get explainable reason for path decision
 */
const getExplanation = (mastery: number, skillName: string): string => {
    if (mastery < 40) {
        return `You need more practice on ${skillName}. Let's strengthen the basics with additional exercises.`;
    } else if (mastery < 60) {
        return `You're making progress on ${skillName}, but need a few more exercises before moving on.`;
    } else if (mastery < 80) {
        return `Good progress on ${skillName}! Continue with the standard coursework.`;
    } else if (mastery < 90) {
        return `Great job on ${skillName}! You can skip some review content and move faster.`;
    } else {
        return `Excellent mastery of ${skillName}! Fast-tracking to advanced assessments.`;
    }
};

/**
 * Get overall explanation for a path type
 */
const getOverallExplanation = (pathType: PathType, avgMastery: number): string => {
    switch (pathType) {
        case 'remedial':
            return `Your overall mastery is ${avgMastery.toFixed(0)}%. Focus on strengthening fundamentals before advancing.`;
        case 'standard':
            return `Your overall mastery is ${avgMastery.toFixed(0)}%. You're on track with standard progression.`;
        case 'accelerated':
            return `Excellent! Your mastery of ${avgMastery.toFixed(0)}% allows you to skip ahead to advanced content.`;
    }
};

// ============================================================================
// Adaptive Path Calculation
// ============================================================================

/**
 * Get adaptive path decision for a single skill
 */
export const getSkillPath = async (
    userId: string,
    skillId: string
): Promise<AdaptivePathDecision> => {
    // Get skill info
    const skillResult = await pool.query(`SELECT id, name FROM skills WHERE id = ?`, [skillId]);
    const skill = getFirstRow(skillResult);

    if (!skill) {
        throw new Error(`Skill not found: ${skillId}`);
    }

    // Get mastery
    const mastery = await skillMasteryService.getUserSkillMastery(userId, skillId);
    const currentMastery = mastery?.masteryScore || 0;

    // Determine path
    const { pathType, pathSubType } = getPathType(currentMastery);
    const reason = getExplanation(currentMastery, skill.name);

    // Get recommended levels for this skill
    const recommendations = await getRecommendationsForSkill(userId, skillId, pathType);

    return {
        skillId: skill.id,
        skillName: skill.name,
        currentMastery,
        pathType,
        pathSubType,
        reason,
        recommendations,
    };
};

/**
 * Get level recommendations for a skill based on path type
 */
const getRecommendationsForSkill = async (
    userId: string,
    skillId: string,
    pathType: PathType
): Promise<LevelRecommendation[]> => {
    // Get levels that teach this skill
    const result = await pool.query(
        `SELECT l.id, l.title, l.level_number, c.id as course_id, c.title as course_title,
            ls.contribution_type, ls.weight
     FROM levels l
     INNER JOIN courses c ON l.course_id = c.id
     INNER JOIN level_skills ls ON l.id = ls.level_id
     LEFT JOIN user_progress up ON l.id = up.level_id AND up.user_id = ?
     WHERE ls.skill_id = ?
     ORDER BY l.level_number`,
        [userId, skillId]
    );
    const levels = getRows(result);

    return levels.map((level: any, index: number) => {
        let action: LevelRecommendation['action'];

        if (pathType === 'accelerated') {
            // Skip intro levels, go to assessments
            action = level.contribution_type === 'assesses' ? 'required' : 'skip';
        } else if (pathType === 'remedial') {
            // All levels are required
            action = 'required';
        } else {
            // Standard: follow normal order
            action = index < 3 ? 'required' : 'optional';
        }

        return {
            levelId: level.id,
            levelTitle: level.title,
            levelNumber: level.level_number,
            courseId: level.course_id,
            courseTitle: level.course_title,
            action,
            priority: index + 1,
            estimatedTime: 15,
            skillsAddressed: [],
        };
    });
};

// ============================================================================
// Full Learning Path
// ============================================================================

/**
 * Get full adaptive learning path for a user
 */
export const getUserLearningPath = async (userId: string): Promise<UserLearningPath> => {
    // Get all skills with mastery
    const masteries = await skillMasteryService.getUserAllMasteries(userId);

    if (masteries.length === 0) {
        return {
            userId,
            overallPathType: 'remedial',
            overallMastery: 0,
            skillPaths: [],
            nextRecommendedLessons: [],
            explanation: 'No skills tracked yet. Start with foundation lessons!',
            generatedAt: new Date(),
        };
    }

    // Calculate path for each skill
    const skillPaths: AdaptivePathDecision[] = [];
    for (const skill of masteries) {
        const { pathType, pathSubType } = getPathType(skill.masteryScore);
        skillPaths.push({
            skillId: skill.id,
            skillName: skill.name,
            currentMastery: skill.masteryScore,
            pathType,
            pathSubType,
            reason: getExplanation(skill.masteryScore, skill.name),
            recommendations: [],
        });
    }

    // Calculate overall path (majority vote)
    const pathCounts = { remedial: 0, standard: 0, accelerated: 0 };
    for (const sp of skillPaths) {
        pathCounts[sp.pathType]++;
    }
    const overallPathType = Object.entries(pathCounts)
        .sort((a, b) => b[1] - a[1])[0][0] as PathType;

    const overallMastery = masteries.reduce((sum, s) => sum + s.masteryScore, 0) / masteries.length;

    // Get next recommended lessons
    const nextRecommendedLessons = await getNextRecommendedLessons(userId, overallPathType);

    return {
        userId,
        overallPathType,
        overallMastery: Math.round(overallMastery * 100) / 100,
        skillPaths,
        nextRecommendedLessons,
        explanation: getOverallExplanation(overallPathType, overallMastery),
        generatedAt: new Date(),
    };
};

/**
 * Get learning path for a specific course
 */
export const getCourseLearningPath = async (
    userId: string,
    courseId: string
): Promise<CourseLearningPath> => {
    // Get course info
    const courseResult = await pool.query(`SELECT id, title FROM courses WHERE id = ?`, [courseId]);
    const course = getFirstRow(courseResult);

    if (!course) {
        throw new Error(`Course not found: ${courseId}`);
    }

    // Get skills for this course with mastery
    const courseMastery = await skillMasteryService.getUserCourseSkillMastery(userId, courseId);

    const skillPaths: AdaptivePathDecision[] = courseMastery.skills.map(skill => {
        const { pathType, pathSubType } = getPathType(skill.masteryScore);
        return {
            skillId: skill.id,
            skillName: skill.name,
            currentMastery: skill.masteryScore,
            pathType,
            pathSubType,
            reason: getExplanation(skill.masteryScore, skill.name),
            recommendations: [],
        };
    });

    // Determine overall path for course
    const pathCounts = { remedial: 0, standard: 0, accelerated: 0 };
    for (const sp of skillPaths) {
        pathCounts[sp.pathType]++;
    }
    const overallPathType = skillPaths.length > 0
        ? Object.entries(pathCounts).sort((a, b) => b[1] - a[1])[0][0] as PathType
        : 'standard';

    // Get recommended lessons for this course
    const recommendedLessons = await getCourseLevelRecommendations(
        userId, courseId, overallPathType
    );

    return {
        courseId: course.id,
        courseTitle: course.title,
        overallPathType,
        courseMastery: courseMastery.overallMastery,
        skillPaths,
        recommendedLessons,
        explanation: getOverallExplanation(overallPathType, courseMastery.overallMastery),
    };
};

// ============================================================================
// Next Steps
// ============================================================================

/**
 * Get next recommended lessons
 */
const getNextRecommendedLessons = async (
    userId: string,
    pathType: PathType,
    limit: number = 5
): Promise<LevelRecommendation[]> => {
    // Get incomplete levels ordered by priority
    const result = await pool.query(
        `SELECT DISTINCT l.id, l.title, l.level_number, c.id as course_id, c.title as course_title
     FROM levels l
     INNER JOIN courses c ON l.course_id = c.id
     LEFT JOIN user_progress up ON l.id = up.level_id AND up.user_id = ?
     WHERE up.status IS NULL OR up.status != 'completed'
     ORDER BY l.level_number
     LIMIT ?`,
        [userId, limit]
    );

    return getRows(result).map((row: any, index: number) => ({
        levelId: row.id,
        levelTitle: row.title,
        levelNumber: row.level_number,
        courseId: row.course_id,
        courseTitle: row.course_title,
        action: 'required' as const,
        priority: index + 1,
        estimatedTime: 15,
        skillsAddressed: [],
    }));
};

/**
 * Get level recommendations for a course
 */
const getCourseLevelRecommendations = async (
    userId: string,
    courseId: string,
    pathType: PathType
): Promise<LevelRecommendation[]> => {
    const result = await pool.query(
        `SELECT l.id, l.title, l.level_number, c.id as course_id, c.title as course_title,
            up.status
     FROM levels l
     INNER JOIN courses c ON l.course_id = c.id
     LEFT JOIN user_progress up ON l.id = up.level_id AND up.user_id = ?
     WHERE l.course_id = ?
     ORDER BY l.level_number`,
        [userId, courseId]
    );

    return getRows(result).map((row: any, index: number) => {
        const isCompleted = row.status === 'completed';
        let action: LevelRecommendation['action'];

        if (isCompleted) {
            action = pathType === 'remedial' ? 'recommended' : 'skip';
        } else if (pathType === 'accelerated' && index > 0) {
            action = 'optional';
        } else {
            action = 'required';
        }

        return {
            levelId: row.id,
            levelTitle: row.title,
            levelNumber: row.level_number,
            courseId: row.course_id,
            courseTitle: row.course_title,
            action,
            priority: index + 1,
            estimatedTime: 15,
            skillsAddressed: [],
        };
    });
};

/**
 * Get simplified next steps for a user
 */
export const getNextSteps = async (userId: string): Promise<NextSteps> => {
    const learningPath = await getUserLearningPath(userId);

    // Get skills needing focus (lowest mastery)
    const skillsToFocus = learningPath.skillPaths
        .filter(s => s.currentMastery < 60)
        .sort((a, b) => a.currentMastery - b.currentMastery)
        .slice(0, 3)
        .map(s => ({ id: s.skillId, name: s.skillName, mastery: s.currentMastery }));

    const immediateAction = learningPath.nextRecommendedLessons[0] || null;

    let overallMessage: string;
    if (learningPath.overallPathType === 'remedial') {
        overallMessage = 'Focus on strengthening your fundamentals before moving forward.';
    } else if (learningPath.overallPathType === 'accelerated') {
        overallMessage = 'Great progress! You\'re ready to tackle advanced content.';
    } else {
        overallMessage = 'Keep up the good work! Continue with your current lessons.';
    }

    return {
        immediateAction,
        upcomingLessons: learningPath.nextRecommendedLessons.slice(1, 4),
        skillsToFocus,
        overallMessage,
    };
};
