import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  accountStatus: 'active' | 'deleted' | 'deactivated';
  phone?: string;
  countryCode?: string;
  localPhone?: string;
  title?: string;
  location?: string;
  profileInfo?: string;
  profilePhoto?: string;
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  authProvider?: string;
  googleId?: string;
  linkedinId?: string; // LinkedIn ID 
  supabaseId?: string; // Supabase ID
  supabaseMetadata?: any; // Supabase meta verileri
  emailVerified: boolean;
  emailVerificationToken: string;
  emailVerificationExpires: Date;
  newEmail?: string;
  emailChangeToken?: string;
  emailChangeExpires?: Date;
  locale?: {
    country: string;
    language: string;
  };
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  favoriteUsers?: mongoose.Types.ObjectId[];
  favoriteCompanies?: mongoose.Types.ObjectId[];
  favoriteProducts?: mongoose.Types.ObjectId[];
  // Abonelik özellikleri
  subscriptionStatus?: 'active' | 'pending' | 'trial' | 'cancelled' | 'expired';
  subscriptionStartDate?: Date;
  trialEndsAt?: Date;
  subscriptionPlan?: 'startup' | 'business' | 'investor' | null;
  isAngelInvestor?: boolean;
  subscriptionPeriod?: 'monthly' | 'yearly';
  subscriptionAmount?: number;
  autoRenewal?: boolean;
  paymentMethod?: 'creditCard' | 'bankTransfer' | 'other';
  savedCardId?: mongoose.Types.ObjectId;
  lastPaymentDate?: Date;
  nextPaymentDate?: Date;
  paymentHistory?: Array<{
    amount: number;
    date: Date;
    status: 'success' | 'failed' | 'pending';
    transactionId?: string;
    description?: string;
    type?: string;
    plan?: 'startup' | 'business' | 'investor';
    period?: 'monthly' | 'yearly';
    cardDetails?: {
      cardType?: string;
      cardMaskedNumber?: string;
      cardHolderName?: string;
      expireMonth?: string;
      expireYear?: string;
    }
  }>;
  billingAddress?: string;
  vatNumber?: string;
  isSubscriptionActive?: boolean;
  role?: 'user' | 'admin' | 'editor';
  isOnline?: boolean;
  lastSeen?: Date;
  acceptChatNotification: boolean;
  matchPassword(enteredPassword: string): Promise<boolean>;
  checkAutoRenewal(): Promise<boolean>;
  processPayment(): Promise<{ success: boolean, transactionId?: string, error?: string, cardDetails?: any }>;
}

interface IUserModel extends Model<IUser> {
  // Model statik metodları buraya eklenebilir
  //test
}

