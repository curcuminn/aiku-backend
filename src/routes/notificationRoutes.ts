import express from 'express';
import { protect } from '../middleware/auth';
import {
  getPushNotificationSettings,
  updatePushNotificationSettings,
  getAllNotificationSettings
} from '../controllers/notificationController';

const router = express.Router();

// Push notification ayarlarını getir
router.get('/push-settings', protect, getPushNotificationSettings);

// Push notification ayarlarını güncelle
router.put('/push-settings', protect, updatePushNotificationSettings);

// Tüm notification ayarlarını getir
router.get('/all-settings', protect, getAllNotificationSettings);

export default router;
