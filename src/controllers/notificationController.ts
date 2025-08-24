import { Request, Response } from 'express';
import { User, IUser } from '../models/User';

export const getPushNotificationSettings = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimlik doğrulaması gerekli'
      });
    }

    const user = await User.findById(userId).select('pushNotificationsEnabled');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        pushNotificationsEnabled: user.pushNotificationsEnabled
      }
    });

  } catch (error) {
    console.error('Push notification ayarları getirme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

export const updatePushNotificationSettings = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)?._id;
    const { pushNotificationsEnabled } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimlik doğrulaması gerekli'
      });
    }

    if (typeof pushNotificationsEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'pushNotificationsEnabled boolean değer olmalıdır'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { pushNotificationsEnabled },
      { new: true, runValidators: true }
    ).select('pushNotificationsEnabled');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Push notification ayarları güncellendi',
      data: {
        pushNotificationsEnabled: user.pushNotificationsEnabled
      }
    });

  } catch (error) {
    console.error('Push notification ayarları güncelleme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

export const getAllNotificationSettings = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimlik doğrulaması gerekli'
      });
    }

    const user = await User.findById(userId).select('acceptChatNotification pushNotificationsEnabled');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        chatNotifications: user.acceptChatNotification,
        pushNotifications: user.pushNotificationsEnabled
      }
    });

  } catch (error) {
    console.error('Notification ayarları getirme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// OneSignal push token kaydetme endpoint'i
export const savePushToken = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)?._id;
    const { playerId, pushToken, platform, deviceId } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimlik doğrulaması gerekli'
      });
    }

    // Gerekli alanları kontrol et
    if (!playerId || !pushToken || !platform) {
      return res.status(400).json({
        success: false,
        message: 'playerId, pushToken ve platform alanları zorunludur'
      });
    }

    // Platform değerini kontrol et
    if (!['ios', 'android'].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'Platform değeri ios veya android olmalıdır'
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Mevcut push token'ları kontrol et
    if (!user.pushTokens) {
      user.pushTokens = [];
    }

    // Aynı playerId ile kayıtlı token var mı kontrol et
    const existingTokenIndex = user.pushTokens.findIndex(
      token => token.playerId === playerId
    );

    const newTokenData = {
      playerId,
      pushToken,
      platform,
      deviceId,
      lastUpdated: new Date()
    };

    if (existingTokenIndex !== -1) {
      // Mevcut token'ı güncelle
      user.pushTokens[existingTokenIndex] = newTokenData;
    } else {
      // Yeni token ekle
      user.pushTokens.push(newTokenData);
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Push token başarıyla kaydedildi',
      data: {
        playerId,
        platform,
        deviceId
      }
    });

  } catch (error) {
    console.error('Push token kaydetme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Push token silme endpoint'i
export const deletePushToken = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)?._id;
    const { playerId } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimlik doğrulaması gerekli'
      });
    }

    if (!playerId) {
      return res.status(400).json({
        success: false,
        message: 'playerId alanı zorunludur'
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Push token'ı sil
    if (user.pushTokens) {
      user.pushTokens = user.pushTokens.filter(
        token => token.playerId !== playerId
      );
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Push token başarıyla silindi'
    });

  } catch (error) {
    console.error('Push token silme hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
};

// Test için push notification gönderme endpoint'i
export const sendTestPushNotification = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı kimlik doğrulaması gerekli'
      });
    }

    // OneSignal servisini import et
    const oneSignalService = await import('../services/oneSignalService');
    
    // Test bildirimi gönder
    const result = await oneSignalService.default.sendToUser(userId.toString(), {
      contents: {
        en: 'Bu bir test bildirimidir!',
        tr: 'Bu bir test bildirimidir!'
      },
      headings: {
        en: 'Test Bildirimi',
        tr: 'Test Bildirimi'
      },
      data: {
        type: 'test',
        timestamp: new Date().toISOString()
      },
      priority: 10
    });

    return res.status(200).json({
      success: true,
      message: 'Test bildirimi gönderildi',
      data: result
    });

  } catch (error) {
    console.error('Test push notification hatası:', error);
    return res.status(500).json({
      success: false,
      message: 'Test bildirimi gönderilemedi',
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
};
