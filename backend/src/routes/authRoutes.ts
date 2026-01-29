import { Router } from 'express';
import { loginController, googleLoginController, registerController, forgotPasswordController, changePasswordController } from '../controllers/authController';

import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/login', loginController);
router.post('/google', googleLoginController);
router.post('/register', registerController);
router.post('/forgot-password', forgotPasswordController);
router.post('/change-password', authenticate, changePasswordController);

export default router;

