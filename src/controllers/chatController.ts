import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import { ChatSession, IChatSession } from "../models/ChatSession";
import { Message } from "../models/Message";
import { Company } from "../models/Company";
import { io } from "../app";
// import { mailgunService } from '../services/mailgunService';
import { brevoService } from '../services/brevoService';
import oneSignalService from '../services/oneSignalService';

interface CustomRequest extends Request {
  company?: {
    id: string;
  };
}

/** SystemBot ID'si: */
// const SYSTEM_BOT_ID = new Types.ObjectId(process.env.SYSTEM_BOT_ID!);

// export const broadcastMessage = async (req: Request, res: Response) => {
//   try {
//     const { content, attachment } = req.body;
//     if (!content) {
//       return res.status(400).json({
//         success: false,
//         message: 'Mesaj içeriği (content) zorunludur'
//       });
//     }

//     if (!mongoose.Types.ObjectId.isValid(SYSTEM_BOT_ID)) {
//       return res.status(500).json({
//         success: false,
//         message: 'SYSTEM_BOT_ID hatalı yapılandırılmış'
//       });
//     }

//     const companies = await Company.find({}, '_id');

//     let broadcastCount = 0;
//     for (const { _id: companyId } of companies) {
//       let session = await ChatSession.findOne({
//         $or: [
//           { initiatorCompany: SYSTEM_BOT_ID, targetCompany: companyId },
//           { initiatorCompany: companyId, targetCompany: SYSTEM_BOT_ID }
//         ]
//       });
//       if (!session) {
//         session = await ChatSession.create({
//           initiatorCompany: SYSTEM_BOT_ID,
//           targetCompany: companyId,
//           title: 'System Broadcast'
//         });
//       }

//       const message = await Message.create({
//         chatSession: session._id,
//         sender: new mongoose.Types.ObjectId(SYSTEM_BOT_ID),
//         content,
//         attachment
//       });

//       session.lastMessageText = content;
//       session.lastMessageSender = new mongoose.Types.ObjectId(SYSTEM_BOT_ID);
//       session.lastMessageDate = new Date();
//       if (session.initiatorCompany.toString() === SYSTEM_BOT_ID) {
//         session.unreadCountTarget += 1;
//       } else {
//         session.unreadCountInitiator += 1;
//       }
//       await session.save();

//       io.to(`chat-${session._id}`).emit('new-message', message);
//       io.to(`company-${companyId.toString()}`).emit('chat-notification', {
//         type: 'new-message',
//         chatSessionId: session._id,
//         message,
//         unreadCount:
//           session.initiatorCompany.toString() === SYSTEM_BOT_ID
//             ? session.unreadCountTarget
//             : session.unreadCountInitiator
//       });

//       broadcastCount++;
//     }

//     return res.status(200).json({
//       success: true,
//       message: `Broadcast tamamlandı, ${broadcastCount} şirkete mesaj gönderildi`
//     });
//   } catch (error) {
//     console.error('Broadcast hatası:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Broadcast sırasında hata oluştu',
//       error: error instanceof Error ? error.message : 'Bilinmeyen hata'
//     });
//   }
// };

