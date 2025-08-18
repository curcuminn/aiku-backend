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
exports.authenticateToken = exports.optionalSupabaseToken = exports.adminProtect = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
const errors_1 = require("../utils/errors");
const PanelUser_1 = require("../models/PanelUser");
dotenv_1.default.config();
// Supabase bağlantı bilgileri
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
// Request tipini genişletiyoruz - module augmentation kullanarak
require("express");
const protect = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    let token;
    if ((_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }
    else if ((_b = req.cookies) === null || _b === void 0 ? void 0 : _b.token) {
        token = req.cookies.token;
    }
    if (!token) {
        return res.status(401).json({ success: false, message: 'Oturum açmanız gerekiyor' });
    }
    try {
        // Token'i doğrula (hem normal hem panel login token'ı bu secret ile)
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        let userDoc;
        if (decoded.type === 'panel' && decoded.userId) {
            // panel login token
            userDoc = yield PanelUser_1.PanelUser.findById(decoded.userId).select('-password');
        }
        else if (decoded.id) {
            // normal email/password login token
            userDoc = yield User_1.User.findById(decoded.id).select('-password');
        }
        if (!userDoc) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
        }
        // İster PanelUser, ister normal User; frontend için ortak `req.user`
        req.user = userDoc;
        next();
    }
    catch (err) {
        console.error('Token doğrulama hatası:', err);
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
});
exports.protect = protect;
/**
 * Admin yetkilendirmesi için middleware
 * protect middleware'inden sonra kullanılmalıdır
 */
const adminProtect = (req, res, next) => {
    // protect middleware'i req.user'ı oluşturmuş olmalı
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Oturum açmanız gerekiyor'
        });
    }
    // Kullanıcının admin olup olmadığını kontrol et
    if (!req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Bu işlem için admin yetkileri gerekiyor'
        });
    }
    // Admin yetkisi doğrulandı, bir sonraki middleware'e geç
    next();
};
exports.adminProtect = adminProtect;
/**
 * Hem normal JWT token hem de Supabase token ile doğrulama yapan middleware
 * Önce JWT token kontrolü yapar, başarısız olursa Supabase token kontrolü yapar
 */
const optionalSupabaseToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    let token;
    if ((_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    }
    else if ((_b = req.cookies) === null || _b === void 0 ? void 0 : _b.token) {
        token = req.cookies.token;
    }
    if (!token) {
        return res.status(401).json({ success: false, message: 'Oturum açmanız gerekiyor' });
    }
    try {
        // 1) Önce JWT olarak deneyelim (normal user ya da panel user)
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            // -- panel token mı?
            if (decoded.type === 'panel' && decoded.userId) {
                const panelUser = yield PanelUser_1.PanelUser.findById(decoded.userId).select('-password');
                if (panelUser) {
                    req.user = panelUser;
                    return next();
                }
            }
            // -- normal JWT token mı?
            if (decoded.id) {
                const user = yield User_1.User.findById(decoded.id).select('-password');
                if (user) {
                    req.user = user;
                    return next();
                }
            }
        }
        catch (jwtErr) {
            // JWT doğrulama hatası ise bir sonraki adıma geç
            console.log('JWT doğrulama başarısız veya token tipi farklı, Supabase ile deneniyor');
        }
        // 2) Supabase token olarak dene
        const { data: { user: supabaseUser }, error } = yield supabase.auth.getUser(token);
        if (error || !supabaseUser) {
            return res.status(401).json({ success: false, message: 'Invalid or expired token', error: error === null || error === void 0 ? void 0 : error.message });
        }
        // Supabase ID ile MongoDB'deki kullanıcıyı bul
        const user = yield User_1.User.findOne({ supabaseId: supabaseUser.id });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
        }
        req.user = user;
        next();
    }
    catch (err) {
        console.error("Token doğrulama hatası:", err);
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
});
exports.optionalSupabaseToken = optionalSupabaseToken;
const authenticateToken = (req, _res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        throw new errors_1.UnauthorizedError('Token bulunamadı');
    }
    try {
        const user = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = user;
        next();
    }
    catch (error) {
        throw new errors_1.UnauthorizedError('Geçersiz token');
    }
};
exports.authenticateToken = authenticateToken;
