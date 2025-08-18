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
exports.getAllInvestmentNews = exports.getInvestmentNewsById = exports.deleteInvestmentNews = exports.updateInvestmentNews = exports.createInvestmentNews = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const InvestmentNews_1 = require("../models/InvestmentNews");
// YENİ haber oluştur
const createInvestmentNews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, coverPhoto, text, date } = req.body;
        const news = yield InvestmentNews_1.InvestmentNews.create({
            title,
            coverPhoto,
            text,
            date
        });
        res.status(201).json({ success: true, news });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.createInvestmentNews = createInvestmentNews;
// HABERİ GÜNCELLE
const updateInvestmentNews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Geçersiz ID' });
        }
        const news = yield InvestmentNews_1.InvestmentNews.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true
        });
        if (!news) {
            return res.status(404).json({ success: false, message: 'Haber bulunamadı' });
        }
        res.status(200).json({ success: true, news });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.updateInvestmentNews = updateInvestmentNews;
// HABERİ SİL
const deleteInvestmentNews = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Geçersiz ID' });
        }
        const deleted = yield InvestmentNews_1.InvestmentNews.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Haber bulunamadı' });
        }
        res.status(200).json({ success: true, message: 'Haber silindi' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.deleteInvestmentNews = deleteInvestmentNews;
// TEK HABER GETİR
const getInvestmentNewsById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Geçersiz ID' });
        }
        const news = yield InvestmentNews_1.InvestmentNews.findById(id);
        if (!news) {
            return res.status(404).json({ success: false, message: 'Haber bulunamadı' });
        }
        res.status(200).json({ success: true, news });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.getInvestmentNewsById = getInvestmentNewsById;
// TÜM HABERLERİ GETİR
const getAllInvestmentNews = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newsList = yield InvestmentNews_1.InvestmentNews.find().sort({ date: -1 });
        res.status(200).json({ success: true, data: newsList });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.getAllInvestmentNews = getAllInvestmentNews;
