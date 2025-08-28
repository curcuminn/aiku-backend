import axios from "axios";
import express from "express";
import { User } from "../models/User";
import mongoose from "mongoose";
import SubscriptionService from "../services/SubscriptionService";
import SavedCard from "../models/SavedCard";

export const processPayment = async (
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

    const { amount, currency, token, subscriptionPlan, subscriptionPeriod } =
      req.body;

    // Kullanıcıyı bul ve abonelik bilgilerini güncelle
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    // Abonelik planlarını al
    const subscriptionPlans = SubscriptionService.getSubscriptionPlans();

    // Kullanıcının daha önce bir aboneliği olup olmadığını kontrol et
    const isFirstTimeSubscription =
      !user.paymentHistory || user.paymentHistory.length === 0;

    // Abonelik planı ve periyodunu güncelle
    if (
      subscriptionPlan &&
      ["startup", "business", "investor"].includes(subscriptionPlan)
    ) {
      user.subscriptionPlan = subscriptionPlan as
        | "startup"
        | "business"
        | "investor";
    }

    if (
      subscriptionPeriod &&
      ["monthly", "yearly"].includes(subscriptionPeriod)
    ) {
      user.subscriptionPeriod = subscriptionPeriod as "monthly" | "yearly";
    }

    let paymentSuccess = false;
    let paymentResponse = null;
    let paymentError = null;

    try {
      // Ödeme işlemi
      const response = await axios.post("https://api.param.com/payments", {
        amount,
        currency,
        token,
      });

      paymentSuccess = response.data && response.data.success;
      paymentResponse = response.data;
    } catch (error: any) {
      paymentError = error.message;
      console.error("Ödeme işlemi sırasında hata:", error);
    }

    // Ödeme geçmişine ekle (başarılı veya başarısız)
    if (!user.paymentHistory) user.paymentHistory = [];
    user.paymentHistory.push({
      amount: amount || 0,
      date: new Date(),
      status: paymentSuccess ? "success" : "failed",
      transactionId:
        (paymentResponse && paymentResponse.transactionId) ||
        Date.now().toString(),
      description: `${user.subscriptionPlan} planı için ${
        user.subscriptionPeriod === "monthly" ? "aylık" : "yıllık"
      } ödeme ${paymentSuccess ? "başarılı" : "başarısız"}`,
      plan: user.subscriptionPlan || undefined,
      period: user.subscriptionPeriod,
    });

    // Abonelik durumunu güncelle
    if (paymentSuccess) {
      // Eğer startup planı seçilmişse ve ilk abonelikse trial durumuna ayarla
      if (user.subscriptionPlan === "startup" && isFirstTimeSubscription) {
        const planPricing = user.subscriptionPeriod
          ? subscriptionPlans.startup.pricing[user.subscriptionPeriod]
          : null;

        const hasTrial =
          planPricing &&
          "isFirstTimeOnly" in planPricing &&
          planPricing.isFirstTimeOnly;
        const trialPeriod =
          planPricing && "trialPeriod" in planPricing
            ? planPricing.trialPeriod
            : 6;

        if (hasTrial) {
          user.subscriptionStatus = "trial";
          const trialEndDate = new Date();
          trialEndDate.setMonth(trialEndDate.getMonth() + trialPeriod);
          user.trialEndsAt = trialEndDate;
          user.nextPaymentDate = trialEndDate;
        } else {
          // Free trial yoksa aktif duruma geçir
          user.subscriptionStatus = "active";
          user.trialEndsAt = undefined;

          // Bir sonraki ödeme tarihini belirle (aylık)
          const nextPaymentDate = new Date();
          nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
          user.nextPaymentDate = nextPaymentDate;
        }
      } else if (
        user.subscriptionPeriod === "yearly" &&
        user.subscriptionPlan
      ) {
        // Yıllık abonelik için
        user.subscriptionStatus = "active";
        user.trialEndsAt = undefined;

        // Bir sonraki ödeme tarihini belirle (yıllık + extra aylar)
        const nextPaymentDate = new Date();

        // Extra ay sayısını belirle
        let extraMonths = 0;
        if (
          user.subscriptionPlan === "business" ||
          user.subscriptionPlan === "investor"
        ) {
          extraMonths = 3; // Yıllık abonelikte ekstra 3 ay
        }

        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 12 + extraMonths);
        user.nextPaymentDate = nextPaymentDate;
      } else {
        // Diğer durumlarda (aylık business/investor)
        user.subscriptionStatus = "active";

        // Bir sonraki ödeme tarihini belirle (aylık)
        const nextPaymentDate = new Date();
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
        user.nextPaymentDate = nextPaymentDate;

        // Trial süresini kaldır
        user.trialEndsAt = undefined;
      }

      user.lastPaymentDate = new Date();
    } else {
      // Ödeme başarısız olsa bile, startup planı için ve ilk abonelikse trial durumunu ayarla
      if (user.subscriptionPlan === "startup" && isFirstTimeSubscription) {
        const planPricing = user.subscriptionPeriod
          ? subscriptionPlans.startup.pricing[user.subscriptionPeriod]
          : null;

        const hasTrial =
          planPricing &&
          "isFirstTimeOnly" in planPricing &&
          planPricing.isFirstTimeOnly;
        const trialPeriod =
          planPricing && "trialPeriod" in planPricing
            ? planPricing.trialPeriod
            : 6;

        if (hasTrial) {
          user.subscriptionStatus = "trial";
          const trialEndDate = new Date();
          trialEndDate.setMonth(trialEndDate.getMonth() + trialPeriod);
          user.trialEndsAt = trialEndDate;
          user.nextPaymentDate = trialEndDate;
        } else {
          // Diğer planlar için pending durumunda bırak
          user.subscriptionStatus = "pending";
        }
      } else {
        // Diğer planlar için pending durumunda bırak
        user.subscriptionStatus = "pending";
      }
    }

    // Abonelik başlangıç tarihini her durumda güncelle
    user.subscriptionStartDate = new Date();

    // Subscriptions array'ine yeni abonelik ekle (sadece başarılı ödemeler için)
    if (paymentSuccess) {
      const newSubscription = {
        plan: (user.subscriptionPlan || "startup") as "startup" | "business" | "investor",
        period: (user.subscriptionPeriod || "monthly") as "monthly" | "yearly",
        status: user.subscriptionStatus,
        startDate: user.subscriptionStartDate,
        endDate: user.nextPaymentDate,
        amount: amount || 0,
        autoRenewal: true,
        paymentMethod: "creditCard" as const,
        lastPaymentDate: user.lastPaymentDate || new Date(),
        nextPaymentDate: user.nextPaymentDate || new Date(),
        transactionId: (paymentResponse && paymentResponse.transactionId) || `web-payment-${Date.now()}-${user._id}`,
        revenueCatProductId: `${user.subscriptionPlan || "startup"}_${user.subscriptionPeriod || "monthly"}`,
        isActive: user.isSubscriptionActive || false,
      };

      // Subscriptions array'ini başlat ve yeni aboneliği ekle
      if (!user.subscriptions) {
        user.subscriptions = [];
      }
      user.subscriptions.push(newSubscription);
    }

    // Değişiklikleri kaydet
    await user.save();

    // Yanıt döndür
    if (paymentSuccess) {
      res.status(200).json({
        success: true,
        data: {
          paymentResult: paymentResponse,
          subscription: {
            plan: user.subscriptionPlan,
            period: user.subscriptionPeriod,
            status: user.subscriptionStatus,
            startDate: user.subscriptionStartDate,
            trialEndsAt: user.trialEndsAt,
            nextPaymentDate: user.nextPaymentDate,
            isSubscriptionActive: user.isSubscriptionActive,
            isFirstTimeSubscription: isFirstTimeSubscription,
          },
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Ödeme işlemi başarısız",
        error: paymentError,
        data: {
          subscription: {
            plan: user.subscriptionPlan,
            period: user.subscriptionPeriod,
            status: user.subscriptionStatus,
            startDate: user.subscriptionStartDate,
            trialEndsAt: user.trialEndsAt,
            nextPaymentDate: user.nextPaymentDate,
            isSubscriptionActive: user.isSubscriptionActive,
            isFirstTimeSubscription: isFirstTimeSubscription,
          },
        },
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Ödeme işlemi sırasında bir hata oluştu",
      error: (error as Error).message,
    });
  }
};

