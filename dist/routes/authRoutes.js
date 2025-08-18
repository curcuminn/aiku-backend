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
const express_validator_1 = require("express-validator");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const linkedInService_1 = require("../services/linkedInService");
const supabase_1 = require("../config/supabase");
const googleService_1 = require("../services/googleService");
const logger_1 = __importDefault(require("../config/logger"));
const router = (0, express_1.Router)();
// Kayıt rotası
router.post("/register", [
    (0, express_validator_1.check)("firstName", "İsim alanı zorunludur").not().isEmpty(),
    (0, express_validator_1.check)("lastName", "Soyisim alanı zorunludur").not().isEmpty(),
    (0, express_validator_1.check)("email", "Lütfen geçerli bir email adresi giriniz").isEmail(),
    (0, express_validator_1.check)("password", "Şifre en az 6 karakter olmalıdır").isLength({ min: 6 }),
], authController_1.register);
// Giriş rotası
router.post("/login", [
    (0, express_validator_1.check)("email", "Lütfen geçerli bir email adresi giriniz").trim().isEmail().normalizeEmail(),
    (0, express_validator_1.check)("password", "Şifre alanı zorunludur").trim().notEmpty(),
], authController_1.login);
// Giriş yapmış kullanıcının bilgilerini alma rotası
router.get("/currentUser", auth_1.optionalSupabaseToken, authController_1.getCurrentUser);
// Kullanıcı bilgilerini güncelleme rotası
router.put("/updateUser", auth_1.optionalSupabaseToken, authController_1.updateUser);
router.put("/change-password", auth_1.protect, [
    (0, express_validator_1.check)("currentPassword", "Current password is required").notEmpty(),
    (0, express_validator_1.check)("newPassword", "New password must be at least 6 characters").isLength({ min: 6 }),
    (0, express_validator_1.check)("confirmPassword", "Passwords do not match")
        .custom((value, { req }) => value === req.body.newPassword),
], authController_1.changePassword);
// Kullanıcı id'si ile bilgilerini alma rotası
router.get("/user/:id", auth_1.optionalSupabaseToken, authController_1.getUserById);
router.put('/updateUserById/:id', auth_1.protect, authController_1.updateUserById);
router.post("/email/change/request", auth_1.protect, [
    (0, express_validator_1.check)("newEmail", "Please enter a valid email").isEmail().normalizeEmail()
], authController_1.requestEmailChange);
router.post("/email/change/confirm", [
    (0, express_validator_1.check)("code", "Verification code is required").isLength({ min: 6, max: 6 })
], authController_1.confirmEmailChange);
// **Yeni Eklenti: Tüm kullanıcıları çekme rotası (Sadece admin erişimi)**
router.get("/users", auth_1.protect, authController_1.getAllUsers);
// Abonelik durumunu kontrol et ve düzelt
router.get("/fix-subscription", auth_1.protect, authController_1.fixSubscription);
// Yeni abonelik oluşturma veya güncelleme
router.post("/subscription", auth_1.protect, [
    (0, express_validator_1.check)("plan", "Abonelik planı zorunludur").not().isEmpty(),
    (0, express_validator_1.check)("period", "Abonelik dönemi zorunludur").not().isEmpty(),
    (0, express_validator_1.check)("paymentMethod", "Ödeme yöntemi zorunludur").not().isEmpty(),
], authController_1.createOrUpdateSubscription);
// Trial abonelikleri kontrol etme ve yenileme (sadece admin)
router.post("/admin/check-trial-subscriptions", auth_1.protect, authController_1.checkAndRenewTrialSubscriptions);
// Favorilere öğe ekleme rotası
router.post("/favorites", auth_1.protect, [
    (0, express_validator_1.check)("type", "Favori türü (user, company, product) gereklidir")
        .not()
        .isEmpty(),
    (0, express_validator_1.check)("itemId", "Öğe ID gereklidir").not().isEmpty(),
], authController_1.addFavorite);
// Favoriden kaldırma rotası (DELETE isteği ile)
router.delete("/favorites", auth_1.protect, [
    (0, express_validator_1.check)("type", "Favori türü (user, company, product) gereklidir")
        .not()
        .isEmpty(),
    (0, express_validator_1.check)("itemId", "Öğe ID gereklidir").not().isEmpty(),
], authController_1.removeFavorite);
// Favori öğeleri çekme rotası
router.get("/favorites", auth_1.protect, authController_1.getFavorites);
// Google OAuth rotaları
router.get("/auth/google", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data, error } = yield supabase_1.supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${process.env.CLIENT_URL}/auth/callback`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });
        if (error)
            throw error;
        if (!data.url)
            throw new Error('Auth URL alınamadı');
        res.redirect(data.url);
    }
    catch (error) {
        console.error('Google auth error:', error);
        logger_1.default.error('Google auth error:', error);
        res.redirect(`${process.env.CLIENT_URL}/auth/login?error=auth-failed`);
    }
}));
// Google callback endpoint'i
router.get("/auth/callback", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { code } = req.query;
    if (!code) {
        return res.redirect(`${process.env.CLIENT_URL}/auth/login?error=no-code`);
    }
    try {
        const { data, error } = yield supabase_1.supabase.auth.exchangeCodeForSession(code.toString());
        if (error)
            throw error;
        // MongoDB ile senkronizasyon
        const googleService = new googleService_1.GoogleService();
        const authResult = yield googleService.handleAuth(data);
        res.redirect(`${process.env.CLIENT_URL}/auth/callback?session=${encodeURIComponent(JSON.stringify(authResult))}`);
    }
    catch (error) {
        console.error("Google callback error:", error);
        logger_1.default.error("Google callback error:", error);
        res.redirect(`${process.env.CLIENT_URL}/auth/login?error=callback-failed`);
    }
}));
// Google login endpoint'i - Token ile giriş
router.post("/google/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Google login isteği alındı:", {
            body: req.body,
            headers: req.headers
        });
        const { idToken, accessToken } = req.body;
        if (!idToken && !accessToken) {
            console.log("Google auth login token bulunamadı:", req.body);
            logger_1.default.error("Google auth login Token bulunamadı:", req.body);
            return res.status(400).json({
                success: false,
                error: "idToken veya accessToken gereklidir",
                details: "Kimlik doğrulama başarısız",
                errorCode: 400
            });
        }
        const googleService = new googleService_1.GoogleService();
        const authResult = yield googleService.handleAuth({
            user: {
                id_token: idToken,
                access_token: accessToken
            }
        });
        console.log("Google login başarılı:", { userId: authResult.user.id });
        res.json({
            token: authResult.token,
            user: authResult.user
        });
    }
    catch (error) {
        console.error("Google login error:", error);
        logger_1.default.error("Google login error:", error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: "Sunucu hatası",
            errorCode: 500
        });
    }
}));
// Oturum kapatma rotası
router.post("/logout", auth_1.protect, authController_1.logout);
// Self-delete
router.delete("/delete-account", auth_1.protect, authController_1.deleteCurrentUser);
// Admin: delete any user
router.delete("/users/:id", auth_1.protect, authController_1.deleteUserById);
// LinkedIn Routes
router.get("/linkedin", (req, res) => {
    const linkedInService = new linkedInService_1.LinkedInService();
    const authUrl = linkedInService.getAuthUrl();
    res.json({ authUrl });
});
router.post("/linkedin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: "Authorization code is required" });
        }
        const linkedInService = new linkedInService_1.LinkedInService();
        const accessToken = yield linkedInService.getAccessToken(code);
        const profile = yield linkedInService.getProfile(accessToken);
        const authResult = yield linkedInService.handleAuth(profile);
        res.json(authResult);
    }
    catch (error) {
        console.error("LinkedIn auth error:", error);
        logger_1.default.error("LinkedIn auth error:", error);
        res.status(500).json({ error: error.message });
    }
}));
// E-posta doğrulama rotaları
router.get("/verify-email/:token", authController_1.verifyEmail);
router.post("/resend-verification", [
    (0, express_validator_1.check)("email", "Please enter a valid email address.").isEmail(),
], authController_1.resendVerificationEmail);
exports.default = router;
