// services/geminiReportService.ts
// @ts-nocheck
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { reportDataStore } from "./reportDataStore";

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export type ReportChatInput = {
    reportId: string;
    ideaId?: string;
    sectionKey?: string;
    jsonPath?: string;
    context?: { title?: string; raw?: any; flat?: string };
    question: string;
    history: Array<{ role: "user" | "assistant"; content: string }>;
};

export type ReportChatOutput = {
    answer: string;
    citations?: string[];
};

const SYSTEM_INSTRUCTIONS_EN = `
ROLE
- You are "Report Assistant". Answer ONLY using the provided report context. If the answer is not present, say: "Not present in this section."

SCOPE & GROUNDING
- Ground your answer strictly on the given JSON section. Do not infer, hallucinate, or use external knowledge.
- If the user's question refers to other parts, answer only if they exist in the provided context.

STYLE
- Provide a compact but substantive explanation in 3–6 sentences by synthesizing and interpreting the evidence (cause → effect, why it matters, potential implications).
- If the context is a bullet list, convert it into flowing prose. Do NOT return bullets unless the user explicitly asks.
- Prefer connective words (because/therefore/as a result). End with a short “Takeaway:” sentence when appropriate.
- Do NOT append any "Sources:" or similar footer text in the answer body.

SAFETY
- Do not output personal data or sensitive info. No external links.
- If context is empty, respond: "Not present in this section."
`;

const DEBUG = process.env.REPORTCHAT_DEBUG === "1";
const AUTOROUTE = process.env.REPORTCHAT_AUTOROUTE !== "0"; // default ON

function mapHistoryToGemini(history: any[]) {
    return history.map(h => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: String(h.content || "") }]
    }));
}

// ---- Evidence seçici (extractive) yardımcılar ----

function normalizeSectionToLines(data: any): string[] {
    if (data == null) return [];

    if (typeof data === "string") {
        return data.split(/\n+/).map(s => s.trim()).filter(Boolean);
    }

    if (Array.isArray(data)) {
        // [{ title, description }] gibi dizileri akıcı satıra çevir
        if (data.length && typeof data[0] === "object" && (data[0].title || data[0].description)) {
            return data.map((it: any) => {
                const t = (it.title || "").toString().trim();
                const d = (it.description || "").toString().trim();
                return t && d ? `${t}: ${d}` : (t || d);
            }).filter(Boolean);
        }
        // string dizi
        return data.map(x => (typeof x === "string" ? x : JSON.stringify(x)));
    }

    if (typeof data === "object") {
        return Object.entries(data).map(([k, v]) =>
            `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`
        );
    }

    return [String(data)];
}

const SYNONYM_BUCKETS: Record<string, string[]> = {
    risks: ["risk", "risks", "problem", "problems", "pitfall", "challenge", "downside", "weakness", "limitation", "threat",
        "risk", "riskler", "problem", "problemler", "engel", "zorluk", "dezavantaj", "tehdit", "sınırlama"],
    revenue: ["revenue", "pricing", "price", "subscription", "monetiz", "fee", "tier", "add-on", "license", "licensing",
        "gelir", "gelir modeli", "fiyat", "fiyatlandırma", "abonelik", "ücret", "katman", "eklenti", "lisans", "monetizasyon"],
    advantage: ["advantage", "advantages", "benefit", "benefits", "value", "uvp", "moat", "differentiation", "strength", "pros",
        "avantaj", "artı", "fayda", "değer önerisi", "uvp", "farklılaşma", "güçlü yön", "üstünlük"]
};

function scoreLine(line: string, q: string) {
    const L = line.toLowerCase();
    const Q = q.toLowerCase();
    let s = 0;

    // ortak kelime örtüşmesi
    for (const w of Q.split(/\W+/)) {
        if (w && L.includes(w)) s += 2;
    }
    // kavram kovaları
    for (const words of Object.values(SYNONYM_BUCKETS)) {
        if (words.some(w => Q.includes(w)) && words.some(w => L.includes(w))) {
            s += 3;
        }
    }
    // sayılar (rakamlar) bonus
    if (/\d/.test(L)) s += 1;

    return s;
}

function buildEvidenceFromSection(q: string, data: any, max = 8): string {
    const lines = normalizeSectionToLines(data);
    if (!lines.length) return "";

    const scored = lines
        .map(l => [l, scoreLine(l, q)] as const)
        .sort((a, b) => b[1] - a[1]);

    const topHasSignal = (scored[0]?.[1] ?? 0) > 0;
    const top = topHasSignal
        ? scored.slice(0, max).map(([l]) => l)
        : lines.slice(0, Math.min(max, lines.length));

    return top.join("\n");
}

