"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleClient = exports.verifyGoogleToken = void 0;
const google_auth_library_1 = require("google-auth-library");
const dotenv_1 = __importDefault(require("dotenv"));
// Çevre değişkenlerini yükle
dotenv_1.default.config();
// Google OAuth2 istemcisi oluştur
const googleClient = new google_auth_library_1.OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: `${process.env.API_URL}/api/auth/google/callback`
});
exports.googleClient = googleClient;
// Desteklenen client ID'ler
const SUPPORTED_CLIENT_IDS = [
    process.env.GOOGLE_CLIENT_ID, // Web client ID
    '940825068315-erm1cg6j87lqnldrbohmgvfd2ig0cr2f.apps.googleusercontent.com', // iOS client ID
    '940825068315-11h2cdsluv3a8o3t019pf5hq4dnc4721.apps.googleusercontent.com' // Android client ID
];
/**
 * Google ID token'ı doğrular
 * @param idToken Google tarafından verilen ID token
 * @returns Doğrulanmış token bilgisi
 */
const verifyGoogleToken = (idToken) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('[GoogleAuth] ID token doğrulanıyor');
        // NOT: Eğer "Token used too early" hatası alıyorsanız, sistem saatinizi kontrol ediniz.
        // Bu hata genellikle sunucu saatinin Google sunucularıyla senkronize olmamasından kaynaklanır.
        // Saati düzeltmek için:
        // - macOS: sudo ntpdate -u time.apple.com
        // - Linux: sudo ntpdate pool.ntp.org
        // - Windows: "Tarih ve Saat" ayarlarında "Internet Saati" sekmesinden güncelleme yapılabilir.
        const ticket = yield googleClient.verifyIdToken({
            idToken,
            audience: SUPPORTED_CLIENT_IDS
        });
        const payload = ticket.getPayload();
        if (!payload) {
            throw new Error('Token payload bulunamadı');
        }
        console.log('[GoogleAuth] Token doğrulandı:', {
            sub: payload.sub,
            email: payload.email,
            aud: payload.aud // Hangi client ID ile giriş yapıldığını logla
        });
        return {
            uid: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            email_verified: payload.email_verified
        };
    }
    catch (error) {
        console.error('[GoogleAuth] Token doğrulama hatası:', error);
        throw error;
    }
});
exports.verifyGoogleToken = verifyGoogleToken;
