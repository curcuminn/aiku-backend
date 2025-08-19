import axios from 'axios';
import { User } from '../models/User';
import revenueCatConfig from '../config/revenueCat';
import logger from '../config/logger';

interface RevenueCatWebhookEvent {
  api_version: string;
  event: {
    type: string;
    id: string;
    app_user_id: string;
    aliases?: string[];
    original_app_user_id?: string;
    product_id: string;
    period_type: string;
    purchased_at_ms: number;
    expiration_at_ms?: number;
    environment: string;
    entitlement_id: string;
    entitlement_ids: string[];
    presented_offering_id?: string;
    transaction_id: string;
    original_transaction_id: string;
    is_family_share: boolean;
    country_code: string;
    app_id: string;
    offer_code?: string;
    price?: number;
    currency?: string;
    subscriber_attributes?: any;
    store: string;
    takehome_percentage?: number;
    commission_percentage?: number;
    is_trial_conversion?: boolean;
    cancel_reason?: string;
    expiration_reason?: string;
  };
}

class RevenueCatService {
  private apiKey: string;
  private baseUrl = 'https://api.revenuecat.com/v1';

  constructor() {
    this.apiKey = revenueCatConfig.apiKey;
  }

  /**
   * RevenueCat webhook'larını işler
   */
  async handleWebhook(event: RevenueCatWebhookEvent) {
    try {
      const { event: webhookEvent } = event;
      
      logger.info('RevenueCat webhook alındı', {
        eventType: webhookEvent.type,
        userId: webhookEvent.app_user_id,
        productId: webhookEvent.product_id,
        transactionId: webhookEvent.transaction_id
      });

      // Test event'leri için özel işleme
      if (webhookEvent.type === 'TEST') {
        logger.info('RevenueCat test event alındı', {
          appUserId: webhookEvent.app_user_id,
          productId: webhookEvent.product_id
        });
        return { success: true, message: 'Test event processed successfully' };
      }

      // Kullanıcıyı bul (app_user_id genellikle email veya custom user ID)
      const user = await this.findUserByRevenueCatId(webhookEvent.app_user_id);
      
      if (!user) {
        logger.warn('RevenueCat webhook için kullanıcı bulunamadı', {
          appUserId: webhookEvent.app_user_id
        });
        return { success: false, error: 'User not found' };
      }

      // Event tipine göre işlem yap
      switch (webhookEvent.type) {
        case 'INITIAL_PURCHASE':
          return await this.handleInitialPurchase(user, webhookEvent);
        
        case 'RENEWAL':
          return await this.handleRenewal(user, webhookEvent);
        
        case 'CANCELLATION':
          return await this.handleCancellation(user, webhookEvent);
        
        case 'UNCANCELLATION':
          return await this.handleUncancellation(user, webhookEvent);
        
        case 'NON_RENEWING_PURCHASE':
          return await this.handleNonRenewingPurchase(user, webhookEvent);
        
        case 'EXPIRATION':
          return await this.handleExpiration(user, webhookEvent);
        
        case 'BILLING_ISSUE':
          return await this.handleBillingIssue(user, webhookEvent);
        
        case 'PRODUCT_CHANGE':
          return await this.handleProductChange(user, webhookEvent);
        
        default:
          logger.info('Bilinmeyen RevenueCat event tipi', {
            eventType: webhookEvent.type
          });
          return { success: true, message: 'Event type not handled' };
      }
    } catch (error: any) {
      logger.error('RevenueCat webhook işleme hatası', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * İlk satın alma işlemini işler
   */
  private async handleInitialPurchase(user: any, event: any) {
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
      } else {
        user.subscriptionStatus = 'active';
        user.subscriptionStartDate = purchaseDate;
        
        // Bir sonraki ödeme tarihini hesapla
        const nextPaymentDate = new Date(purchaseDate);
        if (productConfig.period === 'monthly') {
          nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
        } else {
          // Yıllık abonelik için ekstra ayları da ekle
          const extraMonths = (productConfig.plan === 'business' || productConfig.plan === 'investor') ? 3 : 0;
          nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 12 + extraMonths);
        }
        user.nextPaymentDate = nextPaymentDate;
      }

      user.isSubscriptionActive = true;

      // Ödeme geçmişine ekle
      if (!user.paymentHistory) user.paymentHistory = [];
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

      await user.save();

      logger.info('IAP ilk satın alma başarıyla işlendi', {
        userId: user._id,
        plan: productConfig.plan,
        period: productConfig.period
      });

      return { success: true };
    } catch (error: any) {
      logger.error('IAP ilk satın alma işleme hatası', { error: error.message });
      throw error;
    }
  }

