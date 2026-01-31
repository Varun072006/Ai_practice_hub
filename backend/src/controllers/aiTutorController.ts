import { Request, Response } from 'express';
import {
  getTutorResponse,
  getInitialHint,
  getFreeChatResponse,
  getCodingHint,
  checkOllamaHealth,
  TutorContext,
  TutorMessage
} from '../services/aiTutorService';
import { generateMCQHint } from '../services/mcqHintService';
import { generateSessionAnalysis, AnalysisInput } from '../services/analysisService';
import { AuthRequest } from '../middlewares/auth';
import logger from '../config/logger';
import pool from '../config/database';
import { getRows, getFirstRow } from '../utils/mysqlHelper';

/**
 * GET /api/ai-tutor/health
 * Check Ollama connection status
 */
export const healthCheckController = async (req: Request, res: Response): Promise<void> => {
  try {
    const health = await checkOllamaHealth();
    res.json(health);
  } catch (error: any) {
    logger.error('Health check error:', error);
    res.status(500).json({
      isOnline: false,
      modelAvailable: false,
      error: 'Failed to check Ollama status'
    });
  }
};

/**
 * POST /api/ai-tutor/chat
 * Session-aware tutor chat (from Results page)
 */
export const chatWithTutor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId, message } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    let context: TutorContext;

    if (sessionId) {
      // Get session and question context from DB
      const sessionResult = await pool.query(
        `SELECT s.id, s.session_type, sq.question_id, q.title, q.description, q.question_type, q.explanation
         FROM practice_sessions s
         JOIN session_questions sq ON s.id = sq.session_id
         JOIN questions q ON sq.question_id = q.id
         WHERE s.id = ? AND s.user_id = ?
         ORDER BY sq.question_order
         LIMIT 1`,
        [sessionId, userId]
      );

      const sessionRows = getRows(sessionResult);
      if (sessionRows.length === 0) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      const session = sessionRows[0];
      const questionId = session.question_id;

      // Get user submission
      const submissionResult = await pool.query(
        `SELECT submitted_code, language, selected_option_id
         FROM user_submissions
         WHERE session_id = ? AND question_id = ? AND user_id = ?
         ORDER BY submitted_at DESC
         LIMIT 1`,
        [sessionId, questionId, userId]
      );

      const submissionRows = getRows(submissionResult);
      const submission = submissionRows[0] || null;

      // Get failed test cases if coding question
      let failedTestCases: Array<{ input: string; expected: string; actual: string; error?: string }> = [];
      if (session.question_type === 'coding' && submission) {
        const testResults = await pool.query(
          `SELECT tc.input_data, tc.expected_output, tcr.actual_output, tcr.error_message
           FROM test_case_results tcr
           JOIN test_cases tc ON tcr.test_case_id = tc.id
           WHERE tcr.submission_id = (
             SELECT id FROM user_submissions 
             WHERE session_id = ? AND question_id = ? AND user_id = ?
             ORDER BY submitted_at DESC LIMIT 1
           )
           AND tcr.passed = false`,
          [sessionId, questionId, userId]
        );
        failedTestCases = getRows(testResults).map((tc: any) => ({
          input: tc.input_data,
          expected: tc.expected_output,
          actual: tc.actual_output || '',
          error: tc.error_message || undefined,
        }));
      }

      // Get correct answer for MCQ
      let correctAnswer = null;
      if (session.question_type === 'mcq') {
        const correctOption = await pool.query(
          `SELECT option_text FROM mcq_options
           WHERE question_id = ? AND is_correct = true
           LIMIT 1`,
          [questionId]
        );
        const correctOptionRows = getRows(correctOption);
        correctAnswer = correctOptionRows[0]?.option_text || null;
      }

      // Get reference solution for coding
      const questionResult = await pool.query(
        'SELECT reference_solution FROM questions WHERE id = ?',
        [questionId]
      );
      const questionRows = getRows(questionResult);
      const correctCode = questionRows[0]?.reference_solution || null;

      context = {
        questionTitle: session.title,
        questionDescription: session.description,
        userCode: submission?.submitted_code || undefined,
        correctCode: correctCode || undefined,
        failedTestCases,
        questionType: session.question_type as 'coding' | 'mcq',
        selectedAnswer: submission?.selected_option_id || undefined,
        correctAnswer: correctAnswer || undefined,
        explanation: session.explanation || undefined,
      };
    } else {
      // General chat context (no session)
      context = {
        questionTitle: "General Coding Help",
        questionDescription: "The user is asking for general assistance.",
        questionType: 'coding',
      };
    }

    const response = await getTutorResponse(message, context);
    res.json({ message: response });
  } catch (error: any) {
    logger.error('AI Tutor error:', error);
    res.status(500).json({ error: 'Failed to get tutor response' });
  }
};

