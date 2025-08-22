import express from 'express';
import { auth } from '../middleware/auth';
import {
  getPushNotificationSettings,
  updatePushNotificationSettings,
  getAllNotificationSettings
} from '../controllers/notificationController';

const router = express.Router();

// Push notification ayarlarını getir
router.get('/push-settings', auth, getPushNotificationSettings);

// Push notification ayarlarını güncelle
router.put('/push-settings', auth, updatePushNotificationSettings);

// Tüm notification ayarlarını getir
router.get('/all-settings', auth, getAllNotificationSettings);

export default router;
