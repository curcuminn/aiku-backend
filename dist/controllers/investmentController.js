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
exports.getInvestmentsByProduct = exports.getInvestmentsByCompany = exports.getAllInvestments = exports.getInvestmentById = exports.deleteInvestment = exports.updateInvestment = exports.createInvestment = void 0;
const express_validator_1 = require("express-validator");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongoose_1 = __importDefault(require("mongoose"));
const Investment_1 = require("../models/Investment");
function parseCompletedInvestment(input) {
    const result = { amount: 0, description: '' };
    if (input == null)
        return result;
    if (typeof input === 'string') {
        const [amtStr, desc] = input.split('-').map(s => s.trim());
        const amount = parseFloat(amtStr.replace(/[^0-9.]/g, '')) || 0;
        return { amount, description: desc || '' };
    }
    if (typeof input === 'object') {
        const amount = Number(input.amount) || 0;
        const description = String(input.description || '');
        return { amount, description };
    }
    return result;
}
function parseCompletedInvestments(input) {
    if (!input)
        return [];
    const list = Array.isArray(input) ? input : [input];
    return list.map(item => parseCompletedInvestment(item));
}
// **Yeni Yatırım Teklifi Oluşturma**
const createInvestment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // 1) Validasyon hatalarını kontrol et
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        // 2) Yetkilendirme
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        // 3) Body’den alanları oku
        const { investmentTitle, companyName, companyId, targetedInvestment, minimumTicket, deadline, investmentType, description, logo, completedInvestments: rawCompleted, productName, productId, } = req.body;
        // 4) completedInvestment parse et
        const rawList = req.body.completedInvestments;
        const completedInvestments = parseCompletedInvestments(rawList);
        // 5) Oluşturma objesi
        const data = {
            investmentTitle,
            companyName,
            companyId,
            targetedInvestment,
            minimumTicket,
            deadline,
            investmentType,
            description,
            logo,
            completedInvestments,
            user: userId,
        };
        if (productName)
            data.productName = productName;
        if (productId)
            data.productId = productId;
        // 6) Kaydet
        const investment = yield Investment_1.Investment.create(data);
        res.status(201).json({ success: true, investment });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.createInvestment = createInvestment;
// **Yatırım Teklifini Güncelleme**
const updateInvestment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // 1) Yetkilendirme
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res
                .status(401)
                .json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        // 2) Yatırımı bul
        const { id } = req.params;
        const investment = yield Investment_1.Investment.findById(id);
        if (!investment) {
            return res
                .status(404)
                .json({ success: false, message: 'Yatırım teklifi bulunamadı' });
        }
        // 3) Sahip kontrolü
        // @ts-expect-error
        if (investment.user && investment.user.toString() !== userId) {
            return res
                .status(403)
                .json({ success: false, message: 'Güncelleme yetkiniz yok' });
        }
        // 4) Diğer alanları güncelle
        const updatableFields = [
            'investmentTitle',
            'companyName',
            'companyId',
            'targetedInvestment',
            'minimumTicket',
            'deadline',
            'investmentType',
            'description',
            'logo',
            'productName',
            'productId',
        ];
        updatableFields.forEach(field => {
            if (req.body[field] !== undefined) {
                // @ts-expect-error
                investment[field] = req.body[field];
            }
        });
        // 5) completedInvestments varsa parse edip ata
        if (req.body.completedInvestments !== undefined) {
            investment.completedInvestments = parseCompletedInvestments(req.body.completedInvestments);
        }
        // 6) Kaydet ve dön
        yield investment.save();
        res.status(200).json({ success: true, investment });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.updateInvestment = updateInvestment;
// **Yatırım Teklifini Silme**
const deleteInvestment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res
                .status(401)
                .json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const { id } = req.params;
        const investment = yield Investment_1.Investment.findById(id);
        if (!investment) {
            return res
                .status(404)
                .json({ success: false, message: 'Yatırım teklifi bulunamadı' });
        }
        // @ts-expect-error
        if (investment.user && investment.user.toString() !== userId) {
            return res
                .status(403)
                .json({ success: false, message: 'Silme yetkiniz yok' });
        }
        yield investment.deleteOne();
        res
            .status(200)
            .json({ success: true, message: 'Yatırım teklifi başarıyla silindi' });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.deleteInvestment = deleteInvestment;
// **Belirli Bir Yatırım Teklifini Getirme**
const getInvestmentById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const investment = yield Investment_1.Investment.findById(id)
            .populate('companyId', 'companyName companyLogo')
            .populate('productId', 'productName productLogo');
        if (!investment) {
            return res
                .status(404)
                .json({ success: false, message: 'Yatırım teklifi bulunamadı' });
        }
        res.status(200).json({ success: true, investment });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.getInvestmentById = getInvestmentById;
// **Tüm Yatırım Tekliflerini Getirme**
const getAllInvestments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const investments = yield Investment_1.Investment.find()
            .populate('companyId', 'companyName companyLogo')
            .populate('productId', 'productName productLogo');
        res.status(200).json({ success: true, investments });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.getAllInvestments = getAllInvestments;
// **Belirli Bir Şirkete Ait Yatırım Tekliflerini Getirme**
const getInvestmentsByCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(companyId)) {
            return res.status(400).json({ success: false, message: "Geçersiz Şirket ID'si" });
        }
        const investments = yield Investment_1.Investment.find({ companyId })
            .populate('companyId', 'companyName companyLogo')
            .populate('productId', 'productName productLogo');
        res.status(200).json({ success: true, investments });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.getInvestmentsByCompany = getInvestmentsByCompany;
// **Belirli Bir Ürüne Ait Yatırım Tekliflerini Getirme**
const getInvestmentsByProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: "Geçersiz Ürün ID'si" });
        }
        const investments = yield Investment_1.Investment.find({ productId })
            .populate('companyId', 'companyName companyLogo')
            .populate('productId', 'productName productLogo');
        res.status(200).json({ success: true, investments });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.getInvestmentsByProduct = getInvestmentsByProduct;
