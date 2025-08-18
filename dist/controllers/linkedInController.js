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
exports.LinkedInController = void 0;
const linkedInService_1 = require("../services/linkedInService");
const logger_1 = __importDefault(require("../config/logger"));
class LinkedInController {
    constructor() {
        this.linkedInService = new linkedInService_1.LinkedInService();
    }
    getAuthUrl(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const authUrl = this.linkedInService.getAuthUrl();
                console.log("Generated auth URL:", authUrl);
                res.json({ authUrl });
            }
            catch (error) {
                console.error("Auth URL error:", error);
                res
                    .status(500)
                    .json({
                    error: "LinkedIn auth URL oluşturulamadı",
                    details: error.message,
                });
            }
        });
    }
    handleCallback(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log("Received callback with query:", req.query);
                const { code, state } = req.query;
                if (!code || typeof code !== "string") {
                    throw new Error("Geçersiz auth code");
                }
                console.log("Getting access token for code:", code);
                const accessToken = yield this.linkedInService.getAccessToken(code);
                console.log("Access token received, getting profile data");
                const profileData = yield this.linkedInService.getProfile(accessToken);
                console.log("Profile data received:", profileData);
                const authResult = yield this.linkedInService.handleAuth(profileData);
                res.json({
                    success: true,
                    data: authResult,
                    redirectUrl: `${process.env.CLIENT_URL}/auth/callback?token=${authResult.token}`,
                });
            }
            catch (error) {
                console.error("Callback error:", error);
                logger_1.default.error(`LinkedIn callback hatası: ${error.message}`);
                res.status(500).json({
                    success: false,
                    error: error.message,
                });
            }
        });
    }
}
exports.LinkedInController = LinkedInController;
