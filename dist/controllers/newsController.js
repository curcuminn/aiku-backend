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
exports.fetchMissingFullContent = exports.fetchFullContentAll = exports.fetchFullContentById = exports.getNewsById = exports.getNews = exports.manualFetchNews = exports.fetchAndStoreNews = void 0;
const axios_1 = __importDefault(require("axios"));
const Article_1 = require("../models/Article");
const Setting_1 = require("../models/Setting");
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const QUERY = process.env.QUERY; // artık kullanmıyoruz, sabit q içinde tanımladık
const DIFFBOT_TOKEN = process.env.DIFFBOT_TOKEN;
const DIFFBOT_URL = 'https://api.diffbot.com/v3/article';
/**
 * NewsAPI’dan yeni haberleri çekip MongoDB’ye kaydeder.
 */
const fetchAndStoreNews = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    // 1) Son çekim zamanını oku ya da 30 gün öncesine ayarla
    let setting = yield Setting_1.Setting.findOne({ key: 'lastFetchedAt' });
    if (!setting) {
        setting = new Setting_1.Setting({
            key: 'lastFetchedAt',
            value: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        });
    }
    const from = setting.value;
    console.log('>> [DEBUG] fetchAndStoreNews çalıştı, from:', from);
    // 2a) İngilizce, teknoloji kategorisindeki kaynakları çek
    const sourcesResp = yield axios_1.default.get('https://newsapi.org/v2/top-headlines/sources', {
        params: {
            apiKey: NEWS_API_KEY,
            category: 'technology',
            language: 'en',
        },
    });
    const sourceIds = sourcesResp.data.sources
        .map(src => src.id)
        .join(',');
    console.log('>> [DEBUG] Teknoloji kaynakları:', sourceIds);
    // 2b) Everything ile AI haberlerini al
    const response = yield axios_1.default.get('https://newsapi.org/v2/everything', {
        params: {
            apiKey: NEWS_API_KEY,
            sources: sourceIds, // sadece teknoloji siteleri
            language: 'en', // İngilizce
            q: '"artificial intelligence" OR AI', // tam ifade + kısaltma
            searchIn: 'title,description', // başlık ve açıklamada ara
            // from,                                     // sadece son çekim tarihinden sonrası
            sortBy: 'publishedAt', // en yeni önce
            pageSize: 100, // maksimum 100 sonuç
        },
    });
    const fetched = response.data.articles;
    console.log('>> [DEBUG] NewsAPI returned:', fetched.length, 'articles');
    const fetchedCount = fetched.length;
    let newCount = 0;
    // 3) Her makale için upsert + Diffbot
    for (const a of fetched) {
        const result = yield Article_1.Article.findOneAndUpdate({ url: a.url }, {
            $setOnInsert: {
                source: a.source,
                author: a.author,
                title: a.title,
                description: a.description,
                url: a.url,
                urlToImage: a.urlToImage,
                publishedAt: new Date(a.publishedAt),
                content: a.content,
            },
        }, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
            rawResult: true,
        });
        const doc = result.value;
        if (!result.lastErrorObject.updatedExisting) {
            newCount++;
        }
        if (!doc.fullContent) {
            try {
                const dbRes = yield axios_1.default.get(DIFFBOT_URL, {
                    params: {
                        token: DIFFBOT_TOKEN,
                        url: doc.url,
                        fields: 'text',
                    },
                });
                const fullText = ((_b = (_a = dbRes.data.objects) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.text) || '';
                doc.fullContent = fullText;
                yield doc.save();
                console.log(`>> [Diffbot] fullContent kaydedildi for ${doc._id}`);
            }
            catch (e) {
                console.warn(`>> [Diffbot] failed for ${doc._id}:`, e.message);
            }
        }
    }
    // 4) Ayarı güncelle ve sayıları dön
    setting.value = new Date().toISOString();
    yield setting.save();
    console.log('>> [DEBUG] fetchAndStoreNews tamamlandı.', { fetchedCount, newCount });
    return { fetchedCount, newCount };
});
exports.fetchAndStoreNews = fetchAndStoreNews;
/**
 * (Opsiyonel) HTTP isteği ile haberleri güncellemek için:
 * GET /news/fetch
 */
const manualFetchNews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (req.query.reset === 'true') {
            const resetDate = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
            yield Setting_1.Setting.findOneAndUpdate({ key: 'lastFetchedAt' }, { value: resetDate }, { upsert: true });
        }
        const { fetchedCount, newCount } = yield (0, exports.fetchAndStoreNews)();
        res.json({ success: true, fetchedCount, newCount });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
