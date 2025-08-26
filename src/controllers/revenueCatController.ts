import express from 'express';
import crypto from 'crypto';
import revenueCatService from '../services/revenueCatService';
import revenueCatConfig from '../config/revenueCat';
import logger from '../config/logger';
import { User } from '../models/User';

/**
 * RevenueCat webhook'larını işler
 * Bu endpoint RevenueCat'ten gelen tüm abonelik event'lerini alır
 */
export const handleRevenueCatWebhook = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    // Webhook signature doğrulaması (optional)
    const signature = req.headers['authorization'] as string;
    
    // Eğer webhook secret varsa doğrula, yoksa geç
    if (revenueCatConfig.webhookSecret && signature) {
      const expectedSignature = `Bearer ${revenueCatConfig.webhookSecret}`;
      if (signature !== expectedSignature) {
        logger.warn('RevenueCat webhook signature geçersiz');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Webhook body'sini kontrol et
    const webhookBody = req.body;
    
    if (!webhookBody) {
      logger.error('RevenueCat webhook body boş');
      return res.status(400).json({ error: 'Empty webhook body' });
    }

    logger.info('RevenueCat webhook body alındı', {
      hasSignedPayload: !!webhookBody.signedPayload,
      hasEvent: !!webhookBody.event,
      bodyKeys: Object.keys(webhookBody),
      signedPayloadLength: webhookBody.signedPayload?.length || 0,
      contentType: req.headers['content-type'],
      userAgent: req.headers['user-agent']
    });

    // Webhook event'ini işle
    const result = await revenueCatService.handleWebhook(webhookBody);
    
    if (result.success) {
      logger.info('RevenueCat webhook başarıyla işlendi', {
        eventType: webhookBody.event?.type || 'signed_payload'
      });
      res.status(200).json({ success: true });
    } else {
      const errorMessage = 'error' in result ? result.error : 'Unknown error';
      logger.error('RevenueCat webhook işleme hatası', {
        error: errorMessage
      });
      res.status(500).json({ error: errorMessage });
    }
  } catch (error: any) {
    logger.error('RevenueCat webhook genel hata', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Kullanıcının RevenueCat abonelik durumunu kontrol eder
 */
export const checkUserSubscriptionStatus = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userId = req.user?._id;
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

    const subscriptionInfo = await revenueCatService.checkSubscriptionStatus(appUserId);
    
    res.status(200).json({
      success: true,
      subscription: subscriptionInfo
    });
  } catch (error: any) {
    logger.error('Abonelik durumu kontrol hatası', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Abonelik durumu kontrol edilemedi',
      error: error.message
    });
  }
};

/**
 * Kullanıcının RevenueCat bilgilerini alır
 */
export const getUserRevenueCatInfo = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userId = req.user?._id;
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

    const userInfo = await revenueCatService.getUserInfo(appUserId);
    
    res.status(200).json({
      success: true,
      userInfo: userInfo
    });
  } catch (error: any) {
    logger.error('RevenueCat kullanıcı bilgisi alma hatası', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Kullanıcı bilgisi alınamadı',
      error: error.message
    });
  }
};

/**
 * Test webhook endpoint'i - sadece geliştirme ortamında
 */
