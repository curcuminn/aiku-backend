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
exports.listModalMessages = exports.deleteModalMessage = exports.updateModalMessage = exports.createModalMessage = exports.getActiveModalForMobile = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const ModalMessage_1 = require("../models/ModalMessage");
// Aktif modal mesajını getir (yalnızca mobile)
const getActiveModalForMobile = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const message = yield ModalMessage_1.ModalMessage.findOne({ isActive: true })
            .sort({ updatedAt: -1 })
            .lean();
        return res.status(200).json({ success: true, data: message || null });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.getActiveModalForMobile = getActiveModalForMobile;
// Admin: yeni modal mesaj oluştur
const createModalMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const message = yield ModalMessage_1.ModalMessage.create(req.body);
        return res.status(201).json({ success: true, data: message });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.createModalMessage = createModalMessage;
// Admin: modal mesaj güncelle
const updateModalMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Geçersiz ID' });
        }
        const updated = yield ModalMessage_1.ModalMessage.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Kayıt bulunamadı' });
        }
        return res.status(200).json({ success: true, data: updated });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.updateModalMessage = updateModalMessage;
// Admin: modal mesaj sil
const deleteModalMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Geçersiz ID' });
        }
        const deleted = yield ModalMessage_1.ModalMessage.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Kayıt bulunamadı' });
        }
        return res.status(200).json({ success: true, message: 'Silindi' });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.deleteModalMessage = deleteModalMessage;
// Admin: listele
const listModalMessages = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const items = yield ModalMessage_1.ModalMessage.find().sort({ createdAt: -1 });
        return res.status(200).json({ success: true, data: items });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.listModalMessages = listModalMessages;
