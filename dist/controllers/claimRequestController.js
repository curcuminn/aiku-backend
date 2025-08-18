"use strict";
// src/controllers/claimRequestController.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMyClaimRequests = exports.rejectClaimRequest = exports.approveClaimRequest = exports.listClaimRequests = exports.requestClaim = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ClaimRequest_1 = require("../models/ClaimRequest");
const Company_1 = require("../models/Company");
const JWT_SECRET = process.env.JWT_SECRET;
// ————————————————————————————————————————————————
// Helper: verify token and return payload
function verifyToken(req) {
    const header = req.header('Authorization') || '';
    const token = header.replace('Bearer ', '').trim();
    if (!token)
        throw new Error('Token missing');
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch (_a) {
        throw new Error('Invalid or expired token');
    }
}
// Helper: ensure admin role
function requireAdmin(req) {
    const decoded = verifyToken(req);
    if (decoded.role !== 'admin') {
        const err = new Error('Forbidden: admin only');
        err.status = 403;
        throw err;
    }
    return decoded;
}
// ————————————————————————————————————————————————
/**
 * @route   POST /api/claim-requests/:companyId
 * @desc    Create a new claim request for a company
 * @access  Authenticated users
 */
const requestClaim = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(companyId)) {
            return res.status(400).json({ success: false, message: 'Invalid company ID' });
        }
        const { id: userId } = verifyToken(req);
        const company = yield Company_1.Company.findById(companyId);
        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }
        if (company.user.toString() === userId) {
            return res.status(400).json({ success: false, message: 'You already own this company' });
        }
        const existing = yield ClaimRequest_1.ClaimRequest.findOne({
            company: companyId,
            user: userId,
            status: { $in: ['Pending', 'Approved'] },
        });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'A pending or approved claim request already exists'
            });
        }
        // Burada Mongoose'a ya string verip otomatik cast ettiriyoruz...
        const claim = yield ClaimRequest_1.ClaimRequest.create({
            company: companyId,
            user: userId
        });
        // ...ya da elle ObjectId örneği oluşturmak isterseniz:
        // const claim = await ClaimRequest.create({
        //   company: mongoose.Types.ObjectId(companyId),
        //   user:    mongoose.Types.ObjectId(userId)
        // });
        return res.status(201).json({ success: true, claim });
    }
    catch (err) {
        const status = err.status || 500;
        return res
            .status(status)
            .json({ success: false, message: err.message || 'Server error' });
    }
});
exports.requestClaim = requestClaim;
/**
 * @route   GET /api/claim-requests
 * @desc    List all claim requests (for admin)
 * @access  Admin only
 */
const listClaimRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        requireAdmin(req);
        const requests = yield ClaimRequest_1.ClaimRequest.find()
            .populate('company', 'companyName companyLogo')
            .populate('user', 'firstName lastName email profilePhoto');
        return res.status(200).json({ success: true, requests });
    }
    catch (err) {
        const status = err.status || 500;
        return res
            .status(status)
            .json({ success: false, message: err.message || 'Server error' });
    }
});
exports.listClaimRequests = listClaimRequests;
/**
 * @route   PATCH /api/claim-requests/:id/approve
 * @desc    Approve a pending claim request
 * @access  Admin only
 */
const approveClaimRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        requireAdmin(req);
        const { id: reqId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(reqId)) {
            return res.status(400).json({ success: false, message: 'Invalid request ID' });
        }
        const claim = yield ClaimRequest_1.ClaimRequest.findById(reqId);
        if (!claim) {
            return res.status(404).json({ success: false, message: 'Claim request not found' });
        }
        if (claim.status !== 'Pending') {
            return res.status(400).json({
                success: false,
                message: 'This claim request has already been processed'
            });
        }
        const company = yield Company_1.Company.findById(claim.company);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Associated company not found'
            });
        }
        company.user = claim.user;
        yield company.save();
        claim.status = 'Approved';
        yield claim.save();
        return res.status(200).json({
            success: true,
            message: 'Claim request approved',
            claim
        });
    }
    catch (err) {
        const status = err.status || 500;
        return res
            .status(status)
            .json({ success: false, message: err.message || 'Server error' });
    }
});
exports.approveClaimRequest = approveClaimRequest;
/**
 * @route   PATCH /api/claim-requests/:id/reject
 * @desc    Reject a pending claim request
 * @access  Admin only
 */
const rejectClaimRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        requireAdmin(req);
        const { id: reqId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(reqId)) {
            return res.status(400).json({ success: false, message: 'Invalid request ID' });
        }
        const claim = yield ClaimRequest_1.ClaimRequest.findById(reqId);
        if (!claim) {
            return res.status(404).json({ success: false, message: 'Claim request not found' });
        }
        if (claim.status !== 'Pending') {
            return res.status(400).json({
                success: false,
                message: 'This claim request has already been processed'
            });
        }
        claim.status = 'Rejected';
        yield claim.save();
        return res.status(200).json({
            success: true,
            message: 'Claim request rejected',
            claim
        });
    }
    catch (err) {
        const status = err.status || 500;
        return res
            .status(status)
            .json({ success: false, message: err.message || 'Server error' });
    }
});
exports.rejectClaimRequest = rejectClaimRequest;
// Kullanıcının kendi claim request’lerini listele
const listMyClaimRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // verifyToken’ın döndürdüğü id alanı userId
        const { id: userId } = verifyToken(req);
        const requests = yield ClaimRequest_1.ClaimRequest.find({ user: userId })
            .populate('company', 'companyName companyLogo')
            .populate('user', 'firstName lastName email profilePhoto');
        return res.status(200).json({ success: true, requests });
    }
    catch (err) {
        const status = err.status || 500;
        return res.status(status).json({ success: false, message: err.message });
    }
});
exports.listMyClaimRequests = listMyClaimRequests;
