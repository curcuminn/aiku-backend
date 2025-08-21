/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { IUser, User } from "../models/User";
import { UserResponse } from "../types/UserResponse";
import { authService } from "../services/authService";
import { GoogleService } from "../services/googleService";
import crypto from "crypto";
// import { mailgunService } from "../services/mailgunService";
import { brevoService } from "../services/brevoService";
import { is } from "cheerio/dist/commonjs/api/traversing";

const createToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET!, {
    expiresIn: "90d", // Token süresini 90 güne çıkarıyoruz
  });
};

export const register = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      firstName,
      lastName,
      email,
      accountStatus = "active",
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
      acceptChatNotification,
    } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        message: "This email address is already registered.",
      });
    }

    // E-posta doğrulama tokeni oluştur
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat

    user = await User.create({
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
      await brevoService.sendVerificationEmail(email, verificationToken);
    } catch (error) {
      console.error("Verification email was not sent:", error);
      // E-posta gönderilemese bile kullanıcı kaydını tamamla
    }

    const token = createToken(user._id);

    const hasActiveSubscription =
      user.subscriptionStatus === "active" ||
      user.subscriptionStatus === "trial";

    const userResponse: UserResponse = {
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
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
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
    await user.save();

    // Frontend'e yönlendir
    if (process.env.FRONTEND_URL) {
      return res.redirect(`${process.env.FRONTEND_URL}/api/auth/verify-email/${token}`);
    }

    // Eğer FRONTEND_URL tanımlı değilse JSON yanıtı döndür
    res.json({
      success: true,
      message: "Your email address has been verified successfully.",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const resendVerificationEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
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
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    // Yeni doğrulama e-postası gönder
    try {
      await brevoService.sendVerificationEmail(email, verificationToken);
      res.json({
        success: true,
        message: "Verification email resent.",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Verification email was not sent. Please try again later.",
      });
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const requestEmailChange = async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    const { newEmail } = req.body;
    if (!newEmail) {
      return res.status(400).json({ success: false, message: "newEmail is required." });
    }

    // 1) yeni email kullanımda mı kontrol
    const exists = await User.findOne({ email: newEmail });
    if (exists) {
      return res.status(400).json({ success: false, message: "Email already in use." });
    }

    // 2) 6 haneli kod ve expiry oluştur
    const changeCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresInMinutes = 15;
    user.newEmail = newEmail;
    user.emailChangeToken = changeCode;
    user.emailChangeExpires = new Date(Date.now() + expiresInMinutes * 60_000);
    await user.save();

    // 3) mail gönder
    await brevoService.sendEmailChangeCode(newEmail, changeCode, expiresInMinutes);

    res.json({ success: true, message: "Verification code sent to your new email address." });
  } catch (err: any) {
    console.error("Error in requestEmailChange:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const confirmEmailChange = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: "code is required." });
    }

    // token ve expiry kontrolü (select:false alanları da getiriyoruz)
    const user = await User.findOne({
      emailChangeToken: code,
      emailChangeExpires: { $gt: new Date() }
    }).select("+newEmail +emailChangeExpires");

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired code." });
    }

    // geçerliyse email’i güncelle
    user.email = user.newEmail!;
    user.newEmail = undefined;
    user.emailChangeToken = undefined;
    user.emailChangeExpires = undefined;
    user.emailVerified = true; // isteğe bağlı
    await user.save();

    res.json({ success: true, message: "Email address updated successfully." });
  } catch (err: any) {
    console.error("Error in confirmEmailChange:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
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

    const isMatch = await user.matchPassword(password);
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
    await user.save();

    const token = createToken(user._id);

    const hasActiveSubscription =
      user.subscriptionStatus === "active" ||
      user.subscriptionStatus === "trial";

    const userResponse: UserResponse = {
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
      favoriteIdeas: Array.isArray((user as any).favoriteIdeas)
          ? (user as any).favoriteIdeas
          : [],
    };

    res.status(200).json({
      success: true,
      token,
      user: userResponse,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "You need to sign in",
      });
    }

    // Kullanıcı aktif bir aboneliğe sahip mi?
    const hasActiveSubscription =
      user.subscriptionStatus === "active" ||
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
        favoriteIdeas: Array.isArray((user as any).favoriteIdeas)
          ? (user as any).favoriteIdeas
          : [],
      },
    });
  } catch (err: any) {
    console.error("Error while getting user information:", err);
    res.status(500).json({
      success: false,
      message: "An error occurred while retrieving user information.",
      error: err.message,
    });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "You need to sign in.",
      });
    }

    // Güncellenmek istenen alanları al
    const {
      firstName,
      lastName,
      email,
      accountStatus,
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
      password,
      locale,
      isAngelInvestor,
      role,
      acceptChatNotification,
    } = req.body;

    // Gerekli alanları güncelle
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (accountStatus) user.accountStatus = accountStatus;
    if (phone) user.phone = phone;
    if (countryCode) user.countryCode = countryCode;
    if (localPhone) user.localPhone = localPhone;
    if (title) user.title = title;
    if (location) user.location = location;
    if (profileInfo) user.profileInfo = profileInfo;
    if (profilePhoto) user.profilePhoto = profilePhoto;
    if (linkedin) user.linkedin = linkedin;
    if (instagram) user.instagram = instagram;
    if (facebook) user.facebook = facebook;
    if (twitter) user.twitter = twitter;
    if (locale) user.locale = locale;
    if (typeof isAngelInvestor !== 'undefined') {
      user.isAngelInvestor = isAngelInvestor;
    }
    if (typeof acceptChatNotification !== 'undefined') {
      user.acceptChatNotification = acceptChatNotification;
    }

    // Şifre güncelleniyorsa hashle
    if (password && password.length >= 6) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    // Güncellenmiş kullanıcıyı kaydet
    await user.save();

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
  } catch (err: any) {
    console.error("User update error:", err);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating user information.",
      error: err.message,
    });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  // 1) Validator errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    // 2) Load user along with password
    const userId = (req.user as IUser)._id;
    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const { currentPassword, newPassword } = req.body;

    // 3) Verify current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    // 4) Assign new password and save (pre-save hook will hash it)
    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("changePassword error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const hasActiveSubscription =
      user.subscriptionStatus === "active" ||
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
  } catch (err: any) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