export const testWebhook = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    logger.info('Test webhook çağrıldı');
    
    // Gerçek RevenueCat webhook formatında test event'i oluştur
    const testEvent = {
      signedPayload: Buffer.from(JSON.stringify({
        event: {
          type: 'INITIAL_PURCHASE',
          id: 'test_event_id',
          app_user_id: 'admin@test.com',
          product_id: 'startup_monthly',
          store: 'apple_app',
          transaction_id: 'test_transaction_id',
          purchased_at_ms: Date.now(),
          environment: 'Sandbox',
          country_code: 'TR',
          app_id: 'test_app_id',
          period_type: 'normal',
          entitlement_id: 'premium',
          entitlement_ids: ['premium'],
          is_family_share: false,
          subscriber_attributes: {},
          takehome_percentage: 70,
          commission_percentage: 30,
          is_trial_conversion: false
        }
      })).toString('base64')
    };
    
    logger.info('Test event oluşturuldu', {
      eventType: 'INITIAL_PURCHASE',
      appUserId: 'admin@test.com',
      productId: 'startup_monthly'
    });
    
    const result = await revenueCatService.handleWebhook(testEvent);
    
    res.status(200).json({
      success: true,
      message: 'Test webhook başarılı',
      result,
      testEvent: {
        type: 'INITIAL_PURCHASE',
        appUserId: 'admin@test.com',
        productId: 'startup_monthly'
      }
    });
  } catch (error: any) {
    logger.error('Test webhook hatası', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Test webhook hatası',
      error: error.message
    });
  }
};

/**
 * Test için özel webhook endpoint'i - bu kullanıcı için
 */
export const testUserWebhook = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const eventType = (req.query.eventType as string) || 'INITIAL_PURCHASE';
    const productId = (req.query.productId as string) || 'startup_monthly';
    
    // Test event'i oluştur - bu kullanıcı için
    const testEvent = {
      api_version: '1.0',
      event: {
        type: eventType,
        id: 'test-event-' + Date.now(),
        app_user_id: '$RCAnonymousID:ad32e482d520486ea6cc28d5afa44dae',
        product_id: productId,
        new_product_id: eventType === 'PRODUCT_CHANGE' ? 'business_monthly' : undefined,
        period_type: 'NORMAL',
        purchased_at_ms: Date.now(),
        expiration_at_ms: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 gün sonra
        environment: 'SANDBOX',
        entitlement_id: null,
        entitlement_ids: eventType === 'PRODUCT_CHANGE' ? ['premium_access', 'startup_access'] : ['startup_access'],
        presented_offering_id: 'default',
        transaction_id: 'test-transaction-' + Date.now(),
        original_transaction_id: 'test-transaction-' + Date.now(),
        is_family_share: false,
        country_code: 'TR',
        aliases: [],
        original_app_user_id: '$RCAnonymousID:ad32e482d520486ea6cc28d5afa44dae',
        currency: 'TRY',
        price: 0,
        price_in_purchased_currency: 0,
        subscriber_attributes: {},
        store: 'APP_STORE',
        takehome_percentage: 0.7,
        offer_code: null,
        tax_percentage: 0.2292,
        commission_percentage: 0.2312,
        metadata: null,
        renewal_number: null,
        app_id: 'app032bc355d3'
      }
    };

    const result = await revenueCatService.handleWebhook(testEvent);
    
    res.status(200).json({
      success: true,
      message: `Test ${eventType} webhook processed`,
      result,
      testEvent: {
        type: eventType,
        productId: productId,
        newProductId: eventType === 'PRODUCT_CHANGE' ? 'business_monthly' : undefined
      }
    });
  } catch (error: any) {
    logger.error('Test user webhook hatası', { error: error.message });
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mobil uygulama için abonelik planlarını döndürür
 */
export const getMobileSubscriptionPlans = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const plans = revenueCatConfig.productMapping;
    
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
  } catch (error: any) {
    logger.error('Mobil abonelik planları alma hatası', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Abonelik planları alınamadı',
      error: error.message
    });
  }
};

/**
 * Kullanıcının ödeme yöntemini kontrol eder (Web vs Mobil)
 */
export const checkPaymentMethod = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Oturum açmanız gerekiyor',
      });
    }

    // Kullanıcının mevcut ödeme yöntemini kontrol et
    const user = await import('../models/User').then(m => m.User.findById(userId));
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }

    const paymentMethod = user.paymentMethod || 'creditCard';
    const isIAP = paymentMethod === 'iap' as any;
    
    res.status(200).json({
      success: true,
      paymentMethod: paymentMethod,
      isIAP: isIAP,
      canChangeToWeb: !isIAP, // IAP kullanıcıları web'e geçemez
      canChangeToMobile: !isIAP // Web kullanıcıları mobile geçebilir
    });
  } catch (error: any) {
    logger.error('Ödeme yöntemi kontrol hatası', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Ödeme yöntemi kontrol edilemedi',
      error: error.message
    });
  }
};

