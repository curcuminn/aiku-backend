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
const express_1 = __importDefault(require("express"));
const paymentController_1 = require("../controllers/paymentController");
const auth_1 = require("../middleware/auth");
const validateRequest_1 = require("../middleware/validateRequest");
const ParamPosService_1 = __importDefault(require("../services/ParamPosService"));
const User_1 = require("../models/User");
const logger_1 = __importDefault(require("../config/logger"));
const couponService_1 = require("../services/couponService");
const zod_1 = require("zod");
const router = express_1.default.Router();
const couponService = new couponService_1.CouponService();
// Zod validation schemas
const processPaymentSchema = zod_1.z.object({
    cardNumber: zod_1.z.string().length(16, "Please enter a valid card number"),
    cardHolderName: zod_1.z.string().min(1, "Card holder name is required"),
    expireMonth: zod_1.z.string().length(2, "Please enter a valid expiration month"),
    expireYear: zod_1.z.string().length(4, "Please enter a valid expiration year (YYYY)"),
    cvc: zod_1.z.string().length(3, "Please enter a valid CVC"),
    amount: zod_1.z.number().min(0.01, "Please enter a valid amount"),
    installment: zod_1.z.number().min(1).optional()
});
const completePaymentSchema = zod_1.z.object({
    ucdMD: zod_1.z.string().min(1, "UCD_MD value is required"),
    siparisId: zod_1.z.string().min(1, "Order ID is required"),
    islemGuid: zod_1.z.string().optional()
});
const recordFreePaymentSchema = zod_1.z.object({
    amount: zod_1.z.number().min(0, "Please enter a valid amount"),
    description: zod_1.z.string().min(1, "Description is required"),
    planName: zod_1.z.string().min(1, "Plan name is required"),
    billingCycle: zod_1.z.enum(["monthly", "yearly"]).describe("Please enter a valid billing cycle"),
    originalPrice: zod_1.z.number().optional(),
    isFirstPayment: zod_1.z.boolean().optional(),
    paymentDate: zod_1.z.string().datetime().optional()
});
const addPaymentMethodSchema = zod_1.z.object({
    cardHolderName: zod_1.z.string().min(1, "Card holder name is required"),
    cardNumber: zod_1.z.string().length(16, "Please enter a valid card number"),
    expireMonth: zod_1.z.string().length(2, "Please enter a valid expiration month"),
    expireYear: zod_1.z.string().length(4, "Please enter a valid expiration year (YYYY)"),
    cvc: zod_1.z.string().length(3, "Please enter a valid CVC"),
    isDefault: zod_1.z.boolean().optional()
});
router.post("/pay", paymentController_1.processPayment);
router.post("/process-payment", auth_1.protect, (0, validateRequest_1.validateRequest)(processPaymentSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { cardNumber, cardHolderName, expireMonth, expireYear, cvc, amount, installment = 1, } = req.body;
        // User objesini IUser tipine çevir
        const user = req.user;
        const result = yield ParamPosService_1.default.payment({
            amount: amount,
            cardNumber,
            cardHolderName,
            expireMonth,
            expireYear,
            cvc,
            installment,
            is3D: false,
            userId: user && user._id ? user._id.toString() : undefined,
            ipAddress: ((_a = req.headers["x-forwarded-for"]) === null || _a === void 0 ? void 0 : _a.toString()) || req.ip,
        });
        // Kullanıcıyı bul ve ödeme geçmişini güncelle
        if (user && user._id) {
            const updatedUser = yield User_1.User.findById(user._id);
            if (updatedUser) {
                // Abonelik durumunu aktif olarak güncelle
                updatedUser.subscriptionStatus = "active";
                updatedUser.subscriptionStartDate = new Date();
                updatedUser.isSubscriptionActive = true;
                // Bir sonraki ödeme tarihini belirle
                const nextPaymentDate = new Date();
                if (updatedUser.subscriptionPeriod === "monthly") {
                    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
                }
                else {
                    nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
                }
                updatedUser.nextPaymentDate = nextPaymentDate;
                updatedUser.lastPaymentDate = new Date();
                // Ödeme geçmişini güncelle
                if (!updatedUser.paymentHistory)
                    updatedUser.paymentHistory = [];
                updatedUser.paymentHistory.push({
                    amount: amount,
                    date: new Date(),
                    status: "success",
                    transactionId: result.TURKPOS_RETVAL_Islem_ID,
                    description: `Ödeme başarılı: ${amount} TL, İşlem ID: ${result.TURKPOS_RETVAL_Islem_ID}`,
                });
                yield updatedUser.save();
            }
        }
        res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        // Hata durumunda da ödeme geçmişine ekle (başarısız olarak)
        try {
            // User objesini IUser tipine çevir
            const user = req.user;
            if (user && user._id) {
                const updatedUser = yield User_1.User.findById(user._id);
                if (updatedUser) {
                    const numericAmount = parseFloat(req.body.amount);
                    if (!updatedUser.paymentHistory)
                        updatedUser.paymentHistory = [];
                    updatedUser.paymentHistory.push({
                        amount: numericAmount,
                        date: new Date(),
                        status: "failed",
                        description: `Ödeme başarısız: ${numericAmount} TL, Hata: ${error instanceof Error ? error.message : "Unknown error"}`,
                    });
                    yield updatedUser.save();
                }
            }
        }
        catch (saveError) {
            console.error("Ödeme hatası kaydedilirken hata oluştu:", saveError);
            logger_1.default.error("Ödeme hatası kaydedilirken hata oluştu", {
                error: saveError instanceof Error ? saveError.message : "Unknown error",
                stack: saveError instanceof Error ? saveError.stack : undefined,
                userId: (_c = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id) === null || _c === void 0 ? void 0 : _c.toString(),
            });
        }
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Payment process failed",
        });
    }
}));
// Yeni eklenen complete-payment endpoint'i
router.post("/complete-payment", auth_1.protect, (0, validateRequest_1.validateRequest)(completePaymentSchema), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const { ucdMD, siparisId, islemGuid } = req.body;
        // Callback'ten gelen md değerini kontrol et ve kullan
        const callbackMD = req.body.callbackMD || ucdMD;
        console.log("3D ödeme tamamlama isteği:", {
            callbackMD,
            ucdMD,
            siparisId,
            islemGuid,
        });
        logger_1.default.info("3D ödeme tamamlama isteği", {
            callbackMD,
            ucdMD,
            siparisId,
            islemGuid,
        });
        console.log("Kullanıcı bilgisi:", req.user);
        logger_1.default.info("3D ödeme kullanıcı bilgisi", {
            userId: (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString(),
        });
        console.log("Auth token var mı:", !!req.headers.authorization);
        logger_1.default.debug("3D ödeme auth token kontrolü", {
            hasToken: !!req.headers.authorization,
        });
        // TP_WMD_Pay metodunu çağır
        const result = yield ParamPosService_1.default.completePayment({
            ucdMD: callbackMD, // Callback'ten gelen md değerini kullan
            siparisId,
            islemGuid,
        });
        console.log("3D ödeme tamamlama sonucu:", result);
        logger_1.default.info("3D ödeme tamamlama sonucu", {
            islemId: result.TURKPOS_RETVAL_Islem_ID,
            sonuc: result.TURKPOS_RETVAL_Sonuc,
            sonucStr: result.TURKPOS_RETVAL_Sonuc_Str,
        });
        // Kullanıcıyı bul ve ödeme geçmişini güncelle
        const user = req.user;
        if (user && user._id) {
            console.log("Kullanıcı ID ile aranıyor:", user._id);
            logger_1.default.debug("Kullanıcı ID ile aranıyor", {
                userId: user._id.toString(),
            });
            const updatedUser = yield User_1.User.findById(user._id);
            if (updatedUser) {
                console.log("Kullanıcı bulundu, abonelik durumu güncelleniyor");
                logger_1.default.info("Kullanıcı bulundu, abonelik durumu güncelleniyor", {
                    userId: user._id.toString(),
                });
                // Abonelik durumunu aktif olarak güncelle
                updatedUser.subscriptionStatus = "active";
                updatedUser.subscriptionStartDate = new Date();
                updatedUser.isSubscriptionActive = true;
                // Bir sonraki ödeme tarihini belirle
                const nextPaymentDate = new Date();
                if (updatedUser.subscriptionPeriod === "monthly") {
                    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
                }
                else {
                    nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
                }
                updatedUser.nextPaymentDate = nextPaymentDate;
                updatedUser.lastPaymentDate = new Date();
                // Ödeme geçmişini güncelle
                if (!updatedUser.paymentHistory)
                    updatedUser.paymentHistory = [];
                const paymentAmount = parseFloat(result.TURKPOS_RETVAL_Odeme_Tutari.replace(",", ".")) ||
                    0;
                console.log("Ödeme tutarı:", paymentAmount);
                logger_1.default.info("Ödeme tutarı", {
                    userId: user._id.toString(),
                    amount: paymentAmount,
                    currency: "TRY",
                });
                updatedUser.paymentHistory.push({
                    amount: paymentAmount,
                    date: new Date(),
                    status: "success",
                    transactionId: result.TURKPOS_RETVAL_Islem_ID,
                    description: `3D Ödeme başarılı: ${result.TURKPOS_RETVAL_Odeme_Tutari || "0"} TL, İşlem ID: ${result.TURKPOS_RETVAL_Islem_ID}`,
                });
                yield updatedUser.save();
                console.log("Kullanıcı bilgileri güncellendi");
                logger_1.default.info("Kullanıcı ödeme bilgileri güncellendi", {
                    userId: user._id.toString(),
                    subscriptionStatus: "active",
                    nextPaymentDate,
                });
            }
            else {
                console.log("Kullanıcı bulunamadı:", user._id);
                logger_1.default.warn("Ödeme sonrası kullanıcı bulunamadı", {
                    userId: user._id.toString(),
                });
            }
        }
        else {
            console.log("Kullanıcı bilgisi yok veya ID eksik");
            logger_1.default.warn("Ödeme işleminde kullanıcı bilgisi yok veya ID eksik");
        }
        res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error("3D ödeme tamamlama hatası:", error);
        logger_1.default.error("3D ödeme tamamlama hatası", {
            error: error.message,
            stack: error.stack,
            userId: (_d = (_c = req.user) === null || _c === void 0 ? void 0 : _c._id) === null || _d === void 0 ? void 0 : _d.toString(),
        });
        // Hata durumunda da ödeme geçmişine ekle (başarısız olarak)
        try {
            const user = req.user;
            if (user && user._id) {
                const updatedUser = yield User_1.User.findById(user._id);
                if (updatedUser) {
                    if (!updatedUser.paymentHistory)
                        updatedUser.paymentHistory = [];
                    updatedUser.paymentHistory.push({
                        amount: 0,
                        date: new Date(),
                        status: "failed",
                        description: `3D Ödeme tamamlama başarısız. Hata: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
                    });
                    yield updatedUser.save();
                    logger_1.default.info("Başarısız ödeme kaydedildi", {
                        userId: user._id.toString(),
                    });
                }
            }
        }
        catch (saveError) {
            console.error("Ödeme hatası kaydedilirken hata oluştu:", saveError);
            logger_1.default.error("Ödeme hatası kaydedilirken hata oluştu", {
                error: saveError.message,
                stack: saveError.stack,
                userId: (_f = (_e = req.user) === null || _e === void 0 ? void 0 : _e._id) === null || _f === void 0 ? void 0 : _f.toString(),
            });
        }
        res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Ödeme tamamlama işlemi başarısız",
        });
    }
}));
// 3D Secure callback endpoint'i
router.post("/callback", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("3D Secure callback verileri (body):", req.body);
        console.log("3D Secure callback verileri (query):", req.query);
        logger_1.default.info("3D Secure callback verileri alındı", {
            body: req.body,
            query: req.query,
        });
        // Banka tarafından gönderilen verileri al
        const { md, mdStatus, orderId, transactionAmount, islemGUID, islemHash, bankResult, } = req.body;
        // mdStatus kontrolü
        if (mdStatus !== "1") {
            console.error("3D Secure doğrulaması başarısız:", {
                mdStatus,
                bankResult,
            });
            logger_1.default.error("3D Secure doğrulaması başarısız", {
                mdStatus,
                bankResult,
                orderId,
            });
            throw new Error(`3D Secure doğrulaması başarısız: ${bankResult || "Bilinmeyen hata"}`);
        }
        // Ödemeyi tamamla
        const result = yield ParamPosService_1.default.completePayment({
            ucdMD: md, // Bankadan gelen md değeri
            siparisId: orderId, // Bankadan gelen orderId değeri
            islemGuid: islemGUID, // Bankadan gelen islemGUID değeri
        });
        console.log("Ödeme tamamlama sonucu:", result);
        logger_1.default.info("Ödeme tamamlama sonucu", {
            result: result.TURKPOS_RETVAL_Sonuc,
            resultStr: result.TURKPOS_RETVAL_Sonuc_Str,
            transactionId: result.TURKPOS_RETVAL_Islem_ID,
        });
        // Sonuca göre frontend'e yönlendir
        const frontendUrl = process.env.FRONTEND_URL || "https://aikuaiplatform.com";
        const redirectUrl = `${frontendUrl}/payment/callback?status=${result.TURKPOS_RETVAL_Sonuc === 1 ? "success" : "error"}&data=${encodeURIComponent(JSON.stringify(result))}`;
        // Başarılı yanıt döndür ve frontend'e yönlendir
        res.redirect(redirectUrl);
    }
    catch (error) {
        console.error("Callback hatası:", error);
        logger_1.default.error("Callback hatası", {
            error: error.message,
            stack: error.stack,
        });
        // Hata durumunda frontend'e yönlendir
        const frontendUrl = process.env.FRONTEND_URL || "https://aikuaiplatform.com";
        res.redirect(`${frontendUrl}/payment/callback?status=error&message=${encodeURIComponent(error.message)}`);
    }
}));
/**
 * @route   POST /api/payments/record-free-payment
 * @desc    Ücretsiz abonelik için ödeme kaydı oluşturur
 * @access  Private
 */
router.post("/record-free-payment", auth_1.protect, (0, validateRequest_1.validateRequest)(recordFreePaymentSchema), paymentController_1.recordFreePayment);
/**
 * @route   GET /api/payments/history
 * @desc    Kullanıcının ödeme geçmişini getirir
 * @access  Private
 */
router.get("/history", auth_1.protect, paymentController_1.getPaymentHistory);
/**
 * @route   POST /api/payments/methods
 * @desc    Yeni ödeme yöntemi (kart) ekler
 * @access  Private
 */
router.post("/methods", auth_1.protect, (0, validateRequest_1.validateRequest)(addPaymentMethodSchema), paymentController_1.addPaymentMethod);
/**
 * @route   GET /api/payments/methods
 * @desc    Kullanıcının kayıtlı ödeme yöntemlerini getirir
 * @access  Private
 */
router.get("/methods", auth_1.protect, paymentController_1.getPaymentMethods);
/**
 * @route   DELETE /api/payments/methods/:cardId
 * @desc    Kullanıcının kayıtlı ödeme yöntemini siler
 * @access  Private
 */
router.delete("/methods/:cardId", auth_1.protect, paymentController_1.deletePaymentMethod);
/**
 * @route   PUT /api/payments/methods/:cardId/default
 * @desc    Kullanıcının varsayılan ödeme yöntemini günceller
 * @access  Private
 */
router.put("/methods/:cardId/default", auth_1.protect, paymentController_1.updateDefaultPaymentMethod);
// Kupon doğrulama endpoint'i
router.post("/validate-coupon", auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { couponCode } = req.body;
        const userId = req.user.id;
        const planType = req.body.planType || "MONTHLY";
        const coupon = yield couponService.validateCoupon(couponCode, userId, planType);
        res.json({
            isValid: true,
            discountRate: coupon.discountRate,
            planType: coupon.planType,
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Kupon doğrulama hatası",
        });
    }
}));
exports.default = router;
