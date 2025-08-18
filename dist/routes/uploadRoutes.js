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
const express_1 = require("express");
const upload_1 = require("../config/upload");
const auth_1 = require("../middleware/auth");
const Company_1 = require("../models/Company");
const Product_1 = require("../models/Product");
const InvestmentNews_1 = require("../models/InvestmentNews");
const Hub_1 = require("../models/Hub");
const Blog_1 = require("../models/Blog");
const TeamMember_1 = require("../models/TeamMember");
const Investment_1 = require("../models/Investment");
const fileUtils_1 = require("../utils/fileUtils");
const logger_1 = __importDefault(require("../config/logger"));
const router = (0, express_1.Router)();
// Takım Üyesi Profil Fotoğrafı Yükleme / Güncelleme
router.post('/team-member-profile-photo/:teamMemberId', auth_1.protect, upload_1.upload.single('photo'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Lütfen bir dosya yükleyin'
            });
        }
        const teamMember = yield TeamMember_1.TeamMember.findById(req.params.teamMemberId);
        if (!teamMember) {
            return res.status(404).json({
                success: false,
                message: 'Takım üyesi bulunamadı'
            });
        }
        // Eski fotoğrafı sil
        if (teamMember.profilePhoto) {
            (0, fileUtils_1.deleteFile)(teamMember.profilePhoto);
        }
        // Dosya yolunu oluştur
        const fileUrl = `/uploads/images/${req.file.filename}`;
        // Takım üyesinin profil fotoğrafını güncelle
        teamMember.profilePhoto = fileUrl;
        yield teamMember.save();
        res.status(200).json({
            success: true,
            message: 'Takım üyesi profil fotoğrafı başarıyla yüklendi',
            data: { url: fileUrl }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Dosya yükleme hatası',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
        logger_1.default.error('Dosya yükleme hatası', {
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
}));
// Takım Üyesi Profil Fotoğrafı Silme
router.delete('/team-member-profile-photo/:teamMemberId', auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const teamMember = yield TeamMember_1.TeamMember.findById(req.params.teamMemberId);
        if (!teamMember) {
            return res.status(404).json({
                success: false,
                message: 'Takım üyesi bulunamadı'
            });
        }
        if (teamMember.profilePhoto) {
            (0, fileUtils_1.deleteFile)(teamMember.profilePhoto);
            teamMember.profilePhoto = undefined;
            yield teamMember.save();
        }
        res.status(200).json({
            success: true,
            message: 'Takım üyesi profil fotoğrafı başarıyla silindi'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Dosya silme hatası',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
        logger_1.default.error('Dosya silme hatası', {
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
}));
// Profil fotoğrafı yükleme
router.post('/profile-photo', auth_1.protect, upload_1.upload.single('photo'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Lütfen bir dosya yükleyin'
            });
        }
        // Dosya yolu
        const fileUrl = `/uploads/images/${req.file.filename}`;
        // Eski fotoğrafı sil
        if (req.user && req.user.profilePhoto) {
            (0, fileUtils_1.deleteFile)(req.user.profilePhoto);
        }
        // Kullanıcının profil fotoğrafını güncelle
        if (req.user) {
            req.user.profilePhoto = fileUrl;
            yield req.user.save();
        }
        res.status(200).json({
            success: true,
            message: 'Profil fotoğrafı başarıyla yüklendi',
            data: {
                url: fileUrl
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Dosya yükleme hatası',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
        logger_1.default.error('Dosya yükleme hatası', {
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
}));
// Profil fotoğrafı silme
router.delete('/profile-photo', auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (req.user && req.user.profilePhoto) {
            (0, fileUtils_1.deleteFile)(req.user.profilePhoto);
            req.user.profilePhoto = undefined;
            yield req.user.save();
        }
        res.status(200).json({
            success: true,
            message: 'Profil fotoğrafı başarıyla silindi'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Dosya silme hatası',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
        logger_1.default.error('Dosya silme hatası', {
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
}));
// Şirket logosu yükleme/güncelleme
router.post('/company-logo/:companyId', auth_1.protect, upload_1.upload.single('logo'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Lütfen bir dosya yükleyin'
            });
        }
        const company = yield Company_1.Company.findById(req.params.companyId);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Şirket bulunamadı'
            });
        }
        // Eski logoyu sil
        if (company.companyLogo) {
            (0, fileUtils_1.deleteFile)(company.companyLogo);
        }
        // Dosya yolu
        const fileUrl = `/uploads/images/${req.file.filename}`;
        // Şirket logosunu güncelle
        company.companyLogo = fileUrl;
        yield company.save();
        res.status(200).json({
            success: true,
            message: 'Şirket logosu başarıyla yüklendi',
            data: {
                url: fileUrl
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Dosya yükleme hatası',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
        logger_1.default.error('Dosya yükleme hatası', {
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
}));
// Şirket logosu silme
router.delete('/company-logo/:companyId', auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const company = yield Company_1.Company.findById(req.params.companyId);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Şirket bulunamadı'
            });
        }
        if (company.companyLogo) {
            (0, fileUtils_1.deleteFile)(company.companyLogo);
            company.companyLogo = undefined;
            yield company.save();
        }
        res.status(200).json({
            success: true,
            message: 'Şirket logosu başarıyla silindi'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Dosya silme hatası',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
}));
// Ürün logosu yükleme/güncelleme
router.post('/product-logo/:productId', auth_1.protect, upload_1.upload.single('logo'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Lütfen bir dosya yükleyin'
            });
        }
        const product = yield Product_1.Product.findById(req.params.productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Ürün bulunamadı'
            });
        }
        // Eski logoyu sil
        if (product.productLogo) {
            (0, fileUtils_1.deleteFile)(product.productLogo);
        }
        // Dosya yolu
        const fileUrl = `/uploads/images/${req.file.filename}`;
        // Ürün logosunu güncelle
        product.productLogo = fileUrl;
        yield product.save();
        res.status(200).json({
            success: true,
            message: 'Ürün logosu başarıyla yüklendi',
            data: {
                url: fileUrl
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Dosya yükleme hatası',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
}));
// Ürün logosu silme
router.delete('/product-logo/:productId', auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const product = yield Product_1.Product.findById(req.params.productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Ürün bulunamadı'
            });
        }
        if (product.productLogo) {
            (0, fileUtils_1.deleteFile)(product.productLogo);
            product.productLogo = undefined;
            yield product.save();
        }
        res.status(200).json({
            success: true,
            message: 'Ürün logosu başarıyla silindi'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Dosya silme hatası',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
}));
// Yatırım Teklifi Logosunu Yükleme / Güncelleme
router.post('/investment-logo/:investmentId', auth_1.protect, upload_1.upload.single('logo'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Lütfen bir dosya yükleyin'
            });
        }
        const investment = yield Investment_1.Investment.findById(req.params.investmentId);
        if (!investment) {
            return res.status(404).json({
                success: false,
                message: 'Yatırım teklifi bulunamadı'
            });
        }
        // Eski logoyu sil
        if (investment.logo) {
            (0, fileUtils_1.deleteFile)(investment.logo);
        }
        // Dosya yolu oluşturma
        const fileUrl = `/uploads/images/${req.file.filename}`;
        // Yatırım teklifinin logosunu güncelleme
        investment.logo = fileUrl;
        yield investment.save();
        res.status(200).json({
            success: true,
            message: 'Yatırım teklifi logosu başarıyla yüklendi',
            data: { url: fileUrl }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Dosya yükleme hatası',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
}));
// Yatırım Teklifi Logosunu Silme
router.delete('/investment-logo/:investmentId', auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const investment = yield Investment_1.Investment.findById(req.params.investmentId);
        if (!investment) {
            return res.status(404).json({
                success: false,
                message: 'Yatırım teklifi bulunamadı'
            });
        }
        if (investment.logo) {
            (0, fileUtils_1.deleteFile)(investment.logo);
            investment.logo = undefined;
            yield investment.save();
        }
        res.status(200).json({
            success: true,
            message: 'Yatırım teklifi logosu başarıyla silindi'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Dosya silme hatası',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
}));
// Döküman yükleme
router.post('/document', auth_1.protect, upload_1.upload.single('document'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Lütfen bir dosya yükleyin'
            });
        }
        const fileUrl = `/uploads/documents/${req.file.filename}`;
        res.status(200).json({
            success: true,
            message: 'Döküman başarıyla yüklendi',
            data: {
                url: fileUrl
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Dosya yükleme hatası',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
}));
router.post('/blog-cover/:blogId', auth_1.protect, upload_1.upload.single('cover'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Lütfen bir dosya yükleyin'
            });
        }
        const blog = yield Blog_1.Blog.findById(req.params.blogId);
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog bulunamadı'
            });
        }
        // Eski cover fotoğrafını sil
        if (blog.coverPhoto) {
            (0, fileUtils_1.deleteFile)(blog.coverPhoto);
        }
        // Yeni dosya yolu
        const fileUrl = `/uploads/images/${req.file.filename}`;
        // Blog coverPhoto alanını güncelle
        blog.coverPhoto = fileUrl;
        yield blog.save();
        res.status(200).json({
            success: true,
            message: 'Blog cover fotoğrafı başarıyla yüklendi',
            data: { url: fileUrl }
        });
    }
    catch (error) {
        logger_1.default.error('Blog cover yükleme hatası', {
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
        res.status(500).json({
            success: false,
            message: 'Dosya yükleme hatası',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
}));
// **Blog Cover Fotoğrafı Silme**
router.delete('/blog-cover/:blogId', auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const blog = yield Blog_1.Blog.findById(req.params.blogId);
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: 'Blog bulunamadı'
            });
        }
        if (blog.coverPhoto) {
            (0, fileUtils_1.deleteFile)(blog.coverPhoto);
            blog.coverPhoto = null;
            yield blog.save();
        }
        res.status(200).json({
            success: true,
            message: 'Blog cover fotoğrafı başarıyla silindi'
        });
    }
    catch (error) {
        logger_1.default.error('Blog cover silme hatası', {
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
        res.status(500).json({
            success: false,
            message: 'Dosya silme hatası',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
}));
// InvestmentNews kapak görseli yükleme
router.post('/investment-news-cover/:newsId', auth_1.protect, upload_1.upload.single('cover'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Lütfen bir dosya yükleyin'
            });
        }
        const news = yield InvestmentNews_1.InvestmentNews.findById(req.params.newsId);
        if (!news) {
            return res.status(404).json({
                success: false,
                message: 'Yatırım haberi bulunamadı'
            });
        }
        // Eski görsel varsa sil
        if (news.coverPhoto) {
            (0, fileUtils_1.deleteFile)(news.coverPhoto);
        }
        const fileUrl = `/uploads/images/${req.file.filename}`;
        news.coverPhoto = fileUrl;
        yield news.save();
        res.status(200).json({
            success: true,
            message: 'Kapak görseli başarıyla yüklendi',
            data: { url: fileUrl }
        });
    }
    catch (error) {
        logger_1.default.error('InvestmentNews cover yükleme hatası', {
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
        res.status(500).json({
            success: false,
            message: 'Yükleme hatası',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
}));
// InvestmentNews kapak görseli silme
router.delete('/investment-news-cover/:newsId', auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const news = yield InvestmentNews_1.InvestmentNews.findById(req.params.newsId);
        if (!news) {
            return res.status(404).json({
                success: false,
                message: 'Yatırım haberi bulunamadı'
            });
        }
        if (news.coverPhoto) {
            (0, fileUtils_1.deleteFile)(news.coverPhoto);
            news.coverPhoto = null;
            yield news.save();
        }
        res.status(200).json({
            success: true,
            message: 'Kapak görseli başarıyla silindi'
        });
    }
    catch (error) {
        logger_1.default.error('InvestmentNews cover silme hatası', {
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
        res.status(500).json({
            success: false,
            message: 'Silme hatası',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
}));
// Hub logosu yükleme/güncelleme
router.post('/hub-logo/:hubId', auth_1.protect, upload_1.upload.single('logo'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload a file'
            });
        }
        const hub = yield Hub_1.Hub.findById(req.params.hubId);
        if (!hub) {
            return res.status(404).json({
                success: false,
                message: 'Hub not found'
            });
        }
        // Eski logoyu sil
        if (hub.logoUrl) {
            (0, fileUtils_1.deleteFile)(hub.logoUrl);
        }
        const fileUrl = `/uploads/images/${req.file.filename}`;
        hub.logoUrl = fileUrl;
        yield hub.save();
        res.status(200).json({
            success: true,
            message: 'Hub logo uploaded successfully',
            data: { url: fileUrl }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'File upload error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// Hub logosu silme
router.delete('/hub-logo/:hubId', auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const hub = yield Hub_1.Hub.findById(req.params.hubId);
        if (!hub) {
            return res.status(404).json({
                success: false,
                message: 'Hub not found'
            });
        }
        if (hub.logoUrl) {
            (0, fileUtils_1.deleteFile)(hub.logoUrl);
            hub.logoUrl = undefined;
            yield hub.save();
        }
        res.status(200).json({
            success: true,
            message: 'Hub logo deleted successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'File deletion error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
exports.default = router;
