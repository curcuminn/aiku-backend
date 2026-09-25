// controllers/academicChatController.ts
import { Request, Response } from "express";
import { AcademicChatSession } from "../models/AcademicChatSession";
import { AcademicMessage } from "../models/AcademicMessage";

interface ListSessionsQuery {
    page?: string;
    limit?: string;
    q?: string;
    userId?: string;
    participantName?: string;
}

export const listSessions = async (
    req: Request<{}, any, any, ListSessionsQuery>,
    res: Response
) => {
    const { page = "1", limit = "1000", q = "", userId, participantName } = req.query;
    const filter: any = {};
    if (userId) filter.user = userId;
    if (q) {
        filter.$or = [
            { title: { $regex: q, $options: "i" } },
            { participantName: { $regex: q, $options: "i" } },
            { lastMessageText: { $regex: q, $options: "i" } },
        ];
    }

    if (participantName) {
        filter.participantName = { $regex: participantName, $options: "i" };
    }

    const maxLimit = Math.min(Math.max(1, +limit || 50), 1000);
    const currentPage = Math.max(1, +page || 1);

    const sessions = await AcademicChatSession.find(filter)
        .sort({ updatedAt: -1 })
        .skip((currentPage - 1) * maxLimit)
        .limit(maxLimit)
        .lean();

    const total = await AcademicChatSession.countDocuments(filter);
    res.json({ success: true, data: sessions, total });
};

interface MessagesParams { id: string }
interface MessagesQuery { after?: string; limit?: string }

export const getSessionMessages = async (
    req: Request<MessagesParams, any, any, MessagesQuery>,
    res: Response
) => {
    const { id } = req.params;
    const { after, limit = "50" } = req.query;

    const filter: any = { chatSession: id };
    if (after) filter._id = { $gt: after };

    const messages = await AcademicMessage.find(filter)
        .sort({ createdAt: 1 })
        .limit(+limit)
        .lean();

    res.json({ success: true, data: messages });
};
