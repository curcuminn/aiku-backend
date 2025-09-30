import mongoose from "mongoose";
import logger from "../config/logger";

/**
 * Günlük kullanıcı alan resetleri
 * Not: İstenen alanlar şema içinde bulunmuyor olabilir. Bu nedenle strict:false ile çalışıyoruz.
 * users koleksiyonunda aşağıdaki güncellemeler yapılır:
 * - hasFreeUsage: true
 * - dailyAdWatched: 0, remainingDailyRewardLimit: 30
 * - dailyReferralLimit: 10
 * - spinCount: 1, lastSpinDate: []
 */
export default class DailyUserResetService {
  static async run(): Promise<void> {
    const connection = mongoose.connection;
    const db = connection.db;
    if (!db) {
      logger.error("MongoDB bağlantısı mevcut değil (db null). Cron atlanıyor.");
      return;
    }

    const users = db.collection("users");

    try {
      // 1) ResetFreeUsages
      const resFree = await users.updateMany(
        { hasFreeUsage: false },
        { $set: { hasFreeUsage: true } }
      );
      logger.info("Daily reset: hasFreeUsage set true", { modified: resFree.modifiedCount });

      // 2) ResetWatchedAds
      const resAds = await users.updateMany(
        { dailyAdWatched: { $gt: 0 } },
        { $set: { dailyAdWatched: 0, remainingDailyRewardLimit: 30 } }
      );
      logger.info("Daily reset: ads + rewards reset", { modified: resAds.modifiedCount });

      // 3) ResetDailyReferralLimit
      const resReferral = await users.updateMany(
        { dailyReferralLimit: { $gt: 0 } },
        { $set: { dailyReferralLimit: 10 } }
      );
      logger.info("Daily reset: referral limit set", { modified: resReferral.modifiedCount });

      // 4) ResetSpinCount
      const resSpin = await users.updateMany(
        { spinCount: 0 },
        { $set: { spinCount: 1, lastSpinDate: [] } }
      );
      logger.info("Daily reset: spin count set", { modified: resSpin.modifiedCount });
    } catch (err) {
      logger.error("DailyUserResetService error", { error: err });
    }
  }
}


