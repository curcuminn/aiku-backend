import axios from 'axios';
import { User } from '../models/User';

interface OneSignalNotification {
  app_id: string;
  included_segments?: string[];
  include_player_ids?: string[];
  include_external_user_ids?: string[];
  contents: {
    en: string;
    tr?: string;
  };
  headings?: {
    en: string;
    tr?: string;
  };
  data?: any;
  url?: string;
  android_channel_id?: string;
  ios_sound?: string;
  android_sound?: string;
  priority?: number;
  delayed_option?: string;
  delivery_time_of_day?: string;
  ttl?: number;
}

class OneSignalService {
  private appId: string;
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.appId = process.env.ONESIGNAL_APP_ID || '';
    this.apiKey = process.env.ONESIGNAL_REST_API_KEY || '';
    this.baseUrl = 'https://onesignal.com/api/v1';
    
    // Debug log
    console.log('OneSignal Service initialized:');
    console.log('App ID:', this.appId ? `${this.appId.substring(0, 8)}...` : 'NOT SET');
    console.log('API Key:', this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'NOT SET');
  }

  /**
   * Tek kullanıcıya bildirim gönder
   */
  async sendToUser(userId: string, notification: Omit<OneSignalNotification, 'app_id'>) {
    try {
      // Kullanıcıyı bul ve push token'larını al
      const user = await User.findById(userId).select('pushTokens pushNotificationsEnabled');
      
      if (!user || !user.pushNotificationsEnabled) {
        console.log(`Push bildirim atlandı - Kullanıcı: ${userId}, Sebep: ${!user ? 'Kullanıcı bulunamadı' : 'Push bildirimleri kapalı'}`);
        return { success: false, message: 'Kullanıcı bulunamadı veya push bildirimleri kapalı' };
      }

      if (!user.pushTokens || user.pushTokens.length === 0) {
        console.log(`Push bildirim atlandı - Kullanıcı: ${userId}, Sebep: Push token bulunamadı`);
        return { success: false, message: 'Push token bulunamadı' };
      }

      // Tüm push token'ları topla
      const playerIds = user.pushTokens.map(token => token.playerId);

      const payload: OneSignalNotification = {
        app_id: this.appId,
        include_player_ids: playerIds,
        ...notification
      };

      // Debug payload
      console.log('OneSignal payload:', JSON.stringify(payload, null, 2));

      const response = await axios.post(
        `${this.baseUrl}/notifications`,
        payload,
        {
          headers: {
            'Authorization': `Basic ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`Bildirim gönderildi - Kullanıcı: ${userId}, OneSignal ID: ${response.data.id}`);
      
      return {
        success: true,
        message: 'Bildirim başarıyla gönderildi',
        data: response.data
      };

    } catch (error: any) {
      console.error('OneSignal bildirim gönderme hatası:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Bildirim gönderilemedi',
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Birden fazla kullanıcıya bildirim gönder
   */
  async sendToUsers(userIds: string[], notification: Omit<OneSignalNotification, 'app_id'>) {
    try {
      // Kullanıcıları bul ve push token'larını al
      const users = await User.find({
        _id: { $in: userIds },
        pushNotificationsEnabled: true
      }).select('pushTokens');

      if (!users || users.length === 0) {
        console.log('Push bildirimleri açık kullanıcı bulunamadı');
        return { success: false, message: 'Push bildirimleri açık kullanıcı bulunamadı' };
      }

      // Tüm push token'ları topla
      const playerIds: string[] = [];
      users.forEach(user => {
        if (user.pushTokens && user.pushTokens.length > 0) {
          user.pushTokens.forEach(token => {
            playerIds.push(token.playerId);
          });
        }
      });

      if (playerIds.length === 0) {
        console.log('Hiç push token bulunamadı');
        return { success: false, message: 'Hiç push token bulunamadı' };
      }

      const payload: OneSignalNotification = {
        app_id: this.appId,
        include_player_ids: playerIds,
        ...notification
      };

      const response = await axios.post(
        `${this.baseUrl}/notifications`,
        payload,
        {
          headers: {
            'Authorization': `Basic ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`Toplu bildirim gönderildi - Kullanıcı sayısı: ${userIds.length}, OneSignal ID: ${response.data.id}`);
      
      return {
        success: true,
        message: 'Toplu bildirim başarıyla gönderildi',
        data: response.data
      };

    } catch (error: any) {
      console.error('OneSignal toplu bildirim gönderme hatası:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Toplu bildirim gönderilemedi',
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Tüm kullanıcılara bildirim gönder
   */
  async sendToAll(notification: Omit<OneSignalNotification, 'app_id'>) {
    try {
      const payload: OneSignalNotification = {
        app_id: this.appId,
        included_segments: ['All'],
        ...notification
      };

      const response = await axios.post(
        `${this.baseUrl}/notifications`,
        payload,
        {
          headers: {
            'Authorization': `Basic ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`Genel bildirim gönderildi - OneSignal ID: ${response.data.id}`);
      
      return {
        success: true,
        message: 'Genel bildirim başarıyla gönderildi',
        data: response.data
      };

    } catch (error: any) {
      console.error('OneSignal genel bildirim gönderme hatası:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Genel bildirim gönderilemedi',
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Chat bildirimi gönder
   */
  async sendChatNotification(
    recipientUserId: string,
    senderName: string,
    message: string,
    chatId?: string
  ) {
    console.log(`Chat bildirimi hazırlanıyor - Alıcı: ${recipientUserId}, Gönderen: ${senderName}, Chat: ${chatId}`);
    
    const notification = {
      contents: {
        en: `${senderName}: ${message}`,
        tr: `${senderName}: ${message}`
      },
      headings: {
        en: 'New Message',
        tr: 'New Message'
      },
      data: {
        type: 'chat',
        chatId: chatId || '',
        senderName
      },
      priority: 10,
      // android_channel_id: 'chat', // OneSignal dashboard'da channel oluşturulana kadar kaldırıldı
      ios_sound: 'default',
      android_sound: 'default'
    };

    const result = await this.sendToUser(recipientUserId, notification);
    console.log(`Chat bildirimi sonucu - Alıcı: ${recipientUserId}, Başarılı: ${result.success}`);
    return result;
  }

  /**
   * Abonelik bildirimi gönder
   */
  async sendSubscriptionNotification(
    userId: string,
    title: string,
    message: string,
    type: 'trial_ending' | 'payment_success' | 'payment_failed' | 'subscription_expired'
  ) {
    const notification = {
      contents: {
        en: message,
        tr: message
      },
      headings: {
        en: title,
        tr: title
      },
      data: {
        type: 'subscription',
        subscriptionType: type
      },
      priority: 8,
      // android_channel_id: 'subscription', // OneSignal dashboard'da channel oluşturulana kadar kaldırıldı
      ios_sound: 'default',
      android_sound: 'default'
    };

    return await this.sendToUser(userId, notification);
  }
}

export default new OneSignalService();
