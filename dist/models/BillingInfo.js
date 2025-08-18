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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const billingInfoSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Kullanıcı ID alanı zorunludur']
    },
    billingType: {
        type: String,
        enum: ['individual', 'corporate'],
        required: [true, 'Fatura tipi alanı zorunludur']
    },
    // Bireysel fatura bilgileri
    identityNumber: {
        type: String,
        validate: {
            validator: function (value) {
                // Bireysel fatura tipi için TC Kimlik No zorunlu
                return this.billingType !== 'individual' || (!!value && value.length === 11);
            },
            message: 'Bireysel fatura için geçerli bir TC Kimlik Numarası (11 haneli) girilmelidir'
        }
    },
    firstName: {
        type: String,
        validate: {
            validator: function (value) {
                return this.billingType !== 'individual' || !!value;
            },
            message: 'Bireysel fatura için isim alanı zorunludur'
        }
    },
    lastName: {
        type: String,
        validate: {
            validator: function (value) {
                return this.billingType !== 'individual' || !!value;
            },
            message: 'Bireysel fatura için soyisim alanı zorunludur'
        }
    },
    // Kurumsal fatura bilgileri
    companyName: {
        type: String,
        validate: {
            validator: function (value) {
                return this.billingType !== 'corporate' || !!value;
            },
            message: 'Kurumsal fatura için firma adı zorunludur'
        }
    },
    taxNumber: {
        type: String,
        validate: {
            validator: function (value) {
                return this.billingType !== 'corporate' || !!value;
            },
            message: 'Kurumsal fatura için vergi numarası zorunludur'
        }
    },
    taxOffice: {
        type: String,
        validate: {
            validator: function (value) {
                return this.billingType !== 'corporate' || !!value;
            },
            message: 'Kurumsal fatura için vergi dairesi zorunludur'
        }
    },
    // Ortak fatura bilgileri
    address: {
        type: String,
        required: [true, 'Adres alanı zorunludur'],
        trim: true
    },
    city: {
        type: String,
        required: [true, 'Şehir alanı zorunludur'],
        trim: true
    },
    district: {
        type: String,
        trim: true
    },
    zipCode: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Telefon alanı zorunludur'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email alanı zorunludur'],
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.[A-Za-z]{2,})+$/, 'Lütfen geçerli bir email adresi giriniz']
    },
    // Fatura tercihleri
    isDefault: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});
// Kullanıcı için yalnızca bir varsayılan fatura adresi olabilir
billingInfoSchema.pre('save', function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (this.isDefault) {
            // Aynı kullanıcının diğer varsayılan fatura adreslerini false yap
            const BillingInfoModel = mongoose_1.default.model('BillingInfo');
            yield BillingInfoModel.updateMany({ user: this.user, _id: { $ne: this._id }, isDefault: true }, { isDefault: false });
        }
        next();
    });
});
const BillingInfo = mongoose_1.default.model('BillingInfo', billingInfoSchema);
exports.default = BillingInfo;
