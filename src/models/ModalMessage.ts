import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IModalMessage extends Document {
  title: string;
  message: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface IModalMessageModel extends Model<IModalMessage> {}

const ModalMessageSchema = new Schema<IModalMessage>(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    isActive: { type: Boolean, required: true, default: false },
  },
  {
    timestamps: true,
  }
);

ModalMessageSchema.index({ isActive: 1, updatedAt: -1 });

export const ModalMessage: IModalMessageModel = mongoose.model<IModalMessage, IModalMessageModel>(
  'ModalMessage',
  ModalMessageSchema
);


