import mongoose, { Document, Model, Schema } from "mongoose";

export interface IReportMessage extends Document {
    chatSession: mongoose.Schema.Types.ObjectId;
    sender?: mongoose.Schema.Types.ObjectId;
    role: "user" | "assistant";
    content: string;

    // bağlam snapshot (opsiyonel, denetim izi için)
    contextTitle?: string;
    contextJson?: any;

    createdAt: Date;
    updatedAt: Date;
}

interface IReportMessageModel extends Model<IReportMessage> { }

const reportMessageSchema = new Schema<IReportMessage>(
    {
        chatSession: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ReportChatSession",
            required: [true, "Report chat oturumu zorunludur"],
            index: true,
        },
        sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: { type: String, enum: ["user", "assistant"], required: true },
        content: { type: String, required: [true, "Mesaj içeriği zorunludur"], trim: true },

        contextTitle: { type: String },
        contextJson: { type: Schema.Types.Mixed },

        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    },
    {
        timestamps: true,
        collection: "reportmessages",
    }
);

reportMessageSchema.index({ chatSession: 1, createdAt: 1 });

export const ReportMessage = mongoose.model<IReportMessage, IReportMessageModel>(
    "ReportMessage",
    reportMessageSchema
);
