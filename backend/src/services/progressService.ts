import pool from '../config/database';
import { getRows, getFirstRow } from '../utils/mysqlHelper';

export const getUserProgress = async (userId: string) => {
  try {
    console.log(`[getUserProgress] Fetching progress for userId: ${userId}`);

    // Get stats (with error handling)
    let stats = {
      total_attempted: 0,
      total_solved: 0,
      success_rate: 0,
    };

    try {
      const statsResult = await pool.query(
        `SELECT 
          COUNT(DISTINCT us.question_id) as total_attempted,
          COUNT(DISTINCT CASE WHEN us.is_correct = true THEN us.question_id END) as total_solved,
          AVG(CASE WHEN us.total_test_cases > 0 THEN CAST(us.test_cases_passed AS FLOAT) / us.total_test_cases ELSE 0 END) * 100 as success_rate
         FROM user_submissions us
         WHERE us.user_id = ?`,
        [userId]
      );
      const statsRows = getRows(statsResult);
      stats = statsRows[0] || stats;
    } catch (statsError: any) {
      console.warn(`[getUserProgress] Error fetching stats, using defaults:`, statsError.message);
    }

    // Get streak (with error handling)
    let streak = {
      current_streak: 0,
      longest_streak: 0,
    };

    try {
      const streakResult = await pool.query(
        `SELECT current_streak, longest_streak
         FROM user_statistics
         WHERE user_id = ?`,
        [userId]
      );
      const streakRows = getRows(streakResult);
      streak = streakRows[0] || streak;
    } catch (streakError: any) {
      console.warn(`[getUserProgress] Error fetching streak, using defaults:`, streakError.message);
    }

    // Get recent session (with error handling)
    let recentSession = null;

    try {
      const recentSessionResult = await pool.query(
        `SELECT s.id, c.title as course_title, l.title as level_title,
                s.status, s.completed_at,
                COUNT(DISTINCT sq.question_id) as total_questions,
                COUNT(DISTINCT CASE WHEN sq.status = 'completed' THEN sq.question_id END) as completed_questions
         FROM practice_sessions s
         JOIN courses c ON s.course_id = c.id
         JOIN levels l ON s.level_id = l.id
         LEFT JOIN session_questions sq ON s.id = sq.session_id
         WHERE s.user_id = ?
         GROUP BY s.id, c.title, l.title, s.status, s.completed_at
         ORDER BY s.started_at DESC
         LIMIT 1`,
        [userId]
      );
      const recentSessionRows = getRows(recentSessionResult);
      recentSession = recentSessionRows[0] || null;
    } catch (sessionError: any) {
      console.warn(`[getUserProgress] Error fetching recent session, using null:`, sessionError.message);
    }

    return {
      ...stats,
      ...streak,
      recent_session: recentSession,
    };
  } catch (error: any) {
    console.error('[getUserProgress] Error:', error);
    console.error('[getUserProgress] Error stack:', error.stack);
    // Return default progress on any error
    return {
      total_attempted: 0,
      total_solved: 0,
      success_rate: 0,
      current_streak: 0,
      longest_streak: 0,
      recent_session: null,
    };
  }
};

export const getLeaderboard = async (limit: number = 10) => {
  try {
    console.log(`[getLeaderboard] Fetching leaderboard with limit: ${limit}`);

    // Get real data only - no dummy/fake data
    // Count levels from completed coding/html-css sessions directly for more accurate tracking
    const result = await pool.query(
      `SELECT 
        u.id,
        u.name,
        u.roll_number,
        COUNT(DISTINCT CASE WHEN us.is_correct = true THEN us.question_id END) as problems_solved,
        COUNT(DISTINCT CASE WHEN ps.status = 'completed' AND ps.session_type IN ('coding', 'html-css-challenge') THEN ps.level_id END) as levels_cleared,
        AVG(CASE WHEN us.total_test_cases > 0 THEN CAST(us.test_cases_passed AS FLOAT) / us.total_test_cases ELSE 0 END) * 100 as efficiency
       FROM users u
       LEFT JOIN user_submissions us ON u.id = us.user_id
       LEFT JOIN practice_sessions ps ON u.id = ps.user_id
       WHERE u.role = 'student'
       GROUP BY u.id, u.name, u.roll_number
       HAVING COUNT(DISTINCT CASE WHEN us.is_correct = true THEN us.question_id END) > 0
          OR COUNT(DISTINCT CASE WHEN ps.status = 'completed' AND ps.session_type IN ('coding', 'html-css-challenge') THEN ps.level_id END) > 0
       ORDER BY levels_cleared DESC, problems_solved DESC, efficiency DESC
       LIMIT ?`,
      [limit]
    );

    const rows = getRows(result);
    console.log(`[getLeaderboard] Returning ${rows.length} real leaderboard entries`);
    return rows.map((row: any, index: number) => ({
      rank: index + 1,
      ...row,
      levels_cleared: parseInt(row.levels_cleared) || 0,
      problems_solved: parseInt(row.problems_solved) || 0,
      efficiency: parseFloat(row.efficiency) || 0,
    }));
  } catch (error: any) {
    console.error('[getLeaderboard] Error:', error);
    console.error('[getLeaderboard] Error stack:', error.stack);
    return [];
  }
};

