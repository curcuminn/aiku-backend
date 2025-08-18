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
exports.setDefaultBillingInfo = exports.getDefaultBillingInfo = exports.deleteBillingInfo = exports.updateBillingInfo = exports.getBillingInfoById = exports.getBillingInfos = exports.createBillingInfo = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const BillingInfo_1 = __importDefault(require("../models/BillingInfo"));
// @desc    Yeni fatura bilgisi oluştur
// @route   POST /api/billingInfo
// @access  Private
const createBillingInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { billingType, identityNumber, firstName, lastName, companyName, taxNumber, taxOffice, address, city, district, zipCode, phone, email, isDefault, } = req.body;
        // Temel doğrulamalar
        if (!billingType || !address || !city || !phone || !email) {
            res.status(400);
            throw new Error("Lütfen tüm zorunlu alanları doldurunuz");
        }
        // Bireysel fatura tipi için TC Kimlik No, ad ve soyad kontrolü
        if (billingType === "individual") {
            if (!identityNumber || !firstName || !lastName) {
                res.status(400);
                throw new Error("Bireysel fatura için TC Kimlik No, ad ve soyad alanları zorunludur");
            }
            // TC Kimlik No 11 haneli olmalı
            if (identityNumber.length !== 11) {
                res.status(400);
                throw new Error("TC Kimlik No 11 haneli olmalıdır");
            }
        }
        // Kurumsal fatura tipi için firma adı, vergi no ve vergi dairesi kontrolü
        if (billingType === "corporate") {
            if (!companyName || !taxNumber || !taxOffice) {
                res.status(400);
                throw new Error("Kurumsal fatura için firma adı, vergi numarası ve vergi dairesi alanları zorunludur");
            }
        }
        const userId = req.user.id;
        // İlk fatura bilgisi oluşturulduğunda otomatik olarak varsayılan yap
        const existingBillingInfos = yield BillingInfo_1.default.countDocuments({
            user: userId,
        });
        const shouldBeDefault = isDefault || existingBillingInfos === 0;
        const billingInfo = yield BillingInfo_1.default.create({
            user: userId,
            billingType,
            identityNumber: billingType === "individual" ? identityNumber : undefined,
            firstName: billingType === "individual" ? firstName : undefined,
            lastName: billingType === "individual" ? lastName : undefined,
            companyName: billingType === "corporate" ? companyName : undefined,
            taxNumber: billingType === "corporate" ? taxNumber : undefined,
            taxOffice: billingType === "corporate" ? taxOffice : undefined,
            address,
            city,
            district,
            zipCode,
            phone,
            email,
            isDefault: shouldBeDefault,
        });
        if (billingInfo) {
            res.status(201).json(billingInfo);
        }
        else {
            res.status(400);
            throw new Error("Fatura bilgisi oluşturulurken bir hata oluştu");
        }
    }
    catch (error) {
        res.status(res.statusCode >= 400 ? res.statusCode : 500);
        res.json({
            message: error.message,
            stack: process.env.NODE_ENV === "production" ? null : error.stack,
        });
    }
});
exports.createBillingInfo = createBillingInfo;
// @desc    Kullanıcıya ait tüm fatura bilgilerini getir
// @route   GET /api/billingInfo
// @access  Private
const getBillingInfos = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const billingInfos = yield BillingInfo_1.default.find({ user: userId });
        res.status(200).json(billingInfos);
    }
    catch (error) {
        res.status(res.statusCode >= 400 ? res.statusCode : 500);
        res.json({
            message: error.message,
            stack: process.env.NODE_ENV === "production" ? null : error.stack,
        });
    }
});
exports.getBillingInfos = getBillingInfos;
// @desc    Belirli bir fatura bilgisini getir
// @route   GET /api/billingInfo/:id
// @access  Private
const getBillingInfoById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(req.params.id)) {
            res.status(400);
            throw new Error("Geçersiz fatura bilgisi ID");
        }
        const billingInfo = yield BillingInfo_1.default.findOne({
            _id: req.params.id,
            user: userId,
        });
        if (billingInfo) {
            res.status(200).json(billingInfo);
        }
        else {
            res.status(404);
            throw new Error("Fatura bilgisi bulunamadı");
        }
    }
    catch (error) {
        res.status(res.statusCode >= 400 ? res.statusCode : 500);
        res.json({
            message: error.message,
            stack: process.env.NODE_ENV === "production" ? null : error.stack,
        });
    }
});
exports.getBillingInfoById = getBillingInfoById;
// @desc    Fatura bilgisini güncelle
// @route   PUT /api/billingInfo/:id
// @access  Private
const updateBillingInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(req.params.id)) {
            res.status(400);
            throw new Error("Geçersiz fatura bilgisi ID");
        }
        const billingInfo = yield BillingInfo_1.default.findOne({
            _id: req.params.id,
            user: userId,
        });
        if (!billingInfo) {
            res.status(404);
            throw new Error("Fatura bilgisi bulunamadı");
        }
        const { billingType, identityNumber, firstName, lastName, companyName, taxNumber, taxOffice, address, city, district, zipCode, phone, email, isDefault, } = req.body;
        // Temel doğrulamalar (güncellenecek alanlar için)
        if (billingType && billingType !== billingInfo.billingType) {
            // Fatura tipi değiştiriliyorsa ilgili alanların kontrolü
            if (billingType === "individual" &&
                (!identityNumber || !firstName || !lastName)) {
                res.status(400);
                throw new Error("Bireysel fatura için TC Kimlik No, ad ve soyad alanları zorunludur");
            }
            if (billingType === "corporate" &&
                (!companyName || !taxNumber || !taxOffice)) {
                res.status(400);
                throw new Error("Kurumsal fatura için firma adı, vergi numarası ve vergi dairesi alanları zorunludur");
            }
        }
        // TC Kimlik No kontrolü
        if (identityNumber &&
            identityNumber.length !== 11 &&
            (billingType === "individual" || billingInfo.billingType === "individual")) {
            res.status(400);
            throw new Error("TC Kimlik No 11 haneli olmalıdır");
        }
        // Belirtilen alanları güncelle (sadece sağlanan alanlar)
        if (billingType)
            billingInfo.billingType = billingType;
        // Bireysel fatura bilgileri
        if (identityNumber)
            billingInfo.identityNumber = identityNumber;
        if (firstName)
            billingInfo.firstName = firstName;
        if (lastName)
            billingInfo.lastName = lastName;
        // Kurumsal fatura bilgileri
        if (companyName)
            billingInfo.companyName = companyName;
        if (taxNumber)
            billingInfo.taxNumber = taxNumber;
        if (taxOffice)
            billingInfo.taxOffice = taxOffice;
        // Ortak fatura bilgileri
        if (address)
            billingInfo.address = address;
        if (city)
            billingInfo.city = city;
        if (district !== undefined)
            billingInfo.district = district;
        if (zipCode !== undefined)
            billingInfo.zipCode = zipCode;
        if (phone)
            billingInfo.phone = phone;
        if (email)
            billingInfo.email = email;
        // Varsayılan fatura durumu
        if (isDefault !== undefined)
            billingInfo.isDefault = isDefault;
        const updatedBillingInfo = yield billingInfo.save();
        res.status(200).json(updatedBillingInfo);
    }
    catch (error) {
        res.status(res.statusCode >= 400 ? res.statusCode : 500);
        res.json({
            message: error.message,
            stack: process.env.NODE_ENV === "production" ? null : error.stack,
        });
    }
});
exports.updateBillingInfo = updateBillingInfo;
// @desc    Fatura bilgisini sil
// @route   DELETE /api/billingInfo/:id
// @access  Private
const deleteBillingInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(req.params.id)) {
            res.status(400);
            throw new Error("Geçersiz fatura bilgisi ID");
        }
        const billingInfo = yield BillingInfo_1.default.findOne({
            _id: req.params.id,
            user: userId,
        });
        if (!billingInfo) {
            res.status(404);
            throw new Error("Fatura bilgisi bulunamadı");
        }
        // Varsayılan fatura bilgisi siliniyor mu kontrol et
        if (billingInfo.isDefault) {
            // Başka fatura bilgisi var mı kontrol et
            const otherBillingInfos = yield BillingInfo_1.default.find({
                user: userId,
                _id: { $ne: req.params.id },
            });
            if (otherBillingInfos.length > 0) {
                // Diğer fatura bilgilerinden ilkini varsayılan yap
                otherBillingInfos[0].isDefault = true;
                yield otherBillingInfos[0].save();
            }
        }
        yield billingInfo.deleteOne();
        res.status(200).json({ message: "Fatura bilgisi başarıyla silindi" });
    }
    catch (error) {
        res.status(res.statusCode >= 400 ? res.statusCode : 500);
        res.json({
            message: error.message,
            stack: process.env.NODE_ENV === "production" ? null : error.stack,
        });
    }
});
exports.deleteBillingInfo = deleteBillingInfo;
// @desc    Varsayılan fatura bilgisini getir
// @route   GET /api/billingInfo/default
// @access  Private
const getDefaultBillingInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const defaultBillingInfo = yield BillingInfo_1.default.findOne({
            user: userId,
            isDefault: true,
        });
        if (defaultBillingInfo) {
            res.status(200).json(defaultBillingInfo);
        }
        else {
            res.status(404);
            throw new Error("Varsayılan fatura bilgisi bulunamadı");
        }
    }
    catch (error) {
        res.status(res.statusCode >= 400 ? res.statusCode : 500);
        res.json({
            message: error.message,
            stack: process.env.NODE_ENV === "production" ? null : error.stack,
        });
    }
});
exports.getDefaultBillingInfo = getDefaultBillingInfo;
// @desc    Belirli bir fatura bilgisini varsayılan yap
// @route   PUT /api/billingInfo/:id/set-default
// @access  Private
const setDefaultBillingInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        if (!mongoose_1.default.Types.ObjectId.isValid(req.params.id)) {
            res.status(400);
            throw new Error("Geçersiz fatura bilgisi ID");
        }
        // Öncelikle kullanıcının bu fatura bilgisine sahip olup olmadığını kontrol et
        const billingInfo = yield BillingInfo_1.default.findOne({
            _id: req.params.id,
            user: userId,
        });
        if (!billingInfo) {
            res.status(404);
            throw new Error("Fatura bilgisi bulunamadı");
        }
        // Zaten varsayılan olarak ayarlanmışsa bildirme
        if (billingInfo.isDefault) {
            return res.status(200).json({
                message: "Bu fatura bilgisi zaten varsayılan olarak ayarlanmış",
            });
        }
        // Bu fatura bilgisini varsayılan yap
        billingInfo.isDefault = true;
        yield billingInfo.save(); // Save trigger'ı diğer varsayılanları false yapar
        res.status(200).json({
            message: "Fatura bilgisi varsayılan olarak ayarlandı",
            billingInfo,
        });
    }
    catch (error) {
        res.status(res.statusCode >= 400 ? res.statusCode : 500);
        res.json({
            message: error.message,
            stack: process.env.NODE_ENV === "production" ? null : error.stack,
        });
    }
});
exports.setDefaultBillingInfo = setDefaultBillingInfo;
