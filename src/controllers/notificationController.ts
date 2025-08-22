import { Request, Response } from 'express';
import { User } from '../models/User';

export const getPushNotificationSettings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
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
    const userId = req.user?.id;
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
    const userId = req.user?.id;
    
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