/**
 * Get paginated leaderboard for all users
 */
export const getLeaderboardPaginated = async (page: number = 1, limit: number = 20, search: string = '') => {
  try {
    const offset = (page - 1) * limit;

    // Base query for leaderboard data
    const baseQuery = `
      SELECT 
        u.id,
        u.name,
        u.roll_number,
        u.department,
        COUNT(DISTINCT CASE WHEN us.is_correct = true THEN us.question_id END) as problems_solved,
        COUNT(DISTINCT CASE WHEN ps.status = 'completed' AND ps.session_type IN ('coding', 'html-css-challenge') THEN ps.level_id END) as levels_cleared,
        AVG(CASE WHEN us.total_test_cases > 0 THEN CAST(us.test_cases_passed AS FLOAT) / us.total_test_cases ELSE 0 END) * 100 as efficiency
      FROM users u
      LEFT JOIN user_submissions us ON u.id = us.user_id
      LEFT JOIN practice_sessions ps ON u.id = ps.user_id
      WHERE u.role = 'student'
      ${search ? `AND (u.name LIKE ? OR u.roll_number LIKE ?)` : ''}
      GROUP BY u.id, u.name, u.roll_number, u.department
      ORDER BY levels_cleared DESC, problems_solved DESC, efficiency DESC`;

    const searchParam = `%${search}%`;
    const queryParams: any[] = search ? [searchParam, searchParam] : [];

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM (${baseQuery}) as ranked`,
      queryParams
    );
    const countRows = getRows(countResult);
    const total = parseInt(countRows[0]?.total) || 0;

    // Get paginated data
    const dataResult = await pool.query(
      `${baseQuery} LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );
    const rows = getRows(dataResult);

    const data = rows.map((row: any, index: number) => ({
      rank: offset + index + 1,
      ...row,
      levels_cleared: parseInt(row.levels_cleared) || 0,
      problems_solved: parseInt(row.problems_solved) || 0,
      efficiency: Math.round((parseFloat(row.efficiency) || 0) * 10) / 10,
    }));

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  } catch (error: any) {
    console.error('[getLeaderboardPaginated] Error:', error);
    return { data: [], total: 0, page: 1, totalPages: 1 };
  }
};

/**
 * Get a specific user's rank on the leaderboard
 */
export const getUserRank = async (userId: string) => {
  try {
    // Get all users ranked
    const result = await pool.query(
      `SELECT 
        u.id,
        u.name,
        u.roll_number,
        COUNT(DISTINCT CASE WHEN us.is_correct = true THEN us.question_id END) as problems_solved,
        COUNT(DISTINCT CASE WHEN ps.status = 'completed' AND ps.session_type IN ('coding', 'html-css-challenge') THEN ps.level_id END) as levels_cleared,
        AVG(CASE WHEN us.total_test_cases > 0 THEN CAST(us.test_cases_passed AS FLOAT) / us.total_test_cases ELSE 0 END) * 100 as efficiency
      FROM users u
      LEFT JOIN user_submissions us ON u.id = us.user_id
      LEFT JOIN practice_sessions ps ON u.id = ps.user_id
      WHERE u.role = 'student'
      GROUP BY u.id, u.name, u.roll_number
      ORDER BY levels_cleared DESC, problems_solved DESC, efficiency DESC`
    );

    const rows = getRows(result);
    const userIndex = rows.findIndex((r: any) => r.id === userId);

    if (userIndex === -1) {
      return {
        rank: 0,
        total_users: rows.length,
        problems_solved: 0,
        levels_cleared: 0,
        efficiency: 0,
      };
    }

    const userRow = rows[userIndex];
    return {
      rank: userIndex + 1,
      total_users: rows.length,
      problems_solved: parseInt(userRow.problems_solved) || 0,
      levels_cleared: parseInt(userRow.levels_cleared) || 0,
      efficiency: Math.round((parseFloat(userRow.efficiency) || 0) * 10) / 10,
    };
  } catch (error: any) {
    console.error('[getUserRank] Error:', error);
    return { rank: 0, total_users: 0, problems_solved: 0, levels_cleared: 0, efficiency: 0 };
  }
};

/**
 * Get user's recent activity (completed sessions)
 */
