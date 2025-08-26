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
  getTestUser,
  testUserWebhook,
  getUserSubscriptions,
  cancelSubscription,
  cancelAllSubscriptions,
  toggleSubscriptionRenewal,
  updateSubscriptionRenewal,
  updateUserRevenueCatId,
  testRealWebhook
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
 * Test user webhook endpoint (bu kullanıcı için)
 * GET /api/revenuecat/test-user-webhook
 */
router.get('/test-user-webhook', testUserWebhook);

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

/**
 * Kullanıcının tüm aboneliklerini getirir
 * GET /api/revenuecat/subscriptions
 */
router.get('/subscriptions', protect, getUserSubscriptions);

/**
 * Belirli bir aboneliği iptal eder
 * DELETE /api/revenuecat/subscriptions/:subscriptionId
 */
router.delete('/subscriptions/:subscriptionId', protect, cancelSubscription);

/**
 * Kullanıcının tüm aboneliklerini iptal eder
 * DELETE /api/revenuecat/subscriptions
 */
router.delete('/subscriptions', protect, cancelAllSubscriptions);

/**
 * Aboneliğin auto-renewal durumunu değiştirir (toggle)
 * PATCH /api/revenuecat/subscriptions/:subscriptionId/renewal/toggle
 */
router.patch('/subscriptions/:subscriptionId/renewal/toggle', protect, toggleSubscriptionRenewal);

/**
 * Aboneliğin auto-renewal durumunu belirli bir değere ayarlar
 * PATCH /api/revenuecat/subscriptions/:subscriptionId/renewal
 */
router.patch('/subscriptions/:subscriptionId/renewal', protect, updateSubscriptionRenewal);

/**
 * Kullanıcının RevenueCat ID'sini manuel olarak günceller
 * POST /api/revenuecat/update-user-id
 */
router.post('/update-user-id', protect, updateUserRevenueCatId);

/**
 * Gerçek webhook verisi ile test
 * POST /api/revenuecat/test-real-webhook
 */
router.post('/test-real-webhook', protect, testRealWebhook);

export default router;
