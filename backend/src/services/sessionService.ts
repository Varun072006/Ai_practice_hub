import pool from '../config/database';
import { randomUUID } from 'crypto';
import { validateLanguage } from '../utils/codeExecutor';
import { getRows } from '../utils/mysqlHelper';
import { hashPassword } from '../utils/password';

export interface SessionQuestion {
  question_id: string;
  question_order: number;
  question_type: string;
  title: string;
  description: string;
  input_format?: string;
  output_format?: string;
  constraints?: string;
}

export interface PracticeSession {
  id: string;
  user_id: string;
  course_id: string;
  level_id: string;
  session_type: string;
  status: string;
  questions: SessionQuestion[];
  course_title: string;
}

/**
 * Ensure dev bypass user exists in database
 * This is needed for foreign key constraints when using dev bypass tokens
 */
const ensureDevBypassUser = async (userId: string, username: string, role: string): Promise<void> => {
  try {
    console.log(`[ensureDevBypassUser] Checking for user: ${userId} (${username}, ${role})`);

    // Check if user exists by ID
    const userCheck = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    const userRows = getRows(userCheck);

    if (userRows.length > 0) {
      console.log(`[ensureDevBypassUser] User ${userId} already exists`);
      return;
    }

    // User doesn't exist, create it
    console.log(`[ensureDevBypassUser] Creating dev bypass user: ${userId} (${username}, ${role})`);
    const passwordHash = await hashPassword('dev-bypass-password');

    // Use INSERT IGNORE or ON DUPLICATE KEY UPDATE to handle conflicts
    try {
      await pool.query(
        'INSERT INTO users (id, username, password_hash, role, name) VALUES (?, ?, ?, ?, ?)',
        [userId, username, passwordHash, role, `${role === 'admin' ? 'Admin' : 'Student'} User (Dev Bypass)`]
      );
      console.log(`[ensureDevBypassUser] Dev bypass user created successfully: ${userId}`);
    } catch (insertError: any) {
      // If insert fails due to duplicate username, try to update existing user
      if (insertError.code === 'ER_DUP_ENTRY' && insertError.message.includes('username')) {
        console.log(`[ensureDevBypassUser] Username ${username} exists, updating user ID to ${userId}`);
        // Update existing user to use the dev bypass ID
        await pool.query(
          'UPDATE users SET id = ? WHERE username = ?',
          [userId, username]
        );
        console.log(`[ensureDevBypassUser] Updated existing user to use dev bypass ID: ${userId}`);
      } else {
        // Re-throw other errors
        throw insertError;
      }
    }
  } catch (error: any) {
    console.error(`[ensureDevBypassUser] Error ensuring dev bypass user:`, error);
    console.error(`[ensureDevBypassUser] Error message:`, error.message);
    console.error(`[ensureDevBypassUser] Error code:`, error.code);
    // Re-throw the error so we can see what went wrong
    throw new Error(`Failed to ensure dev bypass user: ${error.message}`);
  }
};

