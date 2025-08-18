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
exports.Company = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const companySchema = new mongoose_1.Schema({
    companyName: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true,
        unique: true,
    },
    companyLogo: {
        type: String,
        trim: true,
    },
    companyVideo: {
        type: String,
        trim: true,
    },
    companyType: {
        type: String,
        required: [true, 'Company type is required'],
        enum: ['Business', 'Investor', 'Startup'],
    },
    openForInvestments: {
        type: Boolean,
        default: false,
    },
    businessModel: {
        type: String,
        required: [true, 'Business model is required'],
        enum: ['B2B', 'B2C', 'B2G', 'C2C', 'C2B', 'D2C', 'B2B2C'],
    },
    companySector: {
        type: [String],
        default: [],
    },
    companySize: {
        type: String,
        required: [true, 'Company size is required'],
        enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10001+'],
    },
    fundSize: {
        type: String,
        trim: true,
    },
    businessScale: {
        type: String,
        required: true,
        enum: ['Micro', 'Small', 'Medium', 'Large'],
    },
    companyEmail: {
        type: String,
        // required: [true, 'Company email is required'],
        trim: true,
        lowercase: true,
        unique: true,
        sparse: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.[A-Za-z]{2,})+$/, 'Please enter a valid email address'],
    },
    companyPhone: {
        type: String,
        // required: [true, 'Company phone is required'],
        trim: true,
        sparse: true,
        match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number'],
        set: (value) => value.replace(/[^\d+]/g, ''),
    },
    countryCode: {
        type: String,
        // required: [true, 'Country code is required'],
        trim: true,
    },
    localPhone: {
        type: String,
        // required: [true, 'Local phone number is required'],
        trim: true,
    },
    companyInfo: {
        type: String,
        required: [true, 'Company information is required'],
        trim: true,
    },
    detailedDescription: {
        type: String,
        required: [true, 'Detailed description is required'],
        trim: true,
    },
    companyWebsite: {
        type: String,
        trim: true,
        match: [
            /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})(\.[a-z]{2,})?(\/[\w.-]*)*\/?$/i,
            'Please enter a valid URL',
        ]
    },
    companyAddress: {
        type: String,
        required: [true, 'Company address is required'],
        trim: true,
    },
    companyLinkedIn: {
        type: String,
        trim: true,
        match: [
            /^(https?:\/\/)?([\w]+\.)?linkedin\.com\/(company|in)\/[\w-]+\/?$/,
            'Please enter a valid LinkedIn URL',
        ],
    },
    companyTwitter: {
        type: String,
        trim: true,
        match: [
            /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/[A-Za-z0-9_]+\/?$/,
            'Please enter a valid Twitter URL',
        ],
    },
    companyInstagram: {
        type: String,
        trim: true,
        match: [
            /^(https?:\/\/)?(www\.)?instagram\.com\/[A-Za-z0-9_.]+\/?$/,
            'Please enter a valid Instagram URL',
        ],
    },
    interestedSectors: {
        type: [String],
        default: [],
    },
    isIncorporated: {
        type: Boolean,
        default: false,
    },
    isHighlighted: {
        type: Boolean,
        default: false,
    },
    acceptMessages: {
        type: Boolean,
        default: true,
    },
    numberOfInvestments: {
        type: Number,
        default: 0,
        min: [0, 'Number of investments cannot be negative'],
    },
    numberOfExits: {
        type: Number,
        default: 0,
        min: [0, 'Number of exits cannot be negative'],
    },
    user: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        required: [true, 'User ID is required'],
        ref: 'User',
    },
    connectedHub: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Hub',
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// **Slug oluşturma (companyName üzerinden)**
companySchema.virtual('slug').get(function () {
    return this.companyName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
});
exports.Company = mongoose_1.default.model('Company', companySchema);
