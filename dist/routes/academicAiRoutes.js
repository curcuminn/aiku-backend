"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
// routes/academicChat.ts
const express_1 = __importDefault(require("express"));
const geminiAcademicService_1 = require("../services/geminiAcademicService");
const logger_1 = __importDefault(require("../config/logger"));
const AcademicChatSession_1 = require("../models/AcademicChatSession");
const AcademicMessage_1 = require("../models/AcademicMessage");
const ctrl = __importStar(require("../controllers/academicChatController"));
const router = express_1.default.Router();
const metaConversionsService_1 = __importDefault(require("../services/metaConversionsService"));
const meta = new metaConversionsService_1.default();
const geminiAcademicService = new geminiAcademicService_1.GeminiAcademicService();
router.post("/chat", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { message, sessionId = null, name } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, error: "Mesaj gereklidir" });
        }
        let session = sessionId ? yield AcademicChatSession_1.AcademicChatSession.findById(sessionId) : null;
        if (!session) {
            session = yield AcademicChatSession_1.AcademicChatSession.create({
                title: "Akademik Sohbet",
                participantName: name !== null && name !== void 0 ? name : undefined,
                lastMessageText: message,
                lastMessageDate: new Date(),
            });
            // Fire a conversions event for a new academic chat session
            // Non-blocking: do not await
            meta
                .sendEvent({
                eventName: "AcademicChat_Started",
                user: {
                    email: undefined,
                    phone: undefined,
                    clientIpAddress: req.headers["x-real-ip"] || req.ip,
                    clientUserAgent: req.headers["user-agent"],
                },
            })
                .catch(() => { });
        }
        else if (!session.participantName && name) {
            session.participantName = name;
        }
        const pastMessages = yield AcademicMessage_1.AcademicMessage.find({ chatSession: session._id })
            .sort({ createdAt: 1 })
            .limit(25)
            .lean();
        const history = pastMessages.map(m => ({
            role: m.role
                ? (m.role === "assistant" ? "model" : "user")
                : "user",
            content: m.content,
        }));
        while (history.length && history[0].role !== "user") {
            history.shift();
        }
        const userMsg = yield AcademicMessage_1.AcademicMessage.create({
            chatSession: session._id,
            content: message,
            role: "user"
        });
        const chatResponse = yield geminiAcademicService.chatAcademic(message, history);
        const aiMsg = yield AcademicMessage_1.AcademicMessage.create({
            chatSession: session._id,
            content: chatResponse.response,
            role: "assistant"
        });
        session.lastMessageText = chatResponse.response.slice(0, 200);
        session.lastMessageDate = new Date();
        yield session.save();
        res.json({
            success: true,
            sessionId: session._id,
            response: chatResponse.response,
            conversation: [userMsg, aiMsg],
        });
    }
    catch (error) {
        logger_1.default.error("Akademik sohbet hatası:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Bilinmeyen bir sohbet hatası oluştu",
        });
    }
}));
router.get("/sessions", ctrl.listSessions);
router.get("/sessions/:id/messages", ctrl.getSessionMessages);
exports.default = router;
