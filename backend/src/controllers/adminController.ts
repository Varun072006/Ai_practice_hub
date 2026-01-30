import { Response } from 'express';
import {
  getAllUsers,
  getRecentActivity,
  getDashboardStats,
  createCourse,
  updateCourse,
  deleteCourse,
  createLevel,
  deleteLevel,
  getCoursesWithLevels,
} from '../services/adminService';
import {
  createCodingQuestion,
  createMCQQuestion,
  getLevelQuestions,
  updateCodingQuestion,
  updateMCQQuestion,
  deleteQuestion,
  getQuestionById,
  deleteQuestions,
} from '../services/questionService';
import { updateLevelTimeLimit } from '../services/adminService';
import { parseAndCreateQuestionsFromCSV, CSVRow } from '../services/csvUploadService';
import { AuthRequest } from '../middlewares/auth';
import logger from '../config/logger';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { Request } from 'express';

export const getDashboardStatsController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (error: any) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

export const getAllUsersController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const searchTerm = req.query.search as string;
    const users = await getAllUsers(searchTerm);
    res.json(users);
  } catch (error: any) {
    logger.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};
// Force rebuild

export const createUserController = async (req: AuthRequest, res: Response): Promise<void> => {
  const { createUser } = await import('../services/adminService');
  try {
    const userId = await createUser(req.body);
    res.json({ id: userId, message: 'User created successfully' });
  } catch (error: any) {
    logger.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const updateUserController = async (req: AuthRequest, res: Response): Promise<void> => {
  const { updateUser } = await import('../services/adminService');
  try {
    const { userId } = req.params;
    await updateUser(userId, req.body);
    res.json({ message: 'User updated successfully' });
  } catch (error: any) {
    logger.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUserController = async (req: AuthRequest, res: Response): Promise<void> => {
  const { deleteUser } = await import('../services/adminService');
  try {
    const { userId } = req.params;
    await deleteUser(userId);
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    logger.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

export const getRecentActivityController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const searchTerm = req.query.search as string;
    const activity = await getRecentActivity(searchTerm);
    res.json(activity);
  } catch (error: any) {
    logger.error('Get recent activity error:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
};

export const createCourseController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, total_levels, image_url } = req.body;
    const courseId = await createCourse({ title, description, total_levels, image_url });
    res.json({ id: courseId, message: 'Course created successfully' });
  } catch (error: any) {
    logger.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
};

export const updateCourseController = async (req: AuthRequest, res: Response): Promise<void> => {
  const { updateCourse } = await import('../services/adminService');
  try {
    const { courseId } = req.params;
    await updateCourse(courseId, req.body);
    res.json({ message: 'Course updated successfully' });
  } catch (error: any) {
    logger.error('Update course error:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
};

export const deleteCourseController = async (req: AuthRequest, res: Response): Promise<void> => {
  const { deleteCourse } = await import('../services/adminService');
  try {
    const { courseId } = req.params;
    await deleteCourse(courseId);
    res.json({ message: 'Course deleted successfully' });
  } catch (error: any) {
    logger.error('Delete course error:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
};

export const createLevelController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { course_id, level_number, title, description, image_url } = req.body;
    const levelId = await createLevel({ course_id, level_number, title, description, image_url });
    res.json({ id: levelId, message: 'Level created successfully' });
  } catch (error: any) {
    logger.error('Create level error:', error);
    res.status(500).json({ error: 'Failed to create level' });
  }
};

export const deleteLevelController = async (req: AuthRequest, res: Response): Promise<void> => {
  const { deleteLevel } = await import('../services/adminService');
  try {
    const { levelId } = req.params;
    await deleteLevel(levelId);
    res.json({ message: 'Level deleted successfully' });
  } catch (error: any) {
    logger.error('Delete level error:', error);
    res.status(500).json({ error: 'Failed to delete level' });
  }
};

export const getCoursesWithLevelsController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const courses = await getCoursesWithLevels();
    res.json(courses);
  } catch (error: any) {
    logger.error('Get courses with levels error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

export const createCodingQuestionController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const questionId = await createCodingQuestion(req.body);
    res.json({ id: questionId, message: 'Question created successfully' });
  } catch (error: any) {
    logger.error('Create coding question error:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
};

export const createMCQQuestionController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const questionId = await createMCQQuestion(req.body);
    res.json({ id: questionId, message: 'Question created successfully' });
  } catch (error: any) {
    logger.error('Create MCQ question error:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
};

export const getLevelQuestionsController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { levelId } = req.params;
    const questions = await getLevelQuestions(levelId);
    res.json(questions);
  } catch (error: any) {
    logger.error('Get level questions error:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
};

export const getQuestionByIdController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { questionId } = req.params;
    logger.info(`Fetching question with ID: ${questionId}`);
    const question = await getQuestionById(questionId);
    if (!question) {
      logger.warn(`Question not found: ${questionId}`);
      res.status(404).json({ error: 'Question not found' });
      return;
    }
    logger.info(`Successfully fetched question: ${questionId}, type: ${question.question_type}`);
    res.json(question);
  } catch (error: any) {
    logger.error('Get question by id error:', error);
    logger.error('Error stack:', error.stack);
    res.status(error.message === 'Question not found' ? 404 : 500).json({
      error: error.message || 'Failed to fetch question',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const updateCodingQuestionController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { questionId } = req.params;
    await updateCodingQuestion(questionId, req.body);
    res.json({ message: 'Question updated successfully' });
  } catch (error: any) {
    logger.error('Update coding question error:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
};

export const updateMCQQuestionController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { questionId } = req.params;
    await updateMCQQuestion(questionId, req.body);
    res.json({ message: 'Question updated successfully' });
  } catch (error: any) {
    logger.error('Update MCQ question error:', error);
    res.status(500).json({
      error: error.message || 'Failed to update question',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const deleteQuestionController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { questionId } = req.params;
    await deleteQuestion(questionId);
    res.json({ message: 'Question deleted successfully' });
  } catch (error: any) {
    logger.error('Delete question error:', error);
    res.status(500).json({
      error: error.message || 'Failed to delete question',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const deleteQuestionsController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { questionIds } = req.body;

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      res.status(400).json({ error: 'Invalid or empty questionIds provided' });
      return;
    }

    await deleteQuestions(questionIds);
    res.json({ message: 'Questions deleted successfully' });
  } catch (error: any) {
    logger.error('Delete questions error:', error);
    res.status(500).json({
      error: error.message || 'Failed to delete questions',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const updateLevelTimeLimitController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { levelId } = req.params;
    const { time_limit } = req.body;
    await updateLevelTimeLimit(levelId, time_limit);
    res.json({ message: 'Time limit updated successfully' });
  } catch (error: any) {
    logger.error('Update level time limit error:', error);
    res.status(500).json({ error: 'Failed to update time limit' });
  }
};

// Configure multer for file upload
const upload = multer({ storage: multer.memoryStorage() });

interface MulterRequest extends AuthRequest {
  file?: Express.Multer.File;
}

export const uploadCSVQuestionsController = async (req: MulterRequest, res: Response): Promise<void> => {
  try {
    logger.info('[uploadCSVQuestionsController] CSV upload request received');

    if (!req.file) {
      logger.warn('[uploadCSVQuestionsController] No file uploaded');
      res.status(400).json({
        error: 'No file uploaded',
        details: 'Please select a CSV file to upload'
      });
      return;
    }

    const { level_id, question_type } = req.body;
    logger.info(`[uploadCSVQuestionsController] level_id: ${level_id}, question_type: ${question_type}`);
    logger.info(`[uploadCSVQuestionsController] Request body keys: ${Object.keys(req.body).join(', ')}`);

    if (!level_id) {
      logger.warn('[uploadCSVQuestionsController] level_id is missing');
      res.status(400).json({
        error: 'level_id is required',
        details: 'Please ensure the level ID is included in the upload request'
      });
      return;
    }

    // Parse CSV file
    logger.info(`[uploadCSVQuestionsController] Parsing CSV file. Size: ${req.file.size} bytes`);
    const csvContent = req.file.buffer.toString('utf-8');
    logger.info(`[uploadCSVQuestionsController] CSV content length: ${csvContent.length} characters`);
    logger.info(`[uploadCSVQuestionsController] CSV preview (first 200 chars): ${csvContent.substring(0, 200)}`);

    let parseResult: CSVRow[];
    try {
      parseResult = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true, // Allow inconsistent column counts (handles extra/missing columns)
        relax_quotes: true, // Allow quotes in unquoted fields
        cast: (value: any, context: any) => {
          // Transform header names to lowercase with underscores
          if (context.header) {
            return value.trim().toLowerCase().replace(/\s+/g, '_');
          }
          return value;
        },
      }) as CSVRow[];

      // Log column count mismatches after parsing
      if (parseResult.length > 0) {
        const headerKeys = Object.keys(parseResult[0]);
        parseResult.forEach((row, index) => {
          const rowKeys = Object.keys(row);
          if (rowKeys.length !== headerKeys.length) {
            logger.warn(`[uploadCSVQuestionsController] Row ${index + 2}: Column count mismatch. Expected: ${headerKeys.length}, Got: ${rowKeys.length}`);
          }
        });
      }
      logger.info(`[uploadCSVQuestionsController] CSV parsed successfully. Rows: ${parseResult.length}`);
      if (parseResult.length > 0) {
        logger.info(`[uploadCSVQuestionsController] First row keys: ${Object.keys(parseResult[0]).join(', ')}`);
      }
    } catch (parseError: any) {
      logger.error('[uploadCSVQuestionsController] CSV parsing error:', parseError);
      logger.error('[uploadCSVQuestionsController] Parse error stack:', parseError.stack);
      res.status(400).json({
        error: 'Failed to parse CSV file',
        details: parseError.message,
        hint: 'Please check CSV format and ensure headers are correct'
      });
      return;
    }

    if (parseResult.length === 0) {
      logger.warn('[uploadCSVQuestionsController] CSV file is empty or has no valid rows');
      res.status(400).json({
        error: 'CSV file is empty or has no valid rows',
        hint: 'Please ensure your CSV file has at least one data row (excluding headers)'
      });
      return;
    }

    // Process and create questions
    logger.info(`[uploadCSVQuestionsController] Processing ${parseResult.length} rows`);
    // Default to mcq if question_type isn't provided
    const normalizedQuestionType = (question_type || 'mcq') as 'coding' | 'mcq' | 'htmlcss';
    const result = await parseAndCreateQuestionsFromCSV(parseResult, level_id, normalizedQuestionType);
    logger.info(`[uploadCSVQuestionsController] Processing complete. Success: ${result.success}, Errors: ${result.errors.length}`);

    res.json({
      message: `Successfully created ${result.success} questions`,
      count: result.success,
      errors: result.errors,
    });
  } catch (error: any) {
    logger.error('[uploadCSVQuestionsController] CSV upload error:', error);
    logger.error('[uploadCSVQuestionsController] Error message:', error.message);
    logger.error('[uploadCSVQuestionsController] Error stack:', error.stack);
    logger.error('[uploadCSVQuestionsController] Error name:', error.name);

    const errorMessage = error.message || 'Failed to upload CSV file';
    res.status(500).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Export multer middleware for use in routes
export const uploadCSVMiddleware = upload.single('file');





export const updateLevelDetailsController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { levelId } = req.params;
    const { title, description, learning_materials } = req.body;

    logger.info(`[updateLevelDetailsController] Updating level ${levelId}`);
    logger.info(`[updateLevelDetailsController] Request body:`, {
      hasTitle: title !== undefined,
      hasDescription: description !== undefined,
      hasLearningMaterials: learning_materials !== undefined,
      learningMaterialsType: typeof learning_materials,
      learningMaterialsKeys: learning_materials && typeof learning_materials === 'object' ? Object.keys(learning_materials) : 'N/A'
    });

    // Log the actual content being saved (truncated for large objects)
    if (learning_materials) {
      const materialsStr = JSON.stringify(learning_materials);
      logger.info(`[updateLevelDetailsController] Learning materials content (first 500 chars):`, materialsStr.substring(0, 500));
    }

    // Import dynamically or move to top if no cycle
    const { updateLevelDetails } = await import('../services/adminService');

    await updateLevelDetails(levelId, {
      title,
      description,
      learning_materials,
      image_url: req.body.image_url
    });

    logger.info(`[updateLevelDetailsController] Successfully updated level ${levelId}`);
    res.json({ message: 'Level details updated successfully' });
  } catch (error: any) {
    logger.error('[updateLevelDetailsController] Update level details error:', error);
    logger.error('[updateLevelDetailsController] Error stack:', error.stack);
    logger.error('[updateLevelDetailsController] Error message:', error.message);
    logger.error('[updateLevelDetailsController] Error code:', error.code);

    const errorMessage = error.message || 'Failed to update level details';
    res.status(500).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const getStudentResultsController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { getStudentResults } = await import('../services/adminService'); // Dynamic import
    const searchTerm = req.query.search as string;
    const results = await getStudentResults(searchTerm);
    res.json(results);
  } catch (error: any) {
    logger.error('Get student results error:', error);
    res.status(500).json({ error: 'Failed to fetch student results' });
  }
};
