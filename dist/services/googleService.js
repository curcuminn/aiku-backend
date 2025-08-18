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
exports.GoogleService = void 0;
const User_1 = require("../models/User");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const axios_1 = __importDefault(require("axios"));
const logger_1 = __importDefault(require("../config/logger"));
const googleAuth_1 = require("../config/googleAuth");
dotenv_1.default.config();
class GoogleService {
    handleAuth(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                console.log("GoogleService.handleAuth başladı:", data);
                logger_1.default.info("GoogleService.handleAuth başladı", { data });
                let googleUserInfo;
                // idToken varsa doğrudan doğrula
                if (data.user.id_token) {
                    googleUserInfo = yield (0, googleAuth_1.verifyGoogleToken)(data.user.id_token);
                }
                // accessToken varsa Google API'den bilgileri al
                else if (data.user.access_token) {
                    googleUserInfo = yield this.getGoogleUserInfo(data.user.access_token);
                }
                else {
                    throw new Error("Geçerli bir token bulunamadı");
                }
                console.log("Google kullanıcı bilgileri alındı:", googleUserInfo);
                logger_1.default.info("Google kullanıcı bilgileri alındı", { googleUserInfo });
                // MongoDB'de kullanıcıyı ara veya oluştur
                let user = yield User_1.User.findOne({ email: googleUserInfo.email });
                // İsim ve soyisim bilgilerini ayır
                const nameParts = (googleUserInfo.name || '').split(' ');
                const firstName = nameParts[0] || ((_a = googleUserInfo.email) === null || _a === void 0 ? void 0 : _a.split('@')[0]) || '';
                const lastName = nameParts.slice(1).join(' ') || firstName; // Eğer soyisim yoksa ismi kullan
                const userData = {
                    firstName,
                    lastName,
                    email: googleUserInfo.email,
                    emailVerified: true,
                    authProvider: "google",
                    lastLogin: new Date(),
                    googleId: googleUserInfo.uid || googleUserInfo.sub,
                    profilePhoto: googleUserInfo.picture
                };
                if (!user) {
                    user = yield User_1.User.create(userData);
                    console.log("Yeni kullanıcı oluşturuldu:", user._id);
                    logger_1.default.info("Yeni kullanıcı oluşturuldu", { userId: user._id });
                }
                else {
                    const updatedUser = yield User_1.User.findByIdAndUpdate(user._id, { $set: userData }, { new: true });
                    if (!updatedUser) {
                        throw new Error("Kullanıcı güncellenemedi");
                    }
                    user = updatedUser;
                    console.log("Kullanıcı güncellendi:", user._id);
                    logger_1.default.info("Kullanıcı güncellendi", { userId: user._id });
                }
                const jwtOptions = {
                    expiresIn: "90d",
                };
                const token = jsonwebtoken_1.default.sign({
                    id: user._id.toString(),
                    googleId: googleUserInfo.uid || googleUserInfo.sub,
                }, process.env.JWT_SECRET || "your-super-secret-jwt-key", jwtOptions);
                console.log("JWT token oluşturuldu", token);
                logger_1.default.info("JWT token oluşturuldu", { userId: user._id.toString() });
                return {
                    user: {
                        id: user._id.toString(),
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email,
                        profilePhoto: user.profilePhoto,
                        emailVerified: user.emailVerified,
                        googleId: user.googleId,
                    },
                    token,
                };
            }
            catch (error) {
                console.error("Google auth error:", error);
                logger_1.default.error("Google auth error", { error: error.message, stack: error.stack });
                throw new Error("Google ile giriş işlemi başarısız: " + error.message);
            }
        });
    }
    getGoogleUserInfo(accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get("https://www.googleapis.com/oauth2/v3/userinfo", {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });
                return response.data;
            }
            catch (error) {
                console.error("Google user info error:", error);
                logger_1.default.error("Google user info error", { error: error.message });
                throw new Error("Google kullanıcı bilgileri alınamadı: " + error.message);
            }
        });
    }
}
exports.GoogleService = GoogleService;
