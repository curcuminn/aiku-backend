import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';
import logger from '../config/logger';

// Environment variables'ları yükle
dotenv.config();

/**
 * Web'den abonelik oluşturma işlemini test eder
 */
async function testWebSubscription() {
  try {
    // MongoDB bağlantısı
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/aiku';
    await mongoose.connect(mongoUri);
    logger.info('MongoDB bağlantısı başarılı');

    // Test kullanıcısı bul (abonelik olmayan bir kullanıcı)
    const testUser = await User.findOne({
      $or: [
        { subscriptionStatus: { $exists: false } },
        { subscriptionStatus: null },
        { subscriptionStatus: "expired" },
        { subscriptionStatus: "cancelled" }
      ]
    });

    if (!testUser) {
      console.log('Test için uygun kullanıcı bulunamadı');
      return;
    }

    console.log(`Test kullanıcısı: ${testUser.email} (${testUser._id})`);

    // Web'den abonelik oluşturma simülasyonu
    const plan = "startup";
    const period = "monthly";
    const paymentMethod = "creditCard";
    const amount = 99;

    const now = new Date();
    let nextPaymentDate;

    // Startup planı ve ilk abonelik ise 3 aylık deneme süresi ver
    const isFirstSubscription = !testUser.subscriptionStatus || 
                               testUser.subscriptionStatus === "expired" || 
                               testUser.subscriptionStatus === "cancelled";

    if (isFirstSubscription && plan === "startup") {
      // 3 aylık trial süresi
      const trialEndDate = new Date(now);
      trialEndDate.setMonth(trialEndDate.getMonth() + 3);

      testUser.subscriptionStatus = "trial";
      testUser.trialEndsAt = trialEndDate;
      testUser.subscriptionStartDate = now;
      testUser.nextPaymentDate = trialEndDate;
      testUser.isSubscriptionActive = true;

      nextPaymentDate = trialEndDate;
    } else {
      // Normal ücretli abonelik
      testUser.subscriptionStatus = "active";
      testUser.subscriptionStartDate = now;
      testUser.isSubscriptionActive = true;

      // Dönem sonunu hesapla
      if (period === "monthly") {
        nextPaymentDate = new Date(now);
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
      } else {
        // Yıllık abonelik
        nextPaymentDate = new Date(now);
        nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
      }

      testUser.nextPaymentDate = nextPaymentDate;
      testUser.lastPaymentDate = now;
    }

    // Abonelik bilgilerini güncelle
    testUser.subscriptionPlan = plan;
    testUser.subscriptionPeriod = period;
    testUser.paymentMethod = paymentMethod;
    testUser.autoRenewal = true;
    testUser.subscriptionAmount = amount;

    // Ödeme kaydı oluştur
    if (!testUser.paymentHistory) {
      testUser.paymentHistory = [];
    }

    testUser.paymentHistory.push({
      amount,
      date: now,
      status: "success",
      type: "subscription",
      plan,
      period,
    });

    // Subscriptions array'ine yeni abonelik ekle
    const newSubscription = {
      plan: plan as "startup" | "business" | "investor",
      period: period as "monthly" | "yearly",
      status: testUser.subscriptionStatus as "active" | "pending" | "trial" | "cancelled" | "expired",
      startDate: testUser.subscriptionStartDate || now,
      endDate: nextPaymentDate,
      amount,
      autoRenewal: true,
      paymentMethod: paymentMethod as "creditCard" | "bankTransfer" | "other" | "iap",
      lastPaymentDate: testUser.lastPaymentDate || now,
      nextPaymentDate: nextPaymentDate,
      transactionId: `web-test-${Date.now()}-${testUser._id}`,
      revenueCatProductId: `${plan}_${period}`,
      isActive: testUser.isSubscriptionActive || false,
    };

    // Subscriptions array'ini başlat ve yeni aboneliği ekle
    if (!testUser.subscriptions) {
      testUser.subscriptions = [];
    }
    testUser.subscriptions.push(newSubscription);

    await testUser.save();

    console.log('\n=== WEB ABONELİK TEST SONUCU ===');
    console.log(`Kullanıcı: ${testUser.email}`);
    console.log(`Plan: ${testUser.subscriptionPlan}`);
    console.log(`Periyod: ${testUser.subscriptionPeriod}`);
    console.log(`Durum: ${testUser.subscriptionStatus}`);
    console.log(`Ödeme Yöntemi: ${testUser.paymentMethod}`);
    console.log(`Aktif: ${testUser.isSubscriptionActive}`);
    console.log(`Subscriptions Array Uzunluğu: ${testUser.subscriptions?.length || 0}`);
    
    if (testUser.subscriptions && testUser.subscriptions.length > 0) {
      const lastSubscription = testUser.subscriptions[testUser.subscriptions.length - 1];
      console.log(`Son Abonelik ID: ${lastSubscription._id}`);
      console.log(`Son Abonelik Transaction ID: ${lastSubscription.transactionId}`);
      console.log(`Son Abonelik RevenueCat Product ID: ${lastSubscription.revenueCatProductId}`);
    }
    
    console.log('===================================\n');

    logger.info('Web abonelik test başarıyla tamamlandı');
    process.exit(0);

  } catch (error: any) {
    console.error('Test hatası:', error.message);
    logger.error('Web abonelik test hatası:', error);
    process.exit(1);
  }
}

// Script'i çalıştır
testWebSubscription();
