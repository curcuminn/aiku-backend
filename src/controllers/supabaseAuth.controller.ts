import { Request, Response } from 'express';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';
import { Secret, SignOptions } from 'jsonwebtoken';

class SupabaseAuthController {
  /**
   * Supabase kullanıcı bilgilerini senkronize eder
   * Bu endpoint, frontend'den Supabase ile giriş yapan kullanıcıları backend'e senkronize etmek için kullanılır
   */
  async syncSupabaseUser(req: Request, res: Response) {
    try {
      const supabaseUser = req.user;
      const { provider, supabase_user_id, email, user_metadata } = req.body;
      
      if (!supabaseUser) {
        return res.status(400).json({
          success: false,
          message: 'Kullanıcı bilgileri bulunamadı'
        });
      }

      console.log('Gelen Supabase verileri:', {
        supabaseUser,
        requestBody: req.body,
        headers: req.headers
      });

      // İsim bilgilerini çıkart
      const firstName = user_metadata?.given_name || user_metadata?.first_name || '';
      const lastName = user_metadata?.family_name || user_metadata?.last_name || '';
      const profilePhoto = user_metadata?.picture || user_metadata?.avatar_url || '';
      
      // LinkedIn veya diğer sağlayıcı kontrolü
      let authProvider = provider || 'email';
      
      // linkedin_oidc'i linkedin olarak normalize et
      if (authProvider === 'linkedin_oidc') {
        authProvider = 'linkedin';
      }
      
      console.log('Çıkarılan kullanıcı bilgileri:', {
        firstName,
        lastName,
        profilePhoto,
        authProvider
      });

      // Önce email ile kullanıcıyı ara
      let user = await User.findOne({ email });
      
      // Email ile bulunamadıysa, Supabase ID ile ara
      if (!user) {
        user = await User.findOne({ supabaseId: supabase_user_id });
      }

      // LinkedIn ID mevcut ise, bununla da arama yap
      if (!user && user_metadata?.linkedinId) {
        user = await User.findOne({ linkedinId: user_metadata.linkedinId });
      }
      
      if (!user) {
        // Yeni kullanıcı oluştur
        console.log('Yeni kullanıcı oluşturuluyor...');
        
        user = new User({
          email,
          firstName,
          lastName,
          supabaseId: supabase_user_id,
          profilePhoto,
          authProvider: authProvider,
          supabaseMetadata: user_metadata,
          emailVerified: user_metadata?.email_verified || false,
          // LinkedIn ID varsa ekle
          linkedinId: authProvider === 'linkedin' ? 
            user_metadata?.sub || user_metadata?.id || null : null,
          lastLogin: new Date()
        });
        
        await user.save();
        console.log('✅ Yeni kullanıcı kaydedildi:', { email, provider, id: user._id });
      } else {
        // Mevcut kullanıcıyı güncelle
        console.log('Mevcut kullanıcı güncelleniyor:', { id: user._id, email: user.email });
        
        user.lastLogin = new Date();
        user.supabaseId = supabase_user_id;
        
        // Her girişte authProvider'ı güncelle
        user.authProvider = authProvider;
        
        if (!user.firstName && firstName) {
          user.firstName = firstName;
        }
        if (!user.lastName && lastName) {
          user.lastName = lastName;
        }
        if (!user.profilePhoto && profilePhoto) {
          user.profilePhoto = profilePhoto;
        }
        
        // LinkedIn giriş ise linkedinId'yi güncelle
        if (authProvider === 'linkedin' && (user_metadata?.sub || user_metadata?.id)) {
          user.linkedinId = user_metadata?.sub || user_metadata?.id;
        }
        
        user.supabaseMetadata = user_metadata;
        user.emailVerified = user_metadata?.email_verified || user.emailVerified;
        
        await user.save();
        console.log('✅ Mevcut kullanıcı güncellendi:', { email, provider, id: user._id });
      }

      // JWT token oluştur
      const jwtSecret: Secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
      const jwtOptions: SignOptions = { expiresIn: '24h' };
      
      const token = jwt.sign(
        { id: user._id.toString() },
        jwtSecret,
        jwtOptions
      );
      
      res.status(200).json({ 
        success: true, 
        message: 'Kullanıcı başarıyla senkronize edildi',
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePhoto: user.profilePhoto,
          authProvider: user.authProvider
        }
      });
    } catch (error: any) {
      console.error('❌ Supabase kullanıcı senkronizasyon hatası:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Kullanıcı verileri senkronize edilirken bir hata oluştu.',
        error: error.message
      });
    }
  }
}

export default new SupabaseAuthController(); 