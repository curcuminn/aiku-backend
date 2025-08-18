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
exports.MetaConversionsService = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
class MetaConversionsService {
    constructor() {
        this.apiVersion = process.env.META_API_VERSION || "v23.0";
        this.datasetId = process.env.META_DATASET_ID || "1389532595173830"; // fallback given by user
        this.accessToken = process.env.META_ACCESS_TOKEN;
        this.leadEventSourceDefault = process.env.META_LEAD_EVENT_SOURCE || "Aloha CRM";
    }
    get endpoint() {
        return `https://graph.facebook.com/${this.apiVersion}/${this.datasetId}/events`;
    }
    sha256(input) {
        return crypto_1.default.createHash("sha256").update(input).digest("hex");
    }
    normalizeEmail(email) {
        if (!email)
            return undefined;
        return email.trim().toLowerCase();
    }
    normalizePhone(phone) {
        if (!phone)
            return undefined;
        const digits = phone.replace(/[^0-9+]/g, "");
        return digits;
    }
    buildUserData(user) {
        const result = {};
        const normalizedEmail = this.normalizeEmail(user.email);
        const normalizedPhone = this.normalizePhone(user.phone);
        if (normalizedEmail) {
            result.em = [this.sha256(normalizedEmail)];
        }
        if (normalizedPhone) {
            result.ph = [this.sha256(normalizedPhone)];
        }
        if (user.leadId) {
            result.lead_id = user.leadId;
        }
        if (user.fbp)
            result.fbp = user.fbp;
        if (user.fbc)
            result.fbc = user.fbc;
        if (user.clientIpAddress)
            result.client_ip_address = user.clientIpAddress;
        if (user.clientUserAgent)
            result.client_user_agent = user.clientUserAgent;
        return result;
    }
    sendEvent(input) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.accessToken) {
                console.warn("[MetaConversions] META_ACCESS_TOKEN is not set. Event not sent.");
                return { skipped: true };
            }
            const payload = {
                data: [
                    {
                        action_source: input.actionSource || "system_generated",
                        custom_data: {
                            event_source: input.eventSource || "crm",
                            lead_event_source: input.leadEventSource || this.leadEventSourceDefault,
                        },
                        event_name: input.eventName,
                        event_time: input.eventTime || Math.floor(Date.now() / 1000),
                        user_data: this.buildUserData(input.user),
                    },
                ],
                // test_event_code: input.testEventCode, // only include if provided
            };
            if (input.testEventCode) {
                payload.test_event_code = input.testEventCode;
            }
            const params = { access_token: this.accessToken };
            const res = yield axios_1.default.post(this.endpoint, payload, { params });
            return res.data;
        });
    }
}
exports.MetaConversionsService = MetaConversionsService;
exports.default = MetaConversionsService;
