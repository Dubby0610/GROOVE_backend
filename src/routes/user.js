import express from 'express';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import * as userController from '../controllers/userController.js';

const router = express.Router();

router.get('/profile', authenticateToken, userController.getProfile);
router.get('/subscription', authenticateToken, userController.getSubscription);

export default router; 