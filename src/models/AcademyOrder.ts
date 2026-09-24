import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAcademyOrderItem {
  id: string;
  name: string;
  price: number; // KDV dahil satış fiyatı
  basePrice?: number; // KDV hariç taban fiyat
  taxAmount?: number; // KDV tutarı
  quantity: number;
}

export interface IAcademyCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  identityNumber: string; // T.C. Kimlik No
}

export interface IAcademyInvoice {
  type: "individual" | "corporate";
  companyName?: string;
  taxOffice?: string;
  taxNumber?: string;
  city: string;
  district: string;
  address: string;
}

export interface IAcademyOrder extends Document {
  orderId: string; // ALH-XXXXXX
  customer: IAcademyCustomer;
  invoice: IAcademyInvoice;
  items: IAcademyOrderItem[];
  subtotal: number;
  taxAmount: number;
  discount: number;
  totalAmount: number; // in TRY
  currency: string;
  paymentMethod: "paytr_card" | "bank_transfer";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  paytrToken?: string;
  paytrTransactionId?: string;
  ipAddress: string;
  paidAt?: Date;
  meta?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const academyOrderItemSchema = new Schema<IAcademyOrderItem>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  basePrice: { type: Number },
  taxAmount: { type: Number },
  quantity: { type: Number, default: 1 },
});

const academyCustomerSchema = new Schema<IAcademyCustomer>({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true },
  identityNumber: { type: String, required: true, trim: true },
});

const academyInvoiceSchema = new Schema<IAcademyInvoice>({
  type: { type: String, enum: ["individual", "corporate"], default: "individual" },
  companyName: { type: String, trim: true },
  taxOffice: { type: String, trim: true },
  taxNumber: { type: String, trim: true },
  city: { type: String, required: true, trim: true },
  district: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
});

const academyOrderSchema = new Schema<IAcademyOrder>(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    customer: { type: academyCustomerSchema, required: true },
    invoice: { type: academyInvoiceSchema, required: true },
    items: { type: [academyOrderItemSchema], required: true },
    subtotal: { type: Number, required: true },
    taxAmount: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    currency: { type: String, default: "TRY" },
    paymentMethod: {
      type: String,
      enum: ["paytr_card", "bank_transfer"],
      default: "paytr_card",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    paytrToken: { type: String },
    paytrTransactionId: { type: String },
    ipAddress: { type: String, required: true },
    paidAt: { type: Date },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const AcademyOrder: Model<IAcademyOrder> = mongoose.model<IAcademyOrder>(
  "AcademyOrder",
  academyOrderSchema
);
