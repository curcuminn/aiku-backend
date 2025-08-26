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
        logger.info('Signed payload alındı, parse ediliyor...');
        
        try {
          // RevenueCat signed payload formatı: JWT benzeri 3 parçalı yapı
          const payloadParts = event.signedPayload.split('.');
          
          logger.info('Signed payload parts', {
            partsCount: payloadParts.length,
            part1Length: payloadParts[0]?.length || 0,
            part2Length: payloadParts[1]?.length || 0,
            part3Length: payloadParts[2]?.length || 0
          });
          
          if (payloadParts.length !== 3) {
            logger.error('Geçersiz signed payload formatı - 3 parça bekleniyor', {
              partsCount: payloadParts.length
            });
            return { success: false, error: 'Invalid signed payload format' };
          }
          
          // İkinci parça (payload) decode et
          const encodedPayload = payloadParts[1];
          
          // Base64URL decode (JWT standardı)
          // Base64URL'deki - ve _ karakterlerini + ve / ile değiştir
          const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
          // Padding ekle
          const paddedBase64 = base64 + '='.repeat((4 - base64.length % 4) % 4);
          
          const decodedPayload = Buffer.from(paddedBase64, 'base64').toString('utf-8');
          logger.info('Signed payload decoded', { 
            decodedLength: decodedPayload.length,
            firstChars: decodedPayload.substring(0, 200)
          });
          
          // JSON parse et
          const rawPayload = JSON.parse(decodedPayload);
          logger.info('Signed payload parsed', { 
            payloadKeys: Object.keys(rawPayload),
            hasEvent: !!rawPayload.event,
            eventType: rawPayload.event?.type
          });
          
          // Event'i al
          webhookEvent = rawPayload.event;
          
          if (!webhookEvent) {
            logger.error('Signed payload içinde event bulunamadı', { 
              payloadKeys: Object.keys(rawPayload),
              rawPayload: JSON.stringify(rawPayload).substring(0, 500)
            });
            return { success: false, error: 'No event found in signed payload' };
          }
          
          logger.info('Signed payload event extracted', {
            eventType: webhookEvent.type,
            appUserId: webhookEvent.app_user_id,
            productId: webhookEvent.product_id
          });
          
        } catch (parseError: any) {
          logger.error('Signed payload parse hatası', { 
            error: parseError,
            errorMessage: parseError.message,
            signedPayloadLength: event.signedPayload.length,
            signedPayloadStart: event.signedPayload.substring(0, 100)
          });
          return { success: false, error: 'Cannot parse signed payload' };
        }
      } else if ('event' in event) {
        // Normal event formatı
        webhookEvent = event.event;
        logger.info('Normal event formatı kullanılıyor', {
          eventType: webhookEvent?.type
        });
      } else {
        logger.error('Geçersiz webhook formatı', { event });
        return { success: false, error: 'Invalid webhook format' };
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
      let user = await this.findUserByRevenueCatId(webhookEvent.app_user_id);
      
      // Eğer bulunamazsa ve original_app_user_id varsa, onunla da dene
      if (!user && webhookEvent.original_app_user_id && webhookEvent.original_app_user_id !== webhookEvent.app_user_id) {
        logger.info('Original app user ID ile kullanıcı aranıyor', {
          currentId: webhookEvent.app_user_id,
          originalId: webhookEvent.original_app_user_id
        });
        user = await this.findUserByRevenueCatId(webhookEvent.original_app_user_id);
        
                 // Eğer original ID ile bulunursa, yeni ID'yi de kaydet
         if (user) {
           logger.info('Original ID ile kullanıcı bulundu, yeni ID kaydediliyor', {
             userId: user._id,
             originalId: webhookEvent.original_app_user_id,
             newId: webhookEvent.app_user_id
           });
           
           // Yeni ID'yi revenueCatId olarak güncelle
           user.revenueCatId = webhookEvent.app_user_id;
           await user.save();
         }
      }
      
      if (!user) {
        logger.warn('RevenueCat webhook için kullanıcı bulunamadı', {
          appUserId: webhookEvent.app_user_id,
          originalAppUserId: webhookEvent.original_app_user_id,
          eventType: webhookEvent.type,
          productId: webhookEvent.product_id
        });
        
        // Kullanıcı bulunamadığında webhook'u başarılı olarak işaretle
        // RevenueCat'in tekrar denemesini engelle
        return { success: true, message: 'User not found, but webhook processed' };
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
      
      // Trial kontrolü - sadece ilk kez abonelik alan kullanıcılar için
      let nextPaymentDate: Date;
      if (productConfig.trialDays > 0 && !isReactivation) {
        const trialEndDate = new Date(purchaseDate);
        trialEndDate.setDate(trialEndDate.getDate() + productConfig.trialDays);
        nextPaymentDate = trialEndDate;
      } else {
        // Yeniden aktivasyon veya trial olmayan planlar için
        // Bir sonraki ödeme tarihini hesapla
        nextPaymentDate = new Date(purchaseDate);
        if (productConfig.period === 'monthly') {
          nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
        } else {
          // Yıllık abonelik için ekstra ayları da ekle
          const extraMonths = (productConfig.plan === 'business' || productConfig.plan === 'investor') ? 3 : 0;
          nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 12 + extraMonths);
        }
      }

      // Yeni abonelik oluştur
      const newSubscription = {
        plan: productConfig.plan,
        period: productConfig.period,
        status: productConfig.trialDays > 0 && !isReactivation ? 'trial' : 'active',
        startDate: purchaseDate,
        amount: productConfig.price,
        autoRenewal: true,
        paymentMethod: 'iap',
        lastPaymentDate: purchaseDate,
        nextPaymentDate: nextPaymentDate,
        transactionId: event.transaction_id,
        revenueCatProductId: event.product_id,
        isActive: true
      };

      // Subscriptions array'ini başlat
      if (!user.subscriptions) user.subscriptions = [];
      
      // Yeni aboneliği ekle
      user.subscriptions.push(newSubscription);

      // Ana abonelik bilgilerini güncelle (en son alınan abonelik aktif olur)
      user.subscriptionPlan = productConfig.plan;
      user.subscriptionPeriod = productConfig.period;
      user.subscriptionAmount = productConfig.price;
      user.paymentMethod = 'iap';
      user.autoRenewal = true;
      user.lastPaymentDate = purchaseDate;
      user.subscriptionStatus = newSubscription.status;
      user.isSubscriptionActive = true;

      if (newSubscription.status === 'trial') {
        const trialEndDate = new Date(purchaseDate);
        trialEndDate.setDate(trialEndDate.getDate() + productConfig.trialDays);
        user.trialEndsAt = trialEndDate;
        user.nextPaymentDate = trialEndDate;
      } else {
        user.subscriptionStartDate = purchaseDate;
        user.trialEndsAt = undefined;
        user.nextPaymentDate = newSubscription.nextPaymentDate;
      }

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
        platform: event.store,
        iapTransactionId: event.transaction_id
      });

      await user.save();

      logger.info('IAP ilk satın alma başarıyla işlendi', {
        userId: user._id,
        plan: productConfig.plan,
        period: productConfig.period,
        isReactivation,
        subscriptionCount: user.subscriptions.length
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

      // İlgili aboneliği bul ve güncelle
      if (user.subscriptions && user.subscriptions.length > 0) {
        const matchingSubscription = user.subscriptions.find(
          (sub: any) => sub.revenueCatProductId === event.product_id && sub.isActive
        );
        
        if (matchingSubscription) {
          // Bir sonraki ödeme tarihini hesapla
          const nextPaymentDate = new Date(renewalDate);
          if (productConfig.period === 'monthly') {
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
          } else {
            const extraMonths = (productConfig.plan === 'business' || productConfig.plan === 'investor') ? 3 : 0;
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 12 + extraMonths);
          }

          // Aboneliği güncelle
          matchingSubscription.status = 'active';
          matchingSubscription.lastPaymentDate = renewalDate;
          matchingSubscription.nextPaymentDate = nextPaymentDate;
          matchingSubscription.isActive = true;
        }
      }

      // Ana abonelik bilgilerini güncelle
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
        period: productConfig.period,
        subscriptionCount: user.subscriptions?.length || 0
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

      // Subscriptions array'indeki aktif aboneliği bul ve güncelle
      if (user.subscriptions && user.subscriptions.length > 0) {
        const activeSubscription = user.subscriptions.find((sub: any) => sub.isActive);
        if (activeSubscription) {
          activeSubscription.status = 'cancelled';
          activeSubscription.autoRenewal = false;
          
          // isActive'i nextPaymentDate'e göre hesapla
          const now = new Date();
          activeSubscription.isActive = activeSubscription.nextPaymentDate && now < activeSubscription.nextPaymentDate;
        }
      }

      await user.save();

      logger.info('IAP abonelik iptal işlendi', {
        userId: user._id,
        cancelReason: event.cancel_reason,
        nextPaymentDate: user.nextPaymentDate
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
   * Ürün değişikliği işlemini işler - PRODUCT_CHANGE eventini yeni abonelik olarak işler
   * Mevcut aboneliği değiştirmek yerine yeni bir abonelik olarak kaydeder
   */
  private async handleProductChange(user: any, event: any) {
    try {
      // Yeni product ID'yi kullan (new_product_id varsa)
      const newProductId = event.new_product_id || event.product_id;
      const productConfig = this.getProductConfig(newProductId);
      if (!productConfig) {
        throw new Error(`Product config not found for: ${newProductId}`);
      }

      const changeDate = new Date(event.purchased_at_ms);
      const previousPlan = user.subscriptionPlan;
      const previousPeriod = user.subscriptionPeriod;

      // Bir sonraki ödeme tarihini hesapla
      const nextPaymentDate = new Date(changeDate);
      if (productConfig.period === 'monthly') {
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
      } else {
        const extraMonths = (productConfig.plan === 'business' || productConfig.plan === 'investor') ? 3 : 0;
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 12 + extraMonths);
      }

      // Yeni abonelik oluştur
      const newSubscription = {
        plan: productConfig.plan,
        period: productConfig.period,
        status: 'active',
        startDate: changeDate,
        amount: productConfig.price,
        autoRenewal: true,
        paymentMethod: 'iap',
        lastPaymentDate: changeDate,
        nextPaymentDate: nextPaymentDate,
        transactionId: event.transaction_id,
        revenueCatProductId: newProductId,
        isActive: true
      };

      // Subscriptions array'ini başlat
      if (!user.subscriptions) user.subscriptions = [];
      
      // Yeni aboneliği ekle
      user.subscriptions.push(newSubscription);

      // Ana abonelik bilgilerini güncelle (en son alınan abonelik aktif olur)
      user.subscriptionPlan = productConfig.plan;
      user.subscriptionPeriod = productConfig.period;
      user.subscriptionAmount = productConfig.price;
      user.lastPaymentDate = changeDate;
      user.isSubscriptionActive = true;
      user.subscriptionStatus = 'active';
      user.nextPaymentDate = nextPaymentDate;

      // Ödeme geçmişine yeni abonelik olarak ekle
      if (!user.paymentHistory) user.paymentHistory = [];
      user.paymentHistory.push({
        amount: productConfig.price,
        date: changeDate,
        status: 'success',
        transactionId: event.transaction_id,
        description: `IAP ${productConfig.plan} ${productConfig.period} yeni abonelik (önceki: ${previousPlan} ${previousPeriod})`,
        type: 'subscription',
        plan: productConfig.plan,
        period: productConfig.period,
        platform: event.store,
        iapTransactionId: event.transaction_id
      });

      await user.save();

      logger.info('IAP PRODUCT_CHANGE eventi yeni abonelik olarak işlendi', {
        userId: user._id,
        previousPlan,
        previousPeriod,
        newPlan: productConfig.plan,
        newPeriod: productConfig.period,
        newProductId,
        transactionId: event.transaction_id,
        eventType: 'PRODUCT_CHANGE',
        subscriptionCount: user.subscriptions.length
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
  private async findUserByRevenueCatId(appUserId: string): Promise<any> {
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

      // Eğer hala bulunamazsa ve anonymous ID ise, RevenueCat API'den bilgi almaya çalış
      if (!user && appUserId.startsWith('$RCAnonymousID:')) {
        try {
          logger.info('Anonymous ID için RevenueCat API\'den bilgi alınıyor', { appUserId });
          const userInfo = await this.getUserInfo(appUserId);
          
          // API'den gelen original_app_user_id ile tekrar dene
          if (userInfo.original_app_user_id && userInfo.original_app_user_id !== appUserId) {
            logger.info('Original app user ID ile tekrar aranıyor', { 
              originalId: userInfo.original_app_user_id,
              currentId: appUserId 
            });
            // Recursive call yerine doğrudan arama yap
            user = await User.findOne({ 'revenueCatId': userInfo.original_app_user_id });
            if (!user && userInfo.original_app_user_id.match(/^[0-9a-fA-F]{24}$/)) {
              user = await User.findById(userInfo.original_app_user_id);
            }
          }
        } catch (apiError: any) {
          logger.warn('RevenueCat API\'den bilgi alınamadı', { 
            appUserId, 
            error: apiError.message 
          });
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

      // Detaylı log ekle
      logger.info('RevenueCat API response alındı', {
        appUserId,
        status: response.status,
        dataKeys: Object.keys(response.data),
        entitlements: response.data?.entitlements,
        subscriptions: response.data?.subscriptions,
        originalAppUserId: response.data?.original_app_user_id,
        firstSeen: response.data?.first_seen,
        lastSeen: response.data?.last_seen
      });

      return response.data;
    } catch (error: any) {
      logger.error('RevenueCat kullanıcı bilgisi alma hatası', { 
        appUserId,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
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
