import { Router } from "express";
import { check } from "express-validator";
import {
  register,
  login,
  getCurrentUser,
  updateUser,
  changePassword,
  getUserById,
  getAllUsers,
  addFavorite,
  removeFavorite,
  getFavorites,
  googleCallback,
  fixSubscription,
  createOrUpdateSubscription,
  checkAndRenewTrialSubscriptions,
  googleLogin,
  updateUserById,
  logout,
  verifyEmail,
  resendVerificationEmail,
  requestEmailChange,
  confirmEmailChange,
  deleteCurrentUser,
  deleteUserById,
  checkUserAuthMethod,
  sendMobileSocialEmailCode,
  verifyMobileSocialEmailCode,
  sendPasswordResetCode,
  verifyPasswordResetCode
} from "../controllers/authController";
import { protect, optionalSupabaseToken } from "../middleware/auth";
import { verifySupabaseToken } from "../middleware/supabaseAuth";
import passport from "../config/passport";
import { LinkedInService } from "../services/linkedInService";
import { supabase } from "../config/supabase";
import { GoogleService } from "../services/googleService";
import logger from "../config/logger";
import { log } from "console";

const router = Router();

// Kayıt rotası
router.post(
  "/register",
  [
    check("firstName", "İsim alanı zorunludur").not().isEmpty(),
    check("lastName", "Soyisim alanı zorunludur").not().isEmpty(),
    check("email", "Lütfen geçerli bir email adresi giriniz").isEmail(),
    check("password", "Şifre en az 6 karakter olmalıdır").isLength({ min: 6 }),
  ],
  register
);


router.post(
  "/check-auth-method",
  [
    check("email", "Email adresi gereklidir").notEmpty(),
  ],
  checkUserAuthMethod
);

// Mobil sosyal email kodu gönderme
router.post(
  "/mobile/send-social-email-code",
  [
    check("email", "Email adresi gereklidir").isEmail().normalizeEmail(),
  ],
  sendMobileSocialEmailCode
);

// Mobil sosyal email kodu doğrulama
router.post(
  "/mobile/verify-social-email-code",
  [
    check("email", "Email adresi gereklidir").isEmail().normalizeEmail(),
    check("code", "Doğrulama kodu gereklidir").isLength({ min: 6, max: 6 }),
  ],
  verifyMobileSocialEmailCode
);

router.post(
  "/login",
  [
    check("email", "Lütfen geçerli bir email adresi giriniz").trim().isEmail().normalizeEmail(),
    check("password", "Şifre alanı zorunludur").trim().notEmpty(),
  ],
  login
);

// Giriş yapmış kullanıcının bilgilerini alma rotası
router.get("/currentUser", optionalSupabaseToken, getCurrentUser);

// Kullanıcı bilgilerini güncelleme rotası
router.put("/updateUser", optionalSupabaseToken, updateUser);

router.put(
  "/change-password",
  protect,
  [
    check("currentPassword", "Current password is required").notEmpty(),
    check("newPassword", "New password must be at least 6 characters").isLength({ min: 6 }),
    check("confirmPassword", "Passwords do not match")
      .custom((value, { req }) => value === req.body.newPassword),
  ],
  changePassword
);

// Kullanıcı id'si ile bilgilerini alma rotası
router.get("/user/:id", optionalSupabaseToken, getUserById);

router.put(
  '/updateUserById/:id',
  protect,
  updateUserById
);

router.post(
  "/email/change/request",
  protect,
  [
    check("newEmail", "Please enter a valid email").isEmail().normalizeEmail()
  ],
  requestEmailChange
);

router.post(
  "/email/change/confirm",
  [
    check("code", "Verification code is required").isLength({ min: 6, max: 6 })
  ],
  confirmEmailChange
);


// **Yeni Eklenti: Tüm kullanıcıları çekme rotası (Sadece admin erişimi)**
router.get("/users", protect, getAllUsers);

// Abonelik durumunu kontrol et ve düzelt
router.get("/fix-subscription", protect, fixSubscription);

// Yeni abonelik oluşturma veya güncelleme
router.post(
  "/subscription",
  protect,
  [
    check("plan", "Abonelik planı zorunludur").not().isEmpty(),
    check("period", "Abonelik dönemi zorunludur").not().isEmpty(),
    check("paymentMethod", "Ödeme yöntemi zorunludur").not().isEmpty(),
  ],
  createOrUpdateSubscription
);

