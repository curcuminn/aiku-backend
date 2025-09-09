import { Request, Response } from "express";
import { ReportChatSession } from "../models/ReportChatSession";
import { ReportMessage } from "../models/ReportMessage";
import logger from "../config/logger";
import MetaConversionsService from "../services/metaConversionsService";
import { GeminiReportService } from "../services/geminiReportService"; // service dosyanızı birazdan bağlarız

const meta = new MetaConversionsService();
const geminiReportService = new GeminiReportService();

interface StartChatBody {
    reportId: string;
    ideaId?: string;
    sectionKey?: string;
    jsonPath?: string;
    context?: { title?: string; raw?: any; flat?: string };
    question: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
    sessionId?: string | null;
    name?: string;
}

export const postReportChat = async (req: Request<{}, any, StartChatBody>, res: Response) => {
    try {
        console.log("[/api/report-chat] body:", JSON.stringify(req.body).slice(0, 1000));
        const {
            reportId,
            ideaId,
            sectionKey,
            jsonPath,
            context,
            question,
            history = [],
            sessionId = null,
            name,
        } = req.body;

        if (!reportId || !question) {
            return res.status(400).json({ success: false, error: "reportId ve question zorunludur" });
        }

        // Var olan oturumu al veya yarat
        let session = sessionId ? await ReportChatSession.findById(sessionId) : null;
        if (!session) {
            session = await ReportChatSession.create({
                reportId,
                ideaId,
                sectionKey,
                jsonPath,
                participantName: name ?? undefined,
                title:
                    context?.title ||
                    [reportId, ideaId ? `#${ideaId}` : null, sectionKey ? `• ${sectionKey}` : null]
                        .filter(Boolean)
                        .join(" "),
                lastMessageText: question,
                lastMessageDate: new Date(),
            });

            // event (non-blocking)
            meta
                .sendEvent({
                    eventName: "ReportChat_Started",
                    user: {
                        email: undefined,
                        phone: undefined,
                        clientIpAddress: (req.headers["x-real-ip"] as string) || req.ip,
                        clientUserAgent: req.headers["user-agent"] as string,
                    },
                })
                .catch(() => { });
        } else if (!session.participantName && name) {
            session.participantName = name;
        }

        // Geçmişi DB’den toplayalım (gerekirse 25 ile sınırlayalım)
        const past = await ReportMessage.find({ chatSession: session._id })
            .sort({ createdAt: 1 })
            .limit(25)
            .lean();

        // 1) dbHistory'yi literal türlerle açıkça tipleyin
        const dbHistory: Array<{ role: "user" | "assistant"; content: string }> = past.map((m) => ({
            role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
            content: m.content,
        }));

        // 2) UI’dan gelen kısa history’yi de (son 6) ekleyelim
        //    Tip güvenliği için birleşimi yine açıkça tipleyin
        const mergedHistory = [...dbHistory, ...history].slice(-25);
        // Gemini kuralı: ilk mesaj user olmalı; baştaki assistant mesajlarını at
        const cleanedHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
        for (const h of mergedHistory) {
            if (!cleanedHistory.length && h.role !== "user") continue; // baştaki assistant'ı at
            cleanedHistory.push(h);
        }

        // Kullanıcı mesajını kaydet
        const userMsg = await ReportMessage.create({
            chatSession: session._id,
            role: "user",
            content: question,
            contextTitle: context?.title,
            contextJson: context?.raw ?? undefined,
        });

        // Service çağrısı (Gemini)
        // Not: aynı Gemini key’i kullanacağız — service içinde ayarlı olacak.
        const llmResp = await geminiReportService.chatReport({
            reportId,
            ideaId,
            sectionKey,
            jsonPath,
            context,
            question,
            history: cleanedHistory,
        });

        // llmResp beklenen şekil:
        // { answer: string, citations?: string[] }
        const answer = llmResp?.answer || "Bu bölüm verisinde ilgili bilgi bulunamadı veya yanıt üretilemedi.";
        const citations: string[] = Array.isArray(llmResp?.citations) ? llmResp.citations : [];

        const aiMsg = await ReportMessage.create({
            chatSession: session._id,
            role: "assistant",
            content: answer,
            contextTitle: context?.title,
            contextJson: context?.raw ?? undefined,
        });

        session.lastMessageText = answer.slice(0, 200);
        session.lastMessageDate = new Date();
        await session.save();

        return res.json({
            success: true,
            sessionId: session._id,
            answer,
            citations,
            conversation: [userMsg, aiMsg],
        });
    } catch (error: any) {
        console.error("Report chat hata:", error);
        return res.status(200).json({
            success: false,
            answer: "The service is temporarily unavailable. Please try again.",
            citations: [],
            error: error?.message || "report-chat failed",
        });
    }
};

/** List sessions (filtrelenebilir) */
interface ListQuery {
    page?: string;
    limit?: string;
    q?: string;
    userId?: string;
    reportId?: string;
    ideaId?: string;
    sectionKey?: string;
    participantName?: string;
}

export const listReportSessions = async (req: Request<{}, any, any, ListQuery>, res: Response) => {
    const {
        page = "1",
        limit = "20",
        q = "",
        userId,
        reportId,
        ideaId,
        sectionKey,
        participantName,
    } = req.query;

    const filter: any = {};
    if (userId) filter.user = userId;
    if (reportId) filter.reportId = reportId;
    if (ideaId) filter.ideaId = ideaId;
    if (sectionKey) filter.sectionKey = sectionKey;
    if (participantName) filter.participantName = { $regex: participantName, $options: "i" };
    if (q) {
        filter.$or = [
            { title: { $regex: q, $options: "i" } },
            { participantName: { $regex: q, $options: "i" } },
            { lastMessageText: { $regex: q, $options: "i" } },
        ];
    }

    const sessions = await ReportChatSession.find(filter)
        .sort({ updatedAt: -1 })
        .skip((+page - 1) * +limit)
        .limit(+limit)
        .lean();

    const total = await ReportChatSession.countDocuments(filter);
    res.json({ success: true, data: sessions, total });
};

/** Get messages in a session */
interface MsgParams { id: string }
interface MsgQuery { after?: string; limit?: string }

export const getReportSessionMessages = async (
    req: Request<MsgParams, any, any, MsgQuery>,
    res: Response
) => {
    const { id } = req.params;
    const { after, limit = "50" } = req.query;

    const filter: any = { chatSession: id };
    if (after) filter._id = { $gt: after };

    const messages = await ReportMessage.find(filter)
        .sort({ createdAt: 1 })
        .limit(+limit)
        .lean();

    res.json({ success: true, data: messages });
};
