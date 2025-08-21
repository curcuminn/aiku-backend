// @ts-nocheck - Typescript hatalarını görmezden gel
import { Request, Response } from "express";
import linkedinAuthService from "../services/linkedinAuth.service";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import dotenv from "dotenv";
import { User } from "../models/User";

dotenv.config();

class LinkedInAuthController {
  /**
   * LinkedIn giriş URL'sini döndürür
   */
  async getLinkedInAuthURL(req: Request, res: Response): Promise<void> {
    try {
      const { platform } = req.query;
      console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Controller] URL isteği alındı. Platform:', platform);
      
      const authURL = linkedinAuthService.getLinkedInAuthURL(platform as string);
      console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn Controller] URL başarıyla oluşturuldu');
      
      res.status(200).json({ url: authURL });
    } catch (error: any) {
      console.log('\x1b[31m%s\x1b[0m', '🔴 [LinkedIn Controller] URL oluşturma hatası:', error.message);
      res.status(500).json({
        error: error.message || "LinkedIn auth URL oluşturulurken bir hata oluştu",
      });
    }
  }

  /**
   * LinkedIn kimlik doğrulama geri dönüş işlemini gerçekleştirir
   */
  async handleLinkedInCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.body;
      console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Callback] İstek alındı. Code:', code);

      if (!code) {
        console.log('\x1b[31m%s\x1b[0m', '🔴 [LinkedIn Callback] Code parametresi eksik!');
        res.status(400).json({ error: "Authorization code gereklidir" });
        return;
      }

      // LinkedIn code'dan token al
      console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Callback] Token alınıyor...');
      const tokenData = await linkedinAuthService.getTokenFromCode(code);
      console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn Callback] Token alındı');

      // Token ile kullanıcı bilgilerini al
      console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Callback] Kullanıcı bilgileri alınıyor...');
      const userInfo = await linkedinAuthService.getUserInfo(tokenData.access_token);
      console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn Callback] Kullanıcı bilgileri alındı');

      // Kullanıcıyı Supabase'e kaydet/güncelle
      console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Callback] Supabase işlemleri başlıyor...');
      const userData = await linkedinAuthService.signInWithLinkedIn(userInfo);
      console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn Callback] Supabase işlemleri tamamlandı');

      // MongoDB'de kullanıcıyı ara veya oluştur
      console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Callback] MongoDB\'de kullanıcı aranıyor...');
      let mongoUser = await User.findOne({ email: userInfo.email });

      if (!mongoUser) {
        // Kullanıcı yoksa MongoDB'de oluştur
        console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Callback] Yeni MongoDB kullanıcısı oluşturuluyor...');
        mongoUser = new User({
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          email: userInfo.email,
          supabaseId: userData.id,
          linkedinId: userInfo.id,
          authProvider: "linkedin",
          emailVerified: true,
          lastLogin: new Date(),
          profilePhoto: userInfo.profilePicture || "",
          linkedin: `https://www.linkedin.com/in/${userInfo.id}/`,
        });

        await mongoUser.save();
        console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn Callback] Yeni MongoDB kullanıcısı oluşturuldu');
      } else {
        // Kullanıcı varsa bilgilerini güncelle
        console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Callback] Mevcut MongoDB kullanıcısı güncelleniyor...');
        mongoUser.supabaseId = userData.id;
        mongoUser.linkedinId = userInfo.id;
        mongoUser.lastLogin = new Date();
        
        // Her LinkedIn girişinde authProvider'ı güncelle
        mongoUser.authProvider = "linkedin";

        if (!mongoUser.firstName) mongoUser.firstName = userInfo.firstName;
        if (!mongoUser.lastName) mongoUser.lastName = userInfo.lastName;
        if (!mongoUser.linkedin)
          mongoUser.linkedin = `https://www.linkedin.com/in/${userInfo.id}/`;
        if (userInfo.profilePicture && !mongoUser.profilePhoto)
          mongoUser.profilePhoto = userInfo.profilePicture;

        await mongoUser.save();
        console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn Callback] MongoDB kullanıcısı güncellendi');
      }

      // JWT token oluştur
      console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Callback] JWT token oluşturuluyor...');
      const jwtSecret: Secret = process.env.JWT_SECRET || "your-super-secret-jwt-key";
      const jwtExpire: string = process.env.JWT_EXPIRE || "24h";
      const jwtOptions: SignOptions = { expiresIn: jwtExpire };

      const token = jwt.sign(
        { id: mongoUser._id.toString() },
        jwtSecret,
        jwtOptions
      );
      console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn Callback] JWT token oluşturuldu');

      // Frontend'e kullanıcı bilgilerini ve token'ı gönder
      console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn Callback] İşlem başarıyla tamamlandı');
      res.status(200).json({
        token,
        user: {
          id: mongoUser._id,
          email: mongoUser.email,
          firstName: mongoUser.firstName,
          lastName: mongoUser.lastName,
          provider: "linkedin",
          profilePhoto: mongoUser.profilePhoto,
        },
      });
    } catch (error: any) {
      console.log('\x1b[31m%s\x1b[0m', '🔴 [LinkedIn Callback] HATA:', error.message);
      res.status(500).json({
        error: error.message || "LinkedIn callback işlenirken bir hata oluştu",
      });
    }
  }
}

export default new LinkedInAuthController();