export const updateUserById = async (req: Request, res: Response) => {
  // Sadece admin rolündekilere izin ver
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Yetkiniz yok.' });
  }

  const { id } = req.params;
  const user = await User.findById(id);
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
      (user as any)[field] = req.body[field];
    }
  });

  await user.save();

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
};

export const addFavorite = async (req: Request, res: Response) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authorization failed, token not found.",
      });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const user = await User.findById(decoded.id);
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
    } else if (type === "company") {
      if (user.favoriteCompanies && user.favoriteCompanies.includes(itemId)) {
        return res
          .status(400)
          .json({ success: false, message: "Şirket zaten favorilerde" });
      }
      user.favoriteCompanies = user.favoriteCompanies || [];
      user.favoriteCompanies.push(itemId);
    } else if (type === "product") {
      if (user.favoriteProducts && user.favoriteProducts.includes(itemId)) {
        return res
          .status(400)
          .json({ success: false, message: "Ürün zaten favorilerde" });
      }
      user.favoriteProducts = user.favoriteProducts || [];
      user.favoriteProducts.push(itemId);
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Geçersiz favori türü" });
    }

    await user.save();
    res.status(200).json({ success: true, message: "Favorilere eklendi" });
  } catch (err: any) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

export const removeFavorite = async (req: Request, res: Response) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authorization failed, token not found.",
      });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const user = await User.findById(decoded.id);
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
      user.favoriteUsers = user.favoriteUsers.filter(
        (fav) => fav.toString() !== itemId
      );
    } else if (type === "company") {
      user.favoriteCompanies = user.favoriteCompanies || [];
      user.favoriteCompanies = user.favoriteCompanies.filter(
        (fav) => fav.toString() !== itemId
      );
    } else if (type === "product") {
      user.favoriteProducts = user.favoriteProducts || [];
      user.favoriteProducts = user.favoriteProducts.filter(
        (fav) => fav.toString() !== itemId
      );
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Geçersiz favori türü" });
    }

    await user.save();
    res.status(200).json({ success: true, message: "Favoriden kaldırıldı" });
  } catch (err: any) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

