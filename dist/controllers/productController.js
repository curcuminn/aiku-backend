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
exports.getAllProducts = exports.getProductsByCompany = exports.getProductsByUser = exports.getProductById = exports.deleteProduct = exports.updateProduct = exports.createProduct = void 0;
const express_validator_1 = require("express-validator");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Product_1 = require("../models/Product");
const mongoose_1 = __importDefault(require("mongoose"));
// **Yeni Ürün Oluşturma**
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Validasyon hatalarını kontrol et
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        // Token doğrulama
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const { productName, productLogo, productCategory, productDescription, detailedDescription, tags, problems, solutions, improvements, keyFeatures, pricingModel, releaseDate, productPrice, productWebsite, productLinkedIn, productTwitter, isHighlighted, companyName, companyId, } = req.body;
        // Yeni ürün oluştur
        const product = yield Product_1.Product.create({
            productName,
            productLogo,
            productCategory,
            productDescription,
            detailedDescription,
            tags,
            problems,
            solutions,
            improvements,
            keyFeatures,
            pricingModel,
            releaseDate,
            productPrice,
            productWebsite,
            productLinkedIn,
            productTwitter,
            isHighlighted,
            companyName,
            companyId,
            user: userId,
        });
        res.status(201).json({ success: true, product });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.createProduct = createProduct;
// **Ürünü Güncelleme**
const updateProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const { id } = req.params;
        let product = yield Product_1.Product.findById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Ürün bulunamadı' });
        }
        if (product.user.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Bu ürünü güncelleme yetkiniz yok' });
        }
        // Güncellenecek alanları belirle
        Object.assign(product, req.body);
        yield product.save();
        res.status(200).json({ success: true, product });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.updateProduct = updateProduct;
// **Ürünü Silme**
const deleteProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const { id } = req.params;
        const product = yield Product_1.Product.findById(id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Ürün bulunamadı' });
        }
        if (product.user.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Bu ürünü silme yetkiniz yok' });
        }
        yield product.deleteOne();
        res.status(200).json({ success: true, message: 'Ürün başarıyla silindi' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.deleteProduct = deleteProduct;
// **Belirli Bir Ürünü Getirme**
const getProductById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const product = yield Product_1.Product.findById(id).populate('companyId', 'companyName companyLogo');
        if (!product) {
            return res.status(404).json({ success: false, message: 'Ürün bulunamadı' });
        }
        res.status(200).json({ success: true, product });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.getProductById = getProductById;
// **Kullanıcının Tüm Ürünlerini Getirme**
const getProductsByUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const products = yield Product_1.Product.find({ user: userId }).populate('companyId', 'companyName companyLogo');
        res.status(200).json({ success: true, products });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.getProductsByUser = getProductsByUser;
// **Belirli Bir Şirkete Ait Ürünleri Getirme**
const getProductsByCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(companyId)) {
            return res.status(400).json({ success: false, message: "Geçersiz Şirket ID'si" });
        }
        const products = yield Product_1.Product.find({ companyId: companyId }).populate('companyId', 'companyName companyLogo');
        res.status(200).json({ success: true, products });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.getProductsByCompany = getProductsByCompany;
// **Tüm Ürünleri Getirme**
const getAllProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Ürünleri getir ve ilgili şirket bilgilerini al
        const products = yield Product_1.Product.find()
            .populate({
            path: "user",
            select: "accountStatus",
            match: { accountStatus: "active" }
        })
            .populate("companyId", "companyName companyLogo");
        const activeProducts = products.filter((p) => p.user);
        return res.status(200).json({ success: true, products: activeProducts });
    }
    catch (err) {
        console.error("❌ Sunucu hatası:", err.message);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});
exports.getAllProducts = getAllProducts;
