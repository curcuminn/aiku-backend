"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.checkPaymentMethod = exports.getMobileSubscriptionPlans = exports.getUserRevenueCatInfo = exports.checkUserSubscriptionStatus = exports.handleRevenueCatWebhook = void 0;
const revenueCatService_1 = __importDefault(require("../services/revenueCatService"));
const revenueCat_1 = __importDefault(require("../config/revenueCat"));
const logger_1 = __importDefault(require("../config/logger"));
/**
 * RevenueCat webhook'larını işler
 * Bu endpoint RevenueCat'ten gelen tüm abonelik event'lerini alır
 */
const handleRevenueCatWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Webhook signature doğrulaması
        const signature = req.headers['authorization'];
        const payload = JSON.stringify(req.body);
        if (!signature || !revenueCat_1.default.webhookSecret) {
            logger_1.default.warn('RevenueCat webhook signature eksik');
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // Signature doğrulaması (RevenueCat'in gönderdiği signature ile karşılaştır)
        const expectedSignature = `Bearer ${revenueCat_1.default.webhookSecret}`;
        if (signature !== expectedSignature) {
            logger_1.default.warn('RevenueCat webhook signature geçersiz');
            return res.status(401).json({ error: 'Invalid signature' });
        }
        // Webhook event'ini işle
        const result = yield revenueCatService_1.default.handleWebhook(req.body);
        if (result.success) {
            logger_1.default.info('RevenueCat webhook başarıyla işlendi', {
                eventType: (_a = req.body.event) === null || _a === void 0 ? void 0 : _a.type
            });
            res.status(200).json({ success: true });
        }
        else {
            const errorMessage = 'error' in result ? result.error : 'Unknown error';
            logger_1.default.error('RevenueCat webhook işleme hatası', {
                error: errorMessage
            });
            res.status(500).json({ error: errorMessage });
        }
    }
    catch (error) {
        logger_1.default.error('RevenueCat webhook genel hata', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.handleRevenueCatWebhook = handleRevenueCatWebhook;
/**
 * Kullanıcının RevenueCat abonelik durumunu kontrol eder
 */
const checkUserSubscriptionStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Oturum açmanız gerekiyor',
            });
        }
        const { appUserId } = req.params;
        if (!appUserId) {
            return res.status(400).json({
                success: false,
                message: 'app_user_id gerekli',
            });
        }
        const subscriptionInfo = yield revenueCatService_1.default.checkSubscriptionStatus(appUserId);
        res.status(200).json({
            success: true,
            subscription: subscriptionInfo
        });
    }
    catch (error) {
        logger_1.default.error('Abonelik durumu kontrol hatası', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Abonelik durumu kontrol edilemedi',
            error: error.message
        });
    }
});
exports.checkUserSubscriptionStatus = checkUserSubscriptionStatus;
/**
 * Kullanıcının RevenueCat bilgilerini alır
 */
const getUserRevenueCatInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Oturum açmanız gerekiyor',
            });
        }
        const { appUserId } = req.params;
        if (!appUserId) {
            return res.status(400).json({
                success: false,
                message: 'app_user_id gerekli',
            });
        }
        const userInfo = yield revenueCatService_1.default.getUserInfo(appUserId);
        res.status(200).json({
            success: true,
            userInfo: userInfo
        });
    }
    catch (error) {
        logger_1.default.error('RevenueCat kullanıcı bilgisi alma hatası', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Kullanıcı bilgisi alınamadı',
            error: error.message
        });
    }
});
exports.getUserRevenueCatInfo = getUserRevenueCatInfo;
/**
 * Mobil uygulama için abonelik planlarını döndürür
 */
const getMobileSubscriptionPlans = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const plans = revenueCat_1.default.productMapping;
        // Mobil için uygun formatta döndür
        const mobilePlans = Object.entries(plans).map(([key, plan]) => ({
            id: key,
            revenueCatId: plan.revenueCatId,
            plan: plan.plan,
            period: plan.period,
            price: plan.price,
            trialDays: plan.trialDays,
            displayName: `${plan.plan.charAt(0).toUpperCase() + plan.plan.slice(1)} ${plan.period === 'monthly' ? 'Aylık' : 'Yıllık'}`,
            description: plan.plan === 'startup' ? 'AI Startups & Developers için' :
                plan.plan === 'business' ? 'Şirketler & İşletmeler için' :
                    'VCs & Angel Investors için'
        }));
        res.status(200).json({
            success: true,
            plans: mobilePlans
        });
    }
    catch (error) {
        logger_1.default.error('Mobil abonelik planları alma hatası', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Abonelik planları alınamadı',
            error: error.message
        });
    }
});
exports.getMobileSubscriptionPlans = getMobileSubscriptionPlans;
/**
 * Kullanıcının ödeme yöntemini kontrol eder (Web vs Mobil)
 */
const checkPaymentMethod = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Oturum açmanız gerekiyor',
            });
        }
        // Kullanıcının mevcut ödeme yöntemini kontrol et
        const user = yield Promise.resolve().then(() => __importStar(require('../models/User'))).then(m => m.User.findById(userId));
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı',
            });
        }
        const paymentMethod = user.paymentMethod || 'creditCard';
        const isIAP = paymentMethod === 'iap';
        res.status(200).json({
            success: true,
            paymentMethod: paymentMethod,
            isIAP: isIAP,
            canChangeToWeb: !isIAP, // IAP kullanıcıları web'e geçemez
            canChangeToMobile: !isIAP // Web kullanıcıları mobile geçebilir
        });
    }
    catch (error) {
        logger_1.default.error('Ödeme yöntemi kontrol hatası', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Ödeme yöntemi kontrol edilemedi',
            error: error.message
        });
    }
});
exports.checkPaymentMethod = checkPaymentMethod;