export const getFavorites = async (req: Request, res: Response) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authorization failed, token not found.",
      });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const user = await User.findById(decoded.id)
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
  } catch (err: any) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

export const googleCallback = async (req: Request, res: Response) => {
  try {
    console.log("[GoogleCallback] Callback başladı");

    if (!req.user) {
      console.error("[GoogleCallback] User not found");
      return res.redirect(
        `${process.env.CLIENT_URL}/auth/login?error=google-user-not-found`
      );
    }

    console.log("[GoogleCallback] Kullanıcı bilgileri alındı:", {
      userId: (req.user as IUser)._id,
      email: (req.user as IUser).email,
    });

    // JWT token oluştur
    const token = createToken((req.user as IUser)._id);
    console.log("[GoogleCallback] JWT token oluşturuldu");

    // Frontend'e yönlendir
    const user = req.user as IUser;
    const hasActiveSubscription =
      user.subscriptionStatus === "active" ||
      user.subscriptionStatus === "trial";

    user.lastSeen = new Date();
    await user.save();

    user.acceptChatNotification = user.acceptChatNotification ?? true;

    const redirectUrl = encodeURIComponent(
      JSON.stringify({
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profilePhoto: user.profilePhoto,
          isSubscriptionActive: hasActiveSubscription,
        },
      })
    );

    console.log(
      "[GoogleCallback] Frontend'e yönlendirme:",
      `${process.env.CLIENT_URL}/auth/social-callback?data=${redirectUrl}`
    );
    return res.redirect(
      `${process.env.CLIENT_URL}/auth/social-callback?data=${redirectUrl}`
    );
  } catch (error) {
    console.error("[GoogleCallback] Hata:", error);
    return res.redirect(
      `${process.env.CLIENT_URL}/auth/login?error=google-callback-failed`
    );
  }
};

export const fixSubscription = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "You need to sign in",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Abonelik durumunu kontrol et
    const hasActiveSubscription =
      user.subscriptionStatus === "active" ||
      user.subscriptionStatus === "trial";

    let updated = false;

    // Eğer paymentHistory içerisinde başarılı ödeme varsa ve status active değilse
    if (
      user.paymentHistory &&
      user.paymentHistory.length > 0 &&
      user.paymentHistory.some((p) => p.status === "success")
    ) {
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
        await user.save();
        console.log("User subscription status updated:", {
          userId: user._id,
          status: user.subscriptionStatus,
          isActive: user.isSubscriptionActive,
        });
      }
    }

    // Tüm kullanıcı verilerini getirerek durumu kontrol et
    const refreshedUser = await User.findById(userId);

    // Son başarılı ödeme tarihini ve kullanıcı bilgilerini getir
    const lastSuccessfulPayment = refreshedUser?.paymentHistory?.find(
      (p) => p.status === "success"
    );

    res.status(200).json({
      success: true,
      updated,
      data: {
        userId: refreshedUser?._id,
        subscriptionStatus: refreshedUser?.subscriptionStatus,
        isSubscriptionActive: refreshedUser?.isSubscriptionActive,
        manualCheck:
          refreshedUser?.subscriptionStatus === "active" ||
          refreshedUser?.subscriptionStatus === "trial",
        subscriptionStartDate: refreshedUser?.subscriptionStartDate,
        lastPaymentDate: refreshedUser?.lastPaymentDate,
        lastSuccessfulPayment,
        debug: {
          subscriptionStatusType: typeof refreshedUser?.subscriptionStatus,
          subscriptionStatusLength: refreshedUser?.subscriptionStatus
            ? refreshedUser.subscriptionStatus.length
            : 0,
          statusRaw: refreshedUser?.subscriptionStatus,
          statusTrimmed: refreshedUser?.subscriptionStatus
            ? refreshedUser.subscriptionStatus.trim()
            : "",
          statusCharCodes: refreshedUser?.subscriptionStatus
            ? Array.from(refreshedUser.subscriptionStatus).map((c) =>
              c.charCodeAt(0)
            )
            : [],
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "An error occurred while checking subscription status",
      error: error.message,
    });
  }
};