// Bölüm boş mu?
function isEmptySection(s: any): boolean {
    if (s == null) return true;
    if (typeof s === "string") return s.trim().length === 0;
    if (Array.isArray(s)) return s.length === 0;
    if (typeof s === "object") return Object.keys(s).length === 0;
    return false;
}

// ---- Soru → bölüm yönlendirme (auto-route) ----
const SECTION_GUESSERS: Array<{ key: string; re: RegExp }> = [
    { key: "risks_and_mitigations", re: /(risk|risks|problem|problems|pitfall|challenge|downside|weakness|limitation|threat|riskler|problem(ler)?|zorluk|engel|dezavantaj|tehdit)/i },
    { key: "revenue_stream", re: /(revenue|pricing|price|subscription|monetiz|fee|tier|add[-\s]?on|license|licensing|gelir|fiyat(landırma)?|abonelik|ücret|lisans|monetizasyon)/i },
    { key: "unique_value_proposition", re: /(advantage|advantages|benefit|benefits|value prop|uvp|moat|differentiation|strength|pros|değer önerisi|avantaj|farklılaşma|güçlü yön)/i },
    { key: "customer_segments", re: /(customer|user|segment|audience|buyer|persona|müşteri|kullanıcı|segment|hedef kitle|alıcı|persona)/i },
    { key: "channels", re: /(channel|distribution|go[-\s]?to[-\s]?market|gtm|acquisition|kanal|dağıtım|pazara gidiş|edinim)/i },
    { key: "proposed_solution", re: /(solution|how.*solve|approach|implementation|çözüm|yaklaşım|nasıl çözer|uygulama)/i },
    { key: "key_metrics", re: /(kpi|metric|okr|measure|track|north star|metrik|kpi|okr|ölçüm|takip)/i },
    { key: "cost_structure", re: /(cost|expense|opex|capex|cac|cogs|maliyet|gider|opex|capex|cac|cogs)/i },
    { key: "total_accessable_market", re: /(tam|market size|total addressable market|toplam adreslenebilir pazar|pazar büyüklüğü)/i },
    { key: "target_market", re: /(target market|sam|som|segment size|who.*target|hedef pazar|sam|som|segment büyüklüğü|kimi hedef)/i },
    { key: "investment", re: /(investment|capex|funding|cost to build|yatırım|sermaye|maliyet)/i },
    { key: "pre_market_value", re: /(valuation|pre[-\s]?market value|pre[-\s]?money|değerleme|piyasa öncesi değer|pre[-\s]?money)/i },
];

const ALL_KEYS = [
    "total_accessable_market", "target_market", "investment", "pre_market_value",
    "customer_segments", "problem", "unique_value_proposition", "proposed_solution",
    "channels", "revenue_stream", "cost_structure", "key_metrics",
    "unfair_advantage", "risks_and_mitigations", "description", "industry", "title"
];

function collectAllSections(reportId: string, ideaId: string) {
    const bag: Record<string, any> = {};
    for (const k of ALL_KEYS) {
        try {
            const { section } = reportDataStore.getSection(reportId, ideaId, k);
            if (!isEmptySection(section)) bag[k] = section;
        } catch { /* yoksay */ }
    }
    return bag;
}

function buildEvidenceFromAll(q: string, all: Record<string, any>, max = 8): string {
    const labeled: Array<{ line: string; score: number }> = [];
    for (const [k, v] of Object.entries(all)) {
        for (const line of normalizeSectionToLines(v)) {
            const L = `[${k}] ${line}`;
            labeled.push({ line: L, score: scoreLine(L, q) });
        }
    }
    if (!labeled.length) return "";
    labeled.sort((a, b) => b.score - a.score);
    const pick = labeled[0].score > 0 ? labeled.slice(0, max) : labeled.slice(0, Math.min(max, labeled.length));
    return pick.map(x => x.line).join("\n");
}

function guessSectionFromQuestion(q: string): string | null {
    if (!q) return null;
    for (const g of SECTION_GUESSERS) {
        if (g.re.test(q)) return g.key;
    }
    return null;
}

