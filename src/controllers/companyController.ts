// @ts-nocheck - Typescript hatalarını görmezden gel
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import { Company, ICompany } from "../models/Company";
import mongoose from "mongoose";
import videoUpload from "../middleware/videoUpload";
import { User } from '../models/User';
import { startStartupTrialIfEligible } from "../services/TrialService";

interface CompanyResponse {
  id: string;
  companyName: string;
  companyLogo?: string;
  companyType: string;
  openForInvestments?: boolean;
  businessModel: string;
  companySector: string[];
  companySize: string;
  businessScale: string;
  fundSize?: string;
  companyEmail: string;
  companyPhone: string;
  countryCode: string;
  localPhone: string;
  companyInfo: string;
  detailedDescription: string;
  companyWebsite?: string;
  companyAddress: string;
  companyLinkedIn?: string;
  companyTwitter?: string;
  companyInstagram?: string;
  interestedSectors?: string[];
  isIncorporated?: boolean;
  isHighlighted?: boolean;
  acceptMessages?: boolean;
  numberOfInvestments?: number;
  numberOfExits?: number;
  user: string;
  connectedHub?: string;
  createdAt: Date;
}

// Tüm şirketleri getirme
export const getAllCompanies = async (req: Request, res: Response) => {
  try {
    // Eğer token ile erişim zorunlu ise aşağıdaki satırları aktif edebilirsiniz:
    // const token = req.header('Authorization')?.replace('Bearer ', '');
    // if (!token) {
    //   return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
    // }
    // const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    const companies = await Company.find()
      .populate({
        path: "user",
        select: "accountStatus",
        match: { accountStatus: "active" }
      });

    // populate sonucu user null gelenleri filtrele
    const activeCompanies = companies.filter(c => c.user);
    const companiesResponse: CompanyResponse[] = activeCompanies.map(company => ({
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
  } catch (err: any) {
    res
      .status(500)
      .json({ success: false, message: "Sunucu hatası", error: err.message });
  }
};

// Şirket oluşturma
export const createCompany = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    // Token doğrulama
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res
        .status(401)
        .json({
          success: false,
          message: "Yetkilendirme başarısız, token bulunamadı",
        });
    }
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.id;

    const {
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
      connectedHub,
    } = req.body;

    const company = await Company.create({
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

    const companyResponse: CompanyResponse = {
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
  } catch (err: any) {
    res
      .status(500)
      .json({ success: false, message: "Sunucu hatası", error: err.message });
  }
};

// Belirtilen ID'ye sahip şirketi getirme
export const getCompany = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const company = await Company.findById(id);
    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Şirket bulunamadı" });
    }

    const companyResponse: CompanyResponse = {
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
  } catch (err: any) {
    res
      .status(500)
      .json({ success: false, message: "Sunucu hatası", error: err.message });
  }
};

// Kullanıcıya ait tüm şirketleri getirme
export const getCompaniesForUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    if (
      !userId ||
      typeof userId !== "string" ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Geçersiz Kullanıcı ID'si" });
    }

    // Belirtilen kullanıcı ID'sine sahip şirketleri bulma
    const companies = await Company.find({
      user: new mongoose.Types.ObjectId(userId),
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
  } catch (err: any) {
    res
      .status(500)
      .json({ success: false, message: "Sunucu hatası", error: err.message });
  }
};

// Şirket bilgilerini güncelleme
export const updateCompany = async (req: Request, res: Response) => {
  try {
    // Token doğrulama
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res
        .status(401)
        .json({
          success: false,
          message: "Yetkilendirme başarısız, token bulunamadı",
        });
    }
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.id;
    const userRole = decoded.role;

    const { id } = req.params;
    let company = await Company.findById(id);
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

    const {
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
      connectedHub,
    } = req.body;

    if (companyName) company.companyName = companyName;
    if (companyLogo) company.companyLogo = companyLogo;
    if (companyType) company.companyType = companyType;
    if (openForInvestments !== undefined)
      company.openForInvestments = openForInvestments;
    if (businessModel) company.businessModel = businessModel;
    if (companySector) company.companySector = companySector;
    if (companySize) company.companySize = companySize;
    if (businessScale) company.businessScale = businessScale;
    if (fundSize) company.fundSize = fundSize;
    if (companyEmail) company.companyEmail = companyEmail;
    if (companyPhone) company.companyPhone = companyPhone;
    if (countryCode) company.countryCode = countryCode;
    if (localPhone) company.localPhone = localPhone;
    if (companyInfo) company.companyInfo = companyInfo;
    if (detailedDescription) company.detailedDescription = detailedDescription;
    if (companyWebsite) company.companyWebsite = companyWebsite;
    if (companyAddress) company.companyAddress = companyAddress;
    if (companyLinkedIn) company.companyLinkedIn = companyLinkedIn;
    if (companyTwitter) company.companyTwitter = companyTwitter;
    if (companyInstagram) company.companyInstagram = companyInstagram;
    if (interestedSectors) company.interestedSectors = interestedSectors;
    if (isIncorporated !== undefined) company.isIncorporated = isIncorporated;
    if (isHighlighted !== undefined) company.isHighlighted = isHighlighted;
    if (acceptMessages !== undefined) company.acceptMessages = acceptMessages;
    if (numberOfInvestments !== undefined) company.numberOfInvestments = numberOfInvestments;
    if (numberOfExits !== undefined) company.numberOfExits = numberOfExits;
    if (connectedHub !== undefined) {
      company.connectedHub = connectedHub;
    }

    await company.save();

    const companyResponse: CompanyResponse = {
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
  } catch (err: any) {
    res
      .status(500)
      .json({ success: false, message: "Sunucu hatası", error: err.message });
  }
};

// Şirket silme
export const deleteCompany = async (req: Request, res: Response) => {
  try {
    // Token doğrulaması
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res
        .status(401)
        .json({
          success: false,
          message: "Yetkilendirme başarısız, token bulunamadı",
        });
    }
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.id;

    const { id } = req.params;
    const company = await Company.findById(id);
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
    await company.deleteOne();
    res
      .status(200)
      .json({ success: true, message: "Şirket başarıyla silindi" });
  } catch (err: any) {
    res
      .status(500)
      .json({ success: false, message: "Sunucu hatası", error: err.message });
  }
};