export const createOrUpdateSubscription = async (
  req: Request,
  res: Response
) => {
  try {
    // @ts-ignore - req.user tipini IUser olarak kabul ediyoruz
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "You need to sign in",
      });
    }

    const user = await User.findById(userId);
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
    const isFirstSubscription =
      !user.subscriptionStatus ||
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
    } else {
      // Normal ücretli abonelik
      user.subscriptionStatus = "active";
      user.subscriptionStartDate = now;
      user.isSubscriptionActive = true;

      // Dönem sonunu hesapla
      if (period === "monthly") {
        nextPaymentDate = new Date(now);
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
      } else {
        // Yıllık abonelik
        nextPaymentDate = new Date(now);

        // Business ve Investor planları için yıllık abonelikte 3 ay bonus (12+3=15 ay)
        if (plan === "business" || plan === "investor") {
          nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 12 + 3);
        } else {
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
    } else if (plan === "business") {
      amount = period === "monthly" ? 199 : 1990;
    } else if (plan === "investor") {
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

    await user.save();

    // Yanıt döndür
    const hasActiveSubscription =
      user.subscriptionStatus === "active" ||
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
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: "An error occurred during the subscription process",
      error: err.message,
    });
  }
};

// Trial abonelikler için kontrol ve otomatik ödeme yenileme - bu genellikle bir cronjob olarak çalışır
// Bu kod örnek olup, gerçek uygulamada bir cronjob servisi tarafından günlük olarak çağrılmalıdır
export const checkAndRenewTrialSubscriptions = async (
  req: Request,
  res: Response
) => {
  try {
    // Sadece admin kullanıcısına izin ver
    // ts-expect-error - req.user tipini IUser olarak kabul ediyoruz
    const userId = req.user?._id;
    const user = await User.findById(userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Bu işlem için yetkiniz bulunmamaktadır",
      });
    }

    const now = new Date();

    // Deneme süresi bugün biten ve otomatik yenileme açık olan kullanıcıları bul
    const usersWithEndingTrial = await User.find({
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
          } else {
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

          await trialUser.save();
          processed++;
        } else {
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

          await trialUser.save();
          failed++;
        }
      } catch (error) {
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
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: "Trial abonelik kontrolü sırasında bir hata oluştu",
      error: err.message,
    });
  }
};

/**
 * Google token ile giriş yapar ve JWT token döndürür
 * @param req Express request
 * @param res Express response
 */
export const googleLogin = async (req: Request, res: Response) => {
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

    const googleService = new GoogleService();
    const authResult = await googleService.handleAuth({
      user: {
        access_token: accessToken,
      },
    });
    const userId = authResult.user.id;

    await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          lastSeen: new Date(),
          isOnline: true    // opsiyonel
        }
      },
      { new: true }
    );

    console.log("Google login başarılı:", { userId: authResult.user.id });

    // Frontend'in beklediği formatta yanıt döndür
    res.json({
      success: true,
      token: authResult.token,
      user: authResult.user,
    });
  } catch (error: any) {
    console.error("Google login error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: "Server error",
      errorCode: 500,
    });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    // İstek yapan kullanıcının admin olup olmadığı kontrolü kaldırıldı.
    // Sadece giriş yapılmış olması yeterli (protect middleware tarafından sağlanıyor).

    // Tüm kullanıcıları parola alanı hariç getirme
    const users = await User.find({}).select("-password");

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error: any) {
    console.error("Error retrieving users:", error);
    res.status(500).json({
      success: false,
      message: "Kullanıcılar getirilirken bir hata oluştu",
      error: error.message,
    });
  }
};

