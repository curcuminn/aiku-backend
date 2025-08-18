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
exports.claimCompany = exports.matchCompaniesByDomain = exports.uploadCompanyVideo = exports.deleteCompany = exports.updateCompany = exports.getCompaniesForUser = exports.getCompany = exports.createCompany = exports.getAllCompanies = void 0;
const express_validator_1 = require("express-validator");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Company_1 = require("../models/Company");
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = require("../models/User");
// Tüm şirketleri getirme
const getAllCompanies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Eğer token ile erişim zorunlu ise aşağıdaki satırları aktif edebilirsiniz:
        // const token = req.header('Authorization')?.replace('Bearer ', '');
        // if (!token) {
        //   return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        // }
        // const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
        const companies = yield Company_1.Company.find()
            .populate({
            path: "user",
            select: "accountStatus",
            match: { accountStatus: "active" }
        });
        // populate sonucu user null gelenleri filtrele
        const activeCompanies = companies.filter(c => c.user);
        const companiesResponse = activeCompanies.map(company => ({
            id: company._id,
            companyName: company.companyName,
            companyLogo: company.companyLogo,
            companyType: company.companyType,
            openForInvestments: company.openForInvestments,
            businessModel: company.businessModel,
            companySector: company.companySector,
            companySize: company.companySize,
            businessScale: company.businessScale,
            fundSize: company.fundSize,
            companyEmail: company.companyEmail,
            companyPhone: company.companyPhone,
            countryCode: company.countryCode,
            localPhone: company.localPhone,
            companyInfo: company.companyInfo,
            detailedDescription: company.detailedDescription,
            companyWebsite: company.companyWebsite,
            companyAddress: company.companyAddress,
            companyLinkedIn: company.companyLinkedIn,
            companyTwitter: company.companyTwitter,
            companyInstagram: company.companyInstagram,
            interestedSectors: company.interestedSectors,
            isIncorporated: company.isIncorporated,
            isHighlighted: company.isHighlighted,
            acceptMessages: company.acceptMessages,
            numberOfInvestments: company.numberOfInvestments,
            numberOfExits: company.numberOfExits,
            user: company.user._id.toString(),
            connectedHub: company.connectedHub ? company.connectedHub.toString() : null,
            createdAt: company.createdAt,
        }));
        res.status(200).json({ success: true, companies: companiesResponse });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: "Sunucu hatası", error: err.message });
    }
});
exports.getAllCompanies = getAllCompanies;
// Şirket oluşturma
const createCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array(),
            });
        }
        // Token doğrulama
        const token = (_a = req.header("Authorization")) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
        if (!token) {
            return res
                .status(401)
                .json({
                success: false,
                message: "Yetkilendirme başarısız, token bulunamadı",
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const { companyName, companyLogo, companyType, openForInvestments, businessModel, companySector, companySize, businessScale, fundSize, companyEmail, companyPhone, countryCode, localPhone, companyInfo, detailedDescription, companyWebsite, companyAddress, companyLinkedIn, companyTwitter, companyInstagram, interestedSectors, isIncorporated, isHighlighted, acceptMessages, numberOfInvestments, numberOfExits, connectedHub, } = req.body;
        const company = yield Company_1.Company.create({
            companyName,
            companyLogo,
            companyType,
            openForInvestments,
            businessModel,
            companySector,
            companySize,
            businessScale,
            fundSize,
            companyEmail,
            companyPhone,
            countryCode,
            localPhone,
            companyInfo,
            detailedDescription,
            companyWebsite,
            companyAddress,
            companyLinkedIn,
            companyTwitter,
            companyInstagram,
            interestedSectors,
            isIncorporated,
            isHighlighted,
            acceptMessages,
            numberOfInvestments,
            numberOfExits,
            user: userId,
            connectedHub: connectedHub || null,
        });
        const companyResponse = {
            id: company._id,
            companyName: company.companyName,
            companyLogo: company.companyLogo,
            companyType: company.companyType,
            openForInvestments: company.openForInvestments,
            businessModel: company.businessModel,
            companySector: company.companySector,
            companySize: company.companySize,
            businessScale: company.businessScale,
            fundSize: company.fundSize,
            companyEmail: company.companyEmail,
            companyPhone: company.companyPhone,
            countryCode: company.countryCode,
            localPhone: company.localPhone,
            companyInfo: company.companyInfo,
            detailedDescription: company.detailedDescription,
            companyWebsite: company.companyWebsite,
            companyAddress: company.companyAddress,
            companyLinkedIn: company.companyLinkedIn,
            companyTwitter: company.companyTwitter,
            companyInstagram: company.companyInstagram,
            interestedSectors: company.interestedSectors,
            isIncorporated: company.isIncorporated,
            isHighlighted: company.isHighlighted,
            acceptMessages: company.acceptMessages,
            numberOfInvestments: company.numberOfInvestments,
            numberOfExits: company.numberOfExits,
            user: company.user.toString(),
            connectedHub: company.connectedHub ? company.connectedHub.toString() : null,
            createdAt: company.createdAt,
        };
        res.status(201).json({ success: true, company: companyResponse });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: "Sunucu hatası", error: err.message });
    }
});
exports.createCompany = createCompany;
// Belirtilen ID'ye sahip şirketi getirme
const getCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const company = yield Company_1.Company.findById(id);
        if (!company) {
            return res
                .status(404)
                .json({ success: false, message: "Şirket bulunamadı" });
        }
        const companyResponse = {
            id: company._id,
            companyName: company.companyName,
            companyLogo: company.companyLogo,
            companyType: company.companyType,
            openForInvestments: company.openForInvestments,
            businessModel: company.businessModel,
            companySector: company.companySector,
            companySize: company.companySize,
            businessScale: company.businessScale,
            fundSize: company.fundSize,
            companyEmail: company.companyEmail,
            companyPhone: company.companyPhone,
            countryCode: company.countryCode,
            localPhone: company.localPhone,
            companyInfo: company.companyInfo,
            detailedDescription: company.detailedDescription,
            companyWebsite: company.companyWebsite,
            companyAddress: company.companyAddress,
            companyLinkedIn: company.companyLinkedIn,
            companyTwitter: company.companyTwitter,
            companyInstagram: company.companyInstagram,
            interestedSectors: company.interestedSectors,
            isIncorporated: company.isIncorporated,
            isHighlighted: company.isHighlighted,
            acceptMessages: company.acceptMessages,
            numberOfInvestments: company.numberOfInvestments,
            numberOfExits: company.numberOfExits,
            user: company.user.toString(),
            connectedHub: company.connectedHub ? company.connectedHub.toString() : null,
            createdAt: company.createdAt,
        };
        res.status(200).json({ success: true, company: companyResponse });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: "Sunucu hatası", error: err.message });
    }
});
exports.getCompany = getCompany;
// Kullanıcıya ait tüm şirketleri getirme
const getCompaniesForUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.query;
        if (!userId ||
            typeof userId !== "string" ||
            !mongoose_1.default.Types.ObjectId.isValid(userId)) {
            return res
                .status(400)
                .json({ success: false, message: "Geçersiz Kullanıcı ID'si" });
        }
        // Belirtilen kullanıcı ID'sine sahip şirketleri bulma
        const companies = yield Company_1.Company.find({
            user: new mongoose_1.default.Types.ObjectId(userId),
        });
        const companiesResponse = companies.map((company) => ({
            id: company._id,
            companyName: company.companyName,
            companyLogo: company.companyLogo,
            companyType: company.companyType,
            openForInvestments: company.openForInvestments,
            businessModel: company.businessModel,
            companySector: company.companySector,
            companySize: company.companySize,
            businessScale: company.businessScale,
            fundSize: company.fundSize,
            companyEmail: company.companyEmail,
            companyPhone: company.companyPhone,
            countryCode: company.countryCode,
            localPhone: company.localPhone,
            companyInfo: company.companyInfo,
            detailedDescription: company.detailedDescription,
            companyWebsite: company.companyWebsite,
            companyAddress: company.companyAddress,
            companyLinkedIn: company.companyLinkedIn,
            companyTwitter: company.companyTwitter,
            companyInstagram: company.companyInstagram,
            interestedSectors: company.interestedSectors,
            isIncorporated: company.isIncorporated,
            isHighlighted: company.isHighlighted,
            acceptMessages: company.acceptMessages,
            numberOfInvestments: company.numberOfInvestments,
            numberOfExits: company.numberOfExits,
            user: company.user.toString(),
            connectedHub: company.connectedHub
                ? company.connectedHub.toString()
                : null,
            createdAt: company.createdAt,
        }));
        res.status(200).json({ success: true, companies: companiesResponse });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: "Sunucu hatası", error: err.message });
    }
});
exports.getCompaniesForUser = getCompaniesForUser;
// Şirket bilgilerini güncelleme
const updateCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Token doğrulama
        const token = (_a = req.header("Authorization")) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
        if (!token) {
            return res
                .status(401)
                .json({
                success: false,
                message: "Yetkilendirme başarısız, token bulunamadı",
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const userRole = decoded.role;
        const { id } = req.params;
        let company = yield Company_1.Company.findById(id);
        if (!company) {
            return res
                .status(404)
                .json({ success: false, message: "Şirket bulunamadı" });
        }
        if (company.user.toString() !== userId && userRole !== 'admin') {
            return res
                .status(403)
                .json({ success: false, message: "Bu şirket üzerinde yetkiniz yok" });
        }
        const { companyName, companyLogo, companyType, openForInvestments, businessModel, companySector, companySize, businessScale, fundSize, companyEmail, companyPhone, countryCode, localPhone, companyInfo, detailedDescription, companyWebsite, companyAddress, companyLinkedIn, companyTwitter, companyInstagram, interestedSectors, isIncorporated, isHighlighted, acceptMessages, numberOfInvestments, numberOfExits, connectedHub, } = req.body;
        if (companyName)
            company.companyName = companyName;
        if (companyLogo)
            company.companyLogo = companyLogo;
        if (companyType)
            company.companyType = companyType;
        if (openForInvestments !== undefined)
            company.openForInvestments = openForInvestments;
        if (businessModel)
            company.businessModel = businessModel;
        if (companySector)
            company.companySector = companySector;
        if (companySize)
            company.companySize = companySize;
        if (businessScale)
            company.businessScale = businessScale;
        if (fundSize)
            company.fundSize = fundSize;
        if (companyEmail)
            company.companyEmail = companyEmail;
        if (companyPhone)
            company.companyPhone = companyPhone;
        if (countryCode)
            company.countryCode = countryCode;
        if (localPhone)
            company.localPhone = localPhone;
        if (companyInfo)
            company.companyInfo = companyInfo;
        if (detailedDescription)
            company.detailedDescription = detailedDescription;
        if (companyWebsite)
            company.companyWebsite = companyWebsite;
        if (companyAddress)
            company.companyAddress = companyAddress;
        if (companyLinkedIn)
            company.companyLinkedIn = companyLinkedIn;
        if (companyTwitter)
            company.companyTwitter = companyTwitter;
        if (companyInstagram)
            company.companyInstagram = companyInstagram;
        if (interestedSectors)
            company.interestedSectors = interestedSectors;
        if (isIncorporated !== undefined)
            company.isIncorporated = isIncorporated;
        if (isHighlighted !== undefined)
            company.isHighlighted = isHighlighted;
        if (acceptMessages !== undefined)
            company.acceptMessages = acceptMessages;
        if (numberOfInvestments !== undefined)
            company.numberOfInvestments = numberOfInvestments;
        if (numberOfExits !== undefined)
            company.numberOfExits = numberOfExits;
        if (connectedHub !== undefined) {
            company.connectedHub = connectedHub;
        }
        yield company.save();
        const companyResponse = {
            id: company._id,
            companyName: company.companyName,
            companyLogo: company.companyLogo,
            companyType: company.companyType,
            openForInvestments: company.openForInvestments,
            businessModel: company.businessModel,
            companySector: company.companySector,
            companySize: company.companySize,
            businessScale: company.businessScale,
            fundSize: company.fundSize,
            companyEmail: company.companyEmail,
            companyPhone: company.companyPhone,
            countryCode: company.countryCode,
            localPhone: company.localPhone,
            companyInfo: company.companyInfo,
            detailedDescription: company.detailedDescription,
            companyWebsite: company.companyWebsite,
            companyAddress: company.companyAddress,
            companyLinkedIn: company.companyLinkedIn,
            companyTwitter: company.companyTwitter,
            companyInstagram: company.companyInstagram,
            interestedSectors: company.interestedSectors,
            isIncorporated: company.isIncorporated,
            isHighlighted: company.isHighlighted,
            acceptMessages: company.acceptMessages,
            numberOfInvestments: company.numberOfInvestments,
            numberOfExits: company.numberOfExits,
            user: company.user.toString(),
            connectedHub: company.connectedHub
                ? company.connectedHub.toString()
                : null,
            createdAt: company.createdAt,
        };
        res.status(200).json({ success: true, company: companyResponse });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: "Sunucu hatası", error: err.message });
    }
});
exports.updateCompany = updateCompany;
// Şirket silme
const deleteCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Token doğrulaması
        const token = (_a = req.header("Authorization")) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
        if (!token) {
            return res
                .status(401)
                .json({
                success: false,
                message: "Yetkilendirme başarısız, token bulunamadı",
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const { id } = req.params;
        const company = yield Company_1.Company.findById(id);
        if (!company) {
            return res
                .status(404)
                .json({ success: false, message: "Şirket bulunamadı" });
        }
        if (company.user.toString() !== userId) {
            return res
                .status(403)
                .json({ success: false, message: "Bu şirket üzerinde yetkiniz yok" });
        }
        // @ts-expect-error - Mongoose'un yeni sürümlerinde remove metodu yerine deleteOne kullanılmalı
        yield company.deleteOne();
        res
            .status(200)
            .json({ success: true, message: "Şirket başarıyla silindi" });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: "Sunucu hatası", error: err.message });
    }
});
exports.deleteCompany = deleteCompany;
// Video yükleme endpoint'i
const uploadCompanyVideo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = req.params.id;
        const company = yield Company_1.Company.findById(companyId);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Şirket bulunamadı",
            });
        }
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Lütfen bir video dosyası yükleyin",
            });
        }
        // Video dosya yolunu güncelle
        company.companyVideo = `/uploads/videos/${req.file.filename}`;
        yield company.save();
        res.status(200).json({
            success: true,
            data: company,
            message: "Video başarıyla yüklendi",
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Video yükleme başarısız",
            error: error.message,
        });
    }
});
exports.uploadCompanyVideo = uploadCompanyVideo;
// Kullanıcının e-posta domain’ine göre, hâlihazırda o kullanıcıya ait olmayan şirketleri getir
const matchCompaniesByDomain = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // 1) Domain query parametresini al ve doğrula
        const rawDomain = req.query.domain;
        if (!rawDomain || typeof rawDomain !== 'string') {
            return res
                .status(400)
                .json({ success: false, message: 'domain query parametresi zorunlu' });
        }
        const domain = rawDomain.trim().toLowerCase();
        // 2) Token'dan kullanıcıyı çöz (aynı create/update’de yaptığınız gibi)
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res
                .status(401)
                .json({ success: false, message: 'Yetkilendirme başarısız, token yok' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        // 3) companyEmail alanı “@domain” ile biten, ama user !== userId olanları bul
        const companies = yield Company_1.Company.find({
            companyEmail: { $regex: new RegExp(`@${domain}$`, 'i') },
            user: { $ne: userId }
        })
            .select('companyName companyEmail companyLogo user');
        // 4) Döndür
        res.status(200).json({ success: true, companies });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.matchCompaniesByDomain = matchCompaniesByDomain;
const claimCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        // 1) ID geçerli mi?
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid company ID" });
        }
        // 2) Şirketi al
        const company = yield Company_1.Company.findById(id);
        if (!company) {
            return res.status(404).json({ success: false, message: "Company not found" });
        }
        // 3) Zaten siz misiniz?
        const token = (_a = req.header("Authorization")) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
        if (!token) {
            return res.status(401).json({ success: false, message: "Token missing" });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        if (company.user.toString() === userId) {
            return res
                .status(400)
                .json({ success: false, message: "You already own this company" });
        }
        // 4) Kullanıcıyı çek (sadece email lazım)
        const user = yield User_1.User.findById(userId).select("email");
        if (!(user === null || user === void 0 ? void 0 : user.email)) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        // 5) Domain’leri karşılaştır
        const userDomain = user.email.split("@")[1].toLowerCase();
        const companyDomain = (_b = company.companyEmail.split("@")[1]) === null || _b === void 0 ? void 0 : _b.toLowerCase();
        if (userDomain !== companyDomain) {
            return res
                .status(403)
                .json({ success: false, message: "Email domain does not match" });
        }
        // 6) Atama ve kaydet
        company.user = userId;
        yield company.save();
        res
            .status(200)
            .json({ success: true, message: "Company successfully claimed", company });
    }
    catch (err) {
        console.error("claimCompany error:", err);
        res
            .status(500)
            .json({ success: false, message: "Server error", error: err.message });
    }
});
exports.claimCompany = claimCompany;
