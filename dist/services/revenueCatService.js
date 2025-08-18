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
const axios_1 = __importDefault(require("axios"));
const User_1 = require("../models/User");
const revenueCat_1 = __importDefault(require("../config/revenueCat"));
const logger_1 = __importDefault(require("../config/logger"));
class RevenueCatService {
    constructor() {
        this.baseUrl = 'https://api.revenuecat.com/v1';
        this.apiKey = revenueCat_1.default.apiKey;
    }
    /**
     * RevenueCat webhook'larını işler
     */
    handleWebhook(event) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { event: webhookEvent } = event;
                logger_1.default.info('RevenueCat webhook alındı', {
                    eventType: webhookEvent.type,
                    userId: webhookEvent.app_user_id,
                    productId: webhookEvent.product_id,
                    transactionId: webhookEvent.transaction_id
                });
                // Kullanıcıyı bul (app_user_id genellikle email veya custom user ID)
                const user = yield this.findUserByRevenueCatId(webhookEvent.app_user_id);
                if (!user) {
                    logger_1.default.warn('RevenueCat webhook için kullanıcı bulunamadı', {
                        appUserId: webhookEvent.app_user_id
                    });
                    return { success: false, error: 'User not found' };
                }
                // Event tipine göre işlem yap
                switch (webhookEvent.type) {
                    case 'INITIAL_PURCHASE':
                        return yield this.handleInitialPurchase(user, webhookEvent);
                    case 'RENEWAL':
                        return yield this.handleRenewal(user, webhookEvent);
                    case 'CANCELLATION':
                        return yield this.handleCancellation(user, webhookEvent);
                    case 'UNCANCELLATION':
                        return yield this.handleUncancellation(user, webhookEvent);
                    case 'NON_RENEWING_PURCHASE':
                        return yield this.handleNonRenewingPurchase(user, webhookEvent);
                    case 'EXPIRATION':
                        return yield this.handleExpiration(user, webhookEvent);
                    case 'BILLING_ISSUE':
                        return yield this.handleBillingIssue(user, webhookEvent);
                    case 'PRODUCT_CHANGE':
                        return yield this.handleProductChange(user, webhookEvent);
                    default:
                        logger_1.default.info('Bilinmeyen RevenueCat event tipi', {
                            eventType: webhookEvent.type
                        });
                        return { success: true, message: 'Event type not handled' };
                }
            }
            catch (error) {
                logger_1.default.error('RevenueCat webhook işleme hatası', { error: error.message });
                return { success: false, error: error.message };
            }
        });
    }
    /**
     * İlk satın alma işlemini işler
     */
    handleInitialPurchase(user, event) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const productConfig = this.getProductConfig(event.product_id);
                if (!productConfig) {
                    throw new Error(`Product config not found for: ${event.product_id}`);
                }
                const now = new Date();
                const purchaseDate = new Date(event.purchased_at_ms);
                // Abonelik bilgilerini güncelle
                user.subscriptionPlan = productConfig.plan;
                user.subscriptionPeriod = productConfig.period;
                user.subscriptionAmount = productConfig.price;
                user.paymentMethod = 'iap'; // In-App Purchase
                user.autoRenewal = true;
                user.lastPaymentDate = purchaseDate;
                // Trial kontrolü
                if (productConfig.trialDays > 0) {
                    user.subscriptionStatus = 'trial';
                    const trialEndDate = new Date(purchaseDate);
                    trialEndDate.setDate(trialEndDate.getDate() + productConfig.trialDays);
                    user.trialEndsAt = trialEndDate;
                    user.nextPaymentDate = trialEndDate;
                }
                else {
                    user.subscriptionStatus = 'active';
                    user.subscriptionStartDate = purchaseDate;
                    // Bir sonraki ödeme tarihini hesapla
                    const nextPaymentDate = new Date(purchaseDate);
                    if (productConfig.period === 'monthly') {
                        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
                    }
                    else {
                        // Yıllık abonelik için ekstra ayları da ekle
                        const extraMonths = (productConfig.plan === 'business' || productConfig.plan === 'investor') ? 3 : 0;
                        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 12 + extraMonths);
                    }
                    user.nextPaymentDate = nextPaymentDate;
                }
                user.isSubscriptionActive = true;
                // Ödeme geçmişine ekle
                if (!user.paymentHistory)
                    user.paymentHistory = [];
                user.paymentHistory.push({
                    amount: productConfig.price,
                    date: purchaseDate,
                    status: 'success',
                    transactionId: event.transaction_id,
                    description: `IAP ${productConfig.plan} ${productConfig.period} abonelik`,
                    type: 'subscription',
                    plan: productConfig.plan,
                    period: productConfig.period,
                    platform: event.store, // 'APP_STORE' veya 'PLAY_STORE'
                    iapTransactionId: event.transaction_id
                });
                yield user.save();
                logger_1.default.info('IAP ilk satın alma başarıyla işlendi', {
                    userId: user._id,
                    plan: productConfig.plan,
                    period: productConfig.period
                });
                return { success: true };
            }
            catch (error) {
                logger_1.default.error('IAP ilk satın alma işleme hatası', { error: error.message });
                throw error;
            }
        });
    }
    /**
     * Abonelik yenileme işlemini işler
     */
    handleRenewal(user, event) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const productConfig = this.getProductConfig(event.product_id);
                if (!productConfig) {
                    throw new Error(`Product config not found for: ${event.product_id}`);
                }
                const now = new Date();
                const renewalDate = new Date(event.purchased_at_ms);
                // Abonelik durumunu güncelle
                user.subscriptionStatus = 'active';
                user.lastPaymentDate = renewalDate;
                user.isSubscriptionActive = true;
                // Bir sonraki ödeme tarihini hesapla
                const nextPaymentDate = new Date(renewalDate);
                if (productConfig.period === 'monthly') {
                    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
                }
                else {
                    const extraMonths = (productConfig.plan === 'business' || productConfig.plan === 'investor') ? 3 : 0;
                    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 12 + extraMonths);
                }
                user.nextPaymentDate = nextPaymentDate;
                // Ödeme geçmişine ekle
                if (!user.paymentHistory)
                    user.paymentHistory = [];
                user.paymentHistory.push({
                    amount: productConfig.price,
                    date: renewalDate,
                    status: 'success',
                    transactionId: event.transaction_id,
                    description: `IAP ${productConfig.plan} ${productConfig.period} yenileme`,
                    type: 'subscription',
                    plan: productConfig.plan,
                    period: productConfig.period,
                    platform: event.store,
                    iapTransactionId: event.transaction_id
                });
                yield user.save();
                logger_1.default.info('IAP abonelik yenileme başarıyla işlendi', {
                    userId: user._id,
                    plan: productConfig.plan,
                    period: productConfig.period
                });
                return { success: true };
            }
            catch (error) {
                logger_1.default.error('IAP yenileme işleme hatası', { error: error.message });
                throw error;
            }
        });
    }
    /**
     * Abonelik iptal işlemini işler
     */
    handleCancellation(user, event) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Abonelik durumunu güncelle (mevcut dönem sonuna kadar aktif kalır)
                user.autoRenewal = false;
                // Eğer expiration_at_ms varsa, o tarihe kadar aktif kalır
                if (event.expiration_at_ms) {
                    user.nextPaymentDate = new Date(event.expiration_at_ms);
                }
                yield user.save();
                logger_1.default.info('IAP abonelik iptal işlendi', {
                    userId: user._id,
                    cancelReason: event.cancel_reason
                });
                return { success: true };
            }
            catch (error) {
                logger_1.default.error('IAP iptal işleme hatası', { error: error.message });
                throw error;
            }
        });
    }
    /**
     * Abonelik iptal geri alma işlemini işler
     */
    handleUncancellation(user, event) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                user.autoRenewal = true;
                yield user.save();
                logger_1.default.info('IAP abonelik iptal geri alındı', {
                    userId: user._id
                });
                return { success: true };
            }
            catch (error) {
                logger_1.default.error('IAP iptal geri alma hatası', { error: error.message });
                throw error;
            }
        });
    }
    /**
     * Abonelik süresi dolma işlemini işler
     */
    handleExpiration(user, event) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                user.subscriptionStatus = 'expired';
                user.isSubscriptionActive = false;
                yield user.save();
                logger_1.default.info('IAP abonelik süresi doldu', {
                    userId: user._id,
                    expirationReason: event.expiration_reason
                });
                return { success: true };
            }
            catch (error) {
                logger_1.default.error('IAP süre dolma hatası', { error: error.message });
                throw error;
            }
        });
    }
    /**
     * Fatura sorunu işlemini işler
     */
    handleBillingIssue(user, event) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Fatura sorunu durumunda kullanıcıyı bilgilendir
                logger_1.default.warn('IAP fatura sorunu tespit edildi', {
                    userId: user._id,
                    transactionId: event.transaction_id
                });
                return { success: true };
            }
            catch (error) {
                logger_1.default.error('IAP fatura sorunu işleme hatası', { error: error.message });
                throw error;
            }
        });
    }
    /**
     * Ürün değişikliği işlemini işler
     */
    handleProductChange(user, event) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const productConfig = this.getProductConfig(event.product_id);
                if (!productConfig) {
                    throw new Error(`Product config not found for: ${event.product_id}`);
                }
                // Abonelik planını güncelle
                user.subscriptionPlan = productConfig.plan;
                user.subscriptionPeriod = productConfig.period;
                user.subscriptionAmount = productConfig.price;
                yield user.save();
                logger_1.default.info('IAP ürün değişikliği işlendi', {
                    userId: user._id,
                    newPlan: productConfig.plan,
                    newPeriod: productConfig.period
                });
                return { success: true };
            }
            catch (error) {
                logger_1.default.error('IAP ürün değişikliği hatası', { error: error.message });
                throw error;
            }
        });
    }
    /**
     * Non-renewing purchase işlemini işler (tek seferlik satın alma)
     */
    handleNonRenewingPurchase(user, event) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const productConfig = this.getProductConfig(event.product_id);
                if (!productConfig) {
                    throw new Error(`Product config not found for: ${event.product_id}`);
                }
                const purchaseDate = new Date(event.purchased_at_ms);
                // Ödeme geçmişine ekle
                if (!user.paymentHistory)
                    user.paymentHistory = [];
                user.paymentHistory.push({
                    amount: productConfig.price,
                    date: purchaseDate,
                    status: 'success',
                    transactionId: event.transaction_id,
                    description: `IAP tek seferlik satın alma: ${event.product_id}`,
                    type: 'one_time',
                    platform: event.store,
                    iapTransactionId: event.transaction_id
                });
                yield user.save();
                logger_1.default.info('IAP tek seferlik satın alma işlendi', {
                    userId: user._id,
                    productId: event.product_id
                });
                return { success: true };
            }
            catch (error) {
                logger_1.default.error('IAP tek seferlik satın alma hatası', { error: error.message });
                throw error;
            }
        });
    }
    /**
     * RevenueCat app_user_id ile kullanıcıyı bulur
     */
    findUserByRevenueCatId(appUserId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Önce email ile dene (RevenueCat'te app_user_id genellikle email)
            let user = yield User_1.User.findOne({ email: appUserId });
            if (!user) {
                // Eğer email ile bulunamazsa, custom field ile dene
                user = yield User_1.User.findOne({ 'revenueCatId': appUserId });
            }
            return user;
        });
    }
    /**
     * Product ID'ye göre konfigürasyon döndürür
     */
    getProductConfig(productId) {
        return revenueCat_1.default.productMapping[productId];
    }
    /**
     * RevenueCat API ile kullanıcı bilgilerini alır
     */
    getUserInfo(appUserId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get(`${this.baseUrl}/subscribers/${appUserId}`, {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                return response.data;
            }
            catch (error) {
                logger_1.default.error('RevenueCat kullanıcı bilgisi alma hatası', { error: error.message });
                throw error;
            }
        });
    }
    /**
     * Kullanıcının abonelik durumunu kontrol eder
     */
    checkSubscriptionStatus(appUserId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userInfo = yield this.getUserInfo(appUserId);
                return userInfo;
            }
            catch (error) {
                logger_1.default.error('RevenueCat abonelik durumu kontrol hatası', { error: error.message });
                throw error;
            }
        });
    }
}
exports.default = new RevenueCatService();