/**
 * Ücretsiz abonelik için ödeme bilgisini kaydeder
 */
export const recordFreePayment = async (
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

    const {
      amount,
      description,
      planName,
      billingCycle,
      originalPrice,
      billingInfo,
      isFirstPayment,
      paymentDate,
    } = req.body;

    // Kullanıcıyı bul
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    // Plan tipini belirle
    let subscriptionPlan: "startup" | "business" | "investor" | null = null;
    if (planName.toLowerCase().includes("startup")) {
      subscriptionPlan = "startup";
    } else if (planName.toLowerCase().includes("business")) {
      subscriptionPlan = "business";
    } else if (planName.toLowerCase().includes("investor")) {
      subscriptionPlan = "investor";
    }

    // Abonelik periyodunu belirle
    const subscriptionPeriod =
      billingCycle === "monthly" ? "monthly" : "yearly";

    // Abonelik durumunu güncelle
    user.subscriptionPlan = subscriptionPlan;
    user.subscriptionPeriod = subscriptionPeriod;
    user.subscriptionStatus = "active";
    user.subscriptionStartDate = new Date(paymentDate) || new Date();
    user.isSubscriptionActive = true;
    user.lastPaymentDate = new Date(paymentDate) || new Date();

    // Bir sonraki ödeme tarihini belirle
    const nextPaymentDate = new Date(paymentDate) || new Date();
    if (subscriptionPeriod === "monthly") {
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    } else {
      nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
    }
    user.nextPaymentDate = nextPaymentDate;

    // İlk abonelik ise ve startup planı ise trial durumunu ayarla
    if (isFirstPayment && subscriptionPlan === "startup") {
      const subscriptionPlans = SubscriptionService.getSubscriptionPlans();
      const planPricing = subscriptionPeriod
        ? subscriptionPlans.startup.pricing[subscriptionPeriod]
        : null;

      const hasTrial =
        planPricing &&
        "isFirstTimeOnly" in planPricing &&
        planPricing.isFirstTimeOnly;
      const trialPeriod =
        planPricing && "trialPeriod" in planPricing
          ? planPricing.trialPeriod
          : 6;

      if (hasTrial) {
        user.subscriptionStatus = "trial";
        const trialEndDate = new Date(paymentDate) || new Date();
        trialEndDate.setMonth(trialEndDate.getMonth() + trialPeriod);
        user.trialEndsAt = trialEndDate;
        user.nextPaymentDate = trialEndDate;
      }
    }

    // Ödeme geçmişine ekle
    if (!user.paymentHistory) user.paymentHistory = [];
    user.paymentHistory.push({
      amount: amount || 0,
      date: new Date(paymentDate) || new Date(),
      status: "success",
      transactionId: `free-${Date.now()}`,
      description: description || `Ücretsiz abonelik: ${planName}`,
      plan: subscriptionPlan || undefined,
      period: subscriptionPeriod,
    });

    // Subscriptions array'ine yeni abonelik ekle
    const newSubscription = {
      plan: (subscriptionPlan || "startup") as "startup" | "business" | "investor",
      period: (subscriptionPeriod || "monthly") as "monthly" | "yearly",
      status: user.subscriptionStatus,
      startDate: user.subscriptionStartDate,
      endDate: user.nextPaymentDate,
      amount: amount || 0,
      autoRenewal: true,
      paymentMethod: "creditCard" as const,
      lastPaymentDate: user.lastPaymentDate || new Date(),
      nextPaymentDate: user.nextPaymentDate,
      transactionId: `free-${Date.now()}-${user._id}`,
      revenueCatProductId: `${subscriptionPlan || "startup"}_${subscriptionPeriod || "monthly"}`,
      isActive: user.isSubscriptionActive || false,
    };

    // Subscriptions array'ini başlat ve yeni aboneliği ekle
    if (!user.subscriptions) {
      user.subscriptions = [];
    }
    user.subscriptions.push(newSubscription);

    // Değişiklikleri kaydet
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        subscription: {
          plan: user.subscriptionPlan,
          period: user.subscriptionPeriod,
          status: user.subscriptionStatus,
          startDate: user.subscriptionStartDate,
          trialEndsAt: user.trialEndsAt,
          nextPaymentDate: user.nextPaymentDate,
          isSubscriptionActive: user.isSubscriptionActive,
        },
        paymentHistory: user.paymentHistory[user.paymentHistory.length - 1],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Ücretsiz abonelik kaydı sırasında bir hata oluştu",
      error: (error as Error).message,
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
 * Yeni bir ödeme yöntemi (kart) ekler
 */
export const addPaymentMethod = async (
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

    const {
      cardHolderName,
      cardNumber,
      expireMonth,
      expireYear,
      cvc,
      isDefault,
    } = req.body;

    // Kullanıcıyı bul
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    // Kart tipini belirle (basit bir kontrol)
    let cardType = "other";
    if (cardNumber.startsWith("4")) {
      cardType = "visa";
    } else if (cardNumber.startsWith("5")) {
      cardType = "mastercard";
    } else if (cardNumber.startsWith("3")) {
      cardType = "amex";
    }

    // Kart token'ı oluştur (gerçek uygulamada bir ödeme servisi kullanılmalı)
    const cardToken = `tok_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 15)}`;

    // Yeni kart oluştur
    const newCard = new SavedCard({
      userId,
      cardToken,
      cardMaskedNumber: cardNumber,
      cardHolderName,
      cardExpireMonth: expireMonth,
      cardExpireYear: expireYear,
      cardType,
      isDefault: isDefault || false,
    });

    // Eğer bu kart varsayılan olarak işaretlendiyse, diğer kartların varsayılan özelliğini kaldır
    if (isDefault) {
      await SavedCard.updateMany(
        { userId, isDefault: true },
        { isDefault: false }
      );
    }

    // Kartı kaydet
    await newCard.save();

    // Kullanıcı modelinde savedCardId alanını güncelle (varsayılan kart olarak)
    if (isDefault) {
      user.savedCardId = newCard._id;
      await user.save();
    }

    res.status(201).json({
      success: true,
      message: "Ödeme yöntemi başarıyla kaydedildi",
      data: {
        cardId: newCard._id,
        cardMaskedNumber: cardNumber,
        cardHolderName,
        cardExpireMonth: expireMonth,
        cardExpireYear: expireYear,
        cardType,
        isDefault: newCard.isDefault,
      },
    });
  } catch (error: any) {
    console.error("Ödeme yöntemi eklenirken hata oluştu:", error);
    res.status(500).json({
      success: false,
      message: "Ödeme yöntemi eklenirken bir hata oluştu",
      error: error.message,
    });
  }
};

