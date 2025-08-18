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
exports.cancelSubscription = exports.getPaymentHistory = exports.toggleAutoRenewal = exports.changeSubscriptionPlan = exports.getUserSubscription = exports.getSubscriptionPlans = void 0;
const User_1 = require("../models/User");
const SubscriptionService_1 = __importDefault(require("../services/SubscriptionService"));
/**
 * Tüm abonelik planlarını listeler
 */
const getSubscriptionPlans = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const plans = SubscriptionService_1.default.getSubscriptionPlans();
        res.status(200).json({
            success: true,
            data: plans,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Abonelik planları alınırken bir hata oluştu",
            error: error.message,
        });
    }
});
exports.getSubscriptionPlans = getSubscriptionPlans;
/**
 * Kullanıcının mevcut abonelik bilgilerini getirir
 */
const getUserSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // @ts-expect-error - req.user tipini IUser olarak kabul ediyoruz
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Oturum açmanız gerekiyor",
            });
        }
        const user = yield User_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Kullanıcı bulunamadı",
            });
        }
        // Abonelik planı bilgilerini al
        const planDetails = SubscriptionService_1.default.getSubscriptionPlans()[user.subscriptionPlan || "startup"];
        res.status(200).json({
            success: true,
            data: {
                subscriptionStatus: user.subscriptionStatus,
                subscriptionPlan: user.subscriptionPlan,
                subscriptionPeriod: user.subscriptionPeriod,
                subscriptionAmount: user.subscriptionAmount,
                subscriptionStartDate: user.subscriptionStartDate,
                trialEndsAt: user.trialEndsAt,
                nextPaymentDate: user.nextPaymentDate,
                lastPaymentDate: user.lastPaymentDate,
                autoRenewal: user.autoRenewal,
                planDetails: planDetails,
                isSubscriptionActive: user.isSubscriptionActive,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Abonelik bilgileri alınırken bir hata oluştu",
            error: error.message,
        });
    }
});
exports.getUserSubscription = getUserSubscription;
/**
 * Kullanıcının abonelik planını değiştirir (Web ve Mobil için)
 */
const changeSubscriptionPlan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Oturum açmanız gerekiyor",
            });
        }
        const { plan, period, platform } = req.body;
        // Plan ve periyod kontrolü
        if (!plan || !["startup", "business", "investor"].includes(plan)) {
            return res.status(400).json({
                success: false,
                message: "Geçersiz abonelik planı",
            });
        }
        if (!period || !["monthly", "yearly"].includes(period)) {
            return res.status(400).json({
                success: false,
                message: "Geçersiz abonelik periyodu",
            });
        }
        // Platform kontrolü (web veya mobile)
        if (platform && !["web", "mobile"].includes(platform)) {
            return res.status(400).json({
                success: false,
                message: "Geçersiz platform",
            });
        }
        // Kullanıcıyı bul
        const user = yield User_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Kullanıcı bulunamadı",
            });
        }
        // Mevcut ödeme yöntemi kontrolü
        const currentPaymentMethod = user.paymentMethod || 'creditCard';
        // Eğer kullanıcı IAP kullanıyorsa ve web'e geçmeye çalışıyorsa engelle
        if (currentPaymentMethod === 'iap' && platform === 'web') {
            return res.status(400).json({
                success: false,
                message: "IAP kullanıcıları web'e geçemez. Lütfen mobil uygulamadan iptal edin.",
            });
        }
        // Abonelik planlarını al
        const subscriptionPlans = SubscriptionService_1.default.getSubscriptionPlans();
        // Kullanıcının daha önce bir aboneliği olup olmadığını kontrol et
        const isFirstTimeSubscription = !user.paymentHistory || user.paymentHistory.length === 0;
        // Abonelik planını ve periyodunu güncelle
        user.subscriptionPlan = plan;
        user.subscriptionPeriod = period;
        // Platform'a göre ödeme yöntemini güncelle
        if (platform === 'mobile') {
            user.paymentMethod = 'iap';
        }
        else if (platform === 'web') {
            user.paymentMethod = 'creditCard';
        }
        // Eğer startup planı seçilmişse ve kullanıcının ilk aboneliği ise free trial uygula
        if (plan === "startup") {
            const planPricing = subscriptionPlans.startup.pricing[period];
            // İlk abonelik ise ve freeTrial sadece ilk abonelikte geçerliyse
            if (isFirstTimeSubscription &&
                "isFirstTimeOnly" in planPricing &&
                planPricing.isFirstTimeOnly) {
                user.subscriptionStatus = "trial";
                const trialEndDate = new Date();
                const trialPeriod = "trialPeriod" in planPricing ? planPricing.trialPeriod : 6;
                trialEndDate.setMonth(trialEndDate.getMonth() + trialPeriod);
                user.trialEndsAt = trialEndDate;
                user.nextPaymentDate = trialEndDate;
            }
            else {
                // Daha önce abonelik yapmış bir kullanıcıysa
                user.subscriptionStatus = "pending"; // Ödeme yapılana kadar pending
                user.trialEndsAt = undefined; // Trial süresini kaldır
                // Bir sonraki ödeme tarihini şimdi olarak ayarla (hemen ödeme alınacak)
                user.nextPaymentDate = new Date();
            }
        }
        else if (period === "yearly") {
            // Business veya Investor planında yıllık abonelikte ek süre ekle
            user.subscriptionStatus = "pending"; // Ödeme yapılana kadar pending
            user.trialEndsAt = undefined; // Trial süresini kaldır
            // Bir sonraki ödeme tarihini şimdi olarak ayarla (hemen ödeme alınacak)
            user.nextPaymentDate = new Date();
        }
        else {
            // Aylık Business veya Investor planı
            user.subscriptionStatus = "pending"; // Ödeme yapılana kadar pending
            user.trialEndsAt = undefined; // Trial süresini kaldır
            // Bir sonraki ödeme tarihini şimdi olarak ayarla (hemen ödeme alınacak)
            user.nextPaymentDate = new Date();
        }
        // Abonelik başlangıç tarihini güncelle
        user.subscriptionStartDate = new Date();
        yield user.save();
        // Abonelik planı bilgilerini al
        // @ts-expect-error - Planlar any tipinde olduğundan indexleme hatası görmezden geliniyor
        const selectedPlan = subscriptionPlans[plan];
        const pricing = selectedPlan.pricing[period];
        res.status(200).json({
            success: true,
            message: "Abonelik planı başarıyla güncellendi",
            subscription: {
                plan: user.subscriptionPlan,
                period: user.subscriptionPeriod,
                status: user.subscriptionStatus,
                startDate: user.subscriptionStartDate,
                trialEndsAt: user.trialEndsAt,
                nextPaymentDate: user.nextPaymentDate,
                paymentMethod: user.paymentMethod,
                platform: platform
            },
            planDetails: {
                name: selectedPlan.name,
                description: selectedPlan.description,
                features: selectedPlan.features,
                pricing: pricing
            }
        });
    }
    catch (error) {
        console.error("Abonelik planı değiştirme hatası:", error);
        res.status(500).json({
            success: false,
            message: "Abonelik planı değiştirilemedi",
            error: error.message,
        });
    }
});
exports.changeSubscriptionPlan = changeSubscriptionPlan;
/**
 * Kullanıcının otomatik yenileme ayarını değiştirir
 */
