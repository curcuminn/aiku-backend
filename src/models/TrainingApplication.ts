import mongoose, { Document, Model, Schema } from "mongoose";

export type ApplicationStatus = "Main" | "Waitlist";

export interface ITrainingApplication extends Document {
    trainingKey: string;
    event: string;
    company: string;
    firstName: string;
    lastName: string;
    title: string;
    email: string;
    status: ApplicationStatus;
    orderInCompany: number;
    createdAt: Date;
    updatedAt: Date;
}

const trainingApplicationSchema = new Schema<ITrainingApplication>(
    {
        trainingKey: { type: String, required: true, trim: true, index: true },
        event: { type: String, required: true, trim: true, index: true },

        company: { type: String, required: true, trim: true, index: true },

        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, required: true, trim: true },
        title: { type: String, required: true, trim: true },
        email: { type: String, required: true, trim: true, lowercase: true },

        status: { type: String, enum: ["Main", "Waitlist"], required: true },
        orderInCompany: { type: Number, required: true },
    },
    { timestamps: true }
);

// Aynı (trainingKey + event + company) içinde aynı email yalnızca 1 başvuru yapabilsin
trainingApplicationSchema.index(
    { trainingKey: 1, event: 1, company: 1, email: 1 },
    { unique: true }
);

trainingApplicationSchema.index({ trainingKey: 1, event: 1, company: 1, status: 1 });
trainingApplicationSchema.index({ trainingKey: 1, event: 1, company: 1, createdAt: 1 });

export const TrainingApplication: Model<ITrainingApplication> =
    mongoose.model<ITrainingApplication>("TrainingApplication", trainingApplicationSchema);
