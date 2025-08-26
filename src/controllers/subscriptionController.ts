// @ts-nocheck - Typescript hatalarını görmezden gel
import express from "express";
import { User, IUser } from "../models/User";
import SubscriptionService from "../services/SubscriptionService";
import mongoose from "mongoose";

/**
 * Tüm abonelik planlarını listeler
 */
export const getSubscriptionPlans = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const plans = SubscriptionService.getSubscriptionPlans();

    res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Abonelik planları alınırken bir hata oluştu",
      error: error.message,
    });
  }
};

/**
 * Kullanıcının mevcut abonelik bilgilerini getirir
 */
export const getUserSubscription = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    // @ts-expect-error - req.user tipini IUser olarak kabul ediyoruz
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Oturum açmanız gerekiyor",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    // Abonelik planı bilgilerini al
    const planDetails =
      SubscriptionService.getSubscriptionPlans()[
        user.subscriptionPlan || "startup"
      ];

    // Aktif aboneliği bul
    const activeSubscription = user.subscriptions?.find(sub => {
      // isActive alanı zaten doğru hesaplanmış olmalı
      return sub.isActive;
    });

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
        activeSubscription: activeSubscription,
        allSubscriptions: user.subscriptions || [],
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Abonelik bilgileri alınırken bir hata oluştu",
      error: error.message,
    });
  }
};

/**
 * Kullanıcının abonelik planını değiştirir (Web ve Mobil için)
 */
export const changeSubscriptionPlan = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userId = req.user?._id;

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
    const user = await User.findById(userId);

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
    const subscriptionPlans = SubscriptionService.getSubscriptionPlans();

    // Kullanıcının daha önce bir aboneliği olup olmadığını kontrol et
    const isFirstTimeSubscription =
      !user.paymentHistory || user.paymentHistory.length === 0;

    // Abonelik planını ve periyodunu güncelle
    user.subscriptionPlan = plan as "startup" | "business" | "investor";
    user.subscriptionPeriod = period as "monthly" | "yearly";

    // Platform'a göre ödeme yöntemini güncelle
    if (platform === 'mobile') {
      user.paymentMethod = 'iap';
    } else if (platform === 'web') {
      user.paymentMethod = 'creditCard';
    }

    // Eğer startup planı seçilmişse ve kullanıcının ilk aboneliği ise free trial uygula
    if (plan === "startup") {
      const planPricing =
        subscriptionPlans.startup.pricing[period as "monthly" | "yearly"];

      // İlk abonelik ise ve freeTrial sadece ilk abonelikte geçerliyse
      if (
        isFirstTimeSubscription &&
        "isFirstTimeOnly" in planPricing &&
        planPricing.isFirstTimeOnly
      ) {
        user.subscriptionStatus = "trial";
        const trialEndDate = new Date();
        const trialPeriod =
          "trialPeriod" in planPricing ? planPricing.trialPeriod : 6;
        trialEndDate.setMonth(trialEndDate.getMonth() + trialPeriod);
        user.trialEndsAt = trialEndDate;
        user.nextPaymentDate = trialEndDate;
      } else {
        // Daha önce abonelik yapmış bir kullanıcıysa
        user.subscriptionStatus = "pending"; // Ödeme yapılana kadar pending
        user.trialEndsAt = undefined; // Trial süresini kaldır

        // Bir sonraki ödeme tarihini şimdi olarak ayarla (hemen ödeme alınacak)
        user.nextPaymentDate = new Date();
      }
    } else if (period === "yearly") {
      // Business veya Investor planında yıllık abonelikte ek süre ekle
      user.subscriptionStatus = "pending"; // Ödeme yapılana kadar pending
      user.trialEndsAt = undefined; // Trial süresini kaldır

      // Bir sonraki ödeme tarihini şimdi olarak ayarla (hemen ödeme alınacak)
      user.nextPaymentDate = new Date();
    } else {
      // Aylık Business veya Investor planı
      user.subscriptionStatus = "pending"; // Ödeme yapılana kadar pending
      user.trialEndsAt = undefined; // Trial süresini kaldır

      // Bir sonraki ödeme tarihini şimdi olarak ayarla (hemen ödeme alınacak)
      user.nextPaymentDate = new Date();
    }

    // Abonelik başlangıç tarihini güncelle
    user.subscriptionStartDate = new Date();

    await user.save();

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
  } catch (error: any) {
    console.error("Abonelik planı değiştirme hatası:", error);
    res.status(500).json({
      success: false,
      message: "Abonelik planı değiştirilemedi",
      error: error.message,
    });
  }
};