/**
 * Kullanıcının RevenueCat ID'sini senkronize eder
 * Mobil uygulamada abonelik alındığında çağrılır
 */
export const syncRevenueCatId = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { userId, revenueCatId } = req.body;
    
    if (!userId || !revenueCatId) {
      return res.status(400).json({
        success: false,
        message: 'userId ve revenueCatId gerekli'
      });
    }

    // Kullanıcıyı bul - hem string hem ObjectId formatını destekle
    let user;
    if (userId.match(/^[0-9a-fA-F]{24}$/)) {
      // Geçerli ObjectId formatı
      user = await User.findById(userId);
    } else {
      // String format - email veya başka bir identifier
      user = await User.findOne({ 
        $or: [
          { email: userId },
          { _id: userId }
        ]
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // RevenueCat ID'yi kaydet
    user.revenueCatId = revenueCatId;
    await user.save();

    logger.info('RevenueCat ID senkronize edildi', {
      userId: user._id,
      revenueCatId
    });

    res.status(200).json({
      success: true,
      message: 'RevenueCat ID başarıyla senkronize edildi'
    });
  } catch (error: any) {
    logger.error('RevenueCat ID senkronizasyon hatası', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Senkronizasyon hatası',
      error: error.message
    });
  }
};

/**
 * Test için basit kullanıcı oluşturur (sadece geliştirme ortamında)
 */
export const createTestUser = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { email, firstName, lastName } = req.body;
    
    if (!email || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'email, firstName ve lastName gerekli'
      });
    }

    // Kullanıcı var mı kontrol et
    let user = await User.findOne({ email });
    
    if (user) {
      return res.status(200).json({
        success: true,
        message: 'Kullanıcı zaten mevcut',
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          revenueCatId: user.revenueCatId
        }
      });
    }

    // Yeni test kullanıcısı oluştur
    user = new User({
      email,
      firstName,
      lastName,
      emailVerified: true,
      authProvider: 'email',
      accountStatus: 'active'
    });

    await user.save();

    logger.info('Test kullanıcısı oluşturuldu', {
      userId: user._id,
      email: user.email
    });

    res.status(201).json({
      success: true,
      message: 'Test kullanıcısı oluşturuldu',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        revenueCatId: user.revenueCatId
      }
    });
  } catch (error: any) {
    logger.error('Test kullanıcısı oluşturma hatası', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Kullanıcı oluşturulamadı',
      error: error.message
    });
  }
};

/**
 * Test kullanıcısı bilgilerini getirir
 */
export const getTestUser = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId gerekli'
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        revenueCatId: user.revenueCatId,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionPlan: user.subscriptionPlan,
        paymentMethod: user.paymentMethod,
        subscriptions: user.subscriptions || [],
        subscriptionCount: user.subscriptions?.length || 0
      }
    });
  } catch (error: any) {
    logger.error('Test kullanıcısı getirme hatası', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Kullanıcı bilgileri alınamadı',
      error: error.message
    });
  }
};

/**
 * Kullanıcının tüm aboneliklerini getirir
 */
export const getUserSubscriptions = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Oturum açmanız gerekiyor',
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    res.status(200).json({
      success: true,
      subscriptions: user.subscriptions || [],
      subscriptionCount: user.subscriptions?.length || 0,
      activeSubscriptionCount: user.subscriptions?.filter((sub: any) => sub.isActive).length || 0
    });
  } catch (error: any) {
    logger.error('Kullanıcı abonelikleri getirme hatası', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Abonelikler alınamadı',
      error: error.message
    });
  }
};

/**
 * Belirli bir aboneliği iptal eder
 */
