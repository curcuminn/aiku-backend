import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SubscriptionMigrationService from './migrateSubscriptions';
import logger from '../config/logger';

// Environment variables'ları yükle
dotenv.config();

async function checkStatus() {
  try {
    // MongoDB bağlantısı
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/aiku';
    await mongoose.connect(mongoUri);
    logger.info('MongoDB bağlantısı başarılı');

    const migrationService = new SubscriptionMigrationService();
    const status = await migrationService.checkMigrationStatus();

    console.log('\n=== MIGRATION DURUMU ===');
    console.log(`Toplam Kullanıcı: ${status.totalUsers}`);
    console.log(`Eski Sistem Kullanan: ${status.usersWithLegacySubscription}`);
    console.log(`Yeni Sistem Kullanan: ${status.usersWithNewSubscription}`);
    console.log(`Abonelik Olmayan: ${status.usersWithoutSubscription}`);
    console.log('========================\n');

    process.exit(0);
  } catch (error: any) {
    console.error('Hata:', error.message);
    process.exit(1);
  }
}

checkStatus();