export class GeminiReportService {
    private chatModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    private async answerWithEvidenceOnly({ ideaId, reportId, jsonPath, evidence, question, history }) {
        const wantsList = /(^|\s)(list|bullets?|bullet points?|enumerate|number(ed)?\s+list|itemize|give me a list|show.*list)(\s|$)/i
            .test(question || "");
        const wantsExplain = /\b(explain|why|how|so what|implication|interpret|comment|analysis|elaborate)\b/i
            .test(question || "");

        const userPrompt = [
            `You are answering for section: (any).`,
            `QUESTION:\n${question}`,
            `\nEVIDENCE (verbatim lines from the report; authoritative):\n${evidence}`,
            `\nEXTRACTIVE MODE:\n- Use ONLY the EVIDENCE lines above. Do not introduce new facts.`,
            wantsList
                ? `- The user explicitly asked for a list. Return a concise bullet list (max 6 bullets).`
                : `- Return 3–6 sentences that synthesize and interpret the evidence in prose (no bullets). Explain why it matters and likely implications. End with one sentence starting with "Takeaway:" if appropriate.`,
            `- No footers or sources.`,
        ].join("\n");

        const chat = this.chatModel.startChat({
            systemInstruction: { role: "system", parts: [{ text: SYSTEM_INSTRUCTIONS_EN }] },
            history: mapHistoryToGemini(history),
            generationConfig: { temperature: 0.3, topK: 40, topP: 0.9, maxOutputTokens: 768 },
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
            ]
        });

