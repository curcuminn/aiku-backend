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
exports.loginPanelUser = exports.createPanelUser = exports.getPanelUsers = void 0;
const PanelUser_1 = require("../models/PanelUser");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const getPanelUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield PanelUser_1.PanelUser.find().select('-password');
        res.status(200).json(users);
    }
    catch (error) {
        res.status(500).json({ message: 'Kullanıcılar getirilirken bir hata oluştu.' });
    }
});
exports.getPanelUsers = getPanelUsers;
const createPanelUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, password, role } = req.body;
        const existingUser = yield PanelUser_1.PanelUser.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Bu kullanıcı adı zaten kullanılıyor.' });
        }
        const user = new PanelUser_1.PanelUser({
            username,
            password,
            role,
            totalEntries: 0,
            dailyEntries: 0,
        });
        yield user.save();
        const _a = user.toObject(), { password: _ } = _a, userResponse = __rest(_a, ["password"]);
        res.status(201).json(userResponse);
    }
    catch (error) {
        res.status(500).json({ message: 'Kullanıcı oluşturulurken bir hata oluştu.' });
    }
});
exports.createPanelUser = createPanelUser;
const loginPanelUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, password } = req.body;
        const user = yield PanelUser_1.PanelUser.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre.' });
        }
        const isPasswordValid = yield user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre.' });
        }
        user.dailyEntries += 1;
        user.totalEntries += 1;
        yield user.save();
        const token = jsonwebtoken_1.default.sign({
            userId: user._id,
            username: user.username,
            role: user.role,
            type: 'panel'
        }, process.env.JWT_SECRET || 'panel-secret-key', { expiresIn: '24h' });
        const _a = user.toObject(), { password: _ } = _a, userResponse = __rest(_a, ["password"]);
        res.status(200).json({
            message: 'Giriş başarılı',
            user: userResponse,
            token
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Giriş yapılırken bir hata oluştu.' });
    }
});
exports.loginPanelUser = loginPanelUser;
