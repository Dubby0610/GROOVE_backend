import express from 'express';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import * as paymentController from '../controllers/paymentController.js';

const router = express.Router();

router.post('/intent', authenticateToken, paymentController.createPaymentIntent);
router.post('/verify', authenticateToken, paymentController.verifyPayment);

export default router; 