export const cancelSubscription = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Oturum açmanız gerekiyor',
      });
    }

    const { subscriptionId } = req.params;
    
    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'subscriptionId gerekli'
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Aboneliği bul
    const subscription = user.subscriptions?.find((sub: any) => sub._id?.toString() === subscriptionId);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Abonelik bulunamadı'
      });
    }

    if (!subscription.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Bu abonelik zaten iptal edilmiş'
      });
    }

    // Aboneliği iptal et
    subscription.status = 'cancelled';
    subscription.isActive = false;
    subscription.autoRenewal = false;
    
    // Eğer bu aktif abonelikse, ana abonelik bilgilerini güncelle
    if (user.subscriptionPlan === subscription.plan && 
        user.subscriptionPeriod === subscription.period) {
      
      // Başka aktif abonelik var mı kontrol et
      const otherActiveSubscriptions = user.subscriptions?.filter((sub: any) => 
        sub.isActive && sub._id.toString() !== subscriptionId
      );
      
      if (otherActiveSubscriptions && otherActiveSubscriptions.length > 0) {
        // En son alınan aktif aboneliği ana abonelik yap
        const latestActive = otherActiveSubscriptions.sort((a: any, b: any) => 
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        )[0];
        
        user.subscriptionPlan = latestActive.plan;
        user.subscriptionPeriod = latestActive.period;
        user.subscriptionAmount = latestActive.amount;
        user.subscriptionStatus = latestActive.status;
        user.nextPaymentDate = latestActive.nextPaymentDate;
      } else {
        // Hiç aktif abonelik kalmadı
        user.subscriptionStatus = 'cancelled';
        user.isSubscriptionActive = false;
        user.subscriptionPlan = undefined;
        user.subscriptionPeriod = undefined;
        user.subscriptionAmount = undefined;
      }
    }

    await user.save();

    logger.info('Abonelik iptal edildi', {
      userId: user._id,
      subscriptionId,
      plan: subscription.plan,
      period: subscription.period
    });

    res.status(200).json({
      success: true,
      message: 'Abonelik başarıyla iptal edildi',
      cancelledSubscription: {
        id: subscription._id?.toString() || subscriptionId,
        plan: subscription.plan,
        period: subscription.period,
        status: subscription.status
      },
      remainingActiveCount: user.subscriptions?.filter((sub: any) => sub.isActive).length || 0
    });
  } catch (error: any) {
    logger.error('Abonelik iptal etme hatası', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Abonelik iptal edilemedi',
      error: error.message
    });
  }
};

/**
 * Kullanıcının tüm aboneliklerini iptal eder
 */
export const cancelAllSubscriptions = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Oturum açmanız gerekiyor',
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    if (!user.subscriptions || user.subscriptions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'İptal edilecek abonelik bulunamadı'
      });
    }

    const cancelledCount = user.subscriptions.filter((sub: any) => sub.isActive).length;

    // Tüm aktif abonelikleri iptal et
    user.subscriptions.forEach((subscription: any) => {
      if (subscription.isActive) {
        subscription.status = 'cancelled';
        subscription.isActive = false;
        subscription.autoRenewal = false;
      }
    });

    // Ana abonelik bilgilerini güncelle
    user.subscriptionStatus = 'cancelled';
    user.isSubscriptionActive = false;
    user.subscriptionPlan = undefined;
    user.subscriptionPeriod = undefined;
    user.subscriptionAmount = undefined;
    user.autoRenewal = false;

    await user.save();

    logger.info('Tüm abonelikler iptal edildi', {
      userId: user._id,
      cancelledCount
    });

    res.status(200).json({
      success: true,
      message: 'Tüm abonelikler başarıyla iptal edildi',
      cancelledCount,
      totalSubscriptions: user.subscriptions.length
    });
  } catch (error: any) {
    logger.error('Tüm abonelikleri iptal etme hatası', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Abonelikler iptal edilemedi',
      error: error.message
    });
  }
};

