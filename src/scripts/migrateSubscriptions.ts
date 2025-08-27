import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, IUser } from '../models/User';
import logger from '../config/logger';

// Environment variables'ları yükle
dotenv.config();

/**
 * Eski subscription sisteminden yeni subscriptions array sistemine geçiş script'i
 * Bu script, web'de abone olmuş kullanıcıların aboneliklerini subscriptions array'ine aktarır
 */

interface MigrationStats {
  totalUsers: number;
  migratedUsers: number;
  skippedUsers: number;
  errorUsers: number;
  errors: Array<{ userId: string; error: string }>;
}

class SubscriptionMigrationService {
  private stats: MigrationStats = {
    totalUsers: 0,
    migratedUsers: 0,
    skippedUsers: 0,
    errorUsers: 0,
    errors: []
  };

  /**
   * Migration işlemini başlatır
   */
  async migrateAllUsers(): Promise<MigrationStats> {
    try {
      logger.info('Subscription migration başlatılıyor...');

      // Tüm kullanıcıları getir
      const users = await User.find({});
      this.stats.totalUsers = users.length;

      logger.info(`${this.stats.totalUsers} kullanıcı bulundu, migration başlatılıyor...`);

      for (const user of users) {
        try {
          await this.migrateUser(user);
        } catch (error: any) {
          this.stats.errorUsers++;
          this.stats.errors.push({
            userId: user._id.toString(),
            error: error.message
          });
          logger.error(`Kullanıcı migration hatası (${user._id}):`, error.message);
        }
      }

      logger.info('Migration tamamlandı:', this.stats);
      return this.stats;

    } catch (error: any) {
      logger.error('Migration genel hatası:', error);
      throw error;
    }
  }

  /**
   * Tek bir kullanıcının subscription'ını migrate eder
   */
  private async migrateUser(user: IUser): Promise<void> {
    // Eğer kullanıcının zaten subscriptions array'i varsa ve boş değilse, atla
    if (user.subscriptions && user.subscriptions.length > 0) {
      this.stats.skippedUsers++;
      logger.info(`Kullanıcı ${user._id} zaten yeni sistemi kullanıyor, atlanıyor`);
      return;
    }

    // Eğer kullanıcının hiç subscription bilgisi yoksa, atla
    if (!user.subscriptionStatus && !user.subscriptionPlan) {
      this.stats.skippedUsers++;
      logger.info(`Kullanıcı ${user._id} hiç abonelik bilgisi yok, atlanıyor`);
      return;
    }

    // Migration işlemi
    await this.createSubscriptionFromLegacyData(user);
    this.stats.migratedUsers++;
    logger.info(`Kullanıcı ${user._id} başarıyla migrate edildi`);
  }

  /**
   * Eski subscription verilerinden yeni subscription objesi oluşturur
   */
  private async createSubscriptionFromLegacyData(user: IUser): Promise<void> {
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

    // Eğer trial süresi varsa, onu da hesaba kat
    if (user.trialEndsAt && user.subscriptionStatus === "trial") {
      endDate = new Date(user.trialEndsAt);
    }

    // Yeni abonelik objesi oluştur
    const newSubscription = {
      plan: user.subscriptionPlan || "startup",
      period: user.subscriptionPeriod || "monthly",
      status: user.subscriptionStatus || "active",
      startDate: user.subscriptionStartDate || now,
      endDate: endDate,
      amount: user.subscriptionAmount || 0,
      autoRenewal: user.autoRenewal || false,
      paymentMethod: user.paymentMethod || "creditCard",
      lastPaymentDate: user.lastPaymentDate || now,
      nextPaymentDate: user.nextPaymentDate || endDate,
      transactionId: `migration-${user._id}-${Date.now()}`,
      revenueCatProductId: `${user.subscriptionPlan || "startup"}_${user.subscriptionPeriod || "monthly"}`,
      isActive: this.calculateIsActive(user),
    };

    // Subscriptions array'ini başlat ve yeni aboneliği ekle
    user.subscriptions = [newSubscription];

    // isSubscriptionActive'ı güncelle
    user.isSubscriptionActive = newSubscription.isActive;

    await user.save();
  }

