import { Router } from 'express';
import {
  getDashboardStatsController,
  getAllUsersController,
  getRecentActivityController,
  createCourseController,
  updateCourseController,
  deleteCourseController,

  createLevelController,
  deleteLevelController,
  getCoursesWithLevelsController,
  getStudentResultsController,
  createCodingQuestionController,
  createMCQQuestionController,
  getLevelQuestionsController,
  getQuestionByIdController,
  updateCodingQuestionController,
  updateMCQQuestionController,
  deleteQuestionController,
  updateLevelTimeLimitController,
  uploadCSVQuestionsController,
  uploadCSVMiddleware,

  updateLevelDetailsController,
  createUserController,
  updateUserController,
  deleteUserController,
  deleteQuestionsController,
  createAssignmentController,
  getAssignmentsController,
  getAssignmentDetailsController,
} from '../controllers/adminController';
import { getSessionResultsForAdminController } from '../controllers/resultController';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

router.get('/dashboard/stats', getDashboardStatsController);
router.get('/users', getAllUsersController);
router.post('/users', createUserController);
router.put('/users/:userId', updateUserController);
router.delete('/users/:userId', deleteUserController);
router.get('/activity', getRecentActivityController);
router.post('/courses', createCourseController);
router.put('/courses/:courseId', updateCourseController);
router.delete('/courses/:courseId', deleteCourseController);
router.post('/levels', createLevelController);
router.delete('/levels/:levelId', deleteLevelController);
router.get('/courses/with-levels', getCoursesWithLevelsController);
router.get('/results', getStudentResultsController);
router.get('/results/:sessionId', getSessionResultsForAdminController);  // Detailed session results for admin
router.post('/questions/coding', createCodingQuestionController);
router.post('/questions/mcq', createMCQQuestionController);
router.get('/levels/:levelId/questions', getLevelQuestionsController);
router.get('/questions/:questionId', getQuestionByIdController);
router.put('/questions/coding/:questionId', updateCodingQuestionController);
router.put('/questions/mcq/:questionId', updateMCQQuestionController);
router.delete('/questions/:questionId', deleteQuestionController);
router.put('/levels/:levelId/time-limit', updateLevelTimeLimitController);
router.put('/levels/:levelId/details', updateLevelDetailsController);
router.post('/questions/bulk-delete', deleteQuestionsController);
router.post('/questions/upload-csv', uploadCSVMiddleware, uploadCSVQuestionsController);

router.post('/assignments', createAssignmentController);
router.get('/assignments', getAssignmentsController);
router.get('/assignments/:id', getAssignmentDetailsController);



export default router;

