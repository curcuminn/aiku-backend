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
exports.getSessionMessages = exports.listSessions = void 0;
const AcademicChatSession_1 = require("../models/AcademicChatSession");
const AcademicMessage_1 = require("../models/AcademicMessage");
const listSessions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { page = "1", limit = "20", q = "", userId, participantName } = req.query;
    const filter = {};
    if (userId)
        filter.user = userId;
    if (q) {
        filter.$or = [
            { title: { $regex: q, $options: "i" } },
            { participantName: { $regex: q, $options: "i" } },
            { lastMessageText: { $regex: q, $options: "i" } },
        ];
    }
    if (participantName) {
        filter.participantName = { $regex: participantName, $options: "i" };
    }
    const sessions = yield AcademicChatSession_1.AcademicChatSession.find(filter)
        .sort({ updatedAt: -1 })
        .skip((+page - 1) * +limit)
        .limit(+limit)
        .lean();
    const total = yield AcademicChatSession_1.AcademicChatSession.countDocuments(filter);
    res.json({ success: true, data: sessions, total });
});
exports.listSessions = listSessions;
const getSessionMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { after, limit = "50" } = req.query;
    const filter = { chatSession: id };
    if (after)
        filter._id = { $gt: after };
    const messages = yield AcademicMessage_1.AcademicMessage.find(filter)
        .sort({ createdAt: 1 })
        .limit(+limit)
        .lean();
    res.json({ success: true, data: messages });
});
exports.getSessionMessages = getSessionMessages;