// Video yükleme endpoint'i
export const uploadCompanyVideo = async (req: Request, res: Response) => {
  try {
    const companyId = req.params.id;
    const company = await Company.findById(companyId);

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
    await company.save();

    res.status(200).json({
      success: true,
      data: company,
      message: "Video başarıyla yüklendi",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Video yükleme başarısız",
      error: error.message,
    });
  }
};

// Kullanıcının e-posta domain’ine göre, hâlihazırda o kullanıcıya ait olmayan şirketleri getir
export const matchCompaniesByDomain = async (req: Request, res: Response) => {
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
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: 'Yetkilendirme başarısız, token yok' });
    }
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.id;

    // 3) companyEmail alanı “@domain” ile biten, ama user !== userId olanları bul
    const companies = await Company.find({
      companyEmail: { $regex: new RegExp(`@${domain}$`, 'i') },
      user: { $ne: userId }
    })
      .select('companyName companyEmail companyLogo user');

    // 4) Döndür
    res.status(200).json({ success: true, companies });
  } catch (err: any) {
    res
      .status(500)
      .json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};

export const claimCompany = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid company ID" });
    }

    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ success: false, message: "Token missing" });
    }
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.id;

    if (company.user.toString() === userId) {
      return res.status(400).json({ success: false, message: "You already own this company" });
    }

    const user = await User.findById(userId).select("email trialEndsAt subscriptionStatus nextPaymentDate");
    if (!user?.email) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const userDomain = user.email.split("@")[1]?.toLowerCase();
    const companyDomain = company.companyEmail?.split("@")[1]?.toLowerCase();
    if (!userDomain || !companyDomain || userDomain !== companyDomain) {
      return res.status(403).json({ success: false, message: "Email domain does not match" });
    }

    // Atama
    company.user = userId;
    await company.save();

    // ✅ Domain claim ile anında 6 aylık trial (aboneliği yoksa)
    const trialResult = await startStartupTrialIfEligible(String(userId), {
      months: 6,
      source: "domain_claim",
    });

    return res.status(200).json({
      success: true,
      message: "Company successfully claimed",
      company,
      trial: trialResult, // { applied: boolean, reason?: string, trialEndsAt?: Date }
    });
  } catch (err: any) {
    console.error("claimCompany error:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};