// Trial abonelikleri kontrol etme ve yenileme (sadece admin)
router.post(
  "/admin/check-trial-subscriptions",
  protect,
  checkAndRenewTrialSubscriptions
);

// Favorilere öğe ekleme rotası
router.post(
  "/favorites",
  protect,
  [
    check("type", "Favori türü (user, company, product) gereklidir")
      .not()
      .isEmpty(),
    check("itemId", "Öğe ID gereklidir").not().isEmpty(),
  ],
  addFavorite
);

// Favoriden kaldırma rotası (DELETE isteği ile)
router.delete(
  "/favorites",
  protect,
  [
    check("type", "Favori türü (user, company, product) gereklidir")
      .not()
      .isEmpty(),
    check("itemId", "Öğe ID gereklidir").not().isEmpty(),
  ],
  removeFavorite
);

// Favori öğeleri çekme rotası
router.get("/favorites", protect, getFavorites);

// Google OAuth rotaları
router.get("/auth/google", async (req, res) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.CLIENT_URL}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) throw error;
    if (!data.url) throw new Error('Auth URL alınamadı');

    res.redirect(data.url);
  } catch (error) {
    console.error('Google auth error:', error);
    logger.error('Google auth error:', error);
    res.redirect(`${process.env.CLIENT_URL}/auth/login?error=auth-failed`);
  }
});

// Google callback endpoint'i
router.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.redirect(`${process.env.CLIENT_URL}/auth/login?error=no-code`);
  }

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code.toString());
    if (error) throw error;

    // MongoDB ile senkronizasyon
    const googleService = new GoogleService();
    const authResult = await googleService.handleAuth(data);

    res.redirect(
      `${process.env.CLIENT_URL}/auth/callback?session=${encodeURIComponent(JSON.stringify(authResult))}`
    );
  } catch (error) {
    console.error("Google callback error:", error);
    logger.error("Google callback error:", error);
    res.redirect(`${process.env.CLIENT_URL}/auth/login?error=callback-failed`);
  }
});

// Google login endpoint'i - Token ile giriş
router.post("/google/login", async (req, res) => {
  try {
    console.log("Google login isteği alındı:", {
      body: req.body,
      headers: req.headers
    });

    const { idToken, accessToken } = req.body;

    if (!idToken && !accessToken) {
      console.log("Google auth login token bulunamadı:", req.body);
      logger.error("Google auth login Token bulunamadı:", req.body);
      return res.status(400).json({
        success: false,
        error: "idToken veya accessToken gereklidir",
        details: "Kimlik doğrulama başarısız",
        errorCode: 400
      });
    }

    const googleService = new GoogleService();
    const authResult = await googleService.handleAuth({
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
  } catch (error: any) {
    console.error("Google login error:", error);
    logger.error("Google login error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: "Sunucu hatası",
      errorCode: 500
    });
  }
});

// Oturum kapatma rotası
router.post("/logout", protect, logout);

// Self-delete
router.delete(
  "/delete-account",
  protect,
  deleteCurrentUser
);

// Admin: delete any user
router.delete(
  "/users/:id",
  protect,
  deleteUserById
);

// LinkedIn Routes
router.get("/linkedin", (req, res) => {
  const linkedInService = new LinkedInService();
  const authUrl = linkedInService.getAuthUrl();
  res.json({ authUrl });
});

router.post("/linkedin", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: "Authorization code is required" });
    }

    const linkedInService = new LinkedInService();
    const accessToken = await linkedInService.getAccessToken(code);
    const profile = await linkedInService.getProfile(accessToken);
    const authResult = await linkedInService.handleAuth(profile);

    res.json(authResult);
  } catch (error: any) {
    console.error("LinkedIn auth error:", error);
    logger.error("LinkedIn auth error:", error);
    res.status(500).json({ error: error.message });
  }
});

// E-posta doğrulama rotaları
router.get("/verify-email/:token", verifyEmail);
router.post("/resend-verification", [
  check("email", "Please enter a valid email address.").isEmail(),
], resendVerificationEmail);

// Şifre sıfırlama rotaları
router.post("/forgot-password", [
  check("email", "Email adresi gereklidir").notEmpty(),
], sendPasswordResetCode);

router.post("/reset-password", [
  check("email", "Email adresi gereklidir").notEmpty(),
  check("code", "Doğrulama kodu gereklidir").notEmpty(),
  check("newPassword", "Yeni şifre en az 6 karakter olmalıdır").isLength({ min: 6 }),
], verifyPasswordResetCode);

export default router;
