import mongoose, { Document, Model, Schema } from "mongoose";

export interface IReportChatSession extends Document {
    user?: mongoose.Schema.Types.ObjectId;
    participantName?: string;

    // Rapor bağlamı
    reportId: string;           // ör. "startupIdeas"
    ideaId?: string;            // ör. "17" (section-level eşleşme için)
    sectionKey?: string;        // ör. "revenue_stream"
    jsonPath?: string;          // ör. "$[id=17].revenue_stream"

    title?: string;             // UI için kısa başlık
    lastMessageText?: string;
    lastMessageDate?: Date;

    createdAt: Date;
    updatedAt: Date;
}

interface IReportChatSessionModel extends Model<IReportChatSession> { }

const reportChatSessionSchema = new Schema<IReportChatSession>(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
        participantName: { type: String, trim: true },

        reportId: { type: String, required: true, index: true },
        ideaId: { type: String, required: false, index: true },
        sectionKey: { type: String, required: false, index: true },
        jsonPath: { type: String, required: false },

        title: { type: String, trim: true },
        lastMessageText: { type: String, trim: true },
        lastMessageDate: { type: Date },

        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    },
    {
        timestamps: true,
        collection: "reportchatsession",
    }
);

reportChatSessionSchema.index({ user: 1, updatedAt: -1 });
reportChatSessionSchema.index({ reportId: 1, ideaId: 1, sectionKey: 1 });

export const ReportChatSession = mongoose.model<IReportChatSession, IReportChatSessionModel>(
    "ReportChatSession",
    reportChatSessionSchema
);
