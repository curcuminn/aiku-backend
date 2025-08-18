"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const revenueCatController_1 = require("../controllers/revenueCatController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
/**
 * RevenueCat webhook endpoint
 * Bu endpoint RevenueCat'ten gelen tüm event'leri alır
 * Authentication gerektirmez çünkü RevenueCat'ten gelir
 */
router.post('/webhook', revenueCatController_1.handleRevenueCatWebhook);
/**
 * Kullanıcının RevenueCat abonelik durumunu kontrol eder
 * GET /api/revenuecat/subscription/:appUserId
 */
router.get('/subscription/:appUserId', auth_1.protect, revenueCatController_1.checkUserSubscriptionStatus);
/**
 * Kullanıcının RevenueCat bilgilerini alır
 * GET /api/revenuecat/user/:appUserId
 */
router.get('/user/:appUserId', auth_1.protect, revenueCatController_1.getUserRevenueCatInfo);
/**
 * Mobil uygulama için abonelik planlarını döndürür
 * GET /api/revenuecat/plans
 */
router.get('/plans', revenueCatController_1.getMobileSubscriptionPlans);
/**
 * Kullanıcının ödeme yöntemini kontrol eder
 * GET /api/revenuecat/payment-method
 */
router.get('/payment-method', auth_1.protect, revenueCatController_1.checkPaymentMethod);
exports.default = router;
