import express from "express";
import { authenticateToken } from "../middlewares/authMiddleware.js";
import * as paymentController from "../controllers/paymentController.js";

const router = express.Router();

router.post(
  "/intent",
  authenticateToken,
  paymentController.createPaymentIntent
);
router.post("/verify", authenticateToken, paymentController.verifyPayment);
router.post("/subscribe", authenticateToken, paymentController.subscribe);
router.post("/webhook", paymentController.stripeWebhook);
router.get(
  "/sync-customer",
  authenticateToken,
  paymentController.syncCustomerData
);

// Hourly plan helpers
router.post(
  "/update-remaining",
  authenticateToken,
  paymentController.updateRemainingTime
);
router.post(
  "/cancel",
  authenticateToken,
  paymentController.cancelSubscription
);

export default router;
