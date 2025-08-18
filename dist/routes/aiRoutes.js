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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const geminiService_1 = require("../services/geminiService");
const powerPointService_1 = require("../services/powerPointService");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const mammoth_1 = __importDefault(require("mammoth"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const textract_1 = __importDefault(require("textract"));
const XLSX = __importStar(require("xlsx"));
const child_process_1 = require("child_process");
const logger_1 = __importDefault(require("../config/logger"));
const router = express_1.default.Router();
const geminiService = new geminiService_1.GeminiService();
const powerPointService = new powerPointService_1.PowerPointService();
const chatSessions = new Map();
// Sohbet oturumları için temizleme (24 saattir aktif olmayan oturumları temizle)
const cleanupChatSessions = () => {
    const now = new Date();
    const MAX_IDLE_TIME = 24 * 60 * 60 * 1000; // 24 saat
    chatSessions.forEach((session, id) => {
        if (now.getTime() - session.lastActivity.getTime() > MAX_IDLE_TIME) {
            chatSessions.delete(id);
        }
    });
};
// Her saat temizlik yap
setInterval(cleanupChatSessions, 60 * 60 * 1000);
// Textract konfigürasyonu
const textractConfig = {
    preserveLineBreaks: true,
    preserveOnlyMultipleLineBreaks: true,
    includeAltText: true,
};
// macOS textutil wrapper
function convertPagesWithTextutil(filePath) {
    return new Promise((resolve, reject) => {
        // Geçici txt dosyası oluştur
        const outputPath = filePath + ".txt";
        // textutil komutu ile pages dosyasını txt'ye çevir
        (0, child_process_1.exec)(`textutil -convert txt -output "${outputPath}" "${filePath}"`, (error) => {
            if (error) {
                reject(new Error("Pages dosyası dönüştürülemedi: " + error.message));
                return;
            }
            // Oluşturulan txt dosyasını oku
            try {
                const content = fs_1.default.readFileSync(outputPath, "utf-8");
                // Geçici txt dosyasını sil
                fs_1.default.unlinkSync(outputPath);
                resolve(content);
            }
            catch (readError) {
                reject(new Error("Dönüştürülen dosya okunamadı: " + readError.message));
            }
        });
    });
}
// Textract promise wrapper
function extractTextFromFile(filePath) {
    return new Promise((resolve, reject) => {
        textract_1.default.fromFileWithPath(filePath, textractConfig, (error, text) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(text);
            }
        });
    });
}
// Desteklenen dosya uzantıları
const SUPPORTED_EXTENSIONS = [
    ".txt",
    ".doc",
    ".docx",
    ".pdf",
    ".pages",
    ".rtf",
    ".odt",
    ".xlsx",
    ".xls",
    ".csv",
    ".pptx",
    ".ppt",
    ".numbers",
    ".key",
];
// Dosya yükleme için multer konfigürasyonu
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        // uploads/documents klasörünü oluştur
        const dir = "uploads/documents";
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path_1.default.extname(file.originalname));
    },
});
const fileFilter = (req, file, cb) => {
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    if (SUPPORTED_EXTENSIONS.includes(ext)) {
        cb(null, true);
    }
    else {
        cb(new Error("Desteklenmeyen dosya formatı. Desteklenen formatlar: " +
            SUPPORTED_EXTENSIONS.join(", ")));
    }
};
const upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
});
// Excel dosyasını text'e çevirme fonksiyonu
function excelToText(filePath) {
    const workbook = XLSX.readFile(filePath);
    let text = "";
    // Tüm sayfaları işle
    workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const sheetText = XLSX.utils.sheet_to_txt(worksheet);
        text += `Sheet: ${sheetName}\n${sheetText}\n\n`;
    });
    return text;
}
// Dosya içeriğini okuma fonksiyonu
function readFileContent(file) {
    return __awaiter(this, void 0, void 0, function* () {
        const ext = path_1.default.extname(file.path).toLowerCase();
        try {
            switch (ext) {
                case ".docx":
                    const result = yield mammoth_1.default.extractRawText({ path: file.path });
                    return result.value;
                case ".pdf":
                    const dataBuffer = fs_1.default.readFileSync(file.path);
                    const pdfData = yield (0, pdf_parse_1.default)(dataBuffer);
                    return pdfData.text;
                case ".xlsx":
                case ".xls":
                case ".numbers":
                    return excelToText(file.path);
                case ".txt":
                case ".csv":
                    return fs_1.default.readFileSync(file.path, "utf-8");
                case ".pages":
                    try {
                        // macOS textutil kullan
                        return yield convertPagesWithTextutil(file.path);
                    }
                    catch (error) {
                        console.error("Pages conversion error:", error);
                        // Eğer textutil başarısız olursa textract'ı dene
                        try {
                            return yield extractTextFromFile(file.path);
                        }
                        catch (textractError) {
                            console.error("Textract error:", textractError);
                            throw new Error(`Pages dosyası okunamadı. Lütfen dosyayı PDF veya Word formatına dönüştürüp tekrar deneyin.`);
                        }
                    }
                // Diğer formatlar için textract kullan
                case ".key":
                case ".rtf":
                case ".odt":
                case ".doc":
                case ".pptx":
                case ".ppt":
                    try {
                        const text = yield extractTextFromFile(file.path);
                        return text;
                    }
                    catch (error) {
                        console.error("Textract error:", error);
                        logger_1.default.error("Textract error:", error);
                        throw new Error(`Dosya içeriği okunamadı: ${ext}`);
                    }
                default:
                    throw new Error(`Desteklenmeyen dosya formatı: ${ext}`);
            }
        }
        finally {
            // Dosyayı sil
            try {
                fs_1.default.unlinkSync(file.path);
            }
            catch (error) {
                console.error("File deletion error:", error);
                logger_1.default.error("File deletion error:", error);
            }
        }
    });
}
// Döküman analizi
router.post("/analyze-document", upload.single("document"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }
        try {
            // Dosya içeriğini oku
            const documentText = yield readFileContent(req.file);
            console.log("File content:", documentText); // Debug için
            // Analiz et
            const formData = yield geminiService.analyzeDocument(documentText);
            res.json(formData);
        }
        catch (error) {
            const err = error;
            console.error("File processing error:", err);
            logger_1.default.error("File processing error:", err);
            res.status(400).json({
                error: "File processing error",
                details: err.message,
            });
        }
    }
    catch (error) {
        console.error("Document analysis error:", error);
        logger_1.default.error("Document analysis error:", error);
        res.status(500).json({ error: "Error during document analysis" });
    }
}));
// Website analizi
router.post("/analyze-website", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: "URL gerekli" });
        }
        const formData = yield geminiService.analyzeWebsite(url);
        res.json(formData);
    }
    catch (error) {
        if (error instanceof geminiService_1.RobotsDisallowedError) {
            res.status(403).json({
                error: "Bu site robots.txt tarafından engellenmiş",
                type: "robots_disallowed",
            });
        }
        else {
            console.error("Website analysis error:", error);
            logger_1.default.error("Website analysis error:", error);
            res.status(500).json({ error: error.message });
        }
    }
}));
// Web sitesinden slayt oluşturma endpoint'i
router.post("/create-presentation", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({
                success: false,
                error: "URL gerekli",
            });
        }
        const presentationData = yield geminiService.createPresentationFromWebsite(url);
        res.json(presentationData);
    }
    catch (error) {
        if (error instanceof geminiService_1.RobotsDisallowedError) {
            res.status(403).json({
                success: false,
                error: "Bu site robots.txt tarafından engellenmiş",
                type: "robots_disallowed",
            });
        }
        else {
            console.error("Presentation creation error:", error);
            logger_1.default.error("Presentation creation error:", error);
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }
}));
// Web sitesinden PowerPoint oluşturma ve indirme endpoint'i
router.post("/create-powerpoint", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("PowerPoint oluşturma isteği alındı");
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({
                success: false,
                error: "URL gerekli",
            });
        }
        // URL formatını kontrol et
        try {
            new URL(url); // Geçerli bir URL değilse hata fırlatır
        }
        catch (urlError) {
            return res.status(400).json({
                success: false,
                error: "Geçersiz URL formatı",
            });
        }
        console.log(`URL alındı: ${url}`);
        try {
            // Önce web sitesinden sunum verileri oluştur
            console.log("Web sitesi taranıyor ve slayt verileri oluşturuluyor...");
            const presentationData = yield geminiService.createPresentationFromWebsite(url);
            if (!presentationData ||
                !presentationData.slides ||
                presentationData.slides.length === 0) {
                return res.status(500).json({
                    success: false,
                    error: "Web sitesinden slayt verileri oluşturulamadı",
                });
            }
            console.log(`${presentationData.slides.length} slayt oluşturuldu, PowerPoint dosyası oluşturuluyor...`);
            // Logo ile ilgili sorunları önlemek için logoUrl'i temizle
            presentationData.logoUrl = null;
            // Her slayttan logo özelliğini kaldır
            presentationData.slides = presentationData.slides.map((slide) => {
                const { logo } = slide, rest = __rest(slide, ["logo"]);
                return rest;
            });
            // Sonra bu verilerden PowerPoint dosyası oluştur
            const pptxFilePath = yield powerPointService.createPowerPoint(presentationData);
            if (!pptxFilePath || !fs_1.default.existsSync(pptxFilePath)) {
                return res.status(500).json({
                    success: false,
                    error: "PowerPoint dosyası oluşturulamadı veya bulunamadı",
                });
            }
            console.log(`PowerPoint oluşturuldu: ${pptxFilePath}`);
            // Dosya adını URL'den türet
            const domain = new URL(url).hostname;
            const fileName = `${domain.replace(/[^a-zA-Z0-9]/g, "_")}_presentation.pptx`;
            // PowerPoint dosyasını indir
            console.log(`Dosya indiriliyor: ${fileName}`);
            console.log(`Dosya konumu: ${pptxFilePath} (Dosya silinmeyecek, test amaçlı olarak korunuyor)`);
            res.download(pptxFilePath, fileName, (err) => {
                if (err) {
                    console.error("Dosya indirme hatası:", err);
                }
                // İndirme tamamlandıktan sonra yapılacak işlemler
                console.log(`Dosya indirme tamamlandı. Dosya konumunuz: ${pptxFilePath}`);
                // Dosyayı silmiyoruz artık
                /*
                try {
                  if (fs.existsSync(pptxFilePath)) {
                    fs.unlinkSync(pptxFilePath);
                    console.log("Geçici dosya temizlendi");
                  }
                } catch (unlinkErr) {
                  console.error("Geçici dosyayı silme hatası:", unlinkErr);
                }
                */
            });
        }
        catch (processingError) {
            console.error("İşlem hatası:", processingError);
            return res.status(500).json({
                success: false,
                error: processingError instanceof Error
                    ? processingError.message
                    : "PowerPoint oluşturma sırasında beklenmeyen bir hata oluştu",
            });
        }
    }
    catch (error) {
        if (error instanceof geminiService_1.RobotsDisallowedError) {
            console.error("Robots.txt engeli:", error);
            res.status(403).json({
                success: false,
                error: "Bu site robots.txt tarafından engellenmiş",
                type: "robots_disallowed",
            });
        }
        else {
            console.error("PowerPoint oluşturma hatası:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Bilinmeyen bir hata oluştu",
            });
        }
    }
}));
// LinkedIn analizi
router.post("/analyze-linkedin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { linkedInData } = req.body;
        if (!linkedInData) {
            return res.status(400).json({ error: "LinkedIn data is required" });
        }
        const formData = yield geminiService.analyzeLinkedIn(linkedInData);
        res.json(formData);
    }
    catch (error) {
        console.error("LinkedIn analysis error:", error);
        res.status(500).json({ error: "Error during LinkedIn analysis" });
    }
}));
// Gemini AI ile sohbet
router.post("/chat", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { message, sessionId = null } = req.body;
        if (!message) {
            return res.status(400).json({
                success: false,
                error: "Mesaj girişi gereklidir",
            });
        }
        let session;
        // Mevcut oturumu kontrol et veya yeni oturum oluştur
        if (sessionId && chatSessions.has(sessionId)) {
            session = chatSessions.get(sessionId);
            session.lastActivity = new Date();
        }
        else {
            // Yeni oturum oluştur
            const newSessionId = Date.now().toString(36) + Math.random().toString(36).substring(2);
            session = {
                id: newSessionId,
                history: [],
                lastActivity: new Date(),
            };
            chatSessions.set(newSessionId, session);
        }
        console.log(`Sohbet mesajı alındı, Oturum ID: ${session.id}`);
        // Gemini ile sohbet et
        const chatResponse = yield geminiService.chat(message, session.history);
        // Oturum geçmişini güncelle
        session.history = chatResponse.conversationHistory;
        // Yanıtı döndür
        res.json({
            success: true,
            sessionId: session.id,
            response: chatResponse.response,
            // İsteğe bağlı olarak UI için kullanılabilecek tam geçmiş
            conversation: session.history,
        });
    }
    catch (error) {
        console.error("Sohbet hatası:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Bilinmeyen bir sohbet hatası oluştu",
        });
        logger_1.default.error("Sohbet hatası:", error);
        console.error("Sohbet hatası:", error);
    }
}));
exports.default = router;