const userSchema = new Schema<IUser>({
  firstName: {
    type: String,
    required: [true, 'İsim alanı zorunludur'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Soyisim alanı zorunludur'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email alanı zorunludur'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.[A-Za-z]{2,})+$/, 'Lütfen geçerli bir email adresi giriniz']
  },
  password: {
    type: String,
    required: function () {
      return !this.authProvider;
    },
    minlength: [6, 'Şifre en az 6 karakter olmalıdır'],
    select: false
  },
  accountStatus: {
    type: String,
    enum: ['active', 'deleted', 'deactivated'],
    default: 'active',
    required: true
  },
  phone: {
    type: String,
    trim: true
  },
  countryCode: {
    type: String,
    trim: true,
  },
  localPhone: {
    type: String,
    trim: true
  },
  title: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  profileInfo: {
    type: String,
    trim: true
  },
  profilePhoto: {
    type: String,
    default: null
  },
  linkedin: {
    type: String,
    trim: true
  },
  instagram: {
    type: String,
    trim: true
  },
  facebook: {
    type: String,
    trim: true
  },
  twitter: {
    type: String,
    trim: true
  },
  authProvider: {
    type: String,
    enum: ['email', 'linkedin', 'google', 'supabase'],
    default: 'email'
  },
  googleId: {
    type: String,
    sparse: true,
    index: true
  },
  linkedinId: { // LinkedIn için ID alanı
    type: String,
    sparse: true,
    index: true
  },
  supabaseId: { // Supabase için ID alanı
    type: String,
    sparse: true,
    index: true
  },
  supabaseMetadata: { // Supabase meta verileri için alan
    type: Schema.Types.Mixed
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  emailVerificationExpires: {
    type: Date,
    select: false
  },
  newEmail: {
    type: String,
    trim: true,
    lowercase: true,
    select: false,
    match: [
      /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/,
      'Please enter a valid email'
    ]
    // unique: true,
    // sparse: true
  },
  emailChangeToken: {
    type: String,
    select: false
  },
  emailChangeExpires: {
    type: Date,
    select: false
  },
  locale: {
    country: { type: String },
    language: { type: String }
  },
  lastLogin: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  favoriteUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  favoriteCompanies: [{
    type: Schema.Types.ObjectId,
    ref: 'Company',
    default: []
  }],
  favoriteProducts: [{
    type: Schema.Types.ObjectId,
    ref: 'Product',
    default: []
  }],
  // Abonelik özellikleri
  subscriptionStatus: {
    type: String,
    enum: ['active', 'pending', 'trial', 'cancelled', 'expired']
  },
  subscriptionStartDate: {
    type: Date
  },
  trialEndsAt: {
    type: Date
  },
  subscriptionPlan: {
    type: String,
    enum: [null, 'startup', 'business', 'investor'],
    default: null,
  },
  isAngelInvestor: {
    type: Boolean,
    default: false,
  },
  subscriptionPeriod: {
    type: String,
    enum: ['monthly', 'yearly']
  },
  subscriptionAmount: {
    type: Number,
    min: 0
  },
  autoRenewal: {
    type: Boolean,
    default: true
  },
  paymentMethod: {
    type: String,
    enum: ['creditCard', 'bankTransfer', 'iap', 'other'],
    default: 'creditCard'
  },
  savedCardId: {
    type: mongoose.Types.ObjectId,
    ref: 'SavedCard',
  },
  lastPaymentDate: {
    type: Date,
  },
  nextPaymentDate: {
    type: Date,
  },
  paymentHistory: {
    type: [
      {
        amount: Number,
        date: Date,
        platform: String, // 'APP_STORE', 'PLAY_STORE', 'WEB'
        iapTransactionId: String, // IAP transaction ID'si
        status: String,
        transactionId: String,
        description: String,
        type: {
          type: String,
          enum: ['subscription', 'oneTime', 'refund'],
          default: 'subscription'
        },
        plan: {
          type: String,
          enum: ['startup', 'business', 'investor']
        },
        period: {
          type: String,
          enum: ['monthly', 'yearly']
        },
        cardDetails: {
          cardType: String,
          cardMaskedNumber: String,
          cardHolderName: String,
          expireMonth: String,
          expireYear: String
        }
      }
    ],
    default: []
  },
  billingAddress: {
    type: String,
  },
  vatNumber: {
    type: String,
  },
  isSubscriptionActive: {
    type: Boolean,
    default: false
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  acceptChatNotification: {
    type: Boolean,
    default: true  // kullanıcı varsayılan olarak chat mail bildirimlerini kabul etsin
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'editor'],
    default: 'user'
  },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userSchema.index({ emailChangeToken: 1 }, { sparse: true });
userSchema.index({ emailChangeExpires: 1 }, { expireAfterSeconds: 0 });

userSchema.pre('save', async function (this: IUser, next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Abonelik planı startup olarak ayarlandığında 6 aylık deneme süresi tanımlanır
userSchema.pre('save', function (next) {
  // Abonelik planı değiştiyse ve plan startup ise
  if (this.isModified('subscriptionPlan') && this.subscriptionPlan === 'startup') {
    // İlk abonelik olup olmadığını kontrol et (periyod fark etmeksizin)
    const isFirstSubscription = !this.paymentHistory || this.paymentHistory.length === 0;

    // Sadece ilk abonelik ise trial süresi ver (aylık veya yıllık)
    if (isFirstSubscription) {
      this.subscriptionStatus = 'trial';
      const trialEndDate = new Date();
      trialEndDate.setMonth(trialEndDate.getMonth() + 6);
      this.trialEndsAt = trialEndDate;
      this.nextPaymentDate = trialEndDate; // Deneme süresi bitiminde otomatik çekim
    } else if (this.subscriptionStatus !== 'active') {
      // İlk abonelik değilse ve aktif değilse, aktif olarak işaretle
      this.subscriptionStatus = 'active';
      // Trial süresini kaldır
      this.trialEndsAt = undefined;
    }
  }
  next();
});

// Abonelik planına göre fiyatı belirleyen fonksiyon
userSchema.pre('save', function (next) {
  if (this.isModified('subscriptionPlan') || this.isModified('subscriptionPeriod')) {
    // Aylık fiyatlar
    const monthlyPrices = {
      startup: 49,
      business: 75,
      investor: 99
    };

    // Yıllık fiyatlar (%10 indirimli)
    const yearlyPrices = {
      startup: 529,
      business: 810,
      investor: 1069
    };

    if (this.subscriptionPlan && this.subscriptionPeriod) {
      if (this.subscriptionPeriod === 'monthly') {
        this.subscriptionAmount = monthlyPrices[this.subscriptionPlan];
      } else {
        this.subscriptionAmount = yearlyPrices[this.subscriptionPlan];
      }
    }
  }
  next();
});

// Abonelik durumunu güncelleyen hook
userSchema.pre('save', function (next) {
  // subscriptionStatus değiştiğinde isSubscriptionActive değerini güncelle
  if (this.isModified('subscriptionStatus')) {
    const status = this.subscriptionStatus ? this.subscriptionStatus.trim() : '';
    this.isSubscriptionActive = (status === 'active' || status === 'trial');
    console.log(`isSubscriptionActive updated to: ${this.isSubscriptionActive} based on status: ${status}`);
  }
  next();
});

// Deneme süresinin sonunda otomatik ödemeyi kontrol eden metod
userSchema.methods.checkAutoRenewal = async function () {
  // Deneme süresinin bitişi kontrol edilir
  if (this.subscriptionStatus === 'trial' && this.trialEndsAt && new Date() >= this.trialEndsAt) {
    // Eğer otomatik yenileme açıksa ve kayıtlı bir kart varsa
    if (this.autoRenewal && this.savedCardId) {
      try {
        // Ödeme işlemini gerçekleştir
        const paymentResult = await this.processPayment();

        if (paymentResult.success) {
          // Ödeme başarılı ise aboneliği aktifleştir
          this.subscriptionStatus = 'active';
          // Bir sonraki ödeme tarihini güncelle
          const nextBillingDate = new Date();
          if (this.subscriptionPeriod === 'monthly') {
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
          } else {
            nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
          }
          this.nextPaymentDate = nextBillingDate;

          // Ödeme geçmişine ekle
          if (!this.paymentHistory) this.paymentHistory = [];
          this.paymentHistory.push({
            amount: this.subscriptionAmount || 0,
            date: new Date(),
            status: 'success',
            transactionId: paymentResult.transactionId,
            description: 'Otomatik abonelik yenileme',
            type: 'subscription',
            plan: this.subscriptionPlan,
            period: this.subscriptionPeriod,
            cardDetails: paymentResult.cardDetails
          });

          this.lastPaymentDate = new Date();
          await this.save();
          return true;
        } else {
          // Ödeme başarısız ise durumu güncelle
          if (!this.paymentHistory) this.paymentHistory = [];
          this.paymentHistory.push({
            amount: this.subscriptionAmount || 0,
            date: new Date(),
            status: 'failed',
            description: 'Otomatik abonelik yenileme başarısız',
            type: 'subscription',
            plan: this.subscriptionPlan,
            period: this.subscriptionPeriod
          });
          this.subscriptionStatus = 'expired';
          await this.save();
          return false;
        }
      } catch (error) {
        console.error('Otomatik ödeme işleminde hata:', error);
        if (!this.paymentHistory) this.paymentHistory = [];
        this.paymentHistory.push({
          amount: this.subscriptionAmount || 0,
          date: new Date(),
          status: 'failed',
          description: 'Otomatik abonelik yenileme hata nedeniyle başarısız',
          type: 'subscription',
          plan: this.subscriptionPlan,
          period: this.subscriptionPeriod
        });
        await this.save();
        return false;
      }
    } else {
      // Otomatik yenileme kapalı veya kayıtlı kart yoksa
      this.subscriptionStatus = 'expired';
      await this.save();
      return false;
    }
  }
  return true;
};

// Ödeme işlemini gerçekleştiren metod
userSchema.methods.processPayment = async function () {
  try {
    if (!this.savedCardId) {
      throw new Error('Kayıtlı kart bulunamadı');
    }

    // Kart bilgisini al
    const savedCard = await mongoose.model('SavedCard').findById(this.savedCardId);
    if (!savedCard) {
      throw new Error('Geçerli kart bilgisi bulunamadı');
    }

    // Param POS API ile ödeme işlemi
    // Not: Bu kısım gerçek entegrasyonda doldurulmalıdır
    const ParamPosService = await import('../services/ParamPosService');
    const paymentService = ParamPosService.default;

    const paymentResult = await paymentService.payment({
      amount: this.subscriptionAmount || 0,
      cardNumber: savedCard.cardMaskedNumber.replace(/X/g, '0'), // Örnek amaçlı
      cardHolderName: savedCard.cardHolderName,
      expireMonth: savedCard.cardExpireMonth,
      expireYear: savedCard.cardExpireYear,
      cvc: '000', // Örnek amaçlı
      installment: 1,
      is3D: false,
      userId: this._id.toString()
    });

    const cardDetails = {
      cardType: savedCard.cardType,
      cardMaskedNumber: savedCard.cardMaskedNumber,
      cardHolderName: savedCard.cardHolderName,
      expireMonth: savedCard.cardExpireMonth,
      expireYear: savedCard.cardExpireYear
    };

    return {
      success: true,
      transactionId: paymentResult.TURKPOS_RETVAL_Islem_ID || Date.now().toString(),
      cardDetails
    };
  } catch (error: any) {
    console.error('Ödeme işleminde hata:', error);
    return { success: false, error: error.message };
  }
};

userSchema.methods.matchPassword = async function (this: IUser, enteredPassword: string): Promise<boolean> {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Aboneliğin aktif olup olmadığını kontrol eden virtual alan
userSchema.virtual('isSubscriptionActiveVirtual').get(function (this: IUser) {
  // Debug için değerleri yazdır
  console.log('isSubscriptionActive calculation:');
  console.log('subscriptionStatus:', this.subscriptionStatus);
  console.log('isEqual active:', this.subscriptionStatus === 'active');
  console.log('isEqual trial:', this.subscriptionStatus === 'trial');

  // Abonelik durumu 'active' veya 'trial' ise aktif kabul edilir
  // String değerlerini temizleyerek kontrol et
  const status = this.subscriptionStatus ? this.subscriptionStatus.trim() : '';
  return status === 'active' || status === 'trial';
});

export const User = mongoose.model<IUser, IUserModel>('User', userSchema);
