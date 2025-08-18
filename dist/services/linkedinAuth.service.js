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
const supabaseClient_1 = __importDefault(require("../config/supabaseClient"));
const dotenv_1 = __importDefault(require("dotenv"));
const axios_1 = __importDefault(require("axios"));
const logger_1 = __importDefault(require("../config/logger"));
dotenv_1.default.config();
class LinkedInAuthService {
    // LinkedIn ile oturum açma URL'sini oluştur
    getLinkedInAuthURL(platform) {
        let redirectURI;
        // Platform'a göre redirect URI'yi belirle
        if (platform === 'mobile') {
            redirectURI = 'com.aikumobile://auth/linkedin-callback';
            console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Auth] Mobil platform için redirect URI:', redirectURI);
        }
        else {
            redirectURI = process.env.LINKEDIN_REDIRECT_URI || 'https://aikuaiplatform.com/auth/social-callback';
            console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Auth] Web platform için redirect URI:', redirectURI);
        }
        const linkedInClientId = process.env.LINKEDIN_CLIENT_ID;
        if (!linkedInClientId) {
            console.log('\x1b[31m%s\x1b[0m', '🔴 [LinkedIn Auth] HATA: LinkedIn Client ID bulunamadı!');
            throw new Error('LinkedIn Client ID is not defined in environment variables');
        }
        const scopes = ['openid', 'profile', 'email'].join(' ');
        const state = Math.random().toString(36).substring(2, 15); // Rastgele state değeri
        const authURL = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${linkedInClientId}&redirect_uri=${encodeURIComponent(redirectURI)}&state=${state}&scope=${encodeURIComponent(scopes)}`;
        console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn Auth] Oluşturulan Auth URL:', authURL);
        return authURL;
    }
    // LinkedIn'den gelen auth code ile token alma
    getTokenFromCode(code) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Token] Token alınmaya çalışılıyor. Code:', code);
                const redirectURI = process.env.LINKEDIN_REDIRECT_URI || 'https://aikuaiplatform.com/auth/social-callback';
                const linkedInClientId = process.env.LINKEDIN_CLIENT_ID;
                const linkedInClientSecret = process.env.LINKEDIN_CLIENT_SECRET;
                if (!linkedInClientId || !linkedInClientSecret) {
                    console.log('\x1b[31m%s\x1b[0m', '🔴 [LinkedIn Token] HATA: Client ID veya Secret bulunamadı!');
                    throw new Error('LinkedIn Client ID or Client Secret is not defined in environment variables');
                }
                console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Token] Token isteği gönderiliyor...');
                // LinkedIn token URL'sine istek gönder
                const response = yield axios_1.default.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
                    params: {
                        grant_type: 'authorization_code',
                        code,
                        redirect_uri: redirectURI,
                        client_id: linkedInClientId,
                        client_secret: linkedInClientSecret
                    },
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn Token] Token başarıyla alındı:', response.data);
                return response.data;
            }
            catch (error) {
                console.log('\x1b[31m%s\x1b[0m', '🔴 [LinkedIn Token] HATA:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                logger_1.default.error(`LinkedIn token alınamadı linkedinAuth.Service: ${error}`);
                throw error;
            }
        });
    }
    // LinkedIn token ile kullanıcı bilgilerini alma
    getUserInfo(accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn User] Kullanıcı bilgileri alınıyor...');
                // Kullanıcı profil bilgilerini al
                const profileResponse = yield axios_1.default.get('https://api.linkedin.com/v2/me', {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'cache-control': 'no-cache',
                        'X-Restli-Protocol-Version': '2.0.0'
                    }
                });
                console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn User] Profil bilgileri alındı:', profileResponse.data);
                // Kullanıcı email bilgisini al
                const emailResponse = yield axios_1.default.get('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'cache-control': 'no-cache',
                        'X-Restli-Protocol-Version': '2.0.0'
                    }
                });
                console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn User] Email bilgisi alındı:', emailResponse.data);
                const profileData = profileResponse.data;
                const emailData = emailResponse.data;
                const email = ((_c = (_b = (_a = emailData.elements) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b['handle~']) === null || _c === void 0 ? void 0 : _c.emailAddress) || '';
                const userData = {
                    id: profileData.id,
                    firstName: profileData.localizedFirstName,
                    lastName: profileData.localizedLastName,
                    email
                };
                console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn User] Birleştirilmiş kullanıcı bilgileri:', userData);
                return userData;
            }
            catch (error) {
                console.log('\x1b[31m%s\x1b[0m', '🔴 [LinkedIn User] HATA:', ((_d = error.response) === null || _d === void 0 ? void 0 : _d.data) || error.message);
                logger_1.default.error(`LinkedIn kullanıcı bilgileri alınamadı linkedinAuth.Service: ${error}`);
                throw error;
            }
        });
    }
    // Kullanıcıyı Supabase'e kaydet veya güncelle
    signInWithLinkedIn(userInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id, email, firstName, lastName } = userInfo;
                if (!email) {
                    throw new Error('Email alınamadı. Kullanıcı kayıt edilemez.');
                }
                // Önce email ile Supabase'de kullanıcı kontrolü yap
                const { data: existingUser, error: searchError } = yield supabaseClient_1.default
                    .from('users')
                    .select('*')
                    .eq('email', email)
                    .maybeSingle();
                if (searchError) {
                    console.error('Kullanıcı arama hatası:', searchError);
                    throw searchError;
                }
                if (existingUser) {
                    // Kullanıcı varsa, LinkedIn bilgilerini güncelle
                    const { data: updatedUser, error: updateError } = yield supabaseClient_1.default
                        .from('users')
                        .update({
                        linkedin_id: id,
                        updated_at: new Date().toISOString()
                    })
                        .eq('email', email)
                        .select()
                        .single();
                    if (updateError) {
                        console.error('Kullanıcı güncelleme hatası:', updateError);
                        logger_1.default.error(`Kullanıcı güncelleme hatası linkedinAuth.Service: ${updateError}`);
                        throw updateError;
                    }
                    return updatedUser;
                }
                else {
                    // Kullanıcı yoksa, yeni kullanıcı oluştur
                    const { data: newUser, error: insertError } = yield supabaseClient_1.default
                        .from('users')
                        .insert([
                        {
                            email,
                            first_name: firstName,
                            last_name: lastName,
                            linkedin_id: id,
                            auth_provider: 'linkedin',
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }
                    ])
                        .select()
                        .single();
                    if (insertError) {
                        console.error('Kullanıcı oluşturma hatası:', insertError);
                        logger_1.default.error(`Kullanıcı oluşturma hatası linkedinAuth.Service: ${insertError}`);
                        throw insertError;
                    }
                    return newUser;
                }
            }
            catch (error) {
                console.error('LinkedIn kullanıcısı Supabase\'e kaydedilemedi:', error);
                logger_1.default.error(`LinkedIn kullanıcısı Supabase\'e kaydedilemedi linkedinAuth.Service: ${error}`);
                throw error;
            }
        });
    }
}
exports.default = new LinkedInAuthService();