export const deleteCurrentUser = async (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, message: "Password is required." });
  }

  // Kullanıcıyı getir (şifre dahil)
  const user = await User.findById((req.user as IUser)._id).select("+password");
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  // Şifre kontrolü
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: "Incorrect password." });
  }

  // Kullanıcı dokümanını tamamen sil
  await user.deleteOne();
  // Alternatif: await User.findByIdAndDelete(user._id);

  // (Opsiyonel) ilgili diğer verileri temizle:
  // await Comment.deleteMany({ author: user._id });
  // await Order.deleteMany({ user: user._id });
  // ...

  return res.status(200).json({ success: true, message: "Account successfully deleted." });
};



// DELETE /users/:id — admin deletes any user by ID
export const deleteUserById = async (req: Request, res: Response) => {
  try {
    // Sadece admin
    if (req.user?.role !== "admin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Kullanıcıyı tamamen sil
    await User.findByIdAndDelete(id);
    // veya: await user.deleteOne();

    // (Opsiyonel) bağlı verileri de sil
    // await Favorite.deleteMany({ user: id });
    // await Post.deleteMany({ author: id });
    // ...

    return res.status(200).json({ success: true, message: "User deleted successfully." });
  } catch (err) {
    console.error("deleteUserById error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};



/**
 * Kullanıcı oturumunu kapatır
 * @param req Express request
 * @param res Express response
 */
export const logout = async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser;
    if (user) {
      await User.findByIdAndUpdate(user._id, {
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
  } catch (error) {
    console.error("logout error:", error);
    res.status(500).json({
      success: false,
      message: "Oturum kapatılırken hata oluştu"
    });
  }
};

export const checkUserAuthMethod = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email adresi gereklidir"
      });
    }

    // Kullanıcıyı bul
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    }).select('email authProvider googleId linkedinId supabaseId password accountStatus');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Bu email adresi ile kayıtlı kullanıcı bulunamadı"
      });
    }

    // Hesap durumunu kontrol et
    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        message: "Hesabınız aktif değil"
      });
    }

    // Giriş yöntemini belirle - sadece authProvider alanına bak
    const authMethod = user.authProvider || 'email';
    let hasPassword = !!user.password;
    let socialProvider = null;

    // Social provider'ı belirle
    if (authMethod === 'google') {
      socialProvider = 'google';
    } else if (authMethod === 'linkedin') {
      socialProvider = 'linkedin';
    } else if (authMethod === 'email') {
      // Email ile kayıt olmuş kullanıcı
      hasPassword = !!user.password;
    }

    return res.status(200).json({
      success: true,
      data: {
        email: user.email,
        authMethod,
        hasPassword,
        socialProvider,
        canLoginWithPassword: hasPassword,
        requiresSocialLogin: !hasPassword && socialProvider !== null
      }
    });

  } catch (error) {
    console.error('Kullanıcı giriş yöntemi kontrolünde hata:', error);
    return res.status(500).json({
      success: false,
      message: "Sunucu hatası oluştu"
    });
  }
};

/**
 * Mobil için sosyal email kodu gönderir
 * @param req Express request
 * @param res Express response
 */
