import express from 'express';
import {
  handleRevenueCatWebhook,
  checkUserSubscriptionStatus,
  getUserRevenueCatInfo,
  getMobileSubscriptionPlans,
  checkPaymentMethod,
  testWebhook,
  syncRevenueCatId,
  createTestUser,
  getTestUser
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
 * Test webhook endpoint (sadece geliştirme ortamında)
 * GET /api/revenuecat/test-webhook
 */
router.get('/test-webhook', testWebhook);

/**
 * RevenueCat ID senkronizasyon endpoint'i
 * POST /api/revenuecat/sync-user
 */
router.post('/sync-user', protect, syncRevenueCatId);

/**
 * Test kullanıcısı oluşturma endpoint'i (sadece geliştirme ortamında)
 * POST /api/revenuecat/test-user
 */
router.post('/test-user', createTestUser);

/**
 * Test kullanıcısı bilgilerini getirme endpoint'i
 * GET /api/revenuecat/test-user/:userId
 */
router.get('/test-user/:userId', getTestUser);

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