  /**
   * Abonelik yenileme işlemini işler
   */
  private async handleRenewal(user: any, event: any) {
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
      } else {
        const extraMonths = (productConfig.plan === 'business' || productConfig.plan === 'investor') ? 3 : 0;
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 12 + extraMonths);
      }
      user.nextPaymentDate = nextPaymentDate;

      // Ödeme geçmişine ekle
      if (!user.paymentHistory) user.paymentHistory = [];
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

      await user.save();

      logger.info('IAP abonelik yenileme başarıyla işlendi', {
        userId: user._id,
        plan: productConfig.plan,
        period: productConfig.period
      });

      return { success: true };
    } catch (error: any) {
      logger.error('IAP yenileme işleme hatası', { error: error.message });
      throw error;
    }
  }

  /**
   * Abonelik iptal işlemini işler
   */
  private async handleCancellation(user: any, event: any) {
    try {
      // Abonelik durumunu güncelle (mevcut dönem sonuna kadar aktif kalır)
      user.autoRenewal = false;
      
      // Eğer expiration_at_ms varsa, o tarihe kadar aktif kalır
      if (event.expiration_at_ms) {
        user.nextPaymentDate = new Date(event.expiration_at_ms);
      }

      await user.save();

      logger.info('IAP abonelik iptal işlendi', {
        userId: user._id,
        cancelReason: event.cancel_reason
      });

      return { success: true };
    } catch (error: any) {
      logger.error('IAP iptal işleme hatası', { error: error.message });
      throw error;
    }
  }

  /**
   * Abonelik iptal geri alma işlemini işler
   */
  private async handleUncancellation(user: any, event: any) {
    try {
      user.autoRenewal = true;
      await user.save();

      logger.info('IAP abonelik iptal geri alındı', {
        userId: user._id
      });

      return { success: true };
    } catch (error: any) {
      logger.error('IAP iptal geri alma hatası', { error: error.message });
      throw error;
    }
  }

  /**
   * Abonelik süresi dolma işlemini işler
   */
  private async handleExpiration(user: any, event: any) {
    try {
      user.subscriptionStatus = 'expired';
      user.isSubscriptionActive = false;
      await user.save();

      logger.info('IAP abonelik süresi doldu', {
        userId: user._id,
        expirationReason: event.expiration_reason
      });

      return { success: true };
    } catch (error: any) {
      logger.error('IAP süre dolma hatası', { error: error.message });
      throw error;
    }
  }

  /**
   * Fatura sorunu işlemini işler
   */
  private async handleBillingIssue(user: any, event: any) {
    try {
      // Fatura sorunu durumunda kullanıcıyı bilgilendir
      logger.warn('IAP fatura sorunu tespit edildi', {
        userId: user._id,
        transactionId: event.transaction_id
      });

      return { success: true };
    } catch (error: any) {
      logger.error('IAP fatura sorunu işleme hatası', { error: error.message });
      throw error;
    }
  }

  /**
   * Ürün değişikliği işlemini işler
   */
  private async handleProductChange(user: any, event: any) {
    try {
      const productConfig = this.getProductConfig(event.product_id);
      if (!productConfig) {
        throw new Error(`Product config not found for: ${event.product_id}`);
      }

      // Abonelik planını güncelle
      user.subscriptionPlan = productConfig.plan;
      user.subscriptionPeriod = productConfig.period;
      user.subscriptionAmount = productConfig.price;

      await user.save();

      logger.info('IAP ürün değişikliği işlendi', {
        userId: user._id,
        newPlan: productConfig.plan,
        newPeriod: productConfig.period
      });

      return { success: true };
    } catch (error: any) {
      logger.error('IAP ürün değişikliği hatası', { error: error.message });
      throw error;
    }
  }

  /**
   * Non-renewing purchase işlemini işler (tek seferlik satın alma)
   */
  private async handleNonRenewingPurchase(user: any, event: any) {
    try {
      const productConfig = this.getProductConfig(event.product_id);
      if (!productConfig) {
        throw new Error(`Product config not found for: ${event.product_id}`);
      }

      const purchaseDate = new Date(event.purchased_at_ms);

      // Ödeme geçmişine ekle
      if (!user.paymentHistory) user.paymentHistory = [];
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

      await user.save();

      logger.info('IAP tek seferlik satın alma işlendi', {
        userId: user._id,
        productId: event.product_id
      });

      return { success: true };
    } catch (error: any) {
      logger.error('IAP tek seferlik satın alma hatası', { error: error.message });
      throw error;
    }
  }

  /**
   * RevenueCat app_user_id ile kullanıcıyı bulur
   */
  private async findUserByRevenueCatId(appUserId: string) {
    // Önce email ile dene (RevenueCat'te app_user_id genellikle email)
    let user = await User.findOne({ email: appUserId });
    
    if (!user) {
      // Eğer email ile bulunamazsa, custom field ile dene
      user = await User.findOne({ 'revenueCatId': appUserId });
    }
    
    return user;
  }

  /**
   * Product ID'ye göre konfigürasyon döndürür
   */
  private getProductConfig(productId: string) {
    return revenueCatConfig.productMapping[productId as keyof typeof revenueCatConfig.productMapping];
  }

  /**
   * RevenueCat API ile kullanıcı bilgilerini alır
   */
  async getUserInfo(appUserId: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/subscribers/${appUserId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error: any) {
      logger.error('RevenueCat kullanıcı bilgisi alma hatası', { error: error.message });
      throw error;
    }
  }

  /**
   * Kullanıcının abonelik durumunu kontrol eder
   */
  async checkSubscriptionStatus(appUserId: string) {
    try {
      const userInfo = await this.getUserInfo(appUserId);
      return userInfo;
    } catch (error: any) {
      logger.error('RevenueCat abonelik durumu kontrol hatası', { error: error.message });
      throw error;
    }
  }
}

export default new RevenueCatService();
