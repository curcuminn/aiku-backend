"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Investment = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const CompletedInvestmentSchema = new mongoose_1.Schema({
    amount: {
        type: Number,
        default: 0,
        min: [0, 'Completed investment cannot be negative'],
    },
    description: {
        type: String,
        trim: true,
        default: '',
    },
}, { _id: false });
const investmentSchema = new mongoose_1.Schema({
    investmentTitle: {
        type: String,
        required: [true, 'Investment title is required'],
        trim: true,
    },
    companyName: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true,
    },
    companyId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        required: [true, 'Company ID is required'],
        ref: 'Company',
    },
    productName: {
        type: String,
        trim: true,
    },
    productId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Product',
    },
    targetedInvestment: {
        type: Number,
        required: [true, 'Targeted investment is required'],
        min: [0, 'Targeted investment cannot be negative'],
    },
    minimumTicket: {
        type: Number,
        required: [true, 'Minimum ticket is required'],
        min: [0, 'Minimum ticket cannot be negative'],
    },
    deadline: {
        type: Date,
        required: [true, 'Deadline is required'],
    },
    investmentType: {
        type: String,
        required: [true, 'Investment type is required'],
        trim: true,
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
    },
    logo: {
        type: String,
        trim: true,
    },
    completedInvestments: {
        type: [CompletedInvestmentSchema],
        default: [],
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Virtual: okunabilir format
investmentSchema
    .virtual('completedInvestmentDisplay')
    .get(function () {
    return this.completedInvestments
        .map(ci => `${ci.amount.toLocaleString()} – ${ci.description}`)
        .join(', ');
});
// Slug virtual’ı
investmentSchema.virtual('slug').get(function () {
    const prodPart = this.productName ? ` ${this.productName}` : '';
    return `${this.companyName}${prodPart}`
        .toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '');
});
exports.Investment = mongoose_1.default.model('Investment', investmentSchema);
