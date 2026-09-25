import express from "express";
import {
  createCheckoutSession,
  handlePayTrCallback,
  getOrderDetails,
  sendTestAcademyEmail,
  listAcademyOrders,
  updateAcademyOrderStatus,
} from "../controllers/academyPaymentController";

const router = express.Router();

// List all academy orders
router.get("/orders", listAcademyOrders);

// Update academy order payment status
router.patch("/orders/:id/status", updateAcademyOrderStatus);

// Create checkout session (generates PayTR iframe token or bank transfer info)
router.post("/create-checkout", createCheckoutSession);

// PayTR webhook callback (PayTR servers POST to this endpoint)
router.post("/paytr-callback", express.urlencoded({ extended: true }), handlePayTrCallback);

// Get order status
router.get("/order/:orderId", getOrderDetails);

// Send test academy confirmation email via Brevo
router.post("/test-email", sendTestAcademyEmail);

export default router;
