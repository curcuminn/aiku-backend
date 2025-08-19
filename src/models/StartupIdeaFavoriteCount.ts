import mongoose, { Document, Model, Schema } from "mongoose";

export interface IStartupIdeaFavoriteCount extends Document {
  ideaId: string; // frontend'deki idea.id (string tutuyoruz)
  count: number; // favori sayısı
  createdAt: Date;
  updatedAt: Date;
}

interface IStartupIdeaFavoriteCountModel
  extends Model<IStartupIdeaFavoriteCount> {
  getCount(ideaId: string): Promise<number>;
  increment(ideaId: string, delta?: number): Promise<IStartupIdeaFavoriteCount>;
  setCount(ideaId: string, value: number): Promise<IStartupIdeaFavoriteCount>;
}

const StartupIdeaFavoriteCountSchema = new Schema<IStartupIdeaFavoriteCount>(
  {
    ideaId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    count: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Negatif sayıyı engelle (her ihtimale karşı)
StartupIdeaFavoriteCountSchema.pre("save", function (next) {
  if (this.count < 0) this.count = 0;
  next();
});

// ---- Statics ----
StartupIdeaFavoriteCountSchema.statics.getCount = async function (
  ideaId: string
) {
  const doc = await this.findOne({ ideaId }).lean().exec();
  return doc?.count ?? 0;
};

StartupIdeaFavoriteCountSchema.statics.increment = function (
  ideaId: string,
  delta = 1
) {
  if (!Number.isFinite(delta)) delta = 1;
  return this.findOneAndUpdate(
    { ideaId },
    { $inc: { count: delta }, $setOnInsert: { ideaId } },
    { upsert: true, new: true }
  ).exec();
};

StartupIdeaFavoriteCountSchema.statics.setCount = function (
  ideaId: string,
  value: number
) {
  const v = Math.max(0, Math.floor(value));
  return this.findOneAndUpdate(
    { ideaId },
    { $set: { count: v }, $setOnInsert: { ideaId } },
    { upsert: true, new: true }
  ).exec();
};

export const StartupIdeaFavoriteCount: IStartupIdeaFavoriteCountModel =
  mongoose.model<IStartupIdeaFavoriteCount, IStartupIdeaFavoriteCountModel>(
    "StartupIdeaFavoriteCount",
    StartupIdeaFavoriteCountSchema
  );