export const sendMobileSocialEmailCode = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email adresi gereklidir"
      });
    }

    // Kullanıcıyı bul
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Bu email adresi ile kayıtlı kullanıcı bulunamadı"
      });
    }

    // Hesap durumunu kontrol et
    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        message: "Hesabınız aktif değil"
      });
    }

    // 6 haneli kod oluştur
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresInMinutes = 10; // 10 dakika geçerli

    // Kullanıcıya geçici kod alanları ekle (User modelinde yoksa eklenebilir)
    user.mobileVerificationCode = verificationCode;
    user.mobileVerificationExpires = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    await user.save();

    // Debug: Kaydedilen kodu logla
    console.log('💾 DEBUG - Kod kaydedildi:', {
      email: user.email,
      verificationCode,
      expiresInMinutes,
      savedCode: user.mobileVerificationCode
    });

    // Mail gönder
    try {
      await brevoService.sendMobileVerificationCode(email, verificationCode, expiresInMinutes);
      
      res.status(200).json({
        success: true,
        message: "Doğrulama kodu email adresinize gönderildi",
        data: {
          email: user.email,
          expiresInMinutes
        }
      });
    } catch (error) {
      console.error('Mail gönderme hatası:', error);
      
      // Test için: Mail gönderilemese bile kodu console'a yazdır
      console.log('🔐 TEST KODU:', verificationCode);
      console.log('📧 Email:', email);
      console.log('⏰ Süre:', expiresInMinutes, 'dakika');
      
      res.status(200).json({
        success: true,
        message: "Doğrulama kodu oluşturuldu (test modu)",
        data: {
          email: user.email,
          expiresInMinutes,
          testCode: verificationCode // Test için kodu response'da da gönder
        }
      });
    }

  } catch (error) {
    console.error('Mobil sosyal email kodu gönderme hatası:', error);
    res.status(500).json({
      success: false,
      message: "Sunucu hatası oluştu"
    });
  }
};

/**
 * Mobil için sosyal email kodunu doğrular
 * @param req Express request
 * @param res Express response
 */
export const verifyMobileSocialEmailCode = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: "Email adresi ve doğrulama kodu gereklidir"
      });
    }

    // Kullanıcıyı bul - select: false alanları da getir
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    }).select('+mobileVerificationCode +mobileVerificationExpires email accountStatus authProvider');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Bu email adresi ile kayıtlı kullanıcı bulunamadı"
      });
    }

    // Debug: Kullanıcı bilgilerini logla
    console.log('🔍 DEBUG - Kullanıcı bilgileri:', {
      email: user.email,
      mobileVerificationCode: user.mobileVerificationCode,
      mobileVerificationExpires: user.mobileVerificationExpires,
      submittedCode: code
    });

    // Kod kontrolü
    if (!user.mobileVerificationCode || user.mobileVerificationCode !== code) {
      console.log('❌ Kod eşleşmedi:', {
        storedCode: user.mobileVerificationCode,
        submittedCode: code,
        match: user.mobileVerificationCode === code
      });
      return res.status(400).json({
        success: false,
        message: "Geçersiz doğrulama kodu"
      });
    }

    // Süre kontrolü
    if (!user.mobileVerificationExpires || new Date() > user.mobileVerificationExpires) {
      return res.status(400).json({
        success: false,
        message: "Doğrulama kodunun süresi dolmuş"
      });
    }

    // Kodu temizle ve kullanıcıyı güncelle
    user.mobileVerificationCode = undefined;
    user.mobileVerificationExpires = undefined;
    user.lastLogin = new Date();
    user.isOnline = true;
    await user.save();

    // JWT token oluştur
    const token = createToken(user._id);

    // Kullanıcı bilgilerini hazırla
    const hasActiveSubscription = user.subscriptionStatus === "active" || user.subscriptionStatus === "trial";

    const userResponse: UserResponse = {
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
      favoriteIdeas: Array.isArray((user as any).favoriteIdeas)
          ? (user as any).favoriteIdeas
          : [],
    };

    res.status(200).json({
      success: true,
      message: "Doğrulama başarılı",
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Mobil sosyal email kodu doğrulama hatası:', error);
    res.status(500).json({
      success: false,
      message: "Sunucu hatası oluştu"
    });
  }
};

/**
 * Şifre sıfırlama kodu gönderir
 * @param req Express request
 * @param res Express response
 */