exports.manualFetchNews = manualFetchNews;
/**
 * GET /news?limit=20&page=1
 * Veritabanındaki haberleri listeler (default: son 20)
 */
const getNews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const limit = parseInt((_a = req.query.limit) !== null && _a !== void 0 ? _a : '20', 10);
        const page = parseInt((_b = req.query.page) !== null && _b !== void 0 ? _b : '1', 10);
        const search = (_c = req.query.search) !== null && _c !== void 0 ? _c : '';
        const skip = (page - 1) * limit;
        const filter = {};
        if (search.trim()) {
            const regex = new RegExp(search, 'i');
            filter.$or = [
                { title: regex },
                { content: regex },
                { fullContent: regex }
            ];
        }
        const articles = yield Article_1.Article
            .find(filter)
            .sort({ publishedAt: -1 })
            .skip(skip)
            .limit(limit);
        const total = yield Article_1.Article.countDocuments(filter);
        res.json({ success: true, page, limit, total, articles });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Haberleri listelerken hata', error: err.message });
    }
});
exports.getNews = getNews;
/**
 * GET /news/:id
 * Tek bir haberi ID ile getirir
 */
const getNewsById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const article = yield Article_1.Article.findById(id);
        if (!article) {
            return res.status(404).json({ success: false, message: 'Haber bulunamadı' });
        }
        res.json({ success: true, article });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Haber getirirken hata', error: err.message });
    }
});
exports.getNewsById = getNewsById;
// Tek bir haber için fullContent al
const fetchFullContentById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const article = yield Article_1.Article.findById(req.params.id);
        if (!article) {
            res.status(404).json({ success: false, message: 'Haber bulunamadı' });
            return;
        }
        const diffbotRes = yield axios_1.default.get(DIFFBOT_URL, {
            params: {
                token: DIFFBOT_TOKEN,
                url: article.url,
                fields: 'text',
            }
        });
        const fullText = ((_b = (_a = diffbotRes.data.objects) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.text) || '';
        article.fullContent = fullText;
        yield article.save();
        res.json({ success: true, fullText });
    }
    catch (err) {
        console.error('Diffbot error:', ((_c = err.response) === null || _c === void 0 ? void 0 : _c.data) || err.message);
        res.status(500).json({ success: false, message: 'Tam içerik alınamadı', error: err.message });
    }
});
exports.fetchFullContentById = fetchFullContentById;
// Tüm haberleri fullContent ile güncelle
const fetchFullContentAll = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const articles = yield Article_1.Article.find({});
        for (const art of articles) {
            try {
                const diffbotRes = yield axios_1.default.get(DIFFBOT_URL, {
                    params: {
                        token: DIFFBOT_TOKEN,
                        url: art.url,
                        fields: 'text',
                    }
                });
                art.fullContent = ((_b = (_a = diffbotRes.data.objects) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.text) || '';
                yield art.save();
            }
            catch (e) {
                console.warn(`Diffbot failed for ${art._id}:`, e.message);
            }
        }
        res.json({ success: true, message: `${articles.length} haberin fullContent’ı güncellendi.` });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Toplu güncelleme sırasında hata', error: err.message });
    }
});
exports.fetchFullContentAll = fetchFullContentAll;
const fetchMissingFullContent = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const missing = yield Article_1.Article.find({
            $or: [
                { fullContent: { $exists: false } },
                { fullContent: null },
                { fullContent: "" }
            ]
        });
        let updatedCount = 0;
        for (const art of missing) {
            try {
                const diffbotRes = yield axios_1.default.get(DIFFBOT_URL, {
                    params: {
                        token: DIFFBOT_TOKEN,
                        url: art.url,
                        fields: 'text'
                    }
                });
                const text = ((_b = (_a = diffbotRes.data.objects) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.text) || '';
                if (text) {
                    art.fullContent = text;
                    yield art.save();
                    updatedCount++;
                }
            }
            catch (e) {
                console.warn(`Diffbot failed for ${art._id}:`, e.message);
            }
        }
        res.json({
            success: true,
            totalMissing: missing.length,
            updatedCount
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Eksik güncelleme sırasında hata', error: err.message });
    }
});
exports.fetchMissingFullContent = fetchMissingFullContent;
