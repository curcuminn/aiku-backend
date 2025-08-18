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
exports.getAllHubs = exports.getHubsByUser = exports.getHubById = exports.deleteHub = exports.updateHub = exports.createHub = void 0;
const express_validator_1 = require("express-validator");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Hub_1 = require("../models/Hub");
// **Yeni Hub Oluşturma**
const createHub = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Token eksik' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const { name, shortDescription, detailedDescription, type, institutionName, website, email, countryCode, localPhone, hubPhone, address, logoUrl, tags, focusSectors, programs, facilities, collaborationLevel, accessibility, applicationUrl, isAcceptingCompanies, connectedCompanies, } = req.body;
        const newHub = yield Hub_1.Hub.create({
            name,
            shortDescription,
            detailedDescription,
            type,
            institutionName,
            website,
            email,
            countryCode,
            localPhone,
            hubPhone,
            address,
            logoUrl,
            tags,
            focusSectors,
            programs,
            facilities,
            collaborationLevel,
            accessibility,
            applicationUrl,
            isAcceptingCompanies,
            connectedCompanies,
            connectedUsers: [userId],
        });
        res.status(201).json({ success: true, hub: newHub });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.createHub = createHub;
// **Hub Güncelleme**
const updateHub = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Token eksik' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const userRole = decoded.role;
        const { id } = req.params;
        const hub = yield Hub_1.Hub.findById(id);
        if (!hub) {
            return res.status(404).json({ success: false, message: 'Hub bulunamadı' });
        }
        // if (!hub.connectedUsers.includes(userId)) {
        //   return res.status(403).json({ success: false, message: 'Bu hub üzerinde yetkiniz yok' });
        // }
        // if (!hub.connectedUsers.includes(userId) && userRole !== 'admin') {
        //   return res.status(403).json({ success: false, message: 'Bu hub üzerinde yetkiniz yok' });
        // }
        Object.assign(hub, req.body);
        yield hub.save();
        res.status(200).json({ success: true, hub });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.updateHub = updateHub;
// **Hub Silme**
const deleteHub = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Token eksik' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const userRole = decoded.role;
        const { id } = req.params;
        const hub = yield Hub_1.Hub.findById(id);
        if (!hub) {
            return res.status(404).json({ success: false, message: 'Hub bulunamadı' });
        }
        if (!hub.connectedUsers.includes(userId)) {
            return res.status(403).json({ success: false, message: 'Bu hub üzerinde yetkiniz yok' });
        }
        if (!hub.connectedUsers.includes(userId) && userRole !== 'admin') {
            return res.status(403).json({ success: false, message: 'Bu hub üzerinde yetkiniz yok' });
        }
        yield hub.deleteOne();
        res.status(200).json({ success: true, message: 'Hub başarıyla silindi' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.deleteHub = deleteHub;
// **Belirli Hub Getirme**
const getHubById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const hub = yield Hub_1.Hub.findById(id)
            .populate('connectedCompanies', 'companyName companyLogo')
            .populate('connectedUsers', 'name email');
        if (!hub) {
            return res.status(404).json({ success: false, message: 'Hub bulunamadı' });
        }
        res.status(200).json({ success: true, hub });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.getHubById = getHubById;
// **Kullanıcının Hublarını Getirme**
const getHubsByUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Token eksik' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const hubs = yield Hub_1.Hub.find({ connectedUsers: userId })
            .populate('connectedCompanies', 'companyName')
            .populate('connectedUsers', 'name');
        res.status(200).json({ success: true, hubs });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.getHubsByUser = getHubsByUser;
// **Tüm Hubları Getirme**
const getAllHubs = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const hubs = yield Hub_1.Hub.find()
            .populate('connectedCompanies', 'companyName companyLogo')
            .populate('connectedUsers', 'name email');
        res.status(200).json({ success: true, hubs });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.getAllHubs = getAllHubs;