export const sendPasswordResetCode = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email adresi gereklidir"
      });
    }

    // Kullanıcıyı bul
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    }).select('email accountStatus authProvider password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Bu email adresi ile kayıtlı kullanıcı bulunamadı"
      });
    }

    // Hesap durumunu kontrol et
    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        message: "Hesabınız aktif değil"
      });
    }

    // Sosyal medya ile giriş yapmış kullanıcılar için şifre sıfırlama yapılamaz
    if (user.authProvider !== 'email' || !user.password) {
      return res.status(400).json({
        success: false,
        message: "Bu hesap sosyal medya ile kayıt olmuş. Şifre sıfırlama yapılamaz."
      });
    }

    // 6 haneli kod oluştur
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresInMinutes = 15; // 15 dakika geçerli

    // Kullanıcıya şifre sıfırlama kodunu kaydet
    user.passwordResetToken = resetCode;
    user.passwordResetExpires = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    await user.save();

    // Debug: Kaydedilen kodu logla
    console.log('💾 DEBUG - Şifre sıfırlama kodu kaydedildi:', {
      email: user.email,
      resetCode,
      expiresInMinutes,
      savedCode: user.passwordResetToken
    });

    // Mail gönder
    try {
      await brevoService.sendPasswordResetCode(email, resetCode, expiresInMinutes);
      
      res.status(200).json({
        success: true,
        message: "Şifre sıfırlama kodu email adresinize gönderildi",
        data: {
          email: user.email,
          expiresInMinutes
        }
      });
    } catch (error) {
      console.error('Mail gönderme hatası:', error);
      
      // Test için: Mail gönderilemese bile kodu console'a yazdır
      console.log('🔐 TEST ŞİFRE SIFIRLAMA KODU:', resetCode);
      console.log('📧 Email:', email);
      console.log('⏰ Süre:', expiresInMinutes, 'dakika');
      
      res.status(200).json({
        success: true,
        message: "Şifre sıfırlama kodu oluşturuldu (test modu)",
        data: {
          email: user.email,
          expiresInMinutes,
          testCode: resetCode // Test için kodu response'da da gönder
        }
      });
    }

  } catch (error) {
    console.error('Şifre sıfırlama kodu gönderme hatası:', error);
    res.status(500).json({
      success: false,
      message: "Sunucu hatası oluştu"
    });
  }
};

/**
 * Şifre sıfırlama kodunu doğrular ve yeni şifre belirler
 * @param req Express request
 * @param res Express response
 */
export const verifyPasswordResetCode = async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email adresi, doğrulama kodu ve yeni şifre gereklidir"
      });
    }

    // Yeni şifre validasyonu
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Yeni şifre en az 6 karakter olmalıdır"
      });
    }

    // Kullanıcıyı bul - select: false alanları da getir
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    }).select('+passwordResetToken +passwordResetExpires email accountStatus authProvider password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Bu email adresi ile kayıtlı kullanıcı bulunamadı"
      });
    }

    // Hesap durumunu kontrol et
    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        message: "Hesabınız aktif değil"
      });
    }

    // Sosyal medya ile giriş yapmış kullanıcılar için şifre sıfırlama yapılamaz
    if (user.authProvider !== 'email' || !user.password) {
      return res.status(400).json({
        success: false,
        message: "Bu hesap sosyal medya ile kayıt olmuş. Şifre sıfırlama yapılamaz."
      });
    }

    // Debug: Kullanıcı bilgilerini logla
    console.log('🔍 DEBUG - Şifre sıfırlama kullanıcı bilgileri:', {
      email: user.email,
      passwordResetToken: user.passwordResetToken,
      passwordResetExpires: user.passwordResetExpires,
      submittedCode: code
    });

    // Kod kontrolü
    if (!user.passwordResetToken || user.passwordResetToken !== code) {
      console.log('❌ Şifre sıfırlama kodu eşleşmedi:', {
        storedCode: user.passwordResetToken,
        submittedCode: code,
        match: user.passwordResetToken === code
      });
      return res.status(400).json({
        success: false,
        message: "Geçersiz doğrulama kodu"
      });
    }

    // Süre kontrolü
    if (!user.passwordResetExpires || new Date() > user.passwordResetExpires) {
      return res.status(400).json({
        success: false,
        message: "Doğrulama kodunun süresi dolmuş"
      });
    }

    // Yeni şifreyi hashle ve kaydet
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    // Kodu temizle
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Şifreniz başarıyla güncellendi"
    });

  } catch (error) {
    console.error('Şifre sıfırlama kodu doğrulama hatası:', error);
    res.status(500).json({
      success: false,
      message: "Sunucu hatası oluştu"
    });
  }
};
