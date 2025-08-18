"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const complaintController_1 = require("../controllers/complaintController");
const auth_1 = require("../middleware/auth");
const express_validator_1 = require("express-validator");
const router = express_1.default.Router();
// Yeni bir şikayet oluşturma
// POST /api/complaints
router.post('/', auth_1.protect, [
    (0, express_validator_1.check)('messageId', 'Message ID is required').not().isEmpty(),
    (0, express_validator_1.check)('complaintType', 'Complaint type is required').not().isEmpty(),
], complaintController_1.createComplaint);
// Kullanıcının kendi şikayetlerini getirme
// GET /api/complaints/user
router.get('/user', auth_1.protect, complaintController_1.getUserComplaints);
// Admin: Tüm şikayetleri getirme
// GET /api/complaints/all
router.get('/all', auth_1.protect, auth_1.adminProtect, complaintController_1.getAllComplaints);
// Admin: Şikayet durumunu güncelleme
// PATCH /api/complaints/:complaintId
router.patch('/:complaintId', auth_1.protect, auth_1.adminProtect, [
    (0, express_validator_1.check)('status', 'Status is required').isIn([
        'pending',
        'reviewed',
        'resolved',
        'rejected',
    ]),
], complaintController_1.updateComplaintStatus);
exports.default = router;