/**
 * GET /api/ai-tutor/hint/:sessionId
 * Get initial hint for a session
 */
export const getInitialHintController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get session context
    const sessionResult = await pool.query(
      `SELECT s.session_type, sq.question_id, q.title, q.description, q.question_type
       FROM practice_sessions s
       JOIN session_questions sq ON s.id = sq.session_id
       JOIN questions q ON sq.question_id = q.id
       WHERE s.id = ? AND s.user_id = ?
       ORDER BY sq.question_order
       LIMIT 1`,
      [sessionId, userId]
    );

    const sessionRows = getRows(sessionResult);
    if (sessionRows.length === 0) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const session = sessionRows[0];

    const context: TutorContext = {
      questionTitle: session.title,
      questionDescription: session.description || '',
      questionType: session.question_type as 'coding' | 'mcq',
    };

    const hint = await getInitialHint(context);

    res.json({ hint });
  } catch (error: any) {
    logger.error('Get initial hint error:', error);
    res.status(500).json({ error: 'Failed to get hint' });
  }
};

/**
 * POST /api/ai-tutor/free-chat
 * Free-form AI coach chat (from AI Coach page)
 * Supports conversation history for contextual responses
 */
export const freeChatWithTutor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { message, conversationHistory, topic } = req.body as {
      message?: string;
      conversationHistory?: TutorMessage[];
      topic?: string;
    };

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    // Validate and sanitize conversation history
    const sanitizedHistory: TutorMessage[] = (conversationHistory || [])
      .filter(msg => msg.role && msg.content && ['user', 'assistant'].includes(msg.role))
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: String(msg.content).slice(0, 4000) // Limit message length
      }));

    // Get AI tutor response with conversation context
    const response = await getFreeChatResponse(message, sanitizedHistory, topic);

    res.json({ message: response, reply: response });
  } catch (error: any) {
    logger.error('AI Coach free-chat error:', error);
    res.status(500).json({ error: 'Failed to get tutor response' });
  }
};

/**
 * POST /api/ai-tutor/mcq-hint
 * Get AI-powered hint for MCQ questions
 */
export const getMCQHintController = async (req: AuthRequest, res: Response): Promise<void> => {
  const DEFAULT_FALLBACK = "Review the question's key terms. Try to eliminate obviously incorrect options first, then compare the remaining choices carefully.";

  try {
    const userId = req.user?.userId;
    const { questionId, attemptCount, previousHints } = req.body;

    logger.info(`[MCQ Hint] Request for questionId: ${questionId}, attemptCount: ${attemptCount}`);

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!questionId) {
      res.status(400).json({ error: 'Question ID is required' });
      return;
    }

    // Get question details
    const cleanQuestionId = typeof questionId === 'string' ? questionId.replace(/\s+/g, '') : questionId;

    let question = null;
    let options: string[] = [];

    try {
      const questionResult = await pool.query(
        `SELECT q.title, q.description, 
                GROUP_CONCAT(mo.option_text ORDER BY mo.option_label SEPARATOR '|||') as options
         FROM questions q
         LEFT JOIN mcq_options mo ON q.id = mo.question_id
         WHERE q.id = ?
         GROUP BY q.id`,
        [cleanQuestionId]
      );
      question = getFirstRow(questionResult);
    } catch (dbError: any) {
      logger.error(`[MCQ Hint DB ERROR] Failed to fetch question ${cleanQuestionId}: ${dbError.message}`);
    }

    if (!question) {
      logger.warn(`[MCQ Hint] Question not found or DB error for ID: ${cleanQuestionId}. Returning fallback.`);
      res.json({ hint: DEFAULT_FALLBACK, hintLevel: 'conceptual' });
      return;
    }

    logger.info(`[MCQ Hint] Question found: ${question.title}`);
    options = question.options ? question.options.split('|||') : [];

    // Use new isolated MCQ hint service
    const result = await generateMCQHint({
      questionTitle: question.title || '',
      questionDescription: question.description || '',
      options,
      attemptCount: attemptCount || 1,
      previousHints: Array.isArray(previousHints) ? previousHints : []
    });

    logger.info(`[MCQ Hint] Generated ${result.hintLevel} hint successfully`);
    res.json({ hint: result.hint, hintLevel: result.hintLevel });

  } catch (error: any) {
    logger.error(`[MCQ Hint CRITICAL ERROR] Unexpected error: ${error.message}`, { stack: error.stack });
    res.json({ hint: DEFAULT_FALLBACK, hintLevel: 'conceptual' });
  }
};

