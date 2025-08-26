import express from 'express';
import { protect } from '../middleware/auth';
import {
  getSubscriptionPlans,
  getUserSubscription,
  changeSubscriptionPlan,
  toggleAutoRenewal,
  getPaymentHistory,
  cancelSubscription,
  createSubscription,
  cancelSpecificSubscription,
  getAllSubscriptions,
  updateExistingSubscriptions,
  fixSubscriptionActiveStatus
} from '../controllers/subscriptionController';

const router = express.Router();

/**
 * @route   GET /api/subscriptions/plans
 * @desc    Tüm abonelik planlarını listeler
 * @access  Public
 */
router.get('/plans', getSubscriptionPlans);

/**
 * @route   GET /api/subscriptions/my-subscription
 * @desc    Kullanıcının mevcut abonelik bilgilerini getirir
 * @access  Private
 */
router.get('/my-subscription', protect, getUserSubscription);

/**
 * @route   POST /api/subscriptions/change-plan
 * @desc    Kullanıcının abonelik planını değiştirir
 * @access  Private
 */
router.post('/change-plan', protect, changeSubscriptionPlan);

/**
 * @route   POST /api/subscriptions/toggle-auto-renewal
 * @desc    Kullanıcının otomatik yenileme ayarını değiştirir
 * @access  Private
 */
router.post('/toggle-auto-renewal', protect, toggleAutoRenewal);

/**
 * @route   GET /api/subscriptions/payment-history
 * @desc    Kullanıcının ödeme geçmişini getirir
 * @access  Private
 */
router.get('/payment-history', protect, getPaymentHistory);

/**
 * @route   POST /api/subscriptions/cancel
 * @desc    Aboneliği iptal eder
 * @access  Private
 */
router.post('/cancel', protect, cancelSubscription);

/**
 * @route   POST /api/subscriptions/create
 * @desc    Yeni abonelik oluşturur
 * @access  Private
 */
router.post('/create', protect, createSubscription);

/**
 * @route   POST /api/subscriptions/:subscriptionId/cancel
 * @desc    Belirli bir aboneliği iptal eder
 * @access  Private
 */
router.post('/:subscriptionId/cancel', protect, cancelSpecificSubscription);

/**
 * @route   GET /api/subscriptions/all
 * @desc    Kullanıcının tüm aboneliklerini getirir
 * @access  Private
 */
router.get('/all', protect, getAllSubscriptions);

/**
 * @route   POST /api/subscriptions/update-existing
 * @desc    Mevcut abonelikleri günceller (test amaçlı)
 * @access  Private
 */
router.post('/update-existing', protect, updateExistingSubscriptions);

/**
 * @route   POST /api/subscriptions/fix-active-status
 * @desc    Mevcut aboneliğin isActive durumunu düzeltir
 * @access  Private
 */
router.post('/fix-active-status', protect, fixSubscriptionActiveStatus);

export default router; 