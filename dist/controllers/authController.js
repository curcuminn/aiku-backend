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
exports.logout = exports.deleteUserById = exports.deleteCurrentUser = exports.getAllUsers = exports.googleLogin = exports.checkAndRenewTrialSubscriptions = exports.createOrUpdateSubscription = exports.fixSubscription = exports.googleCallback = exports.getFavorites = exports.removeFavorite = exports.addFavorite = exports.updateUserById = exports.getUserById = exports.changePassword = exports.updateUser = exports.getCurrentUser = exports.login = exports.confirmEmailChange = exports.requestEmailChange = exports.resendVerificationEmail = exports.verifyEmail = exports.register = void 0;
const express_validator_1 = require("express-validator");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = require("../models/User");
const googleService_1 = require("../services/googleService");
const crypto_1 = __importDefault(require("crypto"));
const mailgunService_1 = require("../services/mailgunService");
const createToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: "90d", // Token süresini 90 güne çıkarıyoruz
    });
};
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array(),
            });
        }
        const { firstName, lastName, email, accountStatus = "active", password, phone, countryCode, localPhone, title, location, profileInfo, profilePhoto, linkedin, instagram, facebook, twitter, role, acceptChatNotification, } = req.body;
        let user = yield User_1.User.findOne({ email });
        if (user) {
            return res.status(400).json({
                success: false,
                message: "This email address is already registered.",
            });
        }
        // E-posta doğrulama tokeni oluştur
        const verificationToken = crypto_1.default.randomBytes(32).toString("hex");
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat
        user = yield User_1.User.create({
            firstName,
            lastName,
            email,
            accountStatus,
            password,
            phone,
            countryCode,
            localPhone,
            title,
            location,
            profileInfo,
            profilePhoto,
            linkedin,
            instagram,
            facebook,
            twitter,
            role,
            authProvider: "email",
            emailVerificationToken: verificationToken,
            emailVerificationExpires: verificationExpires,
            isAngelInvestor: false,
            acceptChatNotification,
        });
        // Doğrulama e-postası gönder
        try {
            yield mailgunService_1.mailgunService.sendVerificationEmail(email, verificationToken);
        }
        catch (error) {
            console.error("Verification email was not sent:", error);
            // E-posta gönderilemese bile kullanıcı kaydını tamamla
        }
        const token = createToken(user._id);
        const hasActiveSubscription = user.subscriptionStatus === "active" ||
            user.subscriptionStatus === "trial";
        const userResponse = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            accountStatus: user.accountStatus,
            phone: user.phone,
            countryCode: user.countryCode,
            localPhone: user.localPhone,
            title: user.title,
            location: user.location,
            profileInfo: user.profileInfo,
            profilePhoto: user.profilePhoto,
            linkedin: user.linkedin,
            instagram: user.instagram,
            facebook: user.facebook,
            twitter: user.twitter,
            emailVerified: user.emailVerified,
            locale: user.locale,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            subscriptionStatus: user.subscriptionStatus,
            subscriptionStartDate: user.subscriptionStartDate,
            trialEndsAt: user.trialEndsAt,
            subscriptionPlan: user.subscriptionPlan || undefined,
            subscriptionPeriod: user.subscriptionPeriod,
            subscriptionAmount: user.subscriptionAmount,
            autoRenewal: user.autoRenewal,
            paymentMethod: user.paymentMethod,
            savedCardId: user.savedCardId ? user.savedCardId.toString() : undefined,
            lastPaymentDate: user.lastPaymentDate,
            nextPaymentDate: user.nextPaymentDate,
            billingAddress: user.billingAddress,
            vatNumber: user.vatNumber,
            isSubscriptionActive: hasActiveSubscription,
            isAngelInvestor: user.isAngelInvestor,
            role: user.role,
            acceptChatNotification: user.acceptChatNotification,
        };
        res.status(201).json({
            success: true,
            token,
            user: userResponse,
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
});
exports.register = register;
const verifyEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token } = req.params;
        const user = yield User_1.User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: Date.now() },
        });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired verification link.",
            });
        }
        user.emailVerified = true;
        // @ts-ignore
        user.emailVerificationToken = undefined;
        // @ts-ignore
        user.emailVerificationExpires = undefined;
        yield user.save();
        // Frontend'e yönlendir
        if (process.env.FRONTEND_URL) {
            return res.redirect(`${process.env.FRONTEND_URL}/api/auth/verify-email/${token}`);
        }
        // Eğer FRONTEND_URL tanımlı değilse JSON yanıtı döndür
        res.json({
            success: true,
            message: "Your email address has been verified successfully.",
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
});
exports.verifyEmail = verifyEmail;
const resendVerificationEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        const user = yield User_1.User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "No users registered with this email address found.",
            });
        }
        if (user.emailVerified) {
            return res.status(400).json({
                success: false,
                message: "This email address has already been verified.",
            });
        }
        // Yeni doğrulama tokeni oluştur
        const verificationToken = crypto_1.default.randomBytes(32).toString("hex");
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat
        user.emailVerificationToken = verificationToken;
        user.emailVerificationExpires = verificationExpires;
        yield user.save();
        // Yeni doğrulama e-postası gönder
        try {
            yield mailgunService_1.mailgunService.sendVerificationEmail(email, verificationToken);
            res.json({
                success: true,
                message: "Verification email resent.",
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Verification email was not sent. Please try again later.",
            });
        }
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
});
exports.resendVerificationEmail = resendVerificationEmail;
const requestEmailChange = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const { newEmail } = req.body;
        if (!newEmail) {
            return res.status(400).json({ success: false, message: "newEmail is required." });
        }
        // 1) yeni email kullanımda mı kontrol
        const exists = yield User_1.User.findOne({ email: newEmail });
        if (exists) {
            return res.status(400).json({ success: false, message: "Email already in use." });
        }
        // 2) 6 haneli kod ve expiry oluştur
        const changeCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresInMinutes = 15;
        user.newEmail = newEmail;
        user.emailChangeToken = changeCode;
        user.emailChangeExpires = new Date(Date.now() + expiresInMinutes * 60000);
        yield user.save();
        // 3) mail gönder
        yield mailgunService_1.mailgunService.sendEmailChangeCode(newEmail, changeCode, expiresInMinutes);
        res.json({ success: true, message: "Verification code sent to your new email address." });
    }
    catch (err) {
        console.error("Error in requestEmailChange:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.requestEmailChange = requestEmailChange;
const confirmEmailChange = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ success: false, message: "code is required." });
        }
        // token ve expiry kontrolü (select:false alanları da getiriyoruz)
        const user = yield User_1.User.findOne({
            emailChangeToken: code,
            emailChangeExpires: { $gt: new Date() }
        }).select("+newEmail +emailChangeExpires");
        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid or expired code." });
        }
        // geçerliyse email’i güncelle
        user.email = user.newEmail;
        user.newEmail = undefined;
        user.emailChangeToken = undefined;
        user.emailChangeExpires = undefined;
        user.emailVerified = true; // isteğe bağlı
        yield user.save();
        res.json({ success: true, message: "Email address updated successfully." });
    }
    catch (err) {
        console.error("Error in confirmEmailChange:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.confirmEmailChange = confirmEmailChange;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array(),
            });
        }
        const { email, password } = req.body;
        const user = yield User_1.User.findOne({ email }).select("+password");
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }
        // Email doğrulaması kontrolü
        if (!user.emailVerified) {
            return res.status(401).json({
                success: false,
                message: "This email is not verified. Please verify your email before login.",
            });
        }
        if (user.accountStatus === 'deleted') {
            return res
                .status(404)
                .json({ success: false, message: 'Account not found.' });
        }
        const isMatch = yield user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }
        user.lastSeen = new Date();
        user.lastLogin = new Date();
        user.isOnline = true;
        user.authProvider = "email";
        yield user.save();
        const token = createToken(user._id);
        const hasActiveSubscription = user.subscriptionStatus === "active" ||
            user.subscriptionStatus === "trial";
        const userResponse = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            accountStatus: user.accountStatus,
            phone: user.phone,
            countryCode: user.countryCode,
            localPhone: user.localPhone,
            title: user.title,
            location: user.location,
            profileInfo: user.profileInfo,
            profilePhoto: user.profilePhoto,
            linkedin: user.linkedin,
            instagram: user.instagram,
            facebook: user.facebook,
            twitter: user.twitter,
            emailVerified: user.emailVerified,
            locale: user.locale,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            subscriptionStatus: user.subscriptionStatus,
            subscriptionStartDate: user.subscriptionStartDate,
            trialEndsAt: user.trialEndsAt,
            subscriptionPlan: user.subscriptionPlan || undefined,
            subscriptionPeriod: user.subscriptionPeriod,
            subscriptionAmount: user.subscriptionAmount,
            autoRenewal: user.autoRenewal,
            paymentMethod: user.paymentMethod,
            savedCardId: user.savedCardId ? user.savedCardId.toString() : undefined,
            lastPaymentDate: user.lastPaymentDate,
            nextPaymentDate: user.nextPaymentDate,
            billingAddress: user.billingAddress,
            vatNumber: user.vatNumber,
            isSubscriptionActive: hasActiveSubscription,
            isAngelInvestor: user.isAngelInvestor,
            role: user.role,
            isOnline: user.isOnline,
            lastSeen: user.lastSeen,
            acceptChatNotification: user.acceptChatNotification,
        };
        res.status(200).json({
            success: true,
            token,
            user: userResponse,
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
});
exports.login = login;
const getCurrentUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "You need to sign in",
            });
        }
        // Kullanıcı aktif bir aboneliğe sahip mi?
        const hasActiveSubscription = user.subscriptionStatus === "active" ||
            user.subscriptionStatus === "trial";
        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                accountStatus: user.accountStatus,
                phone: user.phone,
                countryCode: user.countryCode,
                localPhone: user.localPhone,
                title: user.title,
                location: user.location,
                profileInfo: user.profileInfo,
                profilePhoto: user.profilePhoto,
                linkedin: user.linkedin,
                instagram: user.instagram,
                facebook: user.facebook,
                twitter: user.twitter,
                emailVerified: user.emailVerified,
                locale: user.locale,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                subscriptionStatus: user.subscriptionStatus,
                subscriptionStartDate: user.subscriptionStartDate,
                trialEndsAt: user.trialEndsAt,
                subscriptionPlan: user.subscriptionPlan || undefined,
                subscriptionPeriod: user.subscriptionPeriod,
                subscriptionAmount: user.subscriptionAmount,
                autoRenewal: user.autoRenewal,
                paymentMethod: user.paymentMethod,
                savedCardId: user.savedCardId ? user.savedCardId.toString() : undefined,
                lastPaymentDate: user.lastPaymentDate,
                nextPaymentDate: user.nextPaymentDate,
                billingAddress: user.billingAddress,
                vatNumber: user.vatNumber,
                isSubscriptionActive: hasActiveSubscription,
                isAngelInvestor: user.isAngelInvestor,
                role: user.role,
                authProvider: user.authProvider,
                isOnline: user.isOnline,
                lastSeen: user.lastSeen,
                acceptChatNotification: user.acceptChatNotification,
            },
        });
    }
    catch (err) {
        console.error("Error while getting user information:", err);
        res.status(500).json({
            success: false,
            message: "An error occurred while retrieving user information.",
            error: err.message,
        });
    }
});
exports.getCurrentUser = getCurrentUser;
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "You need to sign in.",
            });
        }
        // Güncellenmek istenen alanları al
        const { firstName, lastName, email, accountStatus, phone, countryCode, localPhone, title, location, profileInfo, profilePhoto, linkedin, instagram, facebook, twitter, password, locale, isAngelInvestor, role, acceptChatNotification, } = req.body;
        // Gerekli alanları güncelle
        if (firstName)
            user.firstName = firstName;
        if (lastName)
            user.lastName = lastName;
        if (email)
            user.email = email;
        if (accountStatus)
            user.accountStatus = accountStatus;
        if (phone)
            user.phone = phone;
        if (countryCode)
            user.countryCode = countryCode;
        if (localPhone)
            user.localPhone = localPhone;
        if (title)
            user.title = title;
        if (location)
            user.location = location;
        if (profileInfo)
            user.profileInfo = profileInfo;
        if (profilePhoto)
            user.profilePhoto = profilePhoto;
        if (linkedin)
            user.linkedin = linkedin;
        if (instagram)
            user.instagram = instagram;
        if (facebook)
            user.facebook = facebook;
        if (twitter)
            user.twitter = twitter;
        if (locale)
            user.locale = locale;
        if (typeof isAngelInvestor !== 'undefined') {
            user.isAngelInvestor = isAngelInvestor;
        }
        if (typeof acceptChatNotification !== 'undefined') {
            user.acceptChatNotification = acceptChatNotification;
        }
        // Şifre güncelleniyorsa hashle
        if (password && password.length >= 6) {
            const salt = yield bcryptjs_1.default.genSalt(10);
            user.password = yield bcryptjs_1.default.hash(password, salt);
        }
        // Güncellenmiş kullanıcıyı kaydet
        yield user.save();
        res.status(200).json({
            success: true,
            message: "User information updated successfully!",
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                accountStatus: user.accountStatus,
                phone: user.phone,
                countryCode: user.countryCode,
                localPhone: user.localPhone,
                title: user.title,
                location: user.location,
                profileInfo: user.profileInfo,
                profilePhoto: user.profilePhoto,
                linkedin: user.linkedin,
                instagram: user.instagram,
                facebook: user.facebook,
                twitter: user.twitter,
                emailVerified: user.emailVerified,
                locale: user.locale,
                isAngelInvestor: user.isAngelInvestor,
                role: user.role,
                acceptChatNotification: user.acceptChatNotification,
            },
        });
    }
    catch (err) {
        console.error("User update error:", err);
        res.status(500).json({
            success: false,
            message: "An error occurred while updating user information.",
            error: err.message,
        });
    }
});
exports.updateUser = updateUser;
const changePassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // 1) Validator errors
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
        // 2) Load user along with password
        const userId = req.user._id;
        const user = yield User_1.User.findById(userId).select("+password");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        const { currentPassword, newPassword } = req.body;
        // 3) Verify current password
        const isMatch = yield user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Current password is incorrect" });
        }
        // 4) Assign new password and save (pre-save hook will hash it)
        user.password = newPassword;
        yield user.save();
        res.status(200).json({ success: true, message: "Password updated successfully" });
    }
    catch (err) {
        console.error("changePassword error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.changePassword = changePassword;
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.id;
        const user = yield User_1.User.findById(userId).select("-password");
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        }
        const hasActiveSubscription = user.subscriptionStatus === "active" ||
            user.subscriptionStatus === "trial";
        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                accountStatus: user.accountStatus,
                phone: user.phone,
                countryCode: user.countryCode,
                localPhone: user.localPhone,
                title: user.title,
                location: user.location,
                profileInfo: user.profileInfo,
                profilePhoto: user.profilePhoto,
                linkedin: user.linkedin,
                instagram: user.instagram,
                facebook: user.facebook,
                twitter: user.twitter,
                emailVerified: user.emailVerified,
                locale: user.locale,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                subscriptionStatus: user.subscriptionStatus,
                subscriptionStartDate: user.subscriptionStartDate,
                trialEndsAt: user.trialEndsAt,
                subscriptionPlan: user.subscriptionPlan,
                subscriptionPeriod: user.subscriptionPeriod,
                subscriptionAmount: user.subscriptionAmount,
                autoRenewal: user.autoRenewal,
                paymentMethod: user.paymentMethod,
                savedCardId: user.savedCardId ? user.savedCardId.toString() : undefined,
                lastPaymentDate: user.lastPaymentDate,
                nextPaymentDate: user.nextPaymentDate,
                billingAddress: user.billingAddress,
                vatNumber: user.vatNumber,
                isSubscriptionActive: hasActiveSubscription,
                isAngelInvestor: user.isAngelInvestor,
                role: user.role,
                isOnline: user.isOnline,
                lastSeen: user.lastSeen,
                acceptChatNotification: user.acceptChatNotification,
            },
        });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: "Server error", error: err.message });
    }
});
exports.getUserById = getUserById;
const updateUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Sadece admin rolündekilere izin ver
    if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        return res.status(403).json({ success: false, message: 'Yetkiniz yok.' });
    }
    const { id } = req.params;
    const user = yield User_1.User.findById(id);
    if (!user) {
        return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
    }
    // Güncellenmesine izin verdiğiniz alanları listeleyin
    const updatable = [
        'firstName',
        'lastName',
        'email',
        'role',
        'subscriptionStatus',
        'subscriptionPlan',
        'acceptChatNotification',
        // ihtiyaca göre diğer alanlar...
    ];
    updatable.forEach((field) => {
        if (req.body[field] !== undefined) {
            user[field] = req.body[field];
        }
    });
    yield user.save();
    res.json({
        success: true,
        user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            subscriptionStatus: user.subscriptionStatus,
            subscriptionPlan: user.subscriptionPlan,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        }
    });
});
exports.updateUserById = updateUserById;
const addFavorite = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.header("Authorization")) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authorization failed, token not found.",
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = yield User_1.User.findById(decoded.id);
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        }
        const { type, itemId } = req.body;
        if (!type || !itemId) {
            return res.status(400).json({
                success: false,
                message: "type ve itemId alanları gereklidir",
            });
        }
        if (type === "user") {
            if (user.favoriteUsers && user.favoriteUsers.includes(itemId)) {
                return res
                    .status(400)
                    .json({ success: false, message: "Kullanıcı zaten favorilerde" });
            }
            user.favoriteUsers = user.favoriteUsers || [];
            user.favoriteUsers.push(itemId);
        }
        else if (type === "company") {
            if (user.favoriteCompanies && user.favoriteCompanies.includes(itemId)) {
                return res
                    .status(400)
                    .json({ success: false, message: "Şirket zaten favorilerde" });
            }
            user.favoriteCompanies = user.favoriteCompanies || [];
            user.favoriteCompanies.push(itemId);
        }
        else if (type === "product") {
            if (user.favoriteProducts && user.favoriteProducts.includes(itemId)) {
                return res
                    .status(400)
                    .json({ success: false, message: "Ürün zaten favorilerde" });
            }
            user.favoriteProducts = user.favoriteProducts || [];
            user.favoriteProducts.push(itemId);
        }
        else {
            return res
                .status(400)
                .json({ success: false, message: "Geçersiz favori türü" });
        }
        yield user.save();
        res.status(200).json({ success: true, message: "Favorilere eklendi" });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: "Server error", error: err.message });
    }
});
exports.addFavorite = addFavorite;
const removeFavorite = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.header("Authorization")) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authorization failed, token not found.",
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = yield User_1.User.findById(decoded.id);
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        }
        const { type, itemId } = req.body;
        if (!type || !itemId) {
            return res.status(400).json({
                success: false,
                message: "type ve itemId alanları gereklidir",
            });
        }
        if (type === "user") {
            user.favoriteUsers = user.favoriteUsers || [];
            user.favoriteUsers = user.favoriteUsers.filter((fav) => fav.toString() !== itemId);
        }
        else if (type === "company") {
            user.favoriteCompanies = user.favoriteCompanies || [];
            user.favoriteCompanies = user.favoriteCompanies.filter((fav) => fav.toString() !== itemId);
        }
        else if (type === "product") {
            user.favoriteProducts = user.favoriteProducts || [];
            user.favoriteProducts = user.favoriteProducts.filter((fav) => fav.toString() !== itemId);
        }
        else {
            return res
                .status(400)
                .json({ success: false, message: "Geçersiz favori türü" });
        }
        yield user.save();
        res.status(200).json({ success: true, message: "Favoriden kaldırıldı" });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: "Server error", error: err.message });
    }
});
exports.removeFavorite = removeFavorite;
const getFavorites = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.header("Authorization")) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authorization failed, token not found.",
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = yield User_1.User.findById(decoded.id)
            .populate("favoriteUsers", "firstName lastName email")
            .populate("favoriteCompanies", "name description")
            .populate("favoriteProducts", "name price")
            .lean();
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        }
        user.favoriteUsers = (user.favoriteUsers || []).filter((fav) => fav);
        res.status(200).json({
            success: true,
            favorites: {
                favoriteUsers: user.favoriteUsers,
                favoriteCompanies: user.favoriteCompanies,
                favoriteProducts: user.favoriteProducts,
            },
        });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: "Server error", error: err.message });
    }
});
exports.getFavorites = getFavorites;
const googleCallback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        console.log("[GoogleCallback] Callback başladı");
        if (!req.user) {
            console.error("[GoogleCallback] User not found");
            return res.redirect(`${process.env.CLIENT_URL}/auth/login?error=google-user-not-found`);
        }
        console.log("[GoogleCallback] Kullanıcı bilgileri alındı:", {
            userId: req.user._id,
            email: req.user.email,
        });
        // JWT token oluştur
        const token = createToken(req.user._id);
        console.log("[GoogleCallback] JWT token oluşturuldu");
        // Frontend'e yönlendir
        const user = req.user;
        const hasActiveSubscription = user.subscriptionStatus === "active" ||
            user.subscriptionStatus === "trial";
        user.lastSeen = new Date();
        yield user.save();
        user.acceptChatNotification = (_a = user.acceptChatNotification) !== null && _a !== void 0 ? _a : true;
        const redirectUrl = encodeURIComponent(JSON.stringify({
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                profilePhoto: user.profilePhoto,
                isSubscriptionActive: hasActiveSubscription,
            },
        }));
        console.log("[GoogleCallback] Frontend'e yönlendirme:", `${process.env.CLIENT_URL}/auth/social-callback?data=${redirectUrl}`);
        return res.redirect(`${process.env.CLIENT_URL}/auth/social-callback?data=${redirectUrl}`);
    }
    catch (error) {
        console.error("[GoogleCallback] Hata:", error);
        return res.redirect(`${process.env.CLIENT_URL}/auth/login?error=google-callback-failed`);
    }
});
exports.googleCallback = googleCallback;
const fixSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "You need to sign in",
            });
        }
        const user = yield User_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        // Abonelik durumunu kontrol et
        const hasActiveSubscription = user.subscriptionStatus === "active" ||
            user.subscriptionStatus === "trial";
        let updated = false;
        // Eğer paymentHistory içerisinde başarılı ödeme varsa ve status active değilse
        if (user.paymentHistory &&
            user.paymentHistory.length > 0 &&
            user.paymentHistory.some((p) => p.status === "success")) {
            if (!hasActiveSubscription) {
                user.subscriptionStatus = "active";
                updated = true;
            }
            // isSubscriptionActive değeri false ise düzelt
            if (!user.isSubscriptionActive) {
                user.isSubscriptionActive = true;
                updated = true;
            }
            // Güncellemeler varsa kaydet
            if (updated) {
                yield user.save();
                console.log("User subscription status updated:", {
                    userId: user._id,
                    status: user.subscriptionStatus,
                    isActive: user.isSubscriptionActive,
                });
            }
        }
        // Tüm kullanıcı verilerini getirerek durumu kontrol et
        const refreshedUser = yield User_1.User.findById(userId);
        // Son başarılı ödeme tarihini ve kullanıcı bilgilerini getir
        const lastSuccessfulPayment = (_b = refreshedUser === null || refreshedUser === void 0 ? void 0 : refreshedUser.paymentHistory) === null || _b === void 0 ? void 0 : _b.find((p) => p.status === "success");
        res.status(200).json({
            success: true,
            updated,
            data: {
                userId: refreshedUser === null || refreshedUser === void 0 ? void 0 : refreshedUser._id,
                subscriptionStatus: refreshedUser === null || refreshedUser === void 0 ? void 0 : refreshedUser.subscriptionStatus,
                isSubscriptionActive: refreshedUser === null || refreshedUser === void 0 ? void 0 : refreshedUser.isSubscriptionActive,
                manualCheck: (refreshedUser === null || refreshedUser === void 0 ? void 0 : refreshedUser.subscriptionStatus) === "active" ||
                    (refreshedUser === null || refreshedUser === void 0 ? void 0 : refreshedUser.subscriptionStatus) === "trial",
                subscriptionStartDate: refreshedUser === null || refreshedUser === void 0 ? void 0 : refreshedUser.subscriptionStartDate,
                lastPaymentDate: refreshedUser === null || refreshedUser === void 0 ? void 0 : refreshedUser.lastPaymentDate,
                lastSuccessfulPayment,
                debug: {
                    subscriptionStatusType: typeof (refreshedUser === null || refreshedUser === void 0 ? void 0 : refreshedUser.subscriptionStatus),
                    subscriptionStatusLength: (refreshedUser === null || refreshedUser === void 0 ? void 0 : refreshedUser.subscriptionStatus)
                        ? refreshedUser.subscriptionStatus.length
                        : 0,
                    statusRaw: refreshedUser === null || refreshedUser === void 0 ? void 0 : refreshedUser.subscriptionStatus,
                    statusTrimmed: (refreshedUser === null || refreshedUser === void 0 ? void 0 : refreshedUser.subscriptionStatus)
                        ? refreshedUser.subscriptionStatus.trim()
                        : "",
                    statusCharCodes: (refreshedUser === null || refreshedUser === void 0 ? void 0 : refreshedUser.subscriptionStatus)
                        ? Array.from(refreshedUser.subscriptionStatus).map((c) => c.charCodeAt(0))
                        : [],
                },
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "An error occurred while checking subscription status",
            error: error.message,
        });
    }
});
exports.fixSubscription = fixSubscription;
const createOrUpdateSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // @ts-ignore - req.user tipini IUser olarak kabul ediyoruz
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "You need to sign in",
            });
        }
        const user = yield User_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        const { plan, period, paymentMethod, cardId } = req.body;
        if (!plan || !period || !paymentMethod) {
            return res.status(400).json({
                success: false,
                message: "Plan, term and payment method required.",
            });
        }
        // Ödeme yöntemi kredi kartı ise ve kart id yoksa hata ver
        if (paymentMethod === "creditCard" && !cardId) {
            return res.status(400).json({
                success: false,
                message: "Card information is required for credit card payment.",
            });
        }
        // Plan tipini kontrol et
        if (!["startup", "business", "investor"].includes(plan)) {
            return res.status(400).json({
                success: false,
                message: "Invalid plan type",
            });
        }
        // Dönem tipini kontrol et
        if (!["monthly", "yearly"].includes(period)) {
            return res.status(400).json({
                success: false,
                message: "Invalid period type",
            });
        }
        // İlk abonelik mi kontrol et
        const isFirstSubscription = !user.subscriptionStatus ||
            user.subscriptionStatus === "expired" ||
            user.subscriptionStatus === "cancelled";
        const now = new Date();
        let nextPaymentDate;
        // Startup planı ve ilk abonelik ise (aylık veya yıllık) 3 aylık deneme süresi ver
        if (isFirstSubscription && plan === "startup") {
            // 3 aylık trial süresi
            const trialEndDate = new Date(now);
            trialEndDate.setMonth(trialEndDate.getMonth() + 3);
            user.subscriptionStatus = "trial";
            user.trialEndsAt = trialEndDate;
            user.subscriptionStartDate = now;
            user.nextPaymentDate = trialEndDate;
            user.isSubscriptionActive = true;
            nextPaymentDate = trialEndDate;
        }
        else {
            // Normal ücretli abonelik
            user.subscriptionStatus = "active";
            user.subscriptionStartDate = now;
            user.isSubscriptionActive = true;
            // Dönem sonunu hesapla
            if (period === "monthly") {
                nextPaymentDate = new Date(now);
                nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
            }
            else {
                // Yıllık abonelik
                nextPaymentDate = new Date(now);
                // Business ve Investor planları için yıllık abonelikte 3 ay bonus (12+3=15 ay)
                if (plan === "business" || plan === "investor") {
                    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 12 + 3);
                }
                else {
                    // Startup planı için standart 12 ay
                    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 12);
                }
            }
            user.nextPaymentDate = nextPaymentDate;
            user.lastPaymentDate = now;
        }
        // Abonelik bilgilerini güncelle
        user.subscriptionPlan = plan;
        user.subscriptionPeriod = period;
        user.paymentMethod = paymentMethod;
        user.autoRenewal = true;
        // Kart bilgisini kaydet
        if (paymentMethod === "creditCard" && cardId) {
            user.savedCardId = cardId;
        }
        // Plana göre fiyatı belirle
        let amount = 0;
        if (plan === "startup") {
            amount = period === "monthly" ? 99 : 990;
        }
        else if (plan === "business") {
            amount = period === "monthly" ? 199 : 1990;
        }
        else if (plan === "investor") {
            amount = period === "monthly" ? 299 : 2990;
        }
        user.subscriptionAmount = amount;
        // Deneme süreci değilse, ödeme kaydı ekle
        if (user.subscriptionStatus !== "trial") {
            // Ödeme kaydı oluştur
            if (!user.paymentHistory) {
                user.paymentHistory = [];
            }
            user.paymentHistory.push({
                amount,
                date: now,
                status: "success",
                type: "subscription",
                plan,
                period,
            });
        }
        yield user.save();
        // Yanıt döndür
        const hasActiveSubscription = user.subscriptionStatus === "active" ||
            user.subscriptionStatus === "trial";
        res.status(200).json({
            success: true,
            subscription: {
                status: user.subscriptionStatus,
                plan: user.subscriptionPlan,
                period: user.subscriptionPeriod,
                startDate: user.subscriptionStartDate,
                amount: user.subscriptionAmount,
                nextPaymentDate: user.nextPaymentDate,
                isActive: hasActiveSubscription,
                trialEndsAt: user.trialEndsAt,
            },
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: "An error occurred during the subscription process",
            error: err.message,
        });
    }
});
exports.createOrUpdateSubscription = createOrUpdateSubscription;
// Trial abonelikler için kontrol ve otomatik ödeme yenileme - bu genellikle bir cronjob olarak çalışır
// Bu kod örnek olup, gerçek uygulamada bir cronjob servisi tarafından günlük olarak çağrılmalıdır
const checkAndRenewTrialSubscriptions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Sadece admin kullanıcısına izin ver
        // ts-expect-error - req.user tipini IUser olarak kabul ediyoruz
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const user = yield User_1.User.findById(userId);
        if (!user || user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Bu işlem için yetkiniz bulunmamaktadır",
            });
        }
        const now = new Date();
        // Deneme süresi bugün biten ve otomatik yenileme açık olan kullanıcıları bul
        const usersWithEndingTrial = yield User_1.User.find({
            subscriptionStatus: "trial",
            trialEndsAt: { $lte: now },
            autoRenewal: true,
            savedCardId: { $exists: true, $ne: null },
        });
        let processed = 0;
        let failed = 0;
        // Her bir kullanıcı için
        for (const trialUser of usersWithEndingTrial) {
            try {
                // Gerçek uygulamada burada bir ödeme servisi ile entegrasyon olmalı
                // Örnek: const paymentResult = await paymentService.chargeCard(trialUser.savedCardId, trialUser.subscriptionAmount);
                // Ödeme başarılı kabul edelim (gerçek uygulamada ödeme API yanıtına göre belirlenecek)
                const paymentSuccess = true;
                if (paymentSuccess) {
                    // Aboneliği aktif hale getir
                    trialUser.subscriptionStatus = "active";
                    trialUser.isSubscriptionActive = true;
                    trialUser.lastPaymentDate = now;
                    // Bir sonraki ödeme tarihini hesapla
                    let nextPaymentDate;
                    if (trialUser.subscriptionPeriod === "monthly") {
                        nextPaymentDate = new Date(now);
                        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
                    }
                    else {
                        // yearly
                        nextPaymentDate = new Date(now);
                        nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
                    }
                    trialUser.nextPaymentDate = nextPaymentDate;
                    // Ödeme geçmişine ekle
                    if (!trialUser.paymentHistory) {
                        trialUser.paymentHistory = [];
                    }
                    trialUser.paymentHistory.push({
                        amount: trialUser.subscriptionAmount || 0,
                        date: now,
                        status: "success",
                        type: "subscription",
                        // @ts-expect-error - subscriptionPlan null olabilir sorunu
                        plan: trialUser.subscriptionPlan,
                        period: trialUser.subscriptionPeriod,
                    });
                    yield trialUser.save();
                    processed++;
                }
                else {
                    // Ödeme başarısız olursa aboneliği süresi dolmuş olarak işaretle
                    trialUser.subscriptionStatus = "expired";
                    trialUser.isSubscriptionActive = false;
                    if (!trialUser.paymentHistory) {
                        trialUser.paymentHistory = [];
                    }
                    // Başarısız ödeme kaydı
                    trialUser.paymentHistory.push({
                        amount: trialUser.subscriptionAmount || 0,
                        date: now,
                        status: "failed",
                        type: "subscription",
                        // @ts-expect-error - subscriptionPlan null olabilir sorunu
                        plan: trialUser.subscriptionPlan,
                        period: trialUser.subscriptionPeriod,
                    });
                    yield trialUser.save();
                    failed++;
                }
            }
            catch (error) {
                console.error(`Trial renewal failed for user ${trialUser._id}:`, error);
                failed++;
            }
        }
        res.status(200).json({
            success: true,
            message: `İşlem tamamlandı: ${processed} kullanıcı başarıyla yenilendi, ${failed} kullanıcı için işlem başarısız oldu.`,
            processed,
            failed,
            total: usersWithEndingTrial.length,
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: "Trial abonelik kontrolü sırasında bir hata oluştu",
            error: err.message,
        });
    }
});
exports.checkAndRenewTrialSubscriptions = checkAndRenewTrialSubscriptions;
/**
 * Google token ile giriş yapar ve JWT token döndürür
 * @param req Express request
 * @param res Express response
 */
