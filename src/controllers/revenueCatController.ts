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

    // Webhook event'ini işle
    const result = await revenueCatService.handleWebhook(req.body);
    
    if (result.success) {
      logger.info('RevenueCat webhook başarıyla işlendi', {
        eventType: req.body.event?.type
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
    const testEvent = {
      api_version: '1.0',
      event: {
        type: 'TEST',
        id: 'test-event-id',
        app_user_id: 'test-user-id',
        product_id: 'test_product',
        period_type: 'NORMAL',
        purchased_at_ms: Date.now(),
        expiration_at_ms: Date.now() + (2 * 60 * 60 * 1000), // 2 saat sonra
        environment: 'SANDBOX',
        entitlement_id: null as any,
        entitlement_ids: null as any,
        presented_offering_id: null as any,
        transaction_id: null as any,
        original_transaction_id: null as any,
        is_family_share: null as any,
        country_code: 'US',
        original_app_user_id: 'test-user-id',
        aliases: [],
        currency: null,
        price: null,
        price_in_purchased_currency: null,
        subscriber_attributes: {},
        store: 'APP_STORE',
        takehome_percentage: null,
        offer_code: null as any,
        tax_percentage: null,
        commission_percentage: null,
        metadata: null,
        renewal_number: null,
        app_id: 'test-app-id'
      }
    };

    const result = await revenueCatService.handleWebhook(testEvent);
    
    res.status(200).json({
      success: true,
      message: 'Test webhook processed',
      result
    });
  } catch (error: any) {
    logger.error('Test webhook hatası', { error: error.message });
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

    // Kullanıcıyı bul
    const user = await User.findById(userId);
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
        paymentMethod: user.paymentMethod
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