// Bir şirketin tüm sohbet oturumlarını getirme
export const getCompanyChatSessions = async (req: Request, res: Response) => {
  try {
    const companyId = req.params.companyId;

    // Geçerli bir MongoDB ObjectId mi kontrol et
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Geçersiz şirket ID",
      });
    }

    // Şirketin başlattığı veya hedef olduğu tüm sohbetleri bul
    const chatSessions = await ChatSession.find({
      $or: [
        { initiatorCompany: companyId, deletedByInitiator: false },
        { targetCompany: companyId, deletedByTarget: false },
      ],
    })
      .populate({
        path: 'initiatorCompany',
        select: 'companyName companyLogo user',          // company.user alanını da alın
        populate: { path: 'user', select: 'isOnline' }   // ve o kullanıcıdan sadece isOnline
      })
      .populate({
        path: 'targetCompany',
        select: 'companyName companyLogo user',
        populate: { path: 'user', select: 'isOnline' }
      })
      .populate("lastMessageSender", "companyName")
      .sort({ lastMessageDate: -1 });

    res.status(200).json({
      success: true,
      count: chatSessions.length,
      data: chatSessions,
    });
  } catch (error) {
    console.error("Sohbet oturumları alınırken hata:", error);
    res.status(500).json({
      success: false,
      message: "Sohbet oturumları alınırken bir hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

// YENİ: Sadece online/offline durumlarını dönen metod
export const getCompanyChatStatuses = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ success: false, message: "Geçersiz şirket ID" });
    }

    // Sadece ID ve user.isOnline gerekli
    const sessions = await ChatSession.find({
      $or: [
        { initiatorCompany: companyId },
        { targetCompany: companyId }
      ]
    })
      .select("_id initiatorCompany targetCompany")
      .populate({
        path: "initiatorCompany",
        select: "user",
        populate: { path: "user", select: "isOnline" }
      })
      .populate({
        path: "targetCompany",
        select: "user",
        populate: { path: "user", select: "isOnline" }
      });

    const statuses = sessions.map(session => {
      // 1) chatSession ID
      const sessionId = session._id.toString();

      // 2) initiatorCompany referansını normalize et
      const initiatorRaw = session.initiatorCompany as any;
      const initiatorId = initiatorRaw._id
        ? initiatorRaw._id.toString()
        : initiatorRaw.toString();

      // 3) targetCompany referansını normalize et
      const targetRaw = session.targetCompany as any;
      const targetId = targetRaw._id
        ? targetRaw._id.toString()
        : targetRaw.toString();

      // 4) karar ver: bu companyId hangi rolde?
      const isInitiator = (initiatorId === companyId);

      // 5) diğer kullanıcı objesini al
      const otherUser = isInitiator
        ? (targetRaw.user as any)
        : (initiatorRaw.user as any);

      // 6) gerçek boolean olarak dön
      return {
        sessionId,
        isOnline: Boolean(otherUser?.isOnline)
      };
    });

    return res.status(200).json(statuses);
  } catch (err) {
    console.error("getCompanyChatStatuses error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Yeni bir sohbet oturumu oluşturma
export const createChatSession = async (req: Request, res: Response) => {
  try {
    const { initiatorCompanyId, targetCompanyId, title } = req.body;

    // Gerekli alanları kontrol et
    if (!initiatorCompanyId || !targetCompanyId || !title) {
      return res.status(400).json({
        success: false,
        message:
          "Başlatıcı şirket ID, hedef şirket ID ve başlık alanları zorunludur",
      });
    }

    // Kendisiyle konuşmayı engelle
    if (initiatorCompanyId === targetCompanyId) {
      return res.status(400).json({
        success: false,
        message: "Bir şirket kendisiyle sohbet başlatamaz",
      });
    }

    // Her iki şirketin de var olduğunu kontrol et
    const initiatorExists = await Company.exists({ _id: initiatorCompanyId });
    const targetExists = await Company.exists({ _id: targetCompanyId });

    if (!initiatorExists || !targetExists) {
      return res.status(404).json({
        success: false,
        message: "Bir veya her iki şirket bulunamadı",
      });
    }

    // Aynı şirketler arasında zaten var olan bir sohbet var mı kontrol et
    let chatSession = await ChatSession.findOne({
      $or: [
        {
          initiatorCompany: initiatorCompanyId,
          targetCompany: targetCompanyId,
        },
        {
          initiatorCompany: targetCompanyId,
          targetCompany: initiatorCompanyId,
        },
      ],
    });

    if (chatSession) {
      // Eğer sohbet silinmişse, tekrar aktive et
      if (
        (chatSession.initiatorCompany.toString() === initiatorCompanyId &&
          chatSession.deletedByInitiator) ||
        (chatSession.targetCompany.toString() === initiatorCompanyId &&
          chatSession.deletedByTarget)
      ) {
        if (chatSession.initiatorCompany.toString() === initiatorCompanyId) {
          chatSession.deletedByInitiator = false;
        } else {
          chatSession.deletedByTarget = false;
        }
        await chatSession.save();
      }

      return res.status(200).json({
        success: true,
        message: "Var olan sohbet bulundu",
        data: chatSession,
      });
    }

    // Yeni bir sohbet oturumu oluştur
    chatSession = await ChatSession.create({
      initiatorCompany: initiatorCompanyId,
      targetCompany: targetCompanyId,
      title,
    });

    res.status(201).json({
      success: true,
      message: "Sohbet oturumu başarıyla oluşturuldu",
      data: chatSession,
    });
  } catch (error) {
    console.error("Sohbet oluşturma hatası:", error);
    res.status(500).json({
      success: false,
      message: "Sohbet oturumu oluşturulurken bir hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

// Bir sohbet oturumunun mesajlarını getirme
export const getChatMessages = async (req: Request, res: Response) => {
  try {
    const { chatSessionId } = req.params;
    const { companyId } = req.query;

    if (!chatSessionId || !companyId) {
      return res.status(400).json({
        success: false,
        message: "Sohbet oturumu ID ve şirket ID parametreleri zorunludur",
      });
    }

    // Sohbet oturumunu bul
    const chatSession = await ChatSession.findById(chatSessionId);

    if (!chatSession) {
      return res.status(404).json({
        success: false,
        message: "Sohbet oturumu bulunamadı",
      });
    }

    // Şirketin bu sohbete erişim izni var mı kontrol et
    if (
      chatSession.initiatorCompany.toString() !== companyId &&
      chatSession.targetCompany.toString() !== companyId
    ) {
      return res.status(403).json({
        success: false,
        message: "Bu sohbete erişim izniniz yok",
      });
    }

    // Sohbetteki mesajları getir
    const messages = await Message.find({ chatSession: chatSessionId })
      .populate("sender", "companyName companyLogo")
      .sort({ createdAt: 1 }); // Mesajları eski->yeni sırayla getir

    // Okunmamış mesajları "okundu" olarak işaretle
    const isInitiator = chatSession.initiatorCompany.toString() === companyId;

    // Şirketin karşı tarafından gelen mesajları okundu olarak işaretle
    await Message.updateMany(
      {
        chatSession: chatSessionId,
        sender: isInitiator
          ? chatSession.targetCompany
          : chatSession.initiatorCompany,
        isRead: false,
      },
      { isRead: true }
    );

    // Okunmamış mesaj sayacını sıfırla
    if (isInitiator) {
      chatSession.unreadCountInitiator = 0;
    } else {
      chatSession.unreadCountTarget = 0;
    }
    await chatSession.save();

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    console.error("Mesajlar alınırken hata:", error);
    res.status(500).json({
      success: false,
      message: "Mesajlar alınırken bir hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

// Yeni bir mesaj gönderme
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { chatSessionId, senderId, content, attachment } = req.body;

    // Gerekli alanları kontrol et
    if (!chatSessionId || !senderId || !content) {
      return res.status(400).json({
        success: false,
        message: "Sohbet oturumu ID, gönderen ID ve mesaj içeriği zorunludur",
      });
    }

    // Sohbet oturumunu bul
    const chatSession = await ChatSession.findById(chatSessionId);

    if (!chatSession) {
      return res.status(404).json({
        success: false,
        message: "Sohbet oturumu bulunamadı",
      });
    }

    // Gönderen şirketin bu sohbete katılımını kontrol et
    if (
      chatSession.initiatorCompany.toString() !== senderId &&
      chatSession.targetCompany.toString() !== senderId
    ) {
      return res.status(403).json({
        success: false,
        message: "Bu sohbete mesaj gönderme yetkiniz yok",
      });
    }

    // Yeni mesaj oluştur
    const message = await Message.create({
      chatSession: chatSessionId,
      sender: senderId,
      content,
      attachment,
    });

    // Sohbet oturumunu son mesaj bilgileriyle güncelle
    chatSession.lastMessageText = content;
    chatSession.lastMessageSender = senderId;
    chatSession.lastMessageDate = new Date();

    // Okunmamış mesaj sayacını artır (karşı taraf için)
    const isInitiator = chatSession.initiatorCompany.toString() === senderId;
    if (isInitiator) {
      chatSession.unreadCountTarget += 1;
    } else {
      chatSession.unreadCountInitiator += 1;
    }

    // Arşivden çıkar (eğer arşivlenmişse)
    if (isInitiator && chatSession.archivedByInitiator) {
      chatSession.archivedByInitiator = false;
    } else if (!isInitiator && chatSession.archivedByTarget) {
      chatSession.archivedByTarget = false;
    }

    await chatSession.save();

    // 4️⃣ KARŞI TARAFIN companyId’si
    const recipientId = isInitiator
      ? chatSession.targetCompany.toString()
      : chatSession.initiatorCompany.toString();

    // 5️⃣ Recipient company ve user bilgisini al
    const recipientCompany = await Company.findById(recipientId)
      .populate('user', 'email isOnline acceptChatNotification pushNotificationsEnabled _id')
      .orFail();

    // 6️⃣ populated user objesi üzerinden isOnline kontrolü
    const recipientUser = (recipientCompany.user as any) as { 
      _id: string; 
      email: string; 
      isOnline: boolean; 
      acceptChatNotification: boolean;
      pushNotificationsEnabled: boolean;
    };
    if (recipientUser.isOnline === false && recipientUser.acceptChatNotification) {
      // Gönderen şirket adını al
      const senderCompany = await Company.findById(senderId).select('companyName');
      const recipientEmail = recipientUser.email as string;
      const chatUrl = `${process.env.FRONTEND_URL}/chats/${chatSessionId}`;

      // Email bildirimi gönder
      await brevoService.sendChatNotification(recipientEmail, {
        companyName: senderCompany?.companyName || 'Biri',
        content,
        chatUrl
      });
    }

    // Push notification gönder (kullanıcı offline ise ve push notification'ları açıksa)
    if (recipientUser.isOnline === false && recipientUser.pushNotificationsEnabled) {
      try {
        const senderCompany = await Company.findById(senderId).select('companyName');
        
        await oneSignalService.sendChatNotification(
          recipientUser._id,
          senderCompany?.companyName || 'Biri',
          content,
          chatSessionId
        );
        
        console.log(`Push notification gönderildi - Kullanıcı: ${recipientUser._id}, Gönderen: ${senderCompany?.companyName}`);
      } catch (error) {
        console.error('Push notification gönderme hatası:', error);
        logger.error('Push notification gönderme hatası:', error);
      }
    }

    const populatedMessage = await Message.findById(message._id).populate(
      "sender",
      "companyName companyLogo"
    );

    console.log(
      "Emitting message to room: chat-" + chatSessionId,
      "Message:",
      populatedMessage
    );

    // Socket.io ile gerçek zamanlı bildirim gönder
    // 1. Sohbet odasına mesaj gönder
    io.to(`chat-${chatSessionId}`).emit("new-message", populatedMessage);

    // 2. Alıcı şirkete bildirim gönder
    // 2. Alıcı şirkete bildirim gönder (recipientId zaten var)
    io.to(`company-${recipientId}`).emit("chat-notification", {
      type: "new-message",
      chatSessionId,
      message: populatedMessage,
      unreadCount: isInitiator
        ? chatSession.unreadCountTarget
        : chatSession.unreadCountInitiator,
    });

    res.status(201).json({
      success: true,
      message: "Mesaj başarıyla gönderildi",
      data: populatedMessage,
    });
  } catch (error) {
    console.error("Mesaj gönderilirken hata:", error);
    res.status(500).json({
      success: false,
      message: "Mesaj gönderilirken bir hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

// Sohbeti arşivleme/arşivden çıkarma
export const toggleArchiveChat = async (req: Request, res: Response) => {
  try {
    const { chatSessionId } = req.params;
    const { companyId, archive } = req.body;

    if (!chatSessionId || !companyId || archive === undefined) {
      return res.status(400).json({
        success: false,
        message: "Sohbet oturumu ID, şirket ID ve arşiv durumu zorunludur",
      });
    }

    const chatSession = await ChatSession.findById(chatSessionId);

    if (!chatSession) {
      return res.status(404).json({
        success: false,
        message: "Sohbet oturumu bulunamadı",
      });
    }

    if (
      chatSession.initiatorCompany.toString() !== companyId &&
      chatSession.targetCompany.toString() !== companyId
    ) {
      return res.status(403).json({
        success: false,
        message: "Bu sohbete erişim izniniz yok",
      });
    }

    if (chatSession.initiatorCompany.toString() === companyId) {
      chatSession.archivedByInitiator = archive;
    } else {
      chatSession.archivedByTarget = archive;
    }

    await chatSession.save();

    res.status(200).json({
      success: true,
      message: `Sohbet ${archive ? "arşivlendi" : "arşivden çıkarıldı"}`,
      data: chatSession,
    });
  } catch (error) {
    console.error("Sohbet arşivleme hatası:", error);
    res.status(500).json({
      success: false,
      message: "Sohbet arşivlenirken bir hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

// Sohbeti silme (aslında soft delete)
export const deleteChat = async (req: Request, res: Response) => {
  try {
    const { chatSessionId } = req.params;
    const { companyId } = req.body;

    if (!chatSessionId || !companyId) {
      return res.status(400).json({
        success: false,
        message: "Sohbet oturumu ID ve şirket ID zorunludur",
      });
    }

    const chatSession = await ChatSession.findById(chatSessionId);

    if (!chatSession) {
      return res.status(404).json({
        success: false,
        message: "Sohbet oturumu bulunamadı",
      });
    }

    if (
      chatSession.initiatorCompany.toString() !== companyId &&
      chatSession.targetCompany.toString() !== companyId
    ) {
      return res.status(403).json({
        success: false,
        message: "Bu sohbete erişim izniniz yok",
      });
    }

    if (chatSession.initiatorCompany.toString() === companyId) {
      chatSession.deletedByInitiator = true;
    } else {
      chatSession.deletedByTarget = true;
    }

    if (chatSession.deletedByInitiator && chatSession.deletedByTarget) {
      // Sohbete ait mesajları silmek istiyorsanız bu bloğu aktif edebilirsiniz
      // await Message.deleteMany({ chatSession: chatSessionId });
    }

    await chatSession.save();

    res.status(200).json({
      success: true,
      message: "Sohbet başarıyla silindi",
    });
  } catch (error) {
    console.error("Sohbet silme hatası:", error);
    res.status(500).json({
      success: false,
      message: "Sohbet silinirken bir hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const broadcastToAllCompanies = async (
  req: CustomRequest,
  res: Response
) => {
  try {
    const { content, isReplyable, attachment } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Mesaj içeriği (content) zorunludur",
      });
    }

    const senderCompanyId = req.company?.id;
    if (!senderCompanyId) {
      return res.status(401).json({
        success: false,
        message: "Yetkisiz erişim",
      });
    }

    const companies = await Company.find({
      _id: { $ne: new mongoose.Schema.Types.ObjectId(senderCompanyId) },
    });

    let broadcastCount = 0;
    for (const company of companies) {
      let session = await ChatSession.findOne({
        $or: [
          { initiatorCompany: senderCompanyId, targetCompany: company._id },
          { initiatorCompany: company._id, targetCompany: senderCompanyId },
        ],
      }).exec();

      if (!session) {
        session = await ChatSession.create({
          initiatorCompany: new mongoose.Schema.Types.ObjectId(senderCompanyId),
          targetCompany: company._id,
          title: "Toplu Mesaj",
        });
      }

      const message = await Message.create({
        chatSession: session._id,
        sender: new mongoose.Schema.Types.ObjectId(senderCompanyId),
        content,
        isReplyable: isReplyable !== undefined ? isReplyable : true,
        attachment,
      });

      session.lastMessageText = content;
      session.lastMessageSender = new mongoose.Schema.Types.ObjectId(senderCompanyId);
      session.lastMessageDate = new Date();
      if (session.initiatorCompany.toString() === senderCompanyId) {
        session.unreadCountTarget += 1;
      } else {
        session.unreadCountInitiator += 1;
      }
      await session.save();

      io.to(`chat-${session._id}`).emit("new-message", message);
      io.to(`company-${company._id.toString()}`).emit("chat-notification", {
        type: "new-message",
        chatSessionId: session._id,
        message,
        unreadCount:
          session.initiatorCompany.toString() === senderCompanyId
            ? session.unreadCountTarget
            : session.unreadCountInitiator,
      });

      broadcastCount++;
    }

    return res.status(200).json({
      success: true,
      message: `Toplu mesaj gönderimi tamamlandı, ${broadcastCount} şirkete mesaj gönderildi`,
    });
  } catch (error) {
    console.error("Toplu mesaj gönderimi hatası:", error);
    return res.status(500).json({
      success: false,
      message: "Toplu mesaj gönderimi sırasında hata oluştu",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};
