import supabase from '../config/supabaseClient';
import dotenv from 'dotenv';
import axios from 'axios';
import logger from '../config/logger';

dotenv.config();

class LinkedInAuthService {
  // LinkedIn ile oturum açma URL'sini oluştur
  getLinkedInAuthURL(platform?: string): string {
    let redirectURI;
    
    // Platform'a göre redirect URI'yi belirle
    if (platform === 'mobile') {
      redirectURI = 'com.aikumobile://auth/linkedin-callback';
      console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Auth] Mobil platform için redirect URI:', redirectURI);
    } else {
      redirectURI = process.env.LINKEDIN_REDIRECT_URI || 'https://aikuaihub.com/auth/social-callback';
      console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Auth] Web platform için redirect URI:', redirectURI);
    }
    
    const linkedInClientId = process.env.LINKEDIN_CLIENT_ID;
    
    if (!linkedInClientId) {
      console.log('\x1b[31m%s\x1b[0m', '🔴 [LinkedIn Auth] HATA: LinkedIn Client ID bulunamadı!');
      throw new Error('LinkedIn Client ID is not defined in environment variables');
    }

    const scopes = ['openid', 'profile', 'email'].join(' ');
    const state = Math.random().toString(36).substring(2, 15); // Rastgele state değeri
    
    const authURL = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${linkedInClientId}&redirect_uri=${encodeURIComponent(redirectURI)}&state=${state}&scope=${encodeURIComponent(scopes)}`;
    console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn Auth] Oluşturulan Auth URL:', authURL);
    
    return authURL;
  }

  // LinkedIn'den gelen auth code ile token alma
  async getTokenFromCode(code: string): Promise<any> {
    try {
      console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Token] Token alınmaya çalışılıyor. Code:', code);
      
      const redirectURI = process.env.LINKEDIN_REDIRECT_URI || 'https://aikuaihub.com/auth/social-callback';
      const linkedInClientId = process.env.LINKEDIN_CLIENT_ID;
      const linkedInClientSecret = process.env.LINKEDIN_CLIENT_SECRET;
      
      if (!linkedInClientId || !linkedInClientSecret) {
        console.log('\x1b[31m%s\x1b[0m', '🔴 [LinkedIn Token] HATA: Client ID veya Secret bulunamadı!');
        throw new Error('LinkedIn Client ID or Client Secret is not defined in environment variables');
      }

      console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn Token] Token isteği gönderiliyor...');
      
      // LinkedIn token URL'sine istek gönder
      const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
        params: {
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectURI,
          client_id: linkedInClientId,
          client_secret: linkedInClientSecret
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn Token] Token başarıyla alındı:', response.data);
      return response.data;
    } catch (error: any) {
      console.log('\x1b[31m%s\x1b[0m', '🔴 [LinkedIn Token] HATA:', error.response?.data || error.message);
      logger.error(`LinkedIn token alınamadı linkedinAuth.Service: ${error}`);
      throw error;
    }
  }

  // LinkedIn token ile kullanıcı bilgilerini alma
  async getUserInfo(accessToken: string): Promise<any> {
    try {
      console.log('\x1b[36m%s\x1b[0m', '🔵 [LinkedIn User] Kullanıcı bilgileri alınıyor...');
      
      // Kullanıcı profil bilgilerini al
      const profileResponse = await axios.get('https://api.linkedin.com/v2/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'cache-control': 'no-cache',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });

      console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn User] Profil bilgileri alındı:', profileResponse.data);

      // Kullanıcı email bilgisini al
      const emailResponse = await axios.get('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'cache-control': 'no-cache',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });

      console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn User] Email bilgisi alındı:', emailResponse.data);

      const profileData = profileResponse.data;
      const emailData = emailResponse.data;
      const email = emailData.elements?.[0]?.['handle~']?.emailAddress || '';

      const userData = {
        id: profileData.id,
        firstName: profileData.localizedFirstName,
        lastName: profileData.localizedLastName,
        email
      };

      console.log('\x1b[32m%s\x1b[0m', '🟢 [LinkedIn User] Birleştirilmiş kullanıcı bilgileri:', userData);
      return userData;
    } catch (error: any) {
      console.log('\x1b[31m%s\x1b[0m', '🔴 [LinkedIn User] HATA:', error.response?.data || error.message);
      logger.error(`LinkedIn kullanıcı bilgileri alınamadı linkedinAuth.Service: ${error}`);
      throw error;
    }
  }

  // Kullanıcıyı Supabase'e kaydet veya güncelle
  async signInWithLinkedIn(userInfo: any): Promise<any> {
    try {
      const { id, email, firstName, lastName } = userInfo;
      
      if (!email) {
        throw new Error('Email alınamadı. Kullanıcı kayıt edilemez.');
      }

      // Önce email ile Supabase'de kullanıcı kontrolü yap
      const { data: existingUser, error: searchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (searchError) {
        console.error('Kullanıcı arama hatası:', searchError);
        throw searchError;
      }

      if (existingUser) {
        // Kullanıcı varsa, LinkedIn bilgilerini güncelle
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({
            linkedin_id: id,
            updated_at: new Date().toISOString()
          })
          .eq('email', email)
          .select()
          .single();

        if (updateError) {
          console.error('Kullanıcı güncelleme hatası:', updateError);
          logger.error(`Kullanıcı güncelleme hatası linkedinAuth.Service: ${updateError}`);
          throw updateError;
        }

        return updatedUser;
      } else {
        // Kullanıcı yoksa, yeni kullanıcı oluştur
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert([
            {
              email,
              first_name: firstName,
              last_name: lastName,
              linkedin_id: id,
              auth_provider: 'linkedin',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (insertError) {
          console.error('Kullanıcı oluşturma hatası:', insertError);
          logger.error(`Kullanıcı oluşturma hatası linkedinAuth.Service: ${insertError}`);
          throw insertError;
        }

        return newUser;
      }
    } catch (error) {
      console.error('LinkedIn kullanıcısı Supabase\'e kaydedilemedi:', error);
      logger.error(`LinkedIn kullanıcısı Supabase\'e kaydedilemedi linkedinAuth.Service: ${error}`);
      throw error;
    }
  }
}

export default new LinkedInAuthService(); 