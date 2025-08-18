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
exports.getAllBlogs = exports.getBlogsByUser = exports.getBlogById = exports.deleteBlog = exports.updateBlog = exports.createBlog = void 0;
const express_validator_1 = require("express-validator");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongoose_1 = __importDefault(require("mongoose"));
const Blog_1 = require("../models/Blog");
// **Yeni Blog Oluşturma**
const createBlog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const { title, coverPhoto, fullContent } = req.body;
        const blog = yield Blog_1.Blog.create({
            title,
            coverPhoto,
            fullContent,
            author: userId,
            // isApproved otomatik false
        });
        res.status(201).json({ success: true, blog });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.createBlog = createBlog;
// **Blog Güncelleme (kendi içeriğini veya admin onayını değiştirme)**
const updateBlog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Token doğrulama
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const userRole = decoded.role; // ← role alanını alıyoruz
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Geçersiz Blog ID'si" });
        }
        const blog = yield Blog_1.Blog.findById(id);
        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog bulunamadı' });
        }
        // Sadece sahibi ya da admin güncelleyebilir
        if (blog.author.toString() !== userId && userRole !== 'admin') {
            return res.status(403).json({ success: false, message: 'Bu blog üzerinde yetkiniz yok' });
        }
        // Normal kullanıcılar sadece içerik değiştirebilir; admin 'isApproved' da değiştirebilir
        const updates = Object.assign({}, req.body);
        if (userRole !== 'admin') {
            delete updates.isApproved;
        }
        Object.assign(blog, updates);
        yield blog.save();
        res.status(200).json({ success: true, blog });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.updateBlog = updateBlog;
// **Blog Silme**
const deleteBlog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Geçersiz Blog ID'si" });
        }
        const blog = yield Blog_1.Blog.findById(id);
        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog bulunamadı' });
        }
        if (blog.author.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Bu blogu silme yetkiniz yok' });
        }
        yield blog.deleteOne();
        res.status(200).json({ success: true, message: 'Blog başarıyla silindi' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.deleteBlog = deleteBlog;
// **Belirli Bir Blogu Getirme**
const getBlogById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Geçersiz Blog ID'si" });
        }
        const blog = yield Blog_1.Blog.findById(id).populate('author', 'username email');
        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog bulunamadı' });
        }
        res.status(200).json({ success: true, blog });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.getBlogById = getBlogById;
// **Kullanıcının Tüm Bloglarını Getirme**
const getBlogsByUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const blogs = yield Blog_1.Blog.find({ author: userId })
            .sort({ createdAt: -1 })
            .populate('author', 'username');
        res.status(200).json({ success: true, blogs });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.getBlogsByUser = getBlogsByUser;
// **Tüm Blogları Getirme**
const getAllBlogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const blogs = yield Blog_1.Blog.find()
            .sort({ createdAt: -1 })
            .populate('author', 'username');
        res.status(200).json({ success: true, blogs });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.getAllBlogs = getAllBlogs;
