"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const modalMessageController_1 = require("../controllers/modalMessageController");
const router = (0, express_1.Router)();
// Mobile uygulama: aktif mesajı getirir (sadece mobile audience)
router.get('/mobile/active', modalMessageController_1.getActiveModalForMobile);
// Admin işlemleri
router.get('/', auth_1.protect, modalMessageController_1.listModalMessages);
router.post('/', auth_1.protect, modalMessageController_1.createModalMessage);
router.put('/:id', auth_1.protect, modalMessageController_1.updateModalMessage);
router.delete('/:id', auth_1.protect, modalMessageController_1.deleteModalMessage);
exports.default = router;