/**
 * POST /api/ai-tutor/coding-hint
 * Get AI-powered hint for coding questions (including HTML/CSS)
 */
export const getCodingHintController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { questionId, userCode, attemptCount, questionType } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!questionId) {
      res.status(400).json({ error: 'Question ID is required' });
      return;
    }

    // Get question details
    const questionResult = await pool.query(
      `SELECT q.title, q.description, q.question_type FROM questions q WHERE q.id = ?`,
      [questionId]
    );

    const question = getFirstRow(questionResult);
    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    // Get sample test cases (non-hidden)
    const testCasesResult = await pool.query(
      `SELECT input_data, expected_output FROM test_cases 
       WHERE question_id = ? AND is_hidden = false 
       ORDER BY id LIMIT 2`,
      [questionId]
    );
    const testCases = getRows(testCasesResult).map((tc: any) => ({
      input: tc.input_data,
      expected: tc.expected_output
    }));

    const hint = await getCodingHint(
      question.title,
      question.description,
      userCode || null,
      testCases,
      attemptCount || 1,
      questionType || question.question_type || 'coding'
    );

    res.json({ hint });
  } catch (error: any) {
    logger.error('Coding hint error:', error);
    res.status(500).json({ error: 'Failed to get hint' });
  }
};

/**
 * GET /api/ai-tutor/analysis/:sessionId
 * Generate comprehensive performance analysis
 */
export const getAnalysisController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!sessionId) {
      res.status(400).json({ error: 'Session ID is required' });
      return;
    }

    // 1. Fetch Session Details (JOIN for course/level info)
    const sessionResult = await pool.query(
      `SELECT s.id, s.session_type, 
              c.title as course_title, l.title as level_title,
              (SELECT COUNT(*) FROM user_progress WHERE session_id = s.id AND is_correct = 1) as correct_count,
              (SELECT COUNT(*) FROM user_progress WHERE session_id = s.id) as total_questions
       FROM practice_sessions s
       JOIN levels l ON s.level_id = l.id
       JOIN courses c ON l.course_id = c.id
       WHERE s.id = ? AND s.user_id = ?`,
      [sessionId, userId]
    );

    const session = getFirstRow(sessionResult);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // 2. Fetch Questions & Performance
    const questionsResult = await pool.query(
      `SELECT q.title, q.concepts, up.is_correct, up.submission_data, 
              COALESCE(TIMESTAMPDIFF(SECOND, up.started_at, up.completed_at), 60) as time_taken
       FROM user_progress up
       JOIN questions q ON up.question_id = q.id
       WHERE up.session_id = ?`,
      [sessionId]
    );
    const questions = getRows(questionsResult);

    // Calculate score
    const score = Math.round((session.correct_count / (session.total_questions || 1)) * 100);

    // 3. Transform data for isolated analysis service
    const analysisInput: AnalysisInput = {
      sessionType: session.session_type,
      courseTitle: session.course_title,
      levelTitle: session.level_title,
      score,
      totalQuestions: session.total_questions || 0,
      correctCount: session.correct_count || 0,
      questions: questions.map((q: any) => ({
        title: q.title,
        concepts: q.concepts,
        isCorrect: Boolean(q.is_correct),
        timeTaken: q.time_taken
      }))
    };

    // 4. Generate Analysis using isolated service
    const analysis = await generateSessionAnalysis(analysisInput);

    res.json(analysis);

  } catch (error: any) {
    logger.error(`[Performance Analysis ERROR] Failed for session ${req.params.sessionId}: ${error.message}`);
    res.status(500).json({ error: `Failed: ${error.message}` });
  }
};
