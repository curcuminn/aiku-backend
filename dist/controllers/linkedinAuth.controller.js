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
const linkedinAuth_service_1 = __importDefault(require("../services/linkedinAuth.service"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = require("../models/User");
dotenv_1.default.config();
class LinkedInAuthController {
    /**
     * LinkedIn giriş URL'sini döndürür
     */
    getLinkedInAuthURL(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { platform } = req.query;
                console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Controller] URL isteği alındı. Platform:', platform);
                const authURL = linkedinAuth_service_1.default.getLinkedInAuthURL(platform);
                console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn Controller] URL başarıyla oluşturuldu');
                res.status(200).json({ url: authURL });
            }
            catch (error) {
                console.log('\x1b[31m%s\x1b[0m', '🔴 [LinkedIn Controller] URL oluşturma hatası:', error.message);
                res.status(500).json({
                    error: error.message || "LinkedIn auth URL oluşturulurken bir hata oluştu",
                });
            }
        });
    }
    /**
     * LinkedIn kimlik doğrulama geri dönüş işlemini gerçekleştirir
     */
    handleLinkedInCallback(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { code } = req.body;
                console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Callback] İstek alındı. Code:', code);
                if (!code) {
                    console.log('\x1b[31m%s\x1b[0m', '🔴 [LinkedIn Callback] Code parametresi eksik!');
                    res.status(400).json({ error: "Authorization code gereklidir" });
                    return;
                }
                // LinkedIn code'dan token al
                console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Callback] Token alınıyor...');
                const tokenData = yield linkedinAuth_service_1.default.getTokenFromCode(code);
                console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn Callback] Token alındı');
                // Token ile kullanıcı bilgilerini al
                console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Callback] Kullanıcı bilgileri alınıyor...');
                const userInfo = yield linkedinAuth_service_1.default.getUserInfo(tokenData.access_token);
                console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn Callback] Kullanıcı bilgileri alındı');
                // Kullanıcıyı Supabase'e kaydet/güncelle
                console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Callback] Supabase işlemleri başlıyor...');
                const userData = yield linkedinAuth_service_1.default.signInWithLinkedIn(userInfo);
                console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn Callback] Supabase işlemleri tamamlandı');
                // MongoDB'de kullanıcıyı ara veya oluştur
                console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Callback] MongoDB\'de kullanıcı aranıyor...');
                let mongoUser = yield User_1.User.findOne({ email: userInfo.email });
                if (!mongoUser) {
                    // Kullanıcı yoksa MongoDB'de oluştur
                    console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Callback] Yeni MongoDB kullanıcısı oluşturuluyor...');
                    mongoUser = new User_1.User({
                        firstName: userInfo.firstName,
                        lastName: userInfo.lastName,
                        email: userInfo.email,
                        supabaseId: userData.id,
                        linkedinId: userInfo.id,
                        authProvider: "linkedin",
                        emailVerified: true,
                        lastLogin: new Date(),
                        profilePhoto: userInfo.profilePicture || "",
                        linkedin: `https://www.linkedin.com/in/${userInfo.id}/`,
                    });
                    yield mongoUser.save();
                    console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn Callback] Yeni MongoDB kullanıcısı oluşturuldu');
                }
                else {
                    // Kullanıcı varsa bilgilerini güncelle
                    console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Callback] Mevcut MongoDB kullanıcısı güncelleniyor...');
                    mongoUser.supabaseId = userData.id;
                    mongoUser.linkedinId = userInfo.id;
                    mongoUser.lastLogin = new Date();
                    if (!mongoUser.firstName)
                        mongoUser.firstName = userInfo.firstName;
                    if (!mongoUser.lastName)
                        mongoUser.lastName = userInfo.lastName;
                    if (!mongoUser.linkedin)
                        mongoUser.linkedin = `https://www.linkedin.com/in/${userInfo.id}/`;
                    if (userInfo.profilePicture && !mongoUser.profilePhoto)
                        mongoUser.profilePhoto = userInfo.profilePicture;
                    yield mongoUser.save();
                    console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn Callback] MongoDB kullanıcısı güncellendi');
                }
                // JWT token oluştur
                console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Callback] JWT token oluşturuluyor...');
                const jwtSecret = process.env.JWT_SECRET || "your-super-secret-jwt-key";
                const jwtExpire = process.env.JWT_EXPIRE || "24h";
                const jwtOptions = { expiresIn: jwtExpire };
                const token = jsonwebtoken_1.default.sign({ id: mongoUser._id.toString() }, jwtSecret, jwtOptions);
                console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn Callback] JWT token oluşturuldu');
                // Frontend'e kullanıcı bilgilerini ve token'ı gönder
                console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn Callback] İşlem başarıyla tamamlandı');
                res.status(200).json({
                    token,
                    user: {
                        id: mongoUser._id,
                        email: mongoUser.email,
                        firstName: mongoUser.firstName,
                        lastName: mongoUser.lastName,
                        provider: "linkedin",
                        profilePhoto: mongoUser.profilePhoto,
                    },
                });
            }
            catch (error) {
                console.log('\x1b[31m%s\x1b[0m', '🔴 [LinkedIn Callback] HATA:', error.message);
                res.status(500).json({
                    error: error.message || "LinkedIn callback işlenirken bir hata oluştu",
                });
            }
        });
    }
}
exports.default = new LinkedInAuthController();
