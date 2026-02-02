import { Router } from 'express';
import { getAllUsersController, getUserByIdController, updateUserController } from '../controllers/userController';

const router = Router();

router.get('/', getAllUsersController);
router.get('/:id', getUserByIdController);
router.put('/:id', updateUserController);

export default router;




