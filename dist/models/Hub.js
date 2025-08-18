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
exports.Hub = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const hubSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Hub name is required'],
        unique: true,
        trim: true,
    },
    shortDescription: {
        type: String,
        trim: true,
    },
    detailedDescription: {
        type: String,
        trim: true,
    },
    type: {
        type: String,
        required: [true, 'Hub type is required'],
        trim: true,
    },
    institutionName: {
        type: String,
        trim: true,
    },
    website: {
        type: String,
        trim: true,
        match: [
            /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/\S*)?$/i,
            'Please enter a valid URL',
        ],
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.[A-Za-z]{2,})+$/,
            'Please enter a valid email address',
        ],
    },
    countryCode: {
        type: String,
        trim: true,
    },
    localPhone: {
        type: String,
        trim: true,
        match: [/^\d{4,15}$/, 'Please enter a valid local phone number'],
        set: (value) => value.replace(/[^\d]/g, ''),
    },
    hubPhone: {
        type: String,
        trim: true,
        match: [/^\+?[1-9]\d{1,14}( ?\d{4,15})?$/, 'Please enter a valid full phone number'],
        set: function (_value) {
            var _a, _b;
            // Otomatik üretme: countryCode + localPhone
            const cc = ((_a = this.countryCode) === null || _a === void 0 ? void 0 : _a.trim()) || '';
            const lp = ((_b = this.localPhone) === null || _b === void 0 ? void 0 : _b.trim()) || '';
            return cc && lp ? `${cc} ${lp}` : '';
        },
    },
    address: {
        type: String,
        required: true,
        trim: true,
    },
    logoUrl: {
        type: String,
        trim: true,
    },
    tags: {
        type: [String],
        default: [],
    },
    connectedCompanies: [
        {
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: 'Company',
        },
    ],
    connectedUsers: [
        {
            type: mongoose_1.default.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
    focusSectors: {
        type: [String],
        default: [],
    },
    programs: {
        type: [String],
        default: [],
    },
    facilities: {
        type: [String],
        default: [],
    },
    collaborationLevel: {
        type: String,
        trim: true,
    },
    accessibility: {
        type: [String],
        default: [],
    },
    applicationUrl: {
        type: String,
        trim: true,
        match: [
            /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/\S*)?$/i,
            'Please enter a valid URL',
        ],
    },
    isAcceptingCompanies: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
hubSchema.virtual('slug').get(function () {
    return this.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
});
hubSchema.pre('save', function (next) {
    if (this.countryCode && this.localPhone) {
        this.hubPhone = `${this.countryCode.trim()} ${this.localPhone.trim()}`;
    }
    next();
});
exports.Hub = mongoose_1.default.model('Hub', hubSchema);