export const getUserRecentActivity = async (userId: string, limit: number = 20) => {
  try {
    const result = await pool.query(
      `SELECT 
        s.id,
        s.session_type,
        s.status,
        s.completed_at,
        s.started_at,
        c.title as course_title,
        l.title as level_title,
        COUNT(DISTINCT sq.question_id) as total_questions,
        COUNT(DISTINCT CASE WHEN us.is_correct = true THEN us.question_id END) as correct_count,
        COUNT(DISTINCT us.question_id) as attempted_count
      FROM practice_sessions s
      JOIN courses c ON s.course_id = c.id
      JOIN levels l ON s.level_id = l.id
      LEFT JOIN session_questions sq ON s.id = sq.session_id
      LEFT JOIN user_submissions us ON s.id = us.session_id AND us.user_id = ?
      WHERE s.user_id = ? AND s.status = 'completed' AND s.completed_at IS NOT NULL
      GROUP BY s.id, s.session_type, s.status, s.completed_at, s.started_at, c.title, l.title
      ORDER BY s.completed_at DESC
      LIMIT ?`,
      [userId, userId, limit]
    );

    const rows = getRows(result);

    return rows.map((row: any) => {
      const totalQuestions = parseInt(row.total_questions) || 0;
      const correctCount = parseInt(row.correct_count) || 0;
      const attemptedCount = parseInt(row.attempted_count) || 0;

      // Calculate score
      let score = '0/0';
      if (row.session_type === 'mcq') {
        score = `${correctCount}/${totalQuestions}`;
      } else {
        score = correctCount === totalQuestions ? 'Passed' : 'Failed';
      }

      // Calculate time ago
      const completedAt = new Date(row.completed_at);
      const now = new Date();
      const diffMs = now.getTime() - completedAt.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      let timeAgo = '';
      if (diffMins < 1) {
        timeAgo = 'Just now';
      } else if (diffMins < 60) {
        timeAgo = `${diffMins} ${diffMins === 1 ? 'min' : 'mins'} ago`;
      } else if (diffHours < 24) {
        timeAgo = `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
      } else {
        timeAgo = `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
      }

      return {
        id: row.id,
        type: row.session_type,
        title: `${row.course_title} - ${row.level_title}`,
        course: row.course_title,
        score: score,
        passed: correctCount === totalQuestions && totalQuestions > 0,
        time: timeAgo,
        completed_at: row.completed_at,
      };
    });
  } catch (error: any) {
    console.error('[getUserRecentActivity] Error:', error);
    return [];
  }
};

/**
 * Get user's assigned tasks (incomplete sessions or upcoming assignments)
 */
export const getUserTasks = async (userId: string) => {
  try {
    // Get ALL assigned tasks (both pending and completed)
    const result = await pool.query(
      `SELECT 
        st.id,
        st.status as task_status,
        a.title as assignment_title,
        c.id as course_id,
        c.title as course_title,
        l.id as level_id,
        l.title as level_title,
        l.level_number,
        (SELECT COUNT(DISTINCT q2.id) FROM questions q2 WHERE q2.level_id = l.id) as total_questions,
        -- Get the latest in-progress session for this task
        (SELECT ps2.id FROM practice_sessions ps2 
         WHERE ps2.user_id = st.user_id AND ps2.level_id = l.id AND ps2.status = 'in_progress'
         ORDER BY ps2.started_at DESC LIMIT 1) as session_id,
        (SELECT ps3.status FROM practice_sessions ps3 
         WHERE ps3.user_id = st.user_id AND ps3.level_id = l.id 
         ORDER BY ps3.started_at DESC LIMIT 1) as session_status,
        (SELECT COUNT(DISTINCT sq2.question_id) 
         FROM session_questions sq2 
         JOIN practice_sessions ps4 ON sq2.session_id = ps4.id
         WHERE ps4.user_id = st.user_id AND ps4.level_id = l.id AND sq2.status = 'completed') as completed_questions
      FROM student_tasks st
      JOIN assignments a ON st.assignment_id = a.id
      JOIN courses c ON a.course_id = c.id
      JOIN levels l ON a.level_id = l.id
      WHERE st.user_id = ?
      GROUP BY st.id, st.status, a.title, c.id, c.title, l.id, l.title, l.level_number
      ORDER BY st.created_at DESC`,
      [userId]
    );

    const rows = getRows(result);

    return rows.map((row: any) => {
      // Determine status based on task_status and session_status
      let status = 'assigned';
      if (row.task_status === 'completed') {
        status = 'completed';
      } else if (row.session_status === 'in_progress') {
        status = 'in_progress';
      }

      return {
        id: row.id,
        course_id: row.course_id,
        level_id: row.level_id,
        type: 'coding', // Default or fetch from level/questions
        title: row.assignment_title, // Use assignment title
        course: row.course_title,
        level: row.level_title,
        total_questions: parseInt(row.total_questions) || 0,
        completed_questions: parseInt(row.completed_questions) || 0,
        status: status,
        started_at: row.created_at,
        reassign_count: parseInt(row.reassign_count) || 0,
      };
    });
  } catch (error: any) {
    console.error('[getUserTasks] Error:', error);
    return [];
  }
};
