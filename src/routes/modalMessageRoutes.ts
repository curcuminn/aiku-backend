import { Router } from 'express';
import { protect } from '../middleware/auth';
import { isAdmin } from '../middleware/isAdmin';
import {
  getActiveModalForMobile,
  createModalMessage,
  updateModalMessage,
  deleteModalMessage,
  listModalMessages,
} from '../controllers/modalMessageController';

const router = Router();

// Mobile uygulama: aktif mesajı getirir (sadece mobile audience)
router.get('/mobile/active', getActiveModalForMobile);

// Admin işlemleri
router.get('/', protect, listModalMessages);
router.post('/', protect, createModalMessage);
router.put('/:id', protect, updateModalMessage);
router.delete('/:id', protect, deleteModalMessage);

export default router;