        try {
            const result = await chat.sendMessage(userPrompt);
            const rawResp = await result.response;
            let text = typeof rawResp?.text === "function" ? rawResp.text() : "Not present in this section.";
            text = text.replace(/\n?Sources:.*$/gis, "").trim();
            return {
                answer: text,
                citations: [
                    ...(ideaId ? [`idea:${ideaId}`] : []),
                    ...(jsonPath ? [`path:${jsonPath}`] : []),
                ]
            };
        } catch {
            return {
                answer: "The model could not generate a response right now. Please try again.",
                citations: [
                    ...(ideaId ? [`idea:${ideaId}`] : []),
                    ...(jsonPath ? [`path:${jsonPath}`] : []),
                ]
            };
        }
    }

    async chatReport(input: ReportChatInput): Promise<ReportChatOutput> {
        console.log("[ReportChat] input.head =", {
            reportId: input.reportId,
            ideaId: input.ideaId,
            sectionKey: input.sectionKey,
            hasContextRaw: typeof input?.context?.raw !== "undefined",
            qLen: input.question?.length
        });
        console.log("[ReportChat] DEBUG:", DEBUG ? "ON" : "OFF", "AUTOROUTE:", AUTOROUTE ? "ON" : "OFF");

        const {
            reportId,
            ideaId,
            sectionKey,
            jsonPath,
            context,
            question,
            history = []
        } = input;

        // Gemini kuralı: ilk kayıt "user" olmalı → baştaki assistant'ları kırp
        const safeHistory = [...history];
        while (safeHistory.length && safeHistory[0].role !== "user") safeHistory.shift();

        // --- Bölüm seçimi (auto-route) ---
        let usedSectionKey = sectionKey;
        let sectionData = context?.raw;

        const wantsAny = !usedSectionKey || usedSectionKey === "__any__";

        if (AUTOROUTE) {
            const guessed = guessSectionFromQuestion(question || "");
            if (!wantsAny && guessed && guessed !== sectionKey && ideaId) {
                try {
                    const { section } = reportDataStore.getSection(reportId, ideaId, guessed);
                    if (!isEmptySection(section)) {
                        usedSectionKey = guessed;
                        sectionData = section;
                        console.log(`[ReportChat] auto-routed to section '${usedSectionKey}'`);
                    }
                } catch (e: any) {
                    console.warn("[ReportChat] auto-route fetch failed:", e?.message);
                }
            }
        }

        // Eğer hâlâ context yoksa, istenen/ilk bölümden dosyadan çek
        if (sectionData == null || isEmptySection(sectionData)) {
            try {
                if (wantsAny) {
                    // 1) sorudan bölüm tahmini
                    const g = guessSectionFromQuestion(question || "");
                    if (g) {
                        usedSectionKey = g;
                        sectionData = reportDataStore.getSection(reportId, ideaId, g).section;
                    } else {
                        // 2) tahmin yoksa tüm bölümlerden kanıt derle
                        const all = collectAllSections(reportId, ideaId);
                        const evidence = buildEvidenceFromAll(question || "", all, 8);
                        if (!evidence) {
                            return { answer: "Not present in this section.", citations: [`idea:${ideaId}`] };
                        }
                        // aşağıdaki “Prompt” aşamasında evidence kullanılıyor; bu yüzden
                        // sectionData’yı boş bırakıp doğrudan evidence ile devam edeceğiz.
                        // Bunun için küçük bir bayrak set edelim:
                        return await this.answerWithEvidenceOnly({
                            ideaId, reportId, jsonPath,
                            evidence, question, history: safeHistory
                        });
                    }
                } else {
                    const { section } = reportDataStore.getSection(reportId, ideaId, usedSectionKey);
                    sectionData = section;
                }
            } catch (e) {
                console.error("[ReportChat] getSection error:", e?.message);
                return {
                    answer: "Not present in this section.",
                    citations: [
                        ...(ideaId ? [`idea:${ideaId}`] : []),
                        ...(usedSectionKey ? [`section:${usedSectionKey}`] : []),
                        ...(jsonPath ? [`path:${jsonPath}`] : []),
                    ],
                };
            }
        }



        // ---- Extractive evidence üret ----
        const evidence = buildEvidenceFromSection(question, sectionData, 8);
        if (!evidence) {
            console.warn("[ReportChat] evidence empty");
            return {
                answer: "Not present in this section.",
                citations: [
                    ...(ideaId ? [`idea:${ideaId}`] : []),
                    ...(usedSectionKey ? [`section:${usedSectionKey}`] : []),
                    ...(jsonPath ? [`path:${jsonPath}`] : []),
                ]
            };
        }

        if (DEBUG) {
            return {
                answer: `Mock OK ✅\nSection: ${usedSectionKey || "-"}\nQ: ${question}\n\nEVIDENCE:\n${evidence}`,
                citations: [
                    ...(ideaId ? [`idea:${ideaId}`] : []),
                    ...(usedSectionKey ? [`section:${usedSectionKey}`] : []),
                    ...(jsonPath ? [`path:${jsonPath}`] : []),
                ]
            };
        }

        // Liste mi istiyor? (what are / list / risks / advantages ...)
        const wantsList = /(^|\s)(what are|which|list|pros|advantages|benefits|risks|problems)(\s|$)/i.test(
            question || ""
        );

        // ---- Prompt (extractive) ----
        const userPrompt = [
            `You are answering for section: ${usedSectionKey || "(unknown)"}.`,
            `QUESTION:\n${question}`,
            `\nEVIDENCE (verbatim lines from the report section; authoritative):\n${evidence}`,
            `\nEXTRACTIVE MODE:\n- Use ONLY the EVIDENCE lines above. Do not introduce new facts.`,
            `- Keep any numbers/ranges exactly as written.`,
            wantsList
                ? `- The user is asking for a list. Return a concise bullet list of the most relevant items (max 6 bullets).`
                : `- Return 2–4 full sentences that synthesize the evidence.`,
            `- No footers or sources.`,
        ].join("\n");

        console.log("[ReportChat] calling Gemini...");
        const chat = this.chatModel.startChat({
            systemInstruction: { role: "system", parts: [{ text: SYSTEM_INSTRUCTIONS_EN }] },
            history: mapHistoryToGemini(safeHistory),
            generationConfig: {
                temperature: 0.3,
                topK: 40,
                topP: 0.9,
                maxOutputTokens: 768
            },
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
            ]
        });

        try {
            const result = await chat.sendMessage(userPrompt);
            const rawResp = await result.response;
            let text = typeof rawResp?.text === "function" ? rawResp.text() : "Not present in this section.";
            // Olası “Sources” satırlarını sil ve temizle
            text = text.replace(/\n?Sources:.*$/gis, "").trim();
            console.log("[ReportChat] Gemini ok, text.len =", text?.length || 0);

            return {
                answer: text,
                citations: [
                    ...(ideaId ? [`idea:${ideaId}`] : []),
                    ...(usedSectionKey ? [`section:${usedSectionKey}`] : []),
                    ...(jsonPath ? [`path:${jsonPath}`] : []),
                ]
            };
        } catch (err: any) {
            console.error("[ReportChat] Gemini call error:", err?.message);
            return {
                answer: "The model could not generate a response right now. Please try again.",
                citations: [
                    ...(ideaId ? [`idea:${ideaId}`] : []),
                    ...(usedSectionKey ? [`section:${usedSectionKey}`] : []),
                    ...(jsonPath ? [`path:${jsonPath}`] : []),
                ]
            };
        }
    }
}