/**
 * Kullanıcının kayıtlı ödeme yöntemlerini getirir
 */
export const getPaymentMethods = async (
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

    // Kullanıcının kayıtlı kartlarını bul
    const savedCards = await SavedCard.find({ userId });

    // Kullanıcıyı bul ve varsayılan kartı kontrol et
    const user = await User.findById(userId).select("savedCardId");

    // Her kartın varsayılan olup olmadığını belirle
    const cardsWithDefault = savedCards.map(card => {
      // cardToken hariç diğer bilgileri içeren yeni bir nesne oluştur
      const cardObject = {
        _id: card._id,
        userId: card.userId,
        cardMaskedNumber: card.cardMaskedNumber,
        cardHolderName: card.cardHolderName,
        cardExpireMonth: card.cardExpireMonth,
        cardExpireYear: card.cardExpireYear,
        cardType: card.cardType,
        isDefault: card.isDefault,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt
      };
      
      // Varsayılan kart kontrolü
      if (user && user.savedCardId && card._id.equals(user.savedCardId)) {
        cardObject.isDefault = true;
      }
      
      return cardObject;
    });

    res.status(200).json({
      success: true,
      data: cardsWithDefault,
    });
  } catch (error: any) {
    console.error("Ödeme yöntemleri getirilirken hata oluştu:", error);
    res.status(500).json({
      success: false,
      message: "Ödeme yöntemleri getirilirken bir hata oluştu",
      error: error.message,
    });
  }
};