/**
 * Aboneliğin auto-renewal durumunu değiştirir (toggle)
 */
export const toggleSubscriptionRenewal = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Oturum açmanız gerekiyor',
      });
    }

    const { subscriptionId } = req.params;
    
    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'subscriptionId gerekli'
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Aboneliği bul
    const subscription = user.subscriptions?.find((sub: any) => sub._id?.toString() === subscriptionId);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Abonelik bulunamadı'
      });
    }

    if (!subscription.isActive) {
      return res.status(400).json({
        success: false,
        message: 'İptal edilmiş aboneliklerin auto-renewal durumu değiştirilemez'
      });
    }

    // Auto-renewal durumunu tersine çevir
    const newRenewalStatus = !subscription.autoRenewal;
    subscription.autoRenewal = newRenewalStatus;

    // Eğer bu aktif abonelikse, ana abonelik bilgilerini de güncelle
    if (user.subscriptionPlan === subscription.plan && 
        user.subscriptionPeriod === subscription.period) {
      user.autoRenewal = newRenewalStatus;
    }

    await user.save();

    logger.info('Abonelik auto-renewal durumu değiştirildi', {
      userId: user._id,
      subscriptionId,
      plan: subscription.plan,
      period: subscription.period,
      newRenewalStatus
    });

    res.status(200).json({
      success: true,
      message: `Auto-renewal ${newRenewalStatus ? 'açıldı' : 'kapatıldı'}`,
      subscription: {
        id: subscription._id?.toString() || subscriptionId,
        plan: subscription.plan,
        period: subscription.period,
        autoRenewal: subscription.autoRenewal,
        status: subscription.status
      }
    });
  } catch (error: any) {
    logger.error('Abonelik auto-renewal değiştirme hatası', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Auto-renewal durumu değiştirilemedi',
      error: error.message
    });
  }
};

/**
 * Aboneliğin auto-renewal durumunu belirli bir değere ayarlar
 */
export const updateSubscriptionRenewal = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Oturum açmanız gerekiyor',
      });
    }

    const { subscriptionId } = req.params;
    const { autoRenewal } = req.body;
    
    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'subscriptionId gerekli'
      });
    }

    if (typeof autoRenewal !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'autoRenewal boolean değer olmalı'
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Aboneliği bul
    const subscription = user.subscriptions?.find((sub: any) => sub._id?.toString() === subscriptionId);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Abonelik bulunamadı'
      });
    }

    if (!subscription.isActive) {
      return res.status(400).json({
        success: false,
        message: 'İptal edilmiş aboneliklerin auto-renewal durumu değiştirilemez'
      });
    }

    // Auto-renewal durumunu güncelle
    const oldRenewalStatus = subscription.autoRenewal;
    subscription.autoRenewal = autoRenewal;

    // Eğer bu aktif abonelikse, ana abonelik bilgilerini de güncelle
    if (user.subscriptionPlan === subscription.plan && 
        user.subscriptionPeriod === subscription.period) {
      user.autoRenewal = autoRenewal;
    }

    await user.save();

    logger.info('Abonelik auto-renewal durumu güncellendi', {
      userId: user._id,
      subscriptionId,
      plan: subscription.plan,
      period: subscription.period,
      oldRenewalStatus,
      newRenewalStatus: autoRenewal
    });

    res.status(200).json({
      success: true,
      message: `Auto-renewal ${autoRenewal ? 'açıldı' : 'kapatıldı'}`,
      subscription: {
        id: subscription._id?.toString() || subscriptionId,
        plan: subscription.plan,
        period: subscription.period,
        autoRenewal: subscription.autoRenewal,
        status: subscription.status,
        previousAutoRenewal: oldRenewalStatus
      }
    });
  } catch (error: any) {
    logger.error('Abonelik auto-renewal güncelleme hatası', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Auto-renewal durumu güncellenemedi',
      error: error.message
    });
  }
};
