"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.revenueCatConfig = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.revenueCatConfig = {
    // RevenueCat API anahtarları
    apiKey: process.env.REVENUECAT_API_KEY || '',
    // Webhook secret key (güvenlik için)
    webhookSecret: process.env.REVENUECAT_WEBHOOK_SECRET || '',
    // Platform ayarları
    platforms: {
        ios: {
            appStoreId: process.env.APP_STORE_ID || '',
            bundleId: process.env.IOS_BUNDLE_ID || 'com.aiku.app',
        },
        android: {
            packageName: process.env.ANDROID_PACKAGE_NAME || 'com.aiku.app',
        }
    },
    // Abonelik planları mapping (RevenueCat'teki product ID'ler)
    productMapping: {
        // Startup Plan
        'startup_monthly': {
            revenueCatId: 'startup_monthly',
            plan: 'startup',
            period: 'monthly',
            price: 49,
            trialDays: 180, // 6 ay
        },
        'startup_yearly': {
            revenueCatId: 'startup_yearly',
            plan: 'startup',
            period: 'yearly',
            price: 529,
            trialDays: 180, // 6 ay
        },
        // Business Plan
        'business_monthly': {
            revenueCatId: 'business_monthly',
            plan: 'business',
            period: 'monthly',
            price: 75,
            trialDays: 0,
        },
        'business_yearly': {
            revenueCatId: 'business_yearly',
            plan: 'business',
            period: 'yearly',
            price: 810,
            trialDays: 0,
        },
        // Investor Plan
        'investor_monthly': {
            revenueCatId: 'investor_monthly',
            plan: 'investor',
            period: 'monthly',
            price: 99,
            trialDays: 0,
        },
        'investor_yearly': {
            revenueCatId: 'investor_yearly',
            plan: 'investor',
            period: 'yearly',
            price: 1069,
            trialDays: 0,
        }
    }
};
exports.default = exports.revenueCatConfig;
