import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User';
import dotenv from 'dotenv';

// Çevre değişkenlerini yükle
dotenv.config();

// Kullanıcı serileştirme (session için)
passport.serializeUser((user: any, done) => {
  done(null, user._id);
});

// Kullanıcı deserileştirme (session için)
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth stratejisi
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      console.log('[GoogleStrategy] Google stratejisi çağırıldı:', { 
        profileId: profile.id,
        displayName: profile.displayName,
        email: profile.emails?.[0]?.value
      });
      console.log('[GoogleStrategy] Access Token:', accessToken.substring(0, 10) + '...');
      console.log('[GoogleStrategy] Profile tam:', JSON.stringify(profile, null, 2));

      try {
        // Google ID'si ile kullanıcıyı ara
        console.log('[GoogleStrategy] Kullanıcı aranıyor:', { email: profile.emails?.[0]?.value });
        let user = await User.findOne({
          email: profile.emails?.[0].value
        });

        // Kullanıcı yoksa yeni kayıt oluştur
        if (!user) {
          console.log('[GoogleStrategy] Kullanıcı bulunamadı, yeni kullanıcı oluşturuluyor');
          const nameParts = profile.displayName.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          user = await User.create({
            firstName,
            lastName,
            email: profile.emails?.[0].value,
            profilePhoto: profile.photos?.[0].value,
            authProvider: 'google',
            emailVerified: true,
            googleId: profile.id
          });
          console.log('[GoogleStrategy] Yeni kullanıcı oluşturuldu:', { userId: user._id });
        } else {
          console.log('[GoogleStrategy] Mevcut kullanıcı bulundu:', { userId: user._id });
          // Her Google girişinde authProvider'ı güncelle
          user.authProvider = 'google';
          user.googleId = profile.id;
          if (profile.photos?.[0]?.value && !user.profilePhoto) {
            user.profilePhoto = profile.photos[0].value;
          }
          await user.save();
          console.log('[GoogleStrategy] Kullanıcı auth provider Google olarak güncellendi');
        }

        return done(null, user);
      } catch (err) {
        console.error('[GoogleStrategy] Hata:', err);
        return done(err as Error, undefined);
      }
    }
  )
);

export default passport; 