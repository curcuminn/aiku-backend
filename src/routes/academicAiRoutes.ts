// routes/academicChat.ts
import express, { Request, Response } from "express";
import { GeminiAcademicService } from "../services/geminiAcademicService";
import logger from "../config/logger";
import { AcademicChatSession } from "../models/AcademicChatSession";
import { AcademicMessage } from "../models/AcademicMessage";
import * as ctrl from "../controllers/academicChatController";

const router = express.Router();
import MetaConversionsService from "../services/metaConversionsService";
const meta = new MetaConversionsService();
const geminiAcademicService = new GeminiAcademicService();

router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { message, sessionId = null, name } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: "Mesaj gereklidir" });
    }

    let session = sessionId ? await AcademicChatSession.findById(sessionId) : null;
    if (!session) {
      session = await AcademicChatSession.create({
        title: "Akademik Sohbet",
        participantName: name ?? undefined,
        lastMessageText: message,
        lastMessageDate: new Date(),
      });

      // Fire a conversions event for a new academic chat session
      // Non-blocking: do not await
      meta
        .sendEvent({
          eventName: "AcademicChat_Started",
          user: {
            email: undefined,
            phone: undefined,
            clientIpAddress: (req.headers["x-real-ip"] as string) || req.ip,
            clientUserAgent: req.headers["user-agent"] as string,
          },
        })
        .catch(() => {});
    } else if (!session.participantName && name) {
      session.participantName = name;
    }

    const pastMessages = await AcademicMessage.find({ chatSession: session._id })
      .sort({ createdAt: 1 })
      .limit(25)
      .lean();

    const history = pastMessages.map(m => ({
      role: m.role
        ? (m.role === "assistant" ? "model" : "user")
        : "user",
      content: m.content,
    }));

    while (history.length && history[0].role !== "user") {
      history.shift();
    }

    const userMsg = await AcademicMessage.create({
      chatSession: session._id,
      content: message,
      role: "user"
    });

    const chatResponse = await geminiAcademicService.chatAcademic(message, history);

    const aiMsg = await AcademicMessage.create({
      chatSession: session._id,
      content: chatResponse.response,
      role: "assistant"
    });

    session.lastMessageText = chatResponse.response.slice(0, 200);
    session.lastMessageDate = new Date();
    await session.save();

    res.json({
      success: true,
      sessionId: session._id,
      response: chatResponse.response,
      conversation: [userMsg, aiMsg],
    });
  } catch (error: any) {
    logger.error("Akademik sohbet hatası:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Bilinmeyen bir sohbet hatası oluştu",
    });
  }
});

router.get("/sessions", ctrl.listSessions);
router.get("/sessions/:id/messages", ctrl.getSessionMessages);

export default router;
