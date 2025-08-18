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
exports.mailgunService = void 0;
const form_data_1 = __importDefault(require("form-data"));
const mailgun_js_1 = __importDefault(require("mailgun.js"));
class MailgunService {
    constructor() {
        console.log("Mailgun service initializing...");
        const apiKey = process.env.MAILGUN_API_KEY || "";
        console.log("API Key:", apiKey);
        console.log("Domain:", process.env.MAILGUN_DOMAIN);
        const mailgun = new mailgun_js_1.default(form_data_1.default);
        this.mailgun = mailgun.client({
            username: "api",
            key: apiKey,
            url: "https://api.eu.mailgun.net",
        });
        this.domain = process.env.MAILGUN_DOMAIN || "";
        console.log("Mailgun service initialized with domain:", this.domain);
    }
    sendVerificationEmail(email, verificationToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const verificationUrl = `${process.env.API_URL}/api/auth/verify-email/${verificationToken}`;
            console.log("Preparing to send verification email to:", email);
            console.log("Verification URL:", verificationUrl);
            const messageData = {
                from: `AIKU AI Platform <info@${this.domain}>`,
                to: email,
                subject: "Email Verification",
                template: "email-verification",
                "t:variables": JSON.stringify({
                    verification_url: verificationUrl,
                }),
            };
            console.log("Email message data:", messageData);
            try {
                console.log("Attempting to send email via Mailgun...");
                console.log("Using domain:", this.domain);
                console.log("Using API key:", this.mailgun.apiKey ? "Present" : "Missing");
                const result = yield this.mailgun.messages.create(this.domain, messageData);
                console.log("Email sent successfully:", result);
            }
            catch (error) {
                console.error("E-posta gönderimi başarısız:", error);
                console.error("Error details:", {
                    domain: this.domain,
                    apiKey: this.mailgun.apiKey ? "Present" : "Missing",
                    error: error instanceof Error ? error.message : error,
                });
                throw new Error("E-posta gönderimi başarısız oldu");
            }
        });
    }
    sendEmailChangeCode(newEmail, changeCode, expiresInMinutes) {
        return __awaiter(this, void 0, void 0, function* () {
            const messageData = {
                from: `AIKU AI Platform <info@${this.domain}>`,
                to: newEmail,
                subject: "Your Verification Code",
                template: "email-change-verification",
                "t:variables": JSON.stringify({
                    code: changeCode,
                    expires: expiresInMinutes
                })
            };
            try {
                yield this.mailgun.messages.create(this.domain, messageData);
            }
            catch (err) {
                console.error("Failed to send change-code email:", err);
                throw new Error("Could not send verification code");
            }
        });
    }
    sendChatNotification(to, variables) {
        return __awaiter(this, void 0, void 0, function* () {
            const messageData = {
                from: `AIKU AI Platform <info@${this.domain}>`,
                to,
                subject: "AIKU · You have a new chat message",
                template: "chat-notification",
                "t:variables": JSON.stringify(variables)
            };
            yield this.mailgun.messages.create(this.domain, messageData);
        });
    }
}
exports.mailgunService = new MailgunService();