/**
 * Kullanıcının kayıtlı ödeme yöntemini siler
 */
export const deletePaymentMethod = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userId = req.user?._id;
    const { cardId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Oturum açmanız gerekiyor",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(cardId)) {
      return res.status(400).json({
        success: false,
        message: "Geçersiz kart ID'si",
      });
    }

    // Kartı bul
    const savedCard = await SavedCard.findOne({ 
      _id: cardId,
      userId 
    });

    if (!savedCard) {
      return res.status(404).json({
        success: false,
        message: "Kart bulunamadı veya bu karta erişim izniniz yok",
      });
    }

    // Kullanıcıyı bul ve varsayılan kartı kontrol et
    const user = await User.findById(userId);
    
    // Eğer silinecek kart varsayılan kart ise
    if (user && user.savedCardId && user.savedCardId.equals(savedCard._id)) {
      // Kullanıcının varsayılan kartını null yap
      user.savedCardId = undefined;
      await user.save();
    }

    // Kartı sil
    await savedCard.deleteOne();

    res.status(200).json({
      success: true,
      message: "Ödeme yöntemi başarıyla silindi",
    });
  } catch (error: any) {
    console.error("Ödeme yöntemi silinirken hata oluştu:", error);
    res.status(500).json({
      success: false,
      message: "Ödeme yöntemi silinirken bir hata oluştu",
      error: error.message,
    });
  }
};