/**
 * Kullanıcının otomatik yenileme ayarını değiştirir
 */
export const toggleAutoRenewal = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    // @ts-expect-error - req.user tipini IUser olarak kabul ediyoruz
    const userId = req.user?._id;

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

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    user.autoRenewal = autoRenewal;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Otomatik yenileme ${autoRenewal ? "açıldı" : "kapatıldı"}`,
      data: {
        autoRenewal: user.autoRenewal,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Otomatik yenileme ayarı değiştirilirken bir hata oluştu",
      error: error.message,
    });
  }
};

/**
 * Kullanıcının ödeme geçmişini getirir
 */
export const getPaymentHistory = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    // @ts-expect-error - req.user tipini IUser olarak kabul ediyoruz
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Oturum açmanız gerekiyor",
      });
    }

    const user = await User.findById(userId).select("paymentHistory");

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
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Ödeme geçmişi alınırken bir hata oluştu",
      error: error.message,
    });
  }
};

/**
 * Aboneliği iptal eder
 */
export const cancelSubscription = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    // @ts-expect-error - req.user tipini IUser olarak kabul ediyoruz
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Oturum açmanız gerekiyor",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    // Aboneliği iptal et
    user.subscriptionStatus = "cancelled";
    user.autoRenewal = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Abonelik başarıyla iptal edildi",
      data: {
        subscriptionStatus: user.subscriptionStatus,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Abonelik iptal edilirken bir hata oluştu",
      error: error.message,
    });
  }
};

/**
 * Yeni abonelik oluşturur (subscriptions array'ine ekler)
 */
export const createSubscription = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Oturum açmanız gerekiyor",
      });
    }

    const { plan, period, amount, transactionId, revenueCatProductId, paymentMethod = "iap" } = req.body;

    if (!plan || !period || !amount || !transactionId || !revenueCatProductId) {
      return res.status(400).json({
        success: false,
        message: "Eksik parametreler",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    const now = new Date();
    const startDate = now;
    const lastPaymentDate = now;

    // End date hesaplama
    let endDate = new Date(now);
    if (period === "monthly") {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // Next payment date (yenileme için)
    const nextPaymentDate = new Date(endDate);

    // Yeni abonelik objesi
    const newSubscription = {
      plan,
      period,
      status: "active" as const,
      startDate,
      endDate,
      amount,
      autoRenewal: true,
      paymentMethod,
      lastPaymentDate,
      nextPaymentDate,
      transactionId,
      revenueCatProductId,
      isActive: true,
    };

    // Subscriptions array'ine ekle
    if (!user.subscriptions) {
      user.subscriptions = [];
    }
    user.subscriptions.push(newSubscription);

    // Ana subscription alanlarını da güncelle
    user.subscriptionStatus = "active";
    user.subscriptionPlan = plan;
    user.subscriptionPeriod = period;
    user.subscriptionAmount = amount;
    user.subscriptionStartDate = startDate;
    user.lastPaymentDate = lastPaymentDate;
    user.nextPaymentDate = nextPaymentDate;
    user.paymentMethod = paymentMethod;
    user.autoRenewal = true;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Abonelik başarıyla oluşturuldu",
      data: {
        subscription: newSubscription,
        isSubscriptionActive: user.isSubscriptionActive,
      },
    });
  } catch (error: any) {
    console.error("Abonelik oluşturma hatası:", error);
    res.status(500).json({
      success: false,
      message: "Abonelik oluşturulurken bir hata oluştu",
      error: error.message,
    });
  }
};

/**
 * Aboneliği iptal eder (subscriptions array'indeki belirli aboneliği)
 */
export const cancelSpecificSubscription = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userId = req.user?._id;
    const { subscriptionId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Oturum açmanız gerekiyor",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    if (!user.subscriptions || user.subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Aktif abonelik bulunamadı",
      });
    }

    // En son aktif aboneliği bul
    const activeSubscription = user.subscriptions.find(sub => sub.isActive);
    
    if (!activeSubscription) {
      return res.status(404).json({
        success: false,
        message: "Aktif abonelik bulunamadı",
      });
    }

    // Aboneliği iptal et ama nextPaymentDate'i koru
    activeSubscription.status = "cancelled";
    activeSubscription.autoRenewal = false;
    // isActive'i nextPaymentDate'e göre hesapla - iptal edilmiş abonelikler için
    const now = new Date();
    activeSubscription.isActive = activeSubscription.nextPaymentDate && now < activeSubscription.nextPaymentDate;

    // Ana subscription alanlarını da güncelle
    user.subscriptionStatus = "cancelled";
    user.autoRenewal = false;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Abonelik başarıyla iptal edildi",
      data: {
        subscription: activeSubscription,
        isSubscriptionActive: user.isSubscriptionActive,
      },
    });
  } catch (error: any) {
    console.error("Abonelik iptal etme hatası:", error);
    res.status(500).json({
      success: false,
      message: "Abonelik iptal edilirken bir hata oluştu",
      error: error.message,
    });
  }
};

/**
 * Kullanıcının tüm aboneliklerini getirir
 */
export const getAllSubscriptions = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Oturum açmanız gerekiyor",
      });
    }

    const user = await User.findById(userId).select("subscriptions");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    // Her aboneliğin isActive durumunu güncelle
    if (user.subscriptions) {
      const now = new Date();
      user.subscriptions.forEach(subscription => {
        if (subscription.status === "cancelled") {
          // İptal edilmiş abonelikler için nextPaymentDate'e bak
          subscription.isActive = subscription.nextPaymentDate && now < subscription.nextPaymentDate;
        } else if (subscription.status === "active" || subscription.status === "trial") {
          // Aktif abonelikler için true
          subscription.isActive = true;
        } else {
          // Diğer durumlar için false
          subscription.isActive = false;
        }
      });
      await user.save(); // Değişiklikleri kaydet
    }

    res.status(200).json({
      success: true,
      data: {
        subscriptions: user.subscriptions || [],
        activeSubscription: user.subscriptions?.find(sub => sub.isActive),
        totalActiveCount: user.subscriptions?.filter(sub => sub.isActive).length || 0,
      },
    });
  } catch (error: any) {
    console.error("Abonelikler getirme hatası:", error);
    res.status(500).json({
      success: false,
      message: "Abonelikler alınırken bir hata oluştu",
      error: error.message,
    });
  }
};

/**
 * Aboneliğin aktif olup olmadığını hesaplar
 */
function calculateSubscriptionActive(subscription: any): boolean {
  const now = new Date();
  
  // Eğer status cancelled ise, nextPaymentDate'e bak
  if (subscription.status === "cancelled") {
    return subscription.nextPaymentDate && now < subscription.nextPaymentDate;
  }
  
  // Diğer durumlar için status'a bak
  return subscription.status === "active" || subscription.status === "trial";
}

/**
 * Mevcut abonelikleri günceller (test amaçlı)
 */
export const updateExistingSubscriptions = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Oturum açmanız gerekiyor",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    // Eğer subscriptions array'i yoksa ve eski subscription alanları varsa
    if ((!user.subscriptions || user.subscriptions.length === 0) && user.subscriptionStatus) {
      const now = new Date();
      
      // End date hesaplama
      let endDate = new Date(now);
      if (user.subscriptionPeriod === "monthly") {
        endDate.setMonth(endDate.getMonth() + 1);
      } else if (user.subscriptionPeriod === "yearly") {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      // Eğer nextPaymentDate varsa, onu endDate olarak kullan
      if (user.nextPaymentDate) {
        endDate = new Date(user.nextPaymentDate);
      }

      // Yeni abonelik objesi oluştur
      const newSubscription = {
        plan: user.subscriptionPlan || "startup",
        period: user.subscriptionPeriod || "monthly",
        status: user.subscriptionStatus,
        startDate: user.subscriptionStartDate || now,
        endDate: endDate,
        amount: user.subscriptionAmount || 0,
        autoRenewal: user.autoRenewal || false,
        paymentMethod: user.paymentMethod || "creditCard",
        lastPaymentDate: user.lastPaymentDate || now,
        nextPaymentDate: user.nextPaymentDate || endDate,
        transactionId: "migration-" + Date.now(),
        revenueCatProductId: `${user.subscriptionPlan || "startup"}_${user.subscriptionPeriod || "monthly"}`,
        isActive: user.isSubscriptionActive || false,
      };

      user.subscriptions = [newSubscription];
      await user.save();

      res.status(200).json({
        success: true,
        message: "Mevcut abonelik başarıyla güncellendi",
        data: {
          subscription: newSubscription,
          isSubscriptionActive: user.isSubscriptionActive,
        },
      });
    } else {
      res.status(200).json({
        success: true,
        message: "Zaten güncel abonelik sistemi kullanılıyor",
        data: {
          subscriptions: user.subscriptions || [],
          isSubscriptionActive: user.isSubscriptionActive,
        },
      });
    }
  } catch (error: any) {
    console.error("Abonelik güncelleme hatası:", error);
    res.status(500).json({
      success: false,
      message: "Abonelik güncellenirken bir hata oluştu",
      error: error.message,
    });
  }
};

/**
 * Mevcut aboneliğin isActive durumunu düzeltir
 */
export const fixSubscriptionActiveStatus = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Oturum açmanız gerekiyor",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    if (!user.subscriptions || user.subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Abonelik bulunamadı",
      });
    }

    // Her aboneliğin isActive durumunu düzelt
    let updated = false;
    user.subscriptions.forEach(subscription => {
      const now = new Date();
      let shouldBeActive = false;
      
      if (subscription.status === "cancelled") {
        // İptal edilmiş abonelikler için nextPaymentDate'e bak
        shouldBeActive = subscription.nextPaymentDate && now < subscription.nextPaymentDate;
      } else if (subscription.status === "active" || subscription.status === "trial") {
        // Aktif abonelikler için true
        shouldBeActive = true;
      } else {
        // Diğer durumlar için false
        shouldBeActive = false;
      }
      
      if (subscription.isActive !== shouldBeActive) {
        subscription.isActive = shouldBeActive;
        updated = true;
      }
    });

    if (updated) {
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: "Abonelik durumu düzeltildi",
      data: {
        subscriptions: user.subscriptions,
        isSubscriptionActive: user.isSubscriptionActive,
      },
    });
  } catch (error: any) {
    console.error("Abonelik düzeltme hatası:", error);
    res.status(500).json({
      success: false,
      message: "Abonelik düzeltilirken bir hata oluştu",
      error: error.message,
    });
  }
};

/**
 * Test amaçlı abonelik iptal simülasyonu
 */
export const testCancelSubscription = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Oturum açmanız gerekiyor",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    if (!user.subscriptions || user.subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Abonelik bulunamadı",
      });
    }

    // En son aktif aboneliği bul
    const activeSubscription = user.subscriptions.find(sub => sub.isActive);
    
    if (!activeSubscription) {
      return res.status(404).json({
        success: false,
        message: "Aktif abonelik bulunamadı",
      });
    }

    // Aboneliği iptal et
    activeSubscription.status = "cancelled";
    activeSubscription.autoRenewal = false;
    
    // isActive'i nextPaymentDate'e göre hesapla
    const now = new Date();
    activeSubscription.isActive = activeSubscription.nextPaymentDate && now < activeSubscription.nextPaymentDate;

    // Ana subscription alanlarını da güncelle
    user.subscriptionStatus = "cancelled";
    user.autoRenewal = false;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Test abonelik iptal işlemi başarılı",
      data: {
        subscription: activeSubscription,
        isSubscriptionActive: user.isSubscriptionActive,
        nextPaymentDate: activeSubscription.nextPaymentDate,
        isActive: activeSubscription.isActive,
        now: now,
      },
    });
  } catch (error: any) {
    console.error("Test abonelik iptal hatası:", error);
    res.status(500).json({
      success: false,
      message: "Test abonelik iptal işlemi başarısız",
      error: error.message,
    });
  }
};
