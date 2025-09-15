// src/controllers/claimRequestController.ts

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { ClaimRequest } from '../models/ClaimRequest';
import { Company } from '../models/Company';
import { startStartupTrialIfEligible } from "../services/TrialService";

const JWT_SECRET = process.env.JWT_SECRET!;

// ————————————————————————————————————————————————
// Helper: verify token and return payload
function verifyToken(req: Request): { id: string; role?: string } {
    const header = req.header('Authorization') || '';
    const token = header.replace('Bearer ', '').trim();
    if (!token) throw new Error('Token missing');
    try {
        return jwt.verify(token, JWT_SECRET) as any;
    } catch {
        throw new Error('Invalid or expired token');
    }
}

// Helper: ensure admin role
function requireAdmin(req: Request) {
    const decoded = verifyToken(req);
    if (decoded.role !== 'admin') {
        const err = new Error('Forbidden: admin only');
        (err as any).status = 403;
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
export const requestClaim = async (req: Request, res: Response) => {
    try {
        const { companyId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(companyId)) {
            return res.status(400).json({ success: false, message: 'Invalid company ID' });
        }

        const { id: userId } = verifyToken(req);

        const company = await Company.findById(companyId);
        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }
        if (company.user.toString() === userId) {
            return res.status(400).json({ success: false, message: 'You already own this company' });
        }

        const existing = await ClaimRequest.findOne({
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
        const claim = await ClaimRequest.create({
            company: companyId,
            user: userId
        });

        // ...ya da elle ObjectId örneği oluşturmak isterseniz:
        // const claim = await ClaimRequest.create({
        //   company: mongoose.Types.ObjectId(companyId),
        //   user:    mongoose.Types.ObjectId(userId)
        // });

        return res.status(201).json({ success: true, claim });
    } catch (err: any) {
        const status = err.status || 500;
        return res
            .status(status)
            .json({ success: false, message: err.message || 'Server error' });
    }
};

/**
 * @route   GET /api/claim-requests
 * @desc    List all claim requests (for admin)
 * @access  Admin only
 */
export const listClaimRequests = async (req: Request, res: Response) => {
    try {
        requireAdmin(req);

        const requests = await ClaimRequest.find()
            .populate('company', 'companyName companyLogo')
            .populate('user', 'firstName lastName email profilePhoto');

        return res.status(200).json({ success: true, requests });
    } catch (err: any) {
        const status = err.status || 500;
        return res
            .status(status)
            .json({ success: false, message: err.message || 'Server error' });
    }
};

/**
 * @route   PATCH /api/claim-requests/:id/approve
 * @desc    Approve a pending claim request
 * @access  Admin only
 */
export const approveClaimRequest = async (req: Request, res: Response) => {
    try {
        requireAdmin(req);
        const { id: reqId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(reqId)) {
            return res.status(400).json({ success: false, message: 'Invalid request ID' });
        }

        const claim = await ClaimRequest.findById(reqId);
        if (!claim) return res.status(404).json({ success: false, message: 'Claim request not found' });
        if (claim.status !== 'Pending') {
            return res.status(400).json({ success: false, message: 'This claim request has already been processed' });
        }

        const company = await Company.findById(claim.company);
        if (!company) return res.status(404).json({ success: false, message: 'Associated company not found' });

        company.user = claim.user;
        await company.save();

        claim.status = 'Approved';
        await claim.save();

        // ✅ Admin onayıyla 6 aylık trial (aboneliği yoksa)
        const trialResult = await startStartupTrialIfEligible(String(claim.user), {
            months: 6,
            source: "admin_approved_claim",
        });

        return res.status(200).json({
            success: true,
            message: 'Claim request approved',
            claim,
            trial: trialResult,
        });
    } catch (err: any) {
        const status = err.status || 500;
        return res.status(status).json({ success: false, message: err.message || 'Server error' });
    }
};

/**
 * @route   PATCH /api/claim-requests/:id/reject
 * @desc    Reject a pending claim request
 * @access  Admin only
 */
export const rejectClaimRequest = async (req: Request, res: Response) => {
    try {
        requireAdmin(req);

        const { id: reqId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(reqId)) {
            return res.status(400).json({ success: false, message: 'Invalid request ID' });
        }

        const claim = await ClaimRequest.findById(reqId);
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
        await claim.save();

        return res.status(200).json({
            success: true,
            message: 'Claim request rejected',
            claim
        });
    } catch (err: any) {
        const status = err.status || 500;
        return res
            .status(status)
            .json({ success: false, message: err.message || 'Server error' });
    }
};

// Kullanıcının kendi claim request’lerini listele
export const listMyClaimRequests = async (req: Request, res: Response) => {
    try {
        // verifyToken’ın döndürdüğü id alanı userId
        const { id: userId } = verifyToken(req);

        const requests = await ClaimRequest.find({ user: userId })
            .populate('company', 'companyName companyLogo')
            .populate('user', 'firstName lastName email profilePhoto');

        return res.status(200).json({ success: true, requests });
    } catch (err: any) {
        const status = err.status || 500;
        return res.status(status).json({ success: false, message: err.message });
    }
};

