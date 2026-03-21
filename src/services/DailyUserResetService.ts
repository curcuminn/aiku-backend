import mongoose from "mongoose";
import logger from "../config/logger";
import { MongoClient } from "mongodb";

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
  /**
   * Ayrı bir Mongo bağlantısı gerekiyorsa env üzerinden bağlanır.
   * Env yoksa mevcut mongoose bağlantısını kullanır.
   */
  static async run(): Promise<void> {
    const externalUri = process.env.DAILY_RESET_MONGO_URI;
    const externalDbName =  "aloha-prod";
    const collectionName =  "users";

    let externalClient: MongoClient | undefined;
    const useExternal = Boolean(externalUri);

    try {
      const db = await (async () => {
        if (useExternal && externalUri) {
          externalClient = new MongoClient(externalUri, {
            // Node mongodb v5+ artık useNewUrlParser/useUnifiedTopology gerektirmez
          });
          await externalClient.connect();
          logger.info("Daily reset: external MongoDB connected", {
            dbName: externalDbName,
          });
          return externalClient.db(externalDbName);
        }

        const mongooseDb = mongoose.connection.db;
        if (!mongooseDb) {
          throw new Error("Mongoose connection has no db. Provide DAILY_RESET_MONGO_URI");
        }
        logger.info("Daily reset: using existing Mongoose connection");
        return mongooseDb;
      })();

      const users = db.collection(collectionName);

      // 1) ResetFreeUsages
      /*
      const resFree = await users.updateMany(
        { hasFreeUsage: false },
        { $set: { hasFreeUsage: true } }
      );
      logger.info("Daily reset: hasFreeUsage set true", { modified: resFree.modifiedCount });
      */

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
    } finally {
      if (externalClient) {
        try {
          await externalClient.close();
          logger.info("Daily reset: external MongoDB disconnected");
        } catch (e) {
          logger.warn("Daily reset: error closing external MongoDB", { error: e });
        }
      }
    }
  }
}


