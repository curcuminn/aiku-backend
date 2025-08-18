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
exports.LinkedInService = void 0;
// @ts-nocheck - Typescript hatalarını görmezden gel
const axios_1 = __importDefault(require("axios"));
const geminiService_1 = require("./geminiService");
const dotenv_1 = __importDefault(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const logger_1 = __importDefault(require("../config/logger"));
dotenv_1.default.config();
class LinkedInService {
    constructor() {
        if (!process.env.LINKEDIN_CLIENT_ID ||
            !process.env.LINKEDIN_CLIENT_SECRET ||
            !process.env.LINKEDIN_REDIRECT_URI) {
            throw new Error("LinkedIn API bilgileri eksik. Lütfen .env dosyasını kontrol edin.");
        }
        this.clientId = process.env.LINKEDIN_CLIENT_ID;
        this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
        this.redirectUri = process.env.LINKEDIN_REDIRECT_URI;
        this.geminiService = new geminiService_1.GeminiService();
        console.log("LinkedIn Service initialized with:", {
            clientId: this.clientId,
            redirectUri: this.redirectUri,
        });
    }
    getAuthUrl() {
        const scopes = ["openid", "profile", "email"];
        const scope = scopes.join(",");
        const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${this.clientId}&redirect_uri=${this.redirectUri}&scope=${scope}&state=random123`;
        console.log("Generated LinkedIn Auth URL:", authUrl);
        return authUrl;
    }
    getAccessToken(code) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            try {
                console.log("Getting access token with code:", code);
                console.log("Using client ID:", this.clientId);
                console.log("Using redirect URI:", this.redirectUri);
                const response = yield axios_1.default.post("https://www.linkedin.com/oauth/v2/accessToken", null, {
                    params: {
                        grant_type: "authorization_code",
                        code,
                        client_id: this.clientId,
                        client_secret: this.clientSecret,
                        redirect_uri: this.redirectUri,
                    },
                });
                console.log("Access token response:", response.data);
                return response.data.access_token;
            }
            catch (error) {
                console.error("LinkedIn access token error:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                logger_1.default.error(`LinkedIn access token alınamadı: ${((_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error_description) || error.message}`);
                throw new Error(`LinkedIn access token alınamadı: ${((_e = (_d = error.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.error_description) || error.message}`);
            }
        });
    }
    getProfile(accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            try {
                console.log("Getting user profile with access token");
                const userInfoResponse = yield axios_1.default.get("https://api.linkedin.com/v2/userinfo", {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                console.log("User info response:", userInfoResponse.data);
                return this.formatLinkedInData(userInfoResponse.data);
            }
            catch (error) {
                console.error("LinkedIn profile error:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                logger_1.default.error(`LinkedIn profil bilgileri alınamadı: ${((_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error_description) || error.message}`);
                throw new Error(`LinkedIn profil bilgileri alınamadı: ${((_e = (_d = error.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.error_description) || error.message}`);
            }
        });
    }
    formatLinkedInData(userInfo) {
        return {
            name: userInfo.name || `${userInfo.given_name} ${userInfo.family_name}`,
            email: userInfo.email,
            picture: userInfo.picture,
            locale: userInfo.locale,
            emailVerified: true,
            linkedinUrl: `https://www.linkedin.com/in/${userInfo.sub}/`,
        };
    }
    handleAuth(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
            try {
                console.log("LinkedInService.handleAuth başladı:", data);
                // Supabase'den kullanıcı bilgilerini al
                const user = data.user;
                if (!user || !user.email) {
                    throw new Error("Kullanıcı bilgileri alınamadı");
                }
                console.log("LinkedIn kullanıcı bilgileri:", user);
                // Metadata'dan bilgileri çıkart
                const firstName = ((_a = user.user_metadata) === null || _a === void 0 ? void 0 : _a.given_name) || ((_c = (_b = user.user_metadata) === null || _b === void 0 ? void 0 : _b.name) === null || _c === void 0 ? void 0 : _c.split(' ')[0]) || '';
                const lastName = ((_d = user.user_metadata) === null || _d === void 0 ? void 0 : _d.family_name) ||
                    (((_f = (_e = user.user_metadata) === null || _e === void 0 ? void 0 : _e.name) === null || _f === void 0 ? void 0 : _f.split(' ').length) > 1 ?
                        (_h = (_g = user.user_metadata) === null || _g === void 0 ? void 0 : _g.name) === null || _h === void 0 ? void 0 : _h.split(' ').slice(1).join(' ') : '');
                const profilePhoto = ((_j = user.user_metadata) === null || _j === void 0 ? void 0 : _j.picture) || ((_k = user.user_metadata) === null || _k === void 0 ? void 0 : _k.avatar_url) || '';
                const linkedinId = ((_l = user.user_metadata) === null || _l === void 0 ? void 0 : _l.sub) || ((_m = user.user_metadata) === null || _m === void 0 ? void 0 : _m.id) || '';
                console.log("Ayıklanmış kullanıcı bilgileri:", {
                    firstName, lastName, profilePhoto, linkedinId
                });
                // MongoDB'de kullanıcıyı ara veya oluştur
                let mongoUser = yield User_1.User.findOne({ email: user.email });
                if (!mongoUser) {
                    console.log("LinkedIn: Yeni kullanıcı oluşturuluyor:", user.email);
                    // Yeni kullanıcı oluştur
                    mongoUser = new User_1.User({
                        firstName: firstName,
                        lastName: lastName,
                        email: user.email,
                        profilePhoto: profilePhoto,
                        supabaseId: user.id,
                        linkedinId: linkedinId,
                        emailVerified: true,
                        authProvider: "linkedin_oidc",
                        lastLogin: new Date(),
                        linkedin: linkedinId ? `https://www.linkedin.com/in/${linkedinId}/` : undefined
                    });
                    yield mongoUser.save();
                    console.log("LinkedIn: Yeni kullanıcı kaydedildi, ID:", mongoUser._id);
                }
                else {
                    console.log("LinkedIn: Mevcut kullanıcı güncelleniyor, ID:", mongoUser._id);
                    // Kullanıcıyı güncelle
                    mongoUser.lastLogin = new Date();
                    mongoUser.supabaseId = user.id;
                    // LinkedIn ID güncellemesi
                    if (linkedinId && !mongoUser.linkedinId) {
                        mongoUser.linkedinId = linkedinId;
                    }
                    // Diğer eksik bilgileri güncelle
                    if (!mongoUser.firstName && firstName) {
                        mongoUser.firstName = firstName;
                    }
                    if (!mongoUser.lastName && lastName) {
                        mongoUser.lastName = lastName;
                    }
                    if (!mongoUser.profilePhoto && profilePhoto) {
                        mongoUser.profilePhoto = profilePhoto;
                    }
                    if (!mongoUser.linkedin && linkedinId) {
                        mongoUser.linkedin = `https://www.linkedin.com/in/${linkedinId}/`;
                    }
                    yield mongoUser.save();
                    console.log("LinkedIn: Kullanıcı güncellendi:", mongoUser.email);
                }
                // JWT token oluştur
                // @ts-expect-error - JWT sign işleminde expiresIn tipindeki uyumsuzluğu görmezden geliyoruz
                const token = jsonwebtoken_1.default.sign({
                    id: mongoUser._id.toString(),
                    linkedinId: linkedinId
                }, process.env.JWT_SECRET || "your-super-secret-jwt-key", {
                    expiresIn: process.env.JWT_EXPIRE || "24h"
                });
                console.log("LinkedIn: JWT token oluşturuldu");
                return {
                    user: {
                        id: mongoUser._id.toString(),
                        firstName: mongoUser.firstName,
                        lastName: mongoUser.lastName,
                        email: mongoUser.email,
                        profilePhoto: mongoUser.profilePhoto,
                        emailVerified: mongoUser.emailVerified,
                        linkedinId: mongoUser.linkedinId,
                        authProvider: "linkedin_oidc"
                    },
                    token
                };
            }
            catch (error) {
                console.error("LinkedIn auth error:", error);
                logger_1.default.error(`LinkedIn ile giriş işlemi başarısız: ${error.message}`);
                throw new Error("LinkedIn ile giriş işlemi başarısız: " + error.message);
            }
        });
    }
    // LinkedIn profil bilgilerini gerekirse doğrudan alma
    getLinkedInUserInfo(accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const response = yield axios_1.default.get('https://api.linkedin.com/v2/userinfo', {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                return response.data;
            }
            catch (error) {
                console.error("LinkedIn userinfo error:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                logger_1.default.error(`LinkedIn kullanıcı bilgileri alınamadı: ${((_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error_description) || error.message}`);
                throw new Error("LinkedIn kullanıcı bilgileri alınamadı");
            }
        });
    }
}
exports.LinkedInService = LinkedInService;
