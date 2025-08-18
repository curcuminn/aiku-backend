"use strict";
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
exports.updateComplaintStatus = exports.getAllComplaints = exports.getUserComplaints = exports.createComplaint = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Complaint_1 = require("../models/Complaint");
const Message_1 = require("../models/Message");
// Şikayet oluşturma
const createComplaint = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { messageId, complaintType, description } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // Middleware'den gelen kullanıcı bilgisi
        // Gerekli alanları kontrol et
        if (!messageId || !complaintType || !userId) {
            return res.status(400).json({
                success: false,
                message: 'Message ID, complaint type and user ID are required',
            });
        }
        // Geçerli bir MongoDB ObjectId mi kontrol et
        if (!mongoose_1.default.Types.ObjectId.isValid(messageId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid message ID',
            });
        }
        // Geçerli bir şikayet türü mü kontrol et
        if (!Object.values(Complaint_1.ComplaintType).includes(complaintType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid complaint type',
                validTypes: Object.values(Complaint_1.ComplaintType),
            });
        }
        // Mesajın var olduğunu kontrol et
        const messageExists = yield Message_1.Message.exists({ _id: messageId });
        if (!messageExists) {
            return res.status(404).json({
                success: false,
                message: 'Message not found',
            });
        }
        // Kullanıcının aynı mesaj için zaten bir şikayeti var mı kontrol et
        const existingComplaint = yield Complaint_1.Complaint.findOne({
            message: messageId,
            reporter: userId,
        });
        if (existingComplaint) {
            return res.status(400).json({
                success: false,
                message: 'You have already reported this message',
                data: existingComplaint,
            });
        }
        // Yeni şikayet oluştur
        const complaint = yield Complaint_1.Complaint.create({
            message: messageId,
            reporter: userId,
            complaintType,
            description: description || '',
            status: 'pending',
        });
        res.status(201).json({
            success: true,
            message: 'Complaint submitted successfully',
            data: complaint,
        });
    }
    catch (error) {
        console.error('Error creating complaint:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while submitting the complaint',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.createComplaint = createComplaint;
// Kullanıcının kendi şikayetlerini getirme
const getUserComplaints = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        const complaints = yield Complaint_1.Complaint.find({ reporter: userId })
            .populate('message')
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: complaints.length,
            data: complaints,
        });
    }
    catch (error) {
        console.error('Error getting user complaints:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while retrieving complaints',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.getUserComplaints = getUserComplaints;
// Admin: Tüm şikayetleri getirme
const getAllComplaints = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Kullanıcının admin olup olmadığını kontrol et
        if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.isAdmin)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required',
            });
        }
        const { status, complaintType, page = 1, limit = 20 } = req.query;
        const queryOptions = {};
        // Filtreleme seçenekleri
        if (status) {
            queryOptions.status = status;
        }
        if (complaintType) {
            queryOptions.complaintType = complaintType;
        }
        // Sayfalama
        const skip = (Number(page) - 1) * Number(limit);
        const complaints = yield Complaint_1.Complaint.find(queryOptions)
            .populate('message')
            .populate('reporter', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        const totalComplaints = yield Complaint_1.Complaint.countDocuments(queryOptions);
        res.status(200).json({
            success: true,
            count: complaints.length,
            totalPages: Math.ceil(totalComplaints / Number(limit)),
            currentPage: Number(page),
            data: complaints,
        });
    }
    catch (error) {
        console.error('Error getting all complaints:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while retrieving complaints',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.getAllComplaints = getAllComplaints;
// Admin: Şikayet durumunu güncelleme
const updateComplaintStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { complaintId } = req.params;
        const { status } = req.body;
        // Kullanıcının admin olup olmadığını kontrol et
        if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.isAdmin)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required',
            });
        }
        // Geçerli bir durum mu kontrol et
        if (!['pending', 'reviewed', 'resolved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value',
                validStatus: ['pending', 'reviewed', 'resolved', 'rejected'],
            });
        }
        const complaint = yield Complaint_1.Complaint.findByIdAndUpdate(complaintId, { status, updatedAt: new Date() }, { new: true, runValidators: true });
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found',
            });
        }
        res.status(200).json({
            success: true,
            message: 'Complaint status updated successfully',
            data: complaint,
        });
    }
    catch (error) {
        console.error('Error updating complaint status:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while updating the complaint status',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.updateComplaintStatus = updateComplaintStatus;
