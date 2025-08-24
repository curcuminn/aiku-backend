import express from 'express';
import { protect } from '../middleware/auth';
import {
  getPushNotificationSettings,
  updatePushNotificationSettings,
  getAllNotificationSettings,
  savePushToken,
  deletePushToken,
  sendTestPushNotification
} from '../controllers/notificationController';

const router = express.Router();

// Push notification ayarlarını getir
router.get('/push-settings', protect, getPushNotificationSettings);

// Push notification ayarlarını güncelle
router.put('/push-settings', protect, updatePushNotificationSettings);

// Tüm notification ayarlarını getir
router.get('/all-settings', protect, getAllNotificationSettings);

// Push token kaydet
router.post('/push-tokens', protect, savePushToken);

// Push token sil
router.delete('/push-tokens', protect, deletePushToken);

// Test push notification gönder
router.post('/test-push', protect, sendTestPushNotification);

export default router;
