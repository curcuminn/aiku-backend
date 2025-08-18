import express from 'express';
import {
  handleRevenueCatWebhook,
  checkUserSubscriptionStatus,
  getUserRevenueCatInfo,
  getMobileSubscriptionPlans,
  checkPaymentMethod
} from '../controllers/revenueCatController';
import { protect } from '../middleware/auth';

const router = express.Router();

/**
 * RevenueCat webhook endpoint
 * Bu endpoint RevenueCat'ten gelen tüm event'leri alır
 * Authentication gerektirmez çünkü RevenueCat'ten gelir
 */
router.post('/webhook', handleRevenueCatWebhook);

/**
 * Kullanıcının RevenueCat abonelik durumunu kontrol eder
 * GET /api/revenuecat/subscription/:appUserId
 */
router.get('/subscription/:appUserId', protect, checkUserSubscriptionStatus);

/**
 * Kullanıcının RevenueCat bilgilerini alır
 * GET /api/revenuecat/user/:appUserId
 */
router.get('/user/:appUserId', protect, getUserRevenueCatInfo);

/**
 * Mobil uygulama için abonelik planlarını döndürür
 * GET /api/revenuecat/plans
 */
router.get('/plans', getMobileSubscriptionPlans);

/**
 * Kullanıcının ödeme yöntemini kontrol eder
 * GET /api/revenuecat/payment-method
 */
router.get('/payment-method', protect, checkPaymentMethod);

export default router;