const googleLogin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Google login isteği alındı:", {
            body: req.body,
            headers: req.headers,
        });
        const { accessToken } = req.body;
        if (!accessToken) {
            console.log("Token bulunamadı:", req.body);
            return res.status(400).json({
                success: false,
                error: "Access token gereklidir",
                details: "Kimlik doğrulama başarısız",
                errorCode: 400,
            });
        }
        const googleService = new googleService_1.GoogleService();
        const authResult = yield googleService.handleAuth({
            user: {
                access_token: accessToken,
            },
        });
        const userId = authResult.user.id;
        yield User_1.User.findByIdAndUpdate(userId, {
            $set: {
                lastSeen: new Date(),
                isOnline: true // opsiyonel
            }
        }, { new: true });
        console.log("Google login başarılı:", { userId: authResult.user.id });
        // Frontend'in beklediği formatta yanıt döndür
        res.json({
            success: true,
            token: authResult.token,
            user: authResult.user,
        });
    }
    catch (error) {
        console.error("Google login error:", error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: "Server error",
            errorCode: 500,
        });
    }
});
exports.googleLogin = googleLogin;
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // İstek yapan kullanıcının admin olup olmadığı kontrolü kaldırıldı.
        // Sadece giriş yapılmış olması yeterli (protect middleware tarafından sağlanıyor).
        // Tüm kullanıcıları parola alanı hariç getirme
        const users = yield User_1.User.find({}).select("-password");
        res.status(200).json({
            success: true,
            users,
        });
    }
    catch (error) {
        console.error("Error retrieving users:", error);
        res.status(500).json({
            success: false,
            message: "Kullanıcılar getirilirken bir hata oluştu",
            error: error.message,
        });
    }
});
exports.getAllUsers = getAllUsers;
const deleteCurrentUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { password } = req.body;
    if (!password) {
        return res.status(400).json({ success: false, message: "Password is required." });
    }
    // Kullanıcıyı getir (şifre dahil)
    const user = yield User_1.User.findById(req.user._id).select("+password");
    if (!user) {
        return res.status(404).json({ success: false, message: "User not found." });
    }
    // Şifre kontrolü
    const isMatch = yield user.matchPassword(password);
    if (!isMatch) {
        return res.status(401).json({ success: false, message: "Incorrect password." });
    }
    // Kullanıcı dokümanını tamamen sil
    yield user.deleteOne();
    // Alternatif: await User.findByIdAndDelete(user._id);
    // (Opsiyonel) ilgili diğer verileri temizle:
    // await Comment.deleteMany({ author: user._id });
    // await Order.deleteMany({ user: user._id });
    // ...
    return res.status(200).json({ success: true, message: "Account successfully deleted." });
});
exports.deleteCurrentUser = deleteCurrentUser;
// DELETE /users/:id — admin deletes any user by ID
const deleteUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Sadece admin
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== "admin") {
            return res.status(403).json({ success: false, message: "Forbidden" });
        }
        const { id } = req.params;
        const user = yield User_1.User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        // Kullanıcıyı tamamen sil
        yield User_1.User.findByIdAndDelete(id);
        // veya: await user.deleteOne();
        // (Opsiyonel) bağlı verileri de sil
        // await Favorite.deleteMany({ user: id });
        // await Post.deleteMany({ author: id });
        // ...
        return res.status(200).json({ success: true, message: "User deleted successfully." });
    }
    catch (err) {
        console.error("deleteUserById error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.deleteUserById = deleteUserById;
/**
 * Kullanıcı oturumunu kapatır
 * @param req Express request
 * @param res Express response
 */
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (user) {
            yield User_1.User.findByIdAndUpdate(user._id, {
                $set: {
                    isOnline: false,
                    lastSeen: new Date()
                }
            });
        }
        res.status(200).json({
            success: true,
            message: "Oturum başarıyla kapatıldı"
        });
    }
    catch (error) {
        console.error("logout error:", error);
        res.status(500).json({
            success: false,
            message: "Oturum kapatılırken hata oluştu"
        });
    }
});
exports.logout = logout;
