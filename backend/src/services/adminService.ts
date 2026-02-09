import pool from '../config/database';
import { randomUUID } from 'crypto';
import { getRows } from '../utils/mysqlHelper';

export const getAllUsers = async (searchTerm?: string) => {
  let query = `
    SELECT 
      u.id,
      u.username,
      u.email,
      u.role,
      u.name,
      u.roll_number,
      u.department,
      u.year,
      u.created_at,
      COUNT(DISTINCT CASE WHEN ps.status = 'completed' AND ps.session_type IN ('coding', 'html-css-challenge') THEN ps.level_id END) as levels_practiced,
      MAX(ps.started_at) as last_practice_date,
      MAX(ps.status) as last_status
    FROM users u
    LEFT JOIN practice_sessions ps ON u.id = ps.user_id
    WHERE u.role = 'student'
  `;
  const params: any[] = [];

  if (searchTerm) {
    query += ' AND (LOWER(u.username) LIKE LOWER(?) OR LOWER(u.name) LIKE LOWER(?) OR LOWER(u.roll_number) LIKE LOWER(?))';
    const searchPattern = `%${searchTerm}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  query += ' GROUP BY u.id, u.username, u.email, u.role, u.name, u.roll_number, u.department, u.year, u.created_at';
  query += ' ORDER BY u.created_at DESC';

  const result = await pool.query(query, params);
  return getRows(result).map((row: any) => ({
    ...row,
    levels_practiced: parseInt(row.levels_practiced) || 0,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
    last_practice_date: row.last_practice_date ? new Date(row.last_practice_date).toISOString() : null,
  }));
};

export const createUser = async (data: { name: string; email: string; password?: string; role: string; roll_number?: string, department?: string, year?: number }) => {
  const userId = randomUUID();
  // Simple password hashing for demo - in prod use bcrypt
  // For now we'll store it as is or handle it in auth service if reused
  // Assuming a simple insert for now as this is "admin adding user"
  // Note: ideally we should use authService.register or similar to hash password correctly
  const { hashPassword } = await import('../utils/password');
  const hashedPassword = await hashPassword(data.password || 'password123');

  await pool.query(
    'INSERT INTO users (id, name, email, password_hash, role, roll_number, department, year, username) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [userId, data.name, data.email, hashedPassword, data.role, data.roll_number || null, data.department || null, data.year || null, data.email.split('@')[0]]
  );
  return userId;
};

export const updateUser = async (userId: string, data: { name?: string; email?: string; roll_number?: string; role?: string; department?: string; year?: number }) => {
  const updates: string[] = [];
  const params: any[] = [];

  if (data.name) {
    updates.push('name = ?');
    params.push(data.name);
  }
  if (data.email) {
    updates.push('email = ?');
    params.push(data.email);
  }
  if (data.roll_number) {
    updates.push('roll_number = ?');
    params.push(data.roll_number);
  }
  if (data.role) {
    updates.push('role = ?');
    params.push(data.role);
  }
  if (data.department) {
    updates.push('department = ?');
    params.push(data.department);
  }
  if (data.year) {
    updates.push('year = ?');
    params.push(data.year);
  }

  if (updates.length === 0) return;

  params.push(userId);
  await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
};

export const deleteUser = async (userId: string) => {
  // Cascading deletes usually handled by DB, but safe to delete from users table
  await pool.query('DELETE FROM users WHERE id = ?', [userId]);
};

export const getRecentActivity = async (searchTerm?: string) => {
  let query = `
    SELECT 
      u.id as user_id,
      u.username,
      u.name,
      u.email,
      u.roll_number,
      c.title as course_title,
      l.title as level_title,
      ps.started_at,
      ps.status,
      ps.session_type
    FROM practice_sessions ps
    JOIN users u ON ps.user_id = u.id
    JOIN courses c ON ps.course_id = c.id
    JOIN levels l ON ps.level_id = l.id
  `;

  const params: any[] = [];
  if (searchTerm) {
    query += ' WHERE LOWER(u.name) LIKE LOWER(?) OR LOWER(u.roll_number) LIKE LOWER(?)';
    const searchPattern = `%${searchTerm}%`;
    params.push(searchPattern, searchPattern);
  }

  query += ' ORDER BY ps.started_at DESC LIMIT 50';

  const result = await pool.query(query, params);
  return getRows(result).map((row: any) => ({
    ...row,
    started_at: row.started_at ? new Date(row.started_at).toISOString() : null,
  }));
};

export const getDashboardStats = async () => {
  try {
    console.log('[getDashboardStats] Fetching dashboard stats');

    // Get total users (with error handling)
    let totalUsers = 0;
    try {
      const totalUsersResult = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['student']);
      const totalUsersRows = getRows(totalUsersResult);
      totalUsers = parseInt(totalUsersRows[0]?.count || '0');
    } catch (error: any) {
      console.warn('[getDashboardStats] Error fetching total users:', error.message);
    }

    // Get active users (with error handling)
    let activeUsers = 0;
    try {
      const activeUsersResult = await pool.query(
        "SELECT COUNT(DISTINCT user_id) as count FROM practice_sessions WHERE started_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)"
      );
      const activeUsersRows = getRows(activeUsersResult);
      activeUsers = parseInt(activeUsersRows[0]?.count || '0');
    } catch (error: any) {
      console.warn('[getDashboardStats] Error fetching active users:', error.message);
    }

    // Get questions attempted (with error handling)
    let questionsAttempted = 0;
    try {
      const questionsAttemptedResult = await pool.query('SELECT COUNT(*) as count FROM user_submissions');
      const questionsAttemptedRows = getRows(questionsAttemptedResult);
      questionsAttempted = parseInt(questionsAttemptedRows[0]?.count || '0');
    } catch (error: any) {
      console.warn('[getDashboardStats] Error fetching questions attempted:', error.message);
    }

    // Get pending approvals (with error handling)
    let pendingApprovals = 0;
    try {
      const pendingApprovalsResult = await pool.query(
        "SELECT COUNT(*) as count FROM practice_sessions WHERE status = 'in_progress' AND started_at < DATE_SUB(NOW(), INTERVAL 2 HOUR)"
      );
      const pendingApprovalsRows = getRows(pendingApprovalsResult);
      pendingApprovals = parseInt(pendingApprovalsRows[0]?.count || '0');
    } catch (error: any) {
      console.warn('[getDashboardStats] Error fetching pending approvals:', error.message);
    }

    // Get average success rate
    let avgSuccessRate = 0;
    try {
      const successRateResult = await pool.query(`
        SELECT 
          COUNT(CASE WHEN is_correct = 1 THEN 1 END) * 100.0 / COUNT(*) as rate 
        FROM user_submissions
      `);
      const successRateRows = getRows(successRateResult);
      avgSuccessRate = parseFloat(successRateRows[0]?.rate || '0');
    } catch (error: any) {
      console.warn('[getDashboardStats] Error fetching success rate:', error.message);
    }

    // Get popular courses
    let popularCourses: any[] = [];
    try {
      const popularCoursesResult = await pool.query(`
        SELECT 
          c.id,
          c.title as name, 
          'Computer Science' as subject, 
          COUNT(DISTINCT ps.user_id) as student_count
        FROM courses c
        LEFT JOIN practice_sessions ps ON c.id = ps.course_id
        GROUP BY c.id, c.title
        ORDER BY student_count DESC
        LIMIT 6
      `);
      popularCourses = getRows(popularCoursesResult).map((course: any) => ({
        id: course.id,
        name: course.name,
        subject: course.subject || 'Development', // Fallback subject
        count: `${course.student_count} students`
      }));
    } catch (error: any) {
      console.warn('[getDashboardStats] Error fetching popular courses:', error.message);
    }

    console.log(`[getDashboardStats] Stats: users=${totalUsers}, active=${activeUsers}, questions=${questionsAttempted}, pending=${pendingApprovals}, success=${avgSuccessRate}`);

    return {
      total_users: totalUsers,
      active_learners: activeUsers,
      questions_attempted: questionsAttempted,
      pending_approvals: pendingApprovals,
      average_success_rate: Math.round(avgSuccessRate * 10) / 10,
      popular_courses: popularCourses
    };
  } catch (error: any) {
    console.error('[getDashboardStats] Error:', error);
    console.error('[getDashboardStats] Error stack:', error.stack);
    // Return default stats on error
    return {
      total_users: 0,
      active_learners: 0,
      questions_attempted: 0,
      pending_approvals: 0,
      average_success_rate: 0,
      popular_courses: []
    };
  }
};

export const createCourse = async (data: { title: string; description?: string; total_levels: number; image_url?: string }) => {
  const courseId = randomUUID();
  await pool.query(
    'INSERT INTO courses (id, title, description, total_levels, image_url) VALUES (?, ?, ?, ?, ?)',
    [courseId, data.title, data.description || null, data.total_levels, data.image_url || null]
  );
  return courseId;
};

export const updateCourse = async (courseId: string, data: { title?: string; description?: string; total_levels?: number; image_url?: string }) => {
  const updates: string[] = [];
  const params: any[] = [];

  if (data.title) {
    updates.push('title = ?');
    params.push(data.title);
  }
  if (data.description !== undefined) {
    updates.push('description = ?');
    params.push(data.description);
  }
  if (data.total_levels) {
    updates.push('total_levels = ?');
    params.push(data.total_levels);
  }
  if (data.image_url !== undefined) {
    updates.push('image_url = ?');
    params.push(data.image_url);
  }

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(courseId);
    await pool.query(`UPDATE courses SET ${updates.join(', ')} WHERE id = ?`, params);
  }
};

export const deleteCourse = async (courseId: string) => {
  // Questions and levels should ideally be cascaded or handled, but simple delete for now
  await pool.query('DELETE FROM courses WHERE id = ?', [courseId]);
};

export const createLevel = async (data: {
  course_id: string;
  level_number: number;
  title: string;
  description?: string;
  topic_description?: string;
  learning_materials?: string; // or JSON string
  image_url?: string;
}) => {
  const levelId = randomUUID();
  await pool.query(
    'INSERT INTO levels (id, course_id, level_number, title, description, topic_description, learning_materials, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [levelId, data.course_id, data.level_number, data.title, data.description || null, data.topic_description || null, data.learning_materials || null, data.image_url || null]
  );
  return levelId;
};

export const deleteLevel = async (levelId: string) => {
  // Questions should ideally be cascaded, but simple delete for now
  await pool.query('DELETE FROM levels WHERE id = ?', [levelId]);
};

export const getCoursesWithLevels = async () => {
  try {
    console.log('[getCoursesWithLevels] Fetching courses with levels');

    const coursesResult = await pool.query(
      'SELECT id, title, description, total_levels, image_url, updated_at, created_at FROM courses ORDER BY title'
    );

    const courses = [];
    const coursesRows = getRows(coursesResult);
    console.log(`[getCoursesWithLevels] Found ${coursesRows.length} courses`);

    for (const course of coursesRows) {
      try {
        const levelsResult = await pool.query(
          `SELECT l.id, l.level_number, l.title, l.description, l.time_limit, l.image_url,
              COUNT(q.id) as question_count
       FROM levels l
       LEFT JOIN questions q ON l.id = q.level_id
       WHERE l.course_id = ?
       GROUP BY l.id, l.level_number, l.title, l.description, l.time_limit
       ORDER BY l.level_number`,
          [course.id]
        );

        courses.push({
          ...course,
          levels: getRows(levelsResult) || [],
        });
      } catch (levelError: any) {
        console.warn(`[getCoursesWithLevels] Error fetching levels for course ${course.id}:`, levelError.message);
        courses.push({
          ...course,
          levels: [],
        });
      }
    }

    console.log(`[getCoursesWithLevels] Returning ${courses.length} courses`);
    return courses;
  } catch (error: any) {
    console.error('[getCoursesWithLevels] Error:', error);
    console.error('[getCoursesWithLevels] Error stack:', error.stack);
    // Return empty array on error
    return [];
  }
};

export const updateLevelTimeLimit = async (levelId: string, timeLimit: number | null) => {
  await pool.query('UPDATE levels SET time_limit = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
    timeLimit,
    levelId,
  ]);

  // Update course updated_at
  await pool.query(
    `UPDATE courses SET updated_at = CURRENT_TIMESTAMP 
     WHERE id = (SELECT course_id FROM levels WHERE id = ?)`,
    [levelId]
  );
};

export const updateLevelDetails = async (
  levelId: string,
  data: {
    title?: string;
    description?: string;
    learning_materials?: any;
    image_url?: string;
  }
) => {
  try {
    console.log(`[updateLevelDetails] Updating level ${levelId} with data:`, JSON.stringify(data, null, 2));

    // Check if level exists
    const levelCheck = await pool.query('SELECT id FROM levels WHERE id = ?', [levelId]);
    const levelRows = getRows(levelCheck);

    if (levelRows.length === 0) {
      console.error(`[updateLevelDetails] Level ${levelId} not found`);
      throw new Error(`Level ${levelId} not found`);
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title || null);
      console.log(`[updateLevelDetails] Adding title update`);
    }

    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description || null);
      console.log(`[updateLevelDetails] Adding description update`);
    }

    if (data.learning_materials !== undefined) {
      updates.push('learning_materials = ?');
      // Handle learning_materials - can be object or string
      let learningMaterialsValue: string | null;
      if (typeof data.learning_materials === 'string') {
        learningMaterialsValue = data.learning_materials;
      } else if (data.learning_materials === null) {
        learningMaterialsValue = null;
      } else {
        learningMaterialsValue = JSON.stringify(data.learning_materials);
      }
      params.push(learningMaterialsValue);
      console.log(`[updateLevelDetails] Adding learning_materials update (length: ${learningMaterialsValue ? learningMaterialsValue.length : 0})`);
    }

    if (data.image_url !== undefined) {
      updates.push('image_url = ?');
      params.push(data.image_url || null);
      console.log(`[updateLevelDetails] Adding image_url update`);
    }

    if (updates.length === 0) {
      console.warn(`[updateLevelDetails] No updates to apply for level ${levelId}`);
      return;
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    const query = `UPDATE levels SET ${updates.join(', ')} WHERE id = ?`;
    params.push(levelId);

    console.log(`[updateLevelDetails] Executing query: ${query}`);
    console.log(`[updateLevelDetails] Params:`, params.map(p => typeof p === 'string' && p.length > 100 ? p.substring(0, 100) + '...' : p));

    await pool.query(query, params);

    console.log(`[updateLevelDetails] Successfully updated level ${levelId}`);
  } catch (error: any) {
    console.error(`[updateLevelDetails] Error updating level ${levelId}:`, error);
    console.error(`[updateLevelDetails] Error message:`, error.message);
    console.error(`[updateLevelDetails] Error code:`, error.code);
    console.error(`[updateLevelDetails] Error stack:`, error.stack);
    // Re-throw the error so controller can handle it
    throw error;
  }
};

export const getStudentResults = async (searchTerm?: string) => {
  let query = `
    SELECT 
      ps.id as session_id,
      u.id as user_id,
      u.roll_number as student_id,
      u.name as student_name,
      ps.completed_at,
      c.title as course_title,
      l.title as level_title,
      l.level_number,
      ps.session_type,
      
      -- Calculate scores
      COUNT(DISTINCT q.id) as total_questions,
      
      -- MCQ Score Calculation (count distinct correct questions)
      COUNT(DISTINCT CASE WHEN us.submission_type = 'mcq' AND us.is_correct = 1 THEN us.question_id END) as mcq_correct,
      
      -- Coding Score Calculation (count distinct correct questions)
      COUNT(DISTINCT CASE WHEN us.submission_type = 'coding' AND us.is_correct = 1 THEN us.question_id END) as coding_correct,
      
      -- HTML/CSS Score 
      MAX(us.language) as language
      
    FROM practice_sessions ps
    JOIN users u ON ps.user_id = u.id
    JOIN courses c ON ps.course_id = c.id
    JOIN levels l ON ps.level_id = l.id
    LEFT JOIN session_questions sq ON ps.id = sq.session_id
    LEFT JOIN questions q ON sq.question_id = q.id
    LEFT JOIN user_submissions us ON ps.id = us.session_id AND q.id = us.question_id
    
    WHERE ps.status = 'completed'
  `;

  const params: any[] = [];

  if (searchTerm) {
    query += ' AND (LOWER(u.name) LIKE LOWER(?) OR LOWER(u.roll_number) LIKE LOWER(?) OR LOWER(c.title) LIKE LOWER(?))';
    const searchPattern = `%${searchTerm}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  query += ' GROUP BY ps.id, u.id, u.roll_number, u.name, ps.completed_at, c.title, l.title, l.level_number, ps.session_type';
  query += ' ORDER BY ps.completed_at DESC';

  const result = await pool.query(query, params);
  const rows = getRows(result);

  return rows.map((row: any) => {
    // Determine Pass/Fail Status based on thresholds
    let status = 'Fail';
    let score = 0;

    // Check if it is HTML/CSS based on course title or language
    const isHtmlCss = (row.course_title && row.course_title.toLowerCase().includes('html')) ||
      (row.language === 'html' || row.language === 'css');

    // Calculate overall average score across all questions
    const totalQuestions = parseInt(row.total_questions) || 0;

    if (row.session_type === 'mcq') {
      // MCQ Logic: >= 60% to pass
      const mcqCorrect = parseInt(row.mcq_correct) || 0;
      const percentage = totalQuestions > 0 ? (mcqCorrect / totalQuestions) * 100 : 0;
      score = percentage;
      if (percentage >= 60) status = 'Pass';
    } else if (isHtmlCss) {
      // HTML/CSS Logic: >= 80% to pass
      const codingCorrect = parseInt(row.coding_correct) || 0;
      const percentage = totalQuestions > 0 ? (codingCorrect / totalQuestions) * 100 : 0;
      score = percentage;
      if (percentage >= 80) status = 'Pass';
    } else {
      // Standard Coding Logic: 100% required (all test cases must pass)
      const codingCorrect = parseInt(row.coding_correct) || 0;
      const percentage = totalQuestions > 0 ? (codingCorrect / totalQuestions) * 100 : 0;
      score = percentage;
      // Must have all questions correct to pass (avoid floating-point comparison issues)
      if (codingCorrect === totalQuestions && totalQuestions > 0) status = 'Pass';
    }

    return {
      session_id: row.session_id,
      user_id: row.user_id,
      student_id: row.student_id || 'N/A',
      student_name: row.student_name,
      date_time: row.completed_at ? new Date(row.completed_at).toISOString() : null,
      course: row.course_title,
      level: `Level - ${row.level_number}`,
      test_type: row.session_type === 'mcq' ? 'MCQ' : 'Coding',
      status: status,
      score: Math.min(100, Math.round(score))
    };
  });
};

export const createAssignment = async (data: {
  admin_id: string;
  title: string;
  course_id: string;
  level_id: string;
  target_type: 'all' | 'department' | 'year' | 'user';
  target_value?: string;
}) => {
  const assignmentId = randomUUID();
  const { admin_id, title, course_id, level_id, target_type, target_value } = data;

  // 1. Create Assignment Record
  await pool.query(
    'INSERT INTO assignments (id, admin_id, title, course_id, level_id, target_type, target_value) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [assignmentId, admin_id, title, course_id, level_id, target_type, target_value || null]
  );

  // 2. Identify Target Users
  let userQuery = 'SELECT id FROM users WHERE role = "student"';
  const queryParams: any[] = [];

  if (target_type === 'department' && target_value) {
    userQuery += ' AND department = ?';
    queryParams.push(target_value);
  } else if (target_type === 'year' && target_value) {
    userQuery += ' AND year = ?';
    queryParams.push(target_value);
  } else if (target_type === 'user' && target_value) {
    userQuery += ' AND id = ?';
    queryParams.push(target_value);
  }
  // 'all' already covered by base query

  const usersResult = await pool.query(userQuery, queryParams);
  const users = getRows(usersResult);

  if (users.length === 0) {
    console.warn(`[createAssignment] No users found for target: ${target_type} ${target_value}`);
    return { assignmentId, count: 0 };
  }

  // 3. Create Student Tasks
  // Using multi-row insert for efficiency
  const tasksValues: any[] = [];
  const placeholders: string[] = [];

  for (const user of users) {
    placeholders.push('(?, ?, ?)');
    tasksValues.push(randomUUID(), user.id, assignmentId);
  }

  if (placeholders.length > 0) {
    const taskQuery = `INSERT INTO student_tasks (id, user_id, assignment_id) VALUES ${placeholders.join(', ')}`;
    await pool.query(taskQuery, tasksValues);
  }

  return { assignmentId, count: users.length };
};

export const getAssignments = async () => {
  const query = `
    SELECT 
      a.id,
      a.title,
      a.course_id,
      a.target_type,
      a.target_value,
      a.created_at,
      c.title as course_title,
      l.title as level_title,
      l.level_number,
      COUNT(st.id) as total_assigned,
      COUNT(CASE WHEN st.status = 'completed' THEN 1 END) as completed_count
    FROM assignments a
    JOIN courses c ON a.course_id = c.id
    JOIN levels l ON a.level_id = l.id
    LEFT JOIN student_tasks st ON a.id = st.assignment_id
    GROUP BY a.id, a.title, a.target_type, a.target_value, a.created_at, c.title, l.title, l.level_number
    ORDER BY a.created_at DESC
  `;

  /* Existing getAssignments code */
  const result = await pool.query(query);
  return getRows(result);
};

export const getAssignmentDetails = async (assignmentId: string) => {
  const query = `
    SELECT 
      st.id as task_id,
      st.status,
      st.completed_at,
      u.id as user_id,
      u.name,
      u.email,
      u.roll_number,
      u.department,
      u.year
    FROM student_tasks st
    JOIN users u ON st.user_id = u.id
    WHERE st.assignment_id = ?
    ORDER BY field(st.status, 'completed', 'in_progress', 'pending'), u.name
  `;
  const result = await pool.query(query, [assignmentId]);
  return getRows(result);
};

