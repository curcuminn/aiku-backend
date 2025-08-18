"use strict";
// src/routes/claimRequestRoutes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const claimRequestController_1 = require("../controllers/claimRequestController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Kullanıcı: bir şirkete claim talebi oluşturma
// POST /api/claim-requests/:companyId
router.post('/:companyId', auth_1.protect, claimRequestController_1.requestClaim);
// Admin: tüm claim taleplerini listeleme
// GET /api/claim-requests
router.get('/', auth_1.protect, claimRequestController_1.listClaimRequests);
router.get('/my', auth_1.protect, claimRequestController_1.listMyClaimRequests);
// Admin: bir talebi onaylama
// PATCH /api/claim-requests/:id/approve
router.patch('/:id/approve', auth_1.protect, claimRequestController_1.approveClaimRequest);
// Admin: bir talebi reddetme
// PATCH /api/claim-requests/:id/reject
router.patch('/:id/reject', auth_1.protect, claimRequestController_1.rejectClaimRequest);
exports.default = router;
