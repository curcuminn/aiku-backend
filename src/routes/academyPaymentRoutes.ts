import express from "express";
import {
  createCheckoutSession,
  handlePayTrCallback,
  getOrderDetails,
  sendTestAcademyEmail,
} from "../controllers/academyPaymentController";

const router = express.Router();

// Create checkout session (generates PayTR iframe token or bank transfer info)
router.post("/create-checkout", createCheckoutSession);

// PayTR webhook callback (PayTR servers POST to this endpoint)
router.post("/paytr-callback", express.urlencoded({ extended: true }), handlePayTrCallback);

// Get order status
router.get("/order/:orderId", getOrderDetails);

// Send test academy confirmation email via Brevo
router.post("/test-email", sendTestAcademyEmail);

export default router;
