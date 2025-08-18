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
exports.Complaint = exports.ComplaintType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Complaint türleri
var ComplaintType;
(function (ComplaintType) {
    ComplaintType["INAPPROPRIATE_CONTENT"] = "inappropriate_content";
    ComplaintType["HARASSMENT"] = "harassment";
    ComplaintType["SPAM"] = "spam";
    ComplaintType["FALSE_INFORMATION"] = "false_information";
    ComplaintType["INTELLECTUAL_PROPERTY"] = "intellectual_property";
    ComplaintType["OTHER"] = "other";
})(ComplaintType || (exports.ComplaintType = ComplaintType = {}));
const complaintSchema = new mongoose_1.Schema({
    message: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Message',
        required: [true, 'Message is required'],
        index: true,
    },
    reporter: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Reporter is required'],
        index: true,
    },
    complaintType: {
        type: String,
        enum: Object.values(ComplaintType),
        required: [true, 'Complaint type is required'],
    },
    description: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'resolved', 'rejected'],
        default: 'pending',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});
// Şikayetlerin mesaj ve oluşturulma tarihine göre sıralanması için index
complaintSchema.index({ message: 1, createdAt: 1 });
// Şikayetlerin kullanıcıya göre sıralanması için index
complaintSchema.index({ reporter: 1, createdAt: 1 });
exports.Complaint = mongoose_1.default.model('Complaint', complaintSchema);
