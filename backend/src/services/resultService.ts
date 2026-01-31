import pool from '../config/database';
import { getRows, getFirstRow } from '../utils/mysqlHelper';

export const getSessionResults = async (sessionId: string, userId: string) => {
  // Get session info
  const sessionResult = await pool.query(
    `SELECT s.id, s.session_type, s.status, s.started_at, s.completed_at,
            s.course_id, s.level_id,
            c.title as course_title, l.title as level_title,
            (SELECT COUNT(*) FROM student_tasks st 
             JOIN assignments a ON st.assignment_id = a.id
             WHERE st.user_id = s.user_id AND a.level_id = s.level_id AND st.status = 'completed') > 0 as is_assignment_completed
     FROM practice_sessions s
     JOIN courses c ON s.course_id = c.id
     JOIN levels l ON s.level_id = l.id
     WHERE s.id = ? AND s.user_id = ?`,
    [sessionId, userId]
  );

  const sessionRows = getRows(sessionResult);
  if (sessionRows.length === 0) {
    throw new Error('Session not found');
  }

  const session = sessionRows[0];

  // Get all questions in session
  const questionsResult = await pool.query(
    `SELECT q.id, q.title, q.description, q.question_type, q.input_format, q.output_format, q.constraints, q.reference_solution,
            q.explanation, q.concepts,
            sq.question_order, sq.status
     FROM session_questions sq
     JOIN questions q ON sq.question_id = q.id
     WHERE sq.session_id = ?
     ORDER BY sq.question_order`,
    [sessionId]
  );

  const questionsRows = getRows(questionsResult);

  // Get submissions for each question
  const questions = [];
  for (const question of questionsRows) {
    const submissionResult = await pool.query(
      `SELECT id, submitted_code, language, selected_option_id, is_correct, test_cases_passed, total_test_cases, submitted_at
       FROM user_submissions
       WHERE session_id = ? AND question_id = ?
       ORDER BY submitted_at DESC
       LIMIT 1`,
      [sessionId, question.id]
    );

    const submissionRows = getRows(submissionResult);
    const submission = submissionRows[0] || null;

    // Get test case results if coding question
    let testResults = [];
    if (question.question_type === 'coding' && submission) {
      const testResultsQuery = await pool.query(
        `SELECT tcr.passed, tcr.actual_output, tcr.error_message,
                tc.input_data, tc.expected_output, tc.is_hidden, tc.test_case_number
         FROM test_case_results tcr
         JOIN test_cases tc ON tcr.test_case_id = tc.id
         WHERE tcr.submission_id = ?
         ORDER BY tc.test_case_number`,
        [submission.id]
      );
      testResults = getRows(testResultsQuery);
    }

    // Get MCQ options if MCQ
    let options = [];
    if (question.question_type === 'mcq') {
      const optionsQuery = await pool.query(
        `SELECT id, option_text, is_correct, option_letter
         FROM mcq_options
         WHERE question_id = ?
         ORDER BY option_letter`,
        [question.id]
      );
      options = getRows(optionsQuery);
    }

    questions.push({
      ...question,
      submission,
      test_results: testResults,
      options,
    });
  }

  return {
    session,
    questions,
  };
};
