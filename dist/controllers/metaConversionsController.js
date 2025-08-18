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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendGeneric = exports.sendWhatsAppClick = exports.sendChatStarted = exports.sendKvkkConsent = void 0;
const metaConversionsService_1 = require("../services/metaConversionsService");
const meta = new metaConversionsService_1.MetaConversionsService();
const sendKvkkConsent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, phone, leadId, fbc, fbp } = req.body || {};
        const result = yield meta.sendEvent({
            eventName: "KVKK_Consent_Accepted",
            user: { email, phone, leadId, fbc, fbp, clientIpAddress: req.ip, clientUserAgent: req.headers["user-agent"] },
        });
        res.json({ success: true, result });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
exports.sendKvkkConsent = sendKvkkConsent;
const sendChatStarted = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, phone, leadId, fbc, fbp } = req.body || {};
        const result = yield meta.sendEvent({
            eventName: "AcademicChat_Started",
            user: { email, phone, leadId, fbc, fbp, clientIpAddress: req.ip, clientUserAgent: req.headers["user-agent"] },
        });
        res.json({ success: true, result });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
exports.sendChatStarted = sendChatStarted;
const sendWhatsAppClick = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, phone, leadId, fbc, fbp } = req.body || {};
        const result = yield meta.sendEvent({
            eventName: "WhatsApp_Click",
            user: { email, phone, leadId, fbc, fbp, clientIpAddress: req.ip, clientUserAgent: req.headers["user-agent"] },
        });
        res.json({ success: true, result });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
exports.sendWhatsAppClick = sendWhatsAppClick;
const sendGeneric = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { eventName, testEventCode, leadEventSource, email, phone, leadId, fbc, fbp } = req.body || {};
        if (!eventName)
            return res.status(400).json({ success: false, message: "eventName is required" });
        const result = yield meta.sendEvent({
            eventName,
            testEventCode,
            leadEventSource,
            user: { email, phone, leadId, fbc, fbp, clientIpAddress: req.ip, clientUserAgent: req.headers["user-agent"] },
        });
        res.json({ success: true, result });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
exports.sendGeneric = sendGeneric;