export const startSession = async (
  userId: string,
  courseId: string,
  levelId: string,
  requestedSessionType?: 'coding' | 'mcq' | 'html-css-challenge'
): Promise<PracticeSession> => {
  try {
    console.log(`[startSession] Starting session for userId: ${userId}, courseId: ${courseId}, levelId: ${levelId}, sessionType: ${requestedSessionType || 'auto'}`);

    // Ensure dev bypass users exist in database (for foreign key constraints)
    if (userId === 'user-1' || userId === 'admin-1') {
      const role = userId === 'admin-1' ? 'admin' : 'student';
      const username = userId === 'admin-1' ? 'admin' : 'user';
      await ensureDevBypassUser(userId, username, role);
    }

    // Get course info to determine default session type (with error handling)
    let courseTitle = '';
    try {
      const courseResult = await pool.query(
        'SELECT title FROM courses WHERE id = ?',
        [courseId]
      );
      const courseRows = getRows(courseResult);
      courseTitle = courseRows[0]?.title || '';
      console.log(`[startSession] Course title: ${courseTitle}`);
    } catch (courseError: any) {
      console.error(`[startSession] Error fetching course:`, courseError.message);
      throw new Error(`Failed to fetch course: ${courseError.message}`);
    }

    let sessionType: 'coding' | 'mcq' | 'html-css-challenge';

    if (requestedSessionType === 'coding' || requestedSessionType === 'mcq' || requestedSessionType === 'html-css-challenge') {
      sessionType = requestedSessionType;
    } else {
      // Fallback: preserve original behaviour – ML Level 1 as MCQ, everything else coding
      sessionType =
        courseTitle === 'Machine Learning' &&
          levelId.includes('660e8400-e29b-41d4-a716-446655440021')
          ? 'mcq'
          : 'coding';
    }

    console.log(`[startSession] Session type determined: ${sessionType}`);

    // Determine strict limits and types
    let limit = 10; // Default (e.g. for MCQs)

    if (sessionType === 'coding' || sessionType === 'html-css-challenge') {
      limit = 2; // Coding/HTML-CSS limit
    } else if (sessionType === 'mcq') {
      limit = 10; // MCQ limit
    }

    const dbQuestionType = sessionType === 'mcq' ? 'mcq' : 'coding';

    // 1. Fetch ALL valid question IDs for this level/type
    const allQuestionsQuery = `SELECT id FROM questions WHERE level_id = ? AND question_type = ?`;
    const allQuestionsResult = await pool.query(allQuestionsQuery, [levelId, dbQuestionType]);
    const allQuestionIds = getRows(allQuestionsResult).map((r: any) => r.id);

    if (allQuestionIds.length === 0) {
      console.warn(`[startSession] No questions found for level ${levelId} with type ${dbQuestionType}`);
      // Fallback logic handled below
    }

    // 2. Fetch history (questions user has already seen in sessions)
    // We look at ALL sessions for this user+level to avoid repeats
    const historyQuery = `
      SELECT DISTINCT sq.question_id 
      FROM session_questions sq
      JOIN practice_sessions s ON sq.session_id = s.id
      WHERE s.user_id = ? AND s.level_id = ?
    `;
    const historyResult = await pool.query(historyQuery, [userId, levelId]);
    const seenQuestionIds = new Set(getRows(historyResult).map((r: any) => r.question_id));

    // 3. Filter candidates (Unseen questions)
    let candidateIds = allQuestionIds.filter((id: string) => !seenQuestionIds.has(id));

    // 4. Selection Logic
    // If we have exhausted all questions (candidateIds is empty), or we need more than available
    // The requirement is "until all questions should appear dont repeaat".
    // This implies we reset/recycle only when we run out of unseen questions.

    let selectedIds: string[] = [];

    // Shuffle helper
    const shuffle = (array: string[]) => array.sort(() => 0.5 - Math.random());

    if (candidateIds.length === 0) {
      // All questions seen. Reset pool to ALL questions.
      // We start a new cycle of randomness.
      candidateIds = shuffle([...allQuestionIds]);
      selectedIds = candidateIds.slice(0, limit);
    } else {
      // We have some unseen questions.
      // Shuffle them first.
      candidateIds = shuffle(candidateIds);

      if (candidateIds.length >= limit) {
        // Enough unseen questions to fill the quota
        selectedIds = candidateIds.slice(0, limit);
      } else {
        // Not enough unseen. Take ALL unseen, then fill remainder from SEEN (shuffled).
        selectedIds = [...candidateIds];
        const needed = limit - selectedIds.length;

        // Get seen questions to fill the gap
        const seenAvailable = allQuestionIds.filter((id: string) => !selectedIds.includes(id));
        const shuffledSeen = shuffle(seenAvailable);

        selectedIds = [...selectedIds, ...shuffledSeen.slice(0, needed)];
      }
    }

    console.log(`[startSession] Selected ${selectedIds.length} questions (Pool: ${allQuestionIds.length}, Seen: ${seenQuestionIds.size})`);

    // 5. Fetch full details for selected questions
    // Note: We want to maintain our randomized order, but SQL 'IN' doesn't guarantee order.
    // We will fetch them and then re-order in JS map.
    let questionsRows: any[] = [];

    if (selectedIds.length > 0) {
      // Create placeholders for IN clause
      const placeholders = selectedIds.map(() => '?').join(',');
      const fetchQuery = `
        SELECT id, question_type, title, description, input_format, output_format, constraints, reference_solution, created_at
        FROM questions
        WHERE id IN (${placeholders})
      `;

      try {
        const fetchResult = await pool.query(fetchQuery, selectedIds);
        const unsortedRows = getRows(fetchResult);

        // Re-order to match selectedIds (which are shuffled)
        questionsRows = selectedIds.map(id => unsortedRows.find((r: any) => r.id === id)).filter(x => x);

      } catch (fetchError: any) {
        console.error(`[startSession] Error fetching question details:`, fetchError.message);
        throw new Error(`Failed to fetch question details`);
      }
    }



    if (questionsRows.length === 0) {
      console.warn(`[startSession] No questions found for level ${levelId} with sessionType ${sessionType}`);
      throw new Error(`No questions available for this level. Please add questions before starting a session.`);
    }

    // -----------------------------------------------------------------
    // NEW: Check for existing in_progress session for this user and level
    // -----------------------------------------------------------------
    const existingSessionResult = await pool.query(
      `SELECT id, session_type, status, total_questions, time_limit 
       FROM practice_sessions 
       WHERE user_id = ? AND level_id = ? AND status = 'in_progress' AND session_type = ?
       ORDER BY started_at DESC LIMIT 1`,
      [userId, levelId, sessionType]
    );
    const existingSessionRows = getRows(existingSessionResult);

    if (existingSessionRows.length > 0) {
      const existingSession = existingSessionRows[0];
      console.log(`[startSession] Found existing in_progress session: ${existingSession.id}`);

      // Fetch questions already assigned to this session
      const assignedQuestionsResult = await pool.query(
        `SELECT q.id, q.question_type, q.title, q.description, q.input_format, q.output_format, q.constraints, q.reference_solution
         FROM session_questions sq
         JOIN questions q ON sq.question_id = q.id
         WHERE sq.session_id = ?
         ORDER BY sq.question_order`,
        [existingSession.id]
      );
      const assignedQuestionsRows = getRows(assignedQuestionsResult);

      if (assignedQuestionsRows.length > 0) {
        // Prepare questions with options/test cases
        const sessionQuestions = [];
        for (let index = 0; index < assignedQuestionsRows.length; index++) {
          const q = assignedQuestionsRows[index];
          const questionData: any = {
            question_id: q.id,
            question_order: index + 1,
            question_type: q.question_type,
            title: q.title,
            description: q.description,
            input_format: q.input_format,
            output_format: q.output_format,
            constraints: q.constraints,
            reference_solution: q.reference_solution,
          };

          if (q.question_type === 'mcq') {
            const optionsResult = await pool.query(
              'SELECT id, option_text, is_correct, option_letter FROM mcq_options WHERE question_id = ? ORDER BY option_letter',
              [q.id]
            );
            questionData.options = getRows(optionsResult);
          } else if (q.question_type === 'coding') {
            const testCasesResult = await pool.query(
              'SELECT id, input_data, expected_output, is_hidden, test_case_number FROM test_cases WHERE question_id = ? ORDER BY test_case_number',
              [q.id]
            );
            questionData.test_cases = getRows(testCasesResult);
          }
          sessionQuestions.push(questionData);
        }

        return {
          id: existingSession.id,
          user_id: userId,
          course_id: courseId,
          level_id: levelId,
          session_type: existingSession.session_type,
          status: existingSession.status,
          questions: sessionQuestions,
          course_title: courseTitle
        };
      }
      // If no questions found for existing session, we fallback to creating a new one (cleanup)
      await pool.query('DELETE FROM practice_sessions WHERE id = ?', [existingSession.id]);
    }
    // -----------------------------------------------------------------

    // Create session (store total available questions) (with error handling)
    const sessionId = randomUUID();
    try {
      await pool.query(
        `INSERT INTO practice_sessions (id, user_id, course_id, level_id, session_type, status, total_questions, time_limit)
     VALUES (?, ?, ?, ?, ?, 'in_progress', ?, 3600)`,
        [sessionId, userId, courseId, levelId, sessionType, questionsRows.length]
      );
      console.log(`[startSession] Created session ${sessionId}`);
    } catch (sessionError: any) {
      console.error(`[startSession] Error creating session:`, sessionError.message);
      throw new Error(`Failed to create session: ${sessionError.message}`);
    }

    // Add questions to session and fetch options / test cases (with error handling)
    const sessionQuestions = [];
    for (let index = 0; index < questionsRows.length; index++) {
      const q = questionsRows[index];
      const questionData: any = {
        question_id: q.id,
        question_order: index + 1,
        question_type: q.question_type,
        title: q.title,
        description: q.description,
        input_format: q.input_format,
        output_format: q.output_format,
        constraints: q.constraints,
        reference_solution: q.reference_solution,
      };

      try {
        if (q.question_type === 'mcq') {
          // Fetch options for MCQ questions
          const optionsResult = await pool.query(
            'SELECT id, option_text, is_correct, option_letter FROM mcq_options WHERE question_id = ? ORDER BY option_letter',
            [q.id]
          );
          questionData.options = getRows(optionsResult);
          console.log(`[startSession] Loaded ${questionData.options.length} options for MCQ question ${q.id}`);
        } else if (q.question_type === 'coding') {
          // Fetch test cases for coding questions so the UI can show visible / hidden test cases
          const testCasesResult = await pool.query(
            'SELECT id, input_data, expected_output, is_hidden, test_case_number FROM test_cases WHERE question_id = ? ORDER BY test_case_number',
            [q.id]
          );
          questionData.test_cases = getRows(testCasesResult);
          console.log(`[startSession] Loaded ${questionData.test_cases.length} test cases for coding question ${q.id}`);
        }
      } catch (questionDataError: any) {
        console.warn(`[startSession] Error fetching data for question ${q.id}:`, questionDataError.message);
        // Continue with empty options/test_cases if fetch fails
        if (q.question_type === 'mcq') {
          questionData.options = [];
        } else if (q.question_type === 'coding') {
          questionData.test_cases = [];
        }
      }

      sessionQuestions.push(questionData);

      // Insert session question (with error handling)
      try {
        const sessionQuestionId = randomUUID();
        await pool.query(
          `INSERT INTO session_questions (id, session_id, question_id, question_order, status)
       VALUES (?, ?, ?, ?, 'not_attempted')`,
          [sessionQuestionId, sessionId, q.id, index + 1]
        );
      } catch (sessionQuestionError: any) {
        console.error(`[startSession] Error inserting session question:`, sessionQuestionError.message);
        // Continue even if one session question insert fails
      }
    }

    console.log(`[startSession] Successfully created session ${sessionId} with ${sessionQuestions.length} questions`);

    return {
      id: sessionId,
      user_id: userId,
      course_id: courseId,
      level_id: levelId,
      session_type: sessionType,
      status: 'in_progress',
      questions: sessionQuestions,
      course_title: courseTitle,
    };
  } catch (error: any) {
    console.error('[startSession] Error:', error);
    console.error('[startSession] Error stack:', error.stack);
    // Re-throw the error so controller can handle it
    throw error;
  }
};