/**
 * Kullanıcının varsayılan ödeme yöntemini günceller
 */
export const updateDefaultPaymentMethod = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userId = req.user?._id;
    const { cardId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Oturum açmanız gerekiyor",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(cardId)) {
      return res.status(400).json({
        success: false,
        message: "Geçersiz kart ID'si",
      });
    }

    // Kartı bul ve kullanıcıya ait olduğundan emin ol
    const savedCard = await SavedCard.findOne({ 
      _id: cardId,
      userId 
    });

    if (!savedCard) {
      return res.status(404).json({
        success: false,
        message: "Kart bulunamadı veya bu karta erişim izniniz yok",
      });
    }

    // Tüm kartları güncelle - hiçbirisi varsayılan olmasın
    await SavedCard.updateMany(
      { userId },
      { isDefault: false }
    );

    // Seçilen kartı varsayılan olarak işaretle
    savedCard.isDefault = true;
    await savedCard.save();

    // Kullanıcıyı bul ve varsayılan kart ID'sini güncelle
    const user = await User.findById(userId);
    if (user) {
      user.savedCardId = savedCard._id;
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: "Varsayılan ödeme yöntemi başarıyla güncellendi",
      data: {
        cardId: savedCard._id,
        cardMaskedNumber: savedCard.cardMaskedNumber,
        cardHolderName: savedCard.cardHolderName,
        cardExpireMonth: savedCard.cardExpireMonth,
        cardExpireYear: savedCard.cardExpireYear,
        cardType: savedCard.cardType,
        isDefault: savedCard.isDefault
      }
    });
  } catch (error: any) {
    console.error("Varsayılan ödeme yöntemi güncellenirken hata oluştu:", error);
    res.status(500).json({
      success: false,
      message: "Varsayılan ödeme yöntemi güncellenirken bir hata oluştu",
      error: error.message,
    });
  }
};
