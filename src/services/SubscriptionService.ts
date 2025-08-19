import mongoose from 'mongoose';
import { User, IUser } from '../models/User';
import logger from '../config/logger';

/**
 * Abonelik servis yönetimi
 * Bu servis, abonelik sürelerini takip eder ve otomatik yenileme işlemlerini gerçekleştirir
 */
class SubscriptionService {
  /**
   * Deneme süresi dolan Startup kullanıcılarının ödeme işlemlerini kontrol eder
   * Cron job ile düzenli olarak çalıştırılmalıdır (örn: günlük)
   */
  async checkTrialEndingUsers() {
    try {
      // Deneme süresi bugün veya daha önce biten 'trial' durumundaki kullanıcıları bul
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const users = await User.find({
        subscriptionStatus: 'trial',
        trialEndsAt: { $lte: today }
      });
      
      console.log(`${users.length} kullanıcının deneme süresi dolmuş, otomatik ödeme kontrol ediliyor...`);
      
      for (const user of users) {
        // Her kullanıcı için otomatik ödeme kontrolü yap
        await user.checkAutoRenewal();
      }
      
      return {
        success: true,
        processedCount: users.length
      };
    } catch (error: any) {
      console.error('Abonelik kontrolü sırasında hata:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Aktif aboneliklerin periyodik ödemelerini kontrol eder
   * Cron job ile düzenli olarak çalıştırılmalıdır (örn: günlük)
   */
  async checkRecurringPayments() {
    try {
      // Ödeme tarihi bugün veya daha önce olan 'active' durumundaki kullanıcıları bul
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const users = await User.find({
        subscriptionStatus: 'active',
        nextPaymentDate: { $lte: today },
        autoRenewal: true
      });
      
      console.log(`${users.length} kullanıcının ödeme tarihi gelmiş, otomatik ödeme işlemi yapılıyor...`);
      logger.info(`${users.length} kullanıcının ödeme tarihi gelmiş, otomatik ödeme işlemi yapılıyor...`);
      let successCount = 0;
      let failCount = 0;
      
      // Abonelik planlarını al
      const subscriptionPlans = this.getSubscriptionPlans();
      
      for (const user of users) {
        try {
          // Ödeme işlemini yap
          const paymentResult = await user.processPayment();
          
          if (paymentResult.success) {
            // Ödeme başarılı ise bir sonraki ödeme tarihini ileri al
            const nextBillingDate = new Date();
            
            // Abonelik periyoduna göre bir sonraki ödeme tarihini belirle
            if (user.subscriptionPeriod === 'monthly') {
              nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
            } else if (user.subscriptionPeriod === 'yearly') {
              // Yıllık abonelik için extra ayları da dikkate al
              let extraMonths = 0;
              
              // Tüm planlar için extraMonths değerini alma
              if (user.subscriptionPlan === 'startup') {
                // Startup planı için extraMonths yok, standart 12 ay
                extraMonths = 0;
              } else if (user.subscriptionPlan === 'business' || user.subscriptionPlan === 'investor') {
                // Business ve Investor planları için extraMonths var
                extraMonths = 3; // Yıllık ödemede 3 ay fazla (12+3=15 ay)
              }
              
              nextBillingDate.setMonth(nextBillingDate.getMonth() + 12 + extraMonths);
            }
            
            user.nextPaymentDate = nextBillingDate;
            user.lastPaymentDate = new Date();
            
            // Ödeme geçmişine ekle
            if (!user.paymentHistory) user.paymentHistory = [];
            
            const paymentHistoryEntry: any = {
              amount: user.subscriptionAmount || 0,
              date: new Date(),
              status: 'success' as 'success' | 'failed' | 'pending',
              transactionId: paymentResult.transactionId,
              description: `Otomatik ${user.subscriptionPeriod === 'monthly' ? 'aylık' : 'yıllık'} abonelik ödemesi`,
              type: 'subscription',
              plan: user.subscriptionPlan || undefined,
              period: user.subscriptionPeriod
            };
            
            // Eğer kart bilgileri varsa ekle
            if (paymentResult.cardDetails) {
              paymentHistoryEntry.cardDetails = paymentResult.cardDetails;
            }
            
            user.paymentHistory.push(paymentHistoryEntry);
            
            await user.save();
            successCount++;
          } else {
            // Başarısız ödeme
            if (!user.paymentHistory) user.paymentHistory = [];
            user.paymentHistory.push({
              amount: user.subscriptionAmount || 0,
              date: new Date(),
              status: 'failed' as 'success' | 'failed' | 'pending',
              description: `Otomatik ${user.subscriptionPeriod === 'monthly' ? 'aylık' : 'yıllık'} abonelik ödemesi başarısız`,
              type: 'subscription',
              plan: user.subscriptionPlan || undefined,
              period: user.subscriptionPeriod
            });
            
            // Başarısız ödeme sayısına göre abonelik durumunu değiştirebiliriz
            // Örnek: 3 kez başarısız ödeme sonrası iptal etme gibi
            await user.save();
            failCount++;
          }
        } catch (error) {
          console.error(`${user._id} ID'li kullanıcı için ödeme işlemi başarısız:`, error);
          failCount++;
        }
      }
      
      return {
        success: true,
        totalProcessed: users.length,
        successCount,
        failCount
      };
    } catch (error: any) {
      console.error('Periyodik ödemelerin kontrolü sırasında hata:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Otomatik yenilemesi kapalı olan veya ödeme yöntemi olmayan kullanıcıların
   * süresi dolmuş aboneliklerini sonlandırır (expire eder)
   */
  async expireEndedSubscriptions() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1) Trial süresi bitmiş, ancak otomatik yenileme kapalı veya kartı olmayan kullanıcılar
      const expiredTrials = await User.updateMany(
        {
          subscriptionStatus: 'trial',
          trialEndsAt: { $lte: today },
          $or: [
            { autoRenewal: { $ne: true } },
            { savedCardId: { $exists: false } },
            { savedCardId: null },
          ],
        },
        {
          $set: {
            subscriptionStatus: 'expired',
            isSubscriptionActive: false,
          },
        }
      );

      // 2) Aktif aboneliklerde ödeme tarihi geçmiş ve otomatik yenileme kapalı olan kullanıcılar
      const expiredActives = await User.updateMany(
        {
          subscriptionStatus: 'active',
          nextPaymentDate: { $lte: today },
          $or: [
            { autoRenewal: { $ne: true } },
            { savedCardId: { $exists: false } },
            { savedCardId: null },
          ],
        },
        {
          $set: {
            subscriptionStatus: 'expired',
            isSubscriptionActive: false,
          },
        }
      );

      return {
        success: true,
        expiredTrialCount: (expiredTrials as any)?.modifiedCount || 0,
        expiredActiveCount: (expiredActives as any)?.modifiedCount || 0,
      };
    } catch (error: any) {
      logger.error('Abonelikleri expire ederken hata:', { error });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Kullanıcının abonelik planını değiştirir
   * @param userId Kullanıcı ID
   * @param plan Abonelik planı (startup, business, investor)
   * @param period Abonelik periyodu (monthly, yearly)
   * @param isFirstSubscription İlk abonelik mi
   */
  async changeSubscriptionPlan(
    userId: string, 
    plan: 'startup' | 'business' | 'investor', 
    period: 'monthly' | 'yearly',
    isFirstSubscription: boolean = false
  ) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }
      
      // Abonelik planını ve periyodunu güncelle
      user.subscriptionPlan = plan;
      user.subscriptionPeriod = period;

      const now = new Date();
      
      // Eğer startup planı ve ilk abonelik ise, trial süresini ayarla (periyoda bakılmaksızın)
      if (plan === 'startup' && isFirstSubscription) {
        user.subscriptionStatus = 'trial';
        const trialEndDate = new Date(now);
        trialEndDate.setMonth(trialEndDate.getMonth() + 6); // 6 ay deneme süresi
        user.trialEndsAt = trialEndDate;
        user.nextPaymentDate = trialEndDate;
      } else if (period === 'yearly') {
        // Yıllık abonelikler için
        user.subscriptionStatus = 'active';
        user.trialEndsAt = undefined; // Trial süresini kaldır
        
        // Bir sonraki ödeme tarihini hesapla (yıllık + ekstra)
        const nextPaymentDate = new Date(now);
        
        // Business ve Investor planları için ekstra 3 ay
        if (plan === 'business' || plan === 'investor') {
          nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 12 + 3); // 15 ay (12 + 3 ekstra)
        } else {
          // Startup için standart 12 ay
          nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 12);
        }
        user.nextPaymentDate = nextPaymentDate;
      } else {
        // Aylık abonelikler için (veya startup dışındaki planlar için)
        user.subscriptionStatus = 'active';
        user.trialEndsAt = undefined; // Trial süresini kaldır
        
        // Bir sonraki ödeme tarihini şimdi+1 ay olarak ayarla
        const nextPaymentDate = new Date(now);
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
        user.nextPaymentDate = nextPaymentDate;
      }
      
      // Abonelik başlangıç tarihini güncelle
      user.subscriptionStartDate = now;
      
      await user.save();
      
      return {
        success: true,
        user: {
          _id: user._id,
          subscriptionPlan: user.subscriptionPlan,
          subscriptionPeriod: user.subscriptionPeriod,
          subscriptionAmount: user.subscriptionAmount,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionStartDate: user.subscriptionStartDate,
          trialEndsAt: user.trialEndsAt,
          nextPaymentDate: user.nextPaymentDate
        }
      };
    } catch (error: any) {
      console.error('Abonelik planı değiştirme sırasında hata:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Abonelik planlarını ve fiyatlarını döndürür
   */
  getSubscriptionPlans() {
    const plans = {
      startup: {
        name: 'Startup Plan',
        description: 'For AI Startups & Developers',
        features: [
          'List AI solutions',
          'Get investor access',
          'Use premium AI tools'
        ],
        pricing: {
          monthly: {
            price: 49,
            trialPeriod: 6, // ay
            isFirstTimeOnly: true // Sadece ilk abonelikte geçerli
          },
          yearly: {
            price: 529,
            discount: '10% off',
            trialPeriod: 6, // ay
            isFirstTimeOnly: true, // Sadece ilk abonelikte geçerli
            extraMonths: 0 // Startup planında extra ay yok
          }
        }
      },
      business: {
        name: 'Business Plan',
        description: 'For Companies & Businesss',
        features: [
          'AI discovery',
          'API integrations',
          'Exclusive tools'
        ],
        pricing: {
          monthly: {
            price: 75,
            trialPeriod: 0 // Deneme süresi yok
          },
          yearly: {
            price: 810,
            discount: '10% off',
            extraMonths: 3, // Yıllık ödemede 3 ay fazla (12+3=15 ay)
            trialPeriod: 0 // Deneme süresi yok
          }
        }
      },
      investor: {
        name: 'Investor Plan',
        description: 'For VCs & Angel Investors',
        features: [
          'AI startup deal flow',
          'Analytics',
          'AI-powered investment insights'
        ],
        pricing: {
          monthly: {
            price: 99,
            trialPeriod: 0 // Deneme süresi yok
          },
          yearly: {
            price: 1069,
            discount: '10% off',
            extraMonths: 3, // Yıllık ödemede 3 ay fazla (12+3=15 ay)
            trialPeriod: 0 // Deneme süresi yok
          }
        }
      }
    };
    
    return plans;
  }
}

export default new SubscriptionService(); 