  /**
   * Kullanıcının aboneliğinin aktif olup olmadığını hesaplar
   */
  private calculateIsActive(user: IUser): boolean {
    const now = new Date();

    // Eğer status cancelled ise, nextPaymentDate'e bak
    if (user.subscriptionStatus === "cancelled") {
      return user.nextPaymentDate ? now < user.nextPaymentDate : false;
    }

    // Eğer status trial ise, trialEndsAt'e bak
    if (user.subscriptionStatus === "trial") {
      return user.trialEndsAt ? now < user.trialEndsAt : false;
    }

    // Eğer status active ise, true
    if (user.subscriptionStatus === "active") {
      return true;
    }

    // Diğer durumlar için false
    return false;
  }

  /**
   * Migration durumunu raporlar
   */
  async generateMigrationReport(): Promise<void> {
    logger.info('=== SUBSCRIPTION MIGRATION RAPORU ===');
    logger.info(`Toplam Kullanıcı: ${this.stats.totalUsers}`);
    logger.info(`Migrate Edilen: ${this.stats.migratedUsers}`);
    logger.info(`Atlanan: ${this.stats.skippedUsers}`);
    logger.info(`Hata Alan: ${this.stats.errorUsers}`);

    if (this.stats.errors.length > 0) {
      logger.info('Hatalar:');
      this.stats.errors.forEach(error => {
        logger.info(`  - Kullanıcı ${error.userId}: ${error.error}`);
      });
    }

    logger.info('=====================================');
  }

  /**
   * Belirli bir kullanıcıyı test amaçlı migrate eder
   */
  async testMigrateUser(userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`Kullanıcı bulunamadı: ${userId}`);
    }

    logger.info(`Test migration başlatılıyor: ${userId}`);
    await this.migrateUser(user);
    logger.info(`Test migration tamamlandı: ${userId}`);
  }

  /**
   * Migration öncesi durumu kontrol eder
   */
  async checkMigrationStatus(): Promise<{
    totalUsers: number;
    usersWithLegacySubscription: number;
    usersWithNewSubscription: number;
    usersWithoutSubscription: number;
  }> {
    const users = await User.find({});
    
    let usersWithLegacySubscription = 0;
    let usersWithNewSubscription = 0;
    let usersWithoutSubscription = 0;

    for (const user of users) {
      if (user.subscriptions && user.subscriptions.length > 0) {
        usersWithNewSubscription++;
      } else if (user.subscriptionStatus || user.subscriptionPlan) {
        usersWithLegacySubscription++;
      } else {
        usersWithoutSubscription++;
      }
    }

    const status = {
      totalUsers: users.length,
      usersWithLegacySubscription,
      usersWithNewSubscription,
      usersWithoutSubscription
    };

    logger.info('Migration durumu:', status);
    return status;
  }
}

// Script'i çalıştırmak için ana fonksiyon
async function runMigration() {
  try {
    // MongoDB bağlantısı (config'den alınmalı)
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/aiku';
    await mongoose.connect(mongoUri);
    logger.info('MongoDB bağlantısı başarılı');

    const migrationService = new SubscriptionMigrationService();

    // Migration öncesi durumu kontrol et
    await migrationService.checkMigrationStatus();

    // Migration'ı başlat
    const stats = await migrationService.migrateAllUsers();

    // Rapor oluştur
    await migrationService.generateMigrationReport();

    logger.info('Migration başarıyla tamamlandı');
    process.exit(0);

  } catch (error: any) {
    logger.error('Migration hatası:', error);
    process.exit(1);
  }
}

// Eğer bu dosya doğrudan çalıştırılırsa
if (require.main === module) {
  runMigration();
}

export default SubscriptionMigrationService;