const toggleAutoRenewal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // @ts-expect-error - req.user tipini IUser olarak kabul ediyoruz
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Oturum açmanız gerekiyor",
            });
        }
        const { autoRenewal } = req.body;
        if (typeof autoRenewal !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "Geçersiz otomatik yenileme değeri",
            });
        }
        const user = yield User_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Kullanıcı bulunamadı",
            });
        }
        user.autoRenewal = autoRenewal;
        yield user.save();
        res.status(200).json({
            success: true,
            message: `Otomatik yenileme ${autoRenewal ? "açıldı" : "kapatıldı"}`,
            data: {
                autoRenewal: user.autoRenewal,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Otomatik yenileme ayarı değiştirilirken bir hata oluştu",
            error: error.message,
        });
    }
});
exports.toggleAutoRenewal = toggleAutoRenewal;
/**
 * Kullanıcının ödeme geçmişini getirir
 */
const getPaymentHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // @ts-expect-error - req.user tipini IUser olarak kabul ediyoruz
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Oturum açmanız gerekiyor",
            });
        }
        const user = yield User_1.User.findById(userId).select("paymentHistory");
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Kullanıcı bulunamadı",
            });
        }
        res.status(200).json({
            success: true,
            data: user.paymentHistory || [],
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Ödeme geçmişi alınırken bir hata oluştu",
            error: error.message,
        });
    }
});
exports.getPaymentHistory = getPaymentHistory;
/**
 * Aboneliği iptal eder
 */
const cancelSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // @ts-expect-error - req.user tipini IUser olarak kabul ediyoruz
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Oturum açmanız gerekiyor",
            });
        }
        const user = yield User_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Kullanıcı bulunamadı",
            });
        }
        // Aboneliği iptal et
        user.subscriptionStatus = "cancelled";
        user.autoRenewal = false;
        yield user.save();
        res.status(200).json({
            success: true,
            message: "Abonelik başarıyla iptal edildi",
            data: {
                subscriptionStatus: user.subscriptionStatus,
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Abonelik iptal edilirken bir hata oluştu",
            error: error.message,
        });
    }
});
exports.cancelSubscription = cancelSubscription;