export const submitSolution = async (
  sessionId: string,
  questionId: string,
  userId: string,
  submission: {
    code?: string;
    language?: string;
    selected_option_id?: string;
    isPassed?: boolean;
  }
) => {
  // Get session and question info
  const sessionResult = await pool.query(
    `SELECT s.session_type, q.question_type
     FROM practice_sessions s
     JOIN session_questions sq ON s.id = sq.session_id
     JOIN questions q ON sq.question_id = q.id
     WHERE s.id = ? AND q.id = ?`,
    [sessionId, questionId]
  );

  const sessionRows = getRows(sessionResult);
  if (sessionRows.length === 0) {
    throw new Error('Session or question not found');
  }

  const { session_type, question_type } = sessionRows[0];

  if (question_type === 'mcq') {
    // Handle MCQ submission
    if (!submission.selected_option_id) {
      throw new Error('No option selected');
    }

    const optionResult = await pool.query(
      'SELECT is_correct FROM mcq_options WHERE id = ?',
      [submission.selected_option_id]
    );

    const optionRows = getRows(optionResult);
    if (optionRows.length === 0) {
      throw new Error('Selected option not found');
    }

    // Handle MySQL boolean (0/1) and JavaScript boolean (true/false)
    const isCorrectValue = optionRows[0].is_correct;
    const isCorrect = isCorrectValue === true || isCorrectValue === 1 || isCorrectValue === '1';

    const mcqSubmissionId = randomUUID();
    await pool.query(
      `INSERT INTO user_submissions (id, session_id, question_id, user_id, submission_type, selected_option_id, is_correct)
       VALUES (?, ?, ?, ?, 'mcq', ?, ?)
       ON DUPLICATE KEY UPDATE id=id`,
      [mcqSubmissionId, sessionId, questionId, userId, submission.selected_option_id, isCorrect]
    );

    return { is_correct: isCorrect };
  } else {
    // Coding submission (including HTML/CSS)
    // For HTML/CSS, we trust the client's evaluation (or just save it)
    // because we can't easily run a DOM visual check on the backend.
    const isHtmlCss = submission.language === 'html' || submission.language === 'css';

    let isCorrect = false;
    let passedCount = 0;
    let totalTestCases = 0;
    let testResults: any[] = [];

    if (isHtmlCss) {
      // Use the explicit passed status if provided
      isCorrect = submission.isPassed === true;
      passedCount = isCorrect ? 1 : 0;
      totalTestCases = 1;
    } else {
      // Coding Logic (Standard)
      const courseResult = await pool.query(
        `SELECT c.title FROM courses c
           JOIN practice_sessions s ON c.id = s.course_id
           WHERE s.id = ?`,
        [sessionId]
      );
      const courseRows = getRows(courseResult);
      const courseName = courseRows[0]?.title || '';

      if (submission.language && !validateLanguage(courseName, submission.language)) {
        throw new Error(`Invalid language for ${courseName} course`);
      }

      // Get test cases
      const testCasesResult = await pool.query(
        'SELECT id, input_data, expected_output FROM test_cases WHERE question_id = ? ORDER BY test_case_number',
        [questionId]
      );

      const testCasesRows = getRows(testCasesResult);
      // Note: For some questions test cases might be missing, handling strictly here
      if (testCasesRows.length === 0) {
        // If no test cases, we might want to fail or just save. 
        // But assuming standard coding problems have test cases.
        throw new Error('No test cases found for this question');
      }

      // Evaluate code against test cases
      const { evaluateCode } = await import('./codeExecutionService');
      testResults = await evaluateCode(
        submission.code || '',
        submission.language || 'python',
        testCasesRows,
        courseName
      );

      passedCount = testResults.filter((r) => r.passed).length;
      totalTestCases = testCasesRows.length;
      isCorrect = passedCount === totalTestCases;
    }

    // Generate a submission ID
    const submissionId = randomUUID();

    // Save submission
    await pool.query(
      `INSERT INTO user_submissions (id, session_id, question_id, user_id, submission_type, submitted_code, language, test_cases_passed, total_test_cases, is_correct)
       VALUES (?, ?, ?, ?, 'coding', ?, ?, ?, ?, ?)`,
      [
        submissionId,
        sessionId,
        questionId,
        userId,
        submission.code,
        submission.language,
        passedCount,
        totalTestCases,
        isCorrect,
      ]
    );

    // Save test case results (only for standard coding)
    if (!isHtmlCss) {
      for (const tr of testResults) {
        const testResultId = randomUUID();
        await pool.query(
          `INSERT INTO test_case_results (id, submission_id, test_case_id, passed, actual_output, error_message, execution_time)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            testResultId,
            submissionId,
            tr.test_case_id,
            tr.passed,
            tr.actual_output,
            tr.error_message || null,
            tr.execution_time || null,
          ]
        );
      }
    }

    // Update session question status
    await pool.query(
      `UPDATE session_questions SET status = ? WHERE session_id = ? AND question_id = ?`,
      [isCorrect ? 'completed' : 'attempted', sessionId, questionId]
    );

    return {
      is_correct: isCorrect,
      test_cases_passed: passedCount,
      total_test_cases: totalTestCases,
      test_results: testResults,
    };
  }
};

export const completeSession = async (sessionId: string, userId: string) => {
  // Update session status
  await pool.query(
    `UPDATE practice_sessions SET status = 'completed', completed_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`,
    [sessionId, userId]
  );

  // Check if all questions are completed (for coding sessions)
  const sessionResult = await pool.query(
    `SELECT s.level_id, s.course_id, COUNT(*) as total, SUM(CASE WHEN sq.status = 'completed' THEN 1 ELSE 0 END) as completed
     FROM practice_sessions s
     JOIN session_questions sq ON s.id = sq.session_id
     WHERE s.id = ?
     GROUP BY s.level_id, s.course_id`,
    [sessionId]
  );

  const sessionRows = getRows(sessionResult);
  if (sessionRows.length > 0) {
    const { level_id, course_id, total, completed } = sessionRows[0];

    // If all questions completed, mark level as completed
    if (parseInt(completed) === parseInt(total)) {
      const completedProgressId = randomUUID();
      await pool.query(
        `INSERT INTO user_progress (id, user_id, course_id, level_id, status, completed_at)
         VALUES (?, ?, ?, ?, 'completed', CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE status = 'completed', completed_at = CURRENT_TIMESTAMP`,
        [completedProgressId, userId, course_id, level_id]
      );
    }
  }
};
export const runCode = async (
  sessionId: string,
  code: string,
  language: string,
  customInput?: string
): Promise<{ output: string; error?: string; execution_time?: number }> => {
  // Validate Session
  const sessionResult = await pool.query(
    `SELECT c.title 
     FROM practice_sessions s 
     JOIN courses c ON s.course_id = c.id
     WHERE s.id = ?`,
    [sessionId]
  );

  const rows = getRows(sessionResult);
  if (rows.length === 0) {
    throw new Error('Session not found');
  }
  const courseName = rows[0].title;

  // Validate Language
  if (!validateLanguage(courseName, language)) {
    throw new Error(`Invalid language for ${courseName}`);
  }

  // Execute
  // Dynamic import to avoid cycles if any (safe practice here)
  const { executeCode } = await import('../utils/codeExecutor');
  const { normalizeExecutionInput } = await import('../utils/inputNormalizer');
  const normalizedInput = normalizeExecutionInput(customInput || '');
  const result = await executeCode(code, language, normalizedInput);

  return {
    output: result.output || '',
    error: result.error,
    execution_time: result.executionTime
  };
};

/**
 * Get all practice sessions from the database
 */
// ... (previous code)

export const runTestCases = async (
  sessionId: string,
  questionId: string,
  code: string,
  language: string
) => {
  // TiDB/MySQL connections can be dropped intermittently (ECONNRESET / PROTOCOL_CONNECTION_LOST).
  // Add a small retry to make "Run test cases" resilient.
  const queryWithRetry = async <T = any>(
    sql: string,
    params: any[],
    retries: number = 2
  ): Promise<T> => {
    let lastErr: any;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // @ts-ignore mysql2 typing for pool.query is broad; keep local
        return await pool.query(sql, params);
      } catch (err: any) {
        lastErr = err;
        const code = err?.code;
        const isConnDrop = code === 'ECONNRESET' || code === 'PROTOCOL_CONNECTION_LOST';
        if (!isConnDrop || attempt === retries) throw err;
        // small backoff before retry
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      }
    }
    throw lastErr;
  };

  // Validate Session and get course info
  const sessionResult = await queryWithRetry(
    `SELECT s.course_id, c.title as course_title
     FROM practice_sessions s 
     JOIN courses c ON s.course_id = c.id
     WHERE s.id = ?`,
    [sessionId]
  );

  const sessionRows = getRows(sessionResult);
  if (sessionRows.length === 0) {
    throw new Error('Session not found');
  }

  const courseName = sessionRows[0].course_title;

  // Validate language for this course
  if (!validateLanguage(courseName, language)) {
    throw new Error(`Invalid language for ${courseName}. Please use the correct programming language for this course.`);
  }

  // Get ONLY visible test cases for "Run" mode
  const testCasesResult = await queryWithRetry(
    `SELECT id, input_data, expected_output, test_case_number 
     FROM test_cases 
     WHERE question_id = ? AND is_hidden = 0
     ORDER BY test_case_number`,
    [questionId]
  );

  const testCasesRows = getRows(testCasesResult);
  if (testCasesRows.length === 0) {
    return {
      test_results: [],
      message: 'No visible test cases to run'
    };
  }

  // Execute code against visible test cases
  const { evaluateCode } = await import('./codeExecutionService');
  const testResults = await evaluateCode(
    code,
    language,
    testCasesRows,
    courseName
  );

  const passedCount = testResults.filter((r) => r.passed).length;

  return {
    test_results: testResults,
    test_cases_passed: passedCount,
    total_test_cases: testCasesRows.length,
  };
};

export const getAllSessions = async () => {
  const result = await pool.query(
    `SELECT id, user_id, course_id, level_id, session_type, status, total_questions, time_limit, created_at, completed_at
     FROM practice_sessions
     ORDER BY created_at DESC`
  );
  return getRows(result);
};