"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const chatController_1 = require("../controllers/chatController");
const auth_1 = require("../middleware/auth");
const express_validator_1 = require("express-validator");
const router = express_1.default.Router();
// Bir şirketin tüm sohbet oturumlarını getirme
// GET /api/chat/sessions/:companyId
router.get('/sessions/:companyId', auth_1.protect, chatController_1.getCompanyChatSessions);
// Yeni bir sohbet oturumu oluşturma
// POST /api/chat/sessions
router.post('/sessions', auth_1.protect, [
    (0, express_validator_1.check)('initiatorCompanyId', 'Başlatıcı şirket ID zorunludur')
        .not()
        .isEmpty(),
    (0, express_validator_1.check)('targetCompanyId', 'Hedef şirket ID zorunludur').not().isEmpty(),
    (0, express_validator_1.check)('title', 'Sohbet başlığı zorunludur').not().isEmpty(),
], chatController_1.createChatSession);
// Bir sohbet oturumunun mesajlarını getirme
// GET /api/chat/messages/:chatSessionId?companyId=xxx
router.get('/messages/:chatSessionId', auth_1.protect, chatController_1.getChatMessages);
// Yeni bir mesaj gönderme
// POST /api/chat/messages
router.post('/messages', auth_1.protect, [
    (0, express_validator_1.check)('chatSessionId', 'Sohbet oturumu ID zorunludur').not().isEmpty(),
    (0, express_validator_1.check)('senderId', 'Gönderen ID zorunludur').not().isEmpty(),
    (0, express_validator_1.check)('content', 'Mesaj içeriği zorunludur').not().isEmpty(),
], chatController_1.sendMessage);
// Sohbeti arşivleme/arşivden çıkarma
// PATCH /api/chat/archive/:chatSessionId
router.patch('/archive/:chatSessionId', auth_1.protect, chatController_1.toggleArchiveChat);
// Sohbeti silme
// DELETE /api/chat/sessions/:chatSessionId
router.delete('/sessions/:chatSessionId', auth_1.protect, chatController_1.deleteChat);
// Tüm şirketlere toplu mesaj gönderme
// POST /api/chat/broadcast
router.post('/broadcast', auth_1.protect, [
    (0, express_validator_1.check)('content', 'Mesaj içeriği zorunludur').not().isEmpty(),
], chatController_1.broadcastToAllCompanies);
// ————— Mevcut sohbet oturumlarını çek —————
// GET /api/chat/sessions/:companyId
router.get('/sessions/:companyId', auth_1.protect, chatController_1.getCompanyChatSessions);
// ————— Yeni: sadece online durumlarını çek —————
// GET /api/chat/sessions/:companyId/statuses
router.get('/sessions/:companyId/statuses', auth_1.protect, chatController_1.getCompanyChatStatuses);
exports.default = router;
