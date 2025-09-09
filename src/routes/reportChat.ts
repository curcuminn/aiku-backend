// routes/reportChat.ts
import express from "express";
import * as ctrl from "../controllers/reportChatController";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();

router.post("/", ctrl.postReportChat);
router.get("/sessions", ctrl.listReportSessions);
router.get("/sessions/:id/messages", ctrl.getReportSessionMessages);

// ---- HEALTH CHECK (debug) ----
router.get("/health", async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ ok: false, where: "env", msg: "GEMINI_API_KEY missing" });
        }
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const out = await model.generateContent("ping");
        const text = out.response?.text?.() || null;
        res.json({ ok: true, gemini: !!text, text: (text || "").slice(0, 40) });
    } catch (e: any) {
        res.status(500).json({ ok: false, where: "gemini", error: e?.message });
    }
});

export default router;
