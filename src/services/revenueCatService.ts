import axios from 'axios';
import { verify } from 'jsonwebtoken';
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
    entitlement_id: string | null;
    entitlement_ids: string[] | null;
    presented_offering_id?: string | null;
    transaction_id: string | null;
    original_transaction_id: string | null;
    is_family_share: boolean | null;
    country_code: string;
    app_id: string;
    offer_code?: string | null;
    price?: number | null;
    currency?: string | null;
    subscriber_attributes?: any;
    store: string;
    takehome_percentage?: number | null;
    commission_percentage?: number | null;
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
  async handleWebhook(event: RevenueCatWebhookEvent | { signedPayload: string }) {
    try {
      let webhookEvent: any;
      
      // Signed payload kontrolü
      if ('signedPayload' in event) {
        try {
          logger.info('Signed payload alındı, decode ediliyor...', {
            payloadLength: event.signedPayload.length
          });
          
          // RevenueCat signed payload'ı JWT formatında gelir
          // Önce base64 decode et, sonra JWT verify et
          const decodedPayload = Buffer.from(event.signedPayload, 'base64').toString('utf-8');
          logger.info('Decoded payload başlangıcı:', { 
            decodedStart: decodedPayload.substring(0, 200) + '...',
            payloadLength: decodedPayload.length,
            isJWT: decodedPayload.includes('.') && decodedPayload.split('.').length === 3
          });
          
          // JWT verify et (RevenueCat webhook secret ile)
          const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
          
          if (!webhookSecret) {
            logger.warn('REVENUECAT_WEBHOOK_SECRET bulunamadı, signed payload decode edilemiyor');
            // Secret yoksa signed payload'ı raw olarak parse etmeyi dene
            try {
              const rawPayload = JSON.parse(decodedPayload);
              webhookEvent = rawPayload.event;
              logger.info('Raw payload parse edildi (secret yok)', {
                eventType: webhookEvent?.type
              });
            } catch (parseError) {
              logger.error('Raw payload parse hatası', { error: parseError });
              return { success: false, error: 'Cannot parse signed payload without secret' };
            }
          } else {
            // JWT verify et
            try {
              const verifiedPayload = verify(decodedPayload, webhookSecret) as any;
              webhookEvent = verifiedPayload.event;
              logger.info('JWT verify başarılı', {
                eventType: webhookEvent?.type
              });
            } catch (jwtError) {
              logger.error('JWT verify hatası, raw parse deneniyor', { error: jwtError });
              // JWT verify başarısız olursa raw parse dene
              try {
                const rawPayload = JSON.parse(decodedPayload);
                webhookEvent = rawPayload.event;
                logger.info('Raw payload parse edildi (JWT verify başarısız)', {
                  eventType: webhookEvent?.type
                });
              } catch (parseError) {
                logger.error('Raw payload parse de başarısız', { error: parseError });
                return { success: false, error: 'Cannot verify or parse signed payload' };
              }
            }
          }
          
          logger.info('Signed payload başarıyla decode edildi', {
            eventType: webhookEvent?.type,
            appUserId: webhookEvent?.app_user_id,
            productId: webhookEvent?.product_id
          });
        } catch (decodeError: any) {
          logger.error('Signed payload decode hatası', { 
            error: decodeError.message,
            payloadLength: event.signedPayload.length
          });
          
          // Signed payload decode başarısız olursa, normal event formatını dene
          if ('event' in event) {
            webhookEvent = event.event;
            logger.info('Normal event formatı kullanılıyor', {
              eventType: webhookEvent?.type
            });
          } else {
            return { success: false, error: 'Invalid signed payload and no fallback event' };
          }
        }
      } else {
        webhookEvent = event.event;
      }

      // Event kontrolü
      if (!webhookEvent || !webhookEvent.type) {
        logger.error('Geçersiz webhook event', { event });
        return { success: false, error: 'Invalid event structure' };
      }
      
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

      // Eğer kullanıcının aboneliği iptal edilmişse, yeni abonelik olarak işle
      const isReactivation = user.subscriptionStatus === 'cancelled' || user.subscriptionStatus === 'expired';
      
      // Abonelik bilgilerini güncelle
      user.subscriptionPlan = productConfig.plan;
      user.subscriptionPeriod = productConfig.period;
      user.subscriptionAmount = productConfig.price;
      user.paymentMethod = 'iap'; // In-App Purchase
      user.autoRenewal = true;
      user.lastPaymentDate = purchaseDate;

      // Trial kontrolü - sadece ilk kez abonelik alan kullanıcılar için
      if (productConfig.trialDays > 0 && !isReactivation) {
        user.subscriptionStatus = 'trial';
        const trialEndDate = new Date(purchaseDate);
        trialEndDate.setDate(trialEndDate.getDate() + productConfig.trialDays);
        user.trialEndsAt = trialEndDate;
        user.nextPaymentDate = trialEndDate;
      } else {
        // Yeniden aktivasyon veya trial olmayan planlar için
        user.subscriptionStatus = 'active';
        user.subscriptionStartDate = purchaseDate;
        user.trialEndsAt = undefined; // Trial'ı kaldır
        
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
        description: isReactivation 
          ? `IAP ${productConfig.plan} ${productConfig.period} yeniden aktivasyon`
          : `IAP ${productConfig.plan} ${productConfig.period} abonelik`,
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
        period: productConfig.period,
        isReactivation,
        previousStatus: user.subscriptionStatus
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
    try {
      // Önce revenueCatId field'ı ile dene
      let user = await User.findOne({ 'revenueCatId': appUserId });
      
      if (!user) {
        // Eğer revenueCatId ile bulunamazsa, User ID ile dene (sadece geçerli ObjectId ise)
        if (appUserId.match(/^[0-9a-fA-F]{24}$/)) {
          user = await User.findById(appUserId);
        }
      }
      
      if (!user) {
        // Son olarak email ile dene (eğer app_user_id email formatında ise)
        if (appUserId.includes('@')) {
          user = await User.findOne({ 'email': appUserId });
        }
      }
      
      return user;
    } catch (error: any) {
      logger.error('Kullanıcı arama hatası', { 
        appUserId, 
        error: error.message 
      });
      return null;
    }
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
