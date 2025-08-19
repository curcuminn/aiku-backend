import express, { Request, Response } from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { Server } from "socket.io";
import http from "http";
import passport from "./config/passport";
import cors from "cors";
import logger from "./config/logger";
import httpLogger from "./middleware/httpLogger";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cron from "node-cron";
import { fetchAndStoreNews } from './controllers/newsController';
import SubscriptionService from './services/SubscriptionService';
import { ipBlocker } from './middleware/ipBlocker';

// Route'ları import et
import authRoutes from "./routes/authRoutes";
import companyRoutes from "./routes/companyRoutes";
import productRoutes from "./routes/productRoutes";
import teamMemberRoutes from "./routes/teamMemberRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import aiRoutes from "./routes/aiRoutes";
import cardRoutes from "./routes/cardRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import linkedInRoutes from "./routes/linkedInRoutes";
import subscriptionRoutes from "./routes/subscriptionRoutes";
import applicantRoutes from "./routes/applicantRoutes";
import investmentRoutes from "./routes/investmentRoutes";
import linkedinAuthRoutes from "./routes/linkedinAuth.routes";
import supabaseAuthRoutes from "./routes/supabaseAuth.routes";
import chatRoutes from "./routes/chatRoutes";
import billingInfoRoutes from "./routes/billingInfoRoutes";
import complaintRoutes from "./routes/complaintRoutes";
import exchangeRateRoutes from "./routes/exchangeRateRoutes";
import couponRoutes from "./routes/couponRoutes";
import clickTrackRoutes from "./routes/clickTrackRoutes";
import newsRoutes from "./routes/newsRoutes";
import panelUserRoutes from "./routes/panelUserRoutes";
import blogRoutes from "./routes/blogRoutes";
import investmentNewsRoutes from './routes/investmentNewsRoutes';
import hubRoutes from "./routes/hubRoutes";
import claimRequestRoutes from "./routes/claimRequestRoutes";
import heartbeatRouter from './routes/heartbeat';
import metaConversionsRoutes from "./routes/metaConversionsRoutes";
import modalMessageRoutes from "./routes/modalMessageRoutes";
import { ClaimRequest } from "./models/ClaimRequest";
import { startOfflineUpdater } from './updateOnlineStatus';
import { User } from './models/User'
import academicAiRoutes from "./routes/academicAiRoutes";
import startupIdeaFavoriteCountRoutes from "./routes/startupIdeaFavoriteCountRoutes";
import revenueCatRoutes from "./routes/revenueCatRoutes";

// Env değişkenlerini yükle
dotenv.config();

// Express uygulamasını oluştur
const app = express();
const server = http.createServer(app);

// IP engelleyici middleware'i ekle (en üstte olmalı)
app.use(ipBlocker);

// Proxy güven ayarları
app.set("trust proxy", 1); // Sadece bir proxy'ye güven

// CORS için izin verilen domainler
const whitelist = [
  "https://aikuaiplatform.com",
  "https://www.aikuaiplatform.com",
  "https://api.aikuaiplatform.com",
  "https://www.alohadijital.com",
  "https://alohadijital.com",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3004",
  "http://127.0.0.1:5500",
  "https://bevakpqfycmxnpzrkecv.supabase.co",
  "https://posws.param.com.tr"
];

// 30 saniyelik eşik
const OFFLINE_AFTER_MS = 30_000

// Her 30 saniyede bir, sonSeen < (NOW - 30s) olanları kapat
cron.schedule('*/30 * * * * *', async () => {
  try {
    const cutoff = new Date(Date.now() - OFFLINE_AFTER_MS)
    const result = await User.updateMany(
      { isOnline: true, lastSeen: { $lt: cutoff } },
      { $set: { isOnline: false } }
    )
    // Mongoose 6’da UpdateResult.modifiedCount kullanılır
    if (result.modifiedCount && result.modifiedCount > 0) {
      console.log(`⏱️ ${result.modifiedCount} kullanıcı offline olarak işaretlendi`)
    }
  } catch (err) {
    console.error('Offline cron error:', err)
  }
})

// Socket.io sunucusunu oluştur
const io = new Server(server, {
  cors: {
    origin: "*", // Tüm kaynaklara izin ver (geliştirme için)
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  allowEIO3: true, // Engine.IO 3 uyumluluğu
  transports: ["websocket", "polling"], // Önce WebSocket, sonra polling dene
});

// Socket.io bağlantılarını yönet
io.on("connection", (socket) => {
  console.log("👋 Yeni bir kullanıcı bağlandı:", socket.id);
  logger.debug("Yeni Socket.IO bağlantısı kuruldu", { socketId: socket.id });

  // Şirket id'sine göre chat odası katılımı
  socket.on("join-company-chat", (companyId) => {
    socket.join(`company-${companyId}`);
    console.log(
      `🏢 ${socket.id} kullanıcısı ${companyId} şirket odasına katıldı`
    );
    logger.debug("Kullanıcı şirket chat odasına katıldı", {
      socketId: socket.id,
      companyId,
    });
  });

  // Sohbet oturum id'sine göre chat odası katılımı
  socket.on("join-chat-session", (chatSessionId) => {
    socket.join(`chat-${chatSessionId}`);
    console.log(
      `💬 ${socket.id} kullanıcısı ${chatSessionId} sohbet odasına katıldı`
    );
    logger.debug("Kullanıcı sohbet odasına katıldı", {
      socketId: socket.id,
      chatSessionId,
    });
  });

  // Özel chat odalarından ayrılma
  socket.on("leave-company-chat", (companyId) => {
    socket.leave(`company-${companyId}`);
    console.log(
      `🚪 ${socket.id} kullanıcısı ${companyId} şirket odasından ayrıldı`
    );
    logger.debug("Kullanıcı şirket chat odasından ayrıldı", {
      socketId: socket.id,
      companyId,
    });
  });

  socket.on("leave-chat-session", (chatSessionId) => {
    socket.leave(`chat-${chatSessionId}`);
    console.log(
      `🚪 ${socket.id} kullanıcısı ${chatSessionId} sohbet odasından ayrıldı`
    );
    logger.debug("Kullanıcı sohbet odasından ayrıldı", {
      socketId: socket.id,
      chatSessionId,
    });
  });

  // Bağlantı kesildiğinde
  socket.on("disconnect", () => {
    console.log("👋 Bir kullanıcı ayrıldı:", socket.id);
    logger.debug("Socket.IO bağlantısı kesildi", { socketId: socket.id });
  });
});

// Dışa socket.io instance'ını aktarma (başka dosyalardan erişilebilmesi için)
export { io };

// CORS origin kontrolü için fonksiyon
const corsOriginCheck = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) => {
  console.log("🔒 CORS isteği origin:", origin);

  // Development ortamında tüm originlere izin ver
  if (process.env.NODE_ENV === "development") {
    console.log("💻 Development modu: Tüm CORS isteklerine izin veriliyor");
    callback(null, true);
    return;
  }

  // Origin yoksa (örn. aynı origin'den istek veya Postman gibi araçlar)
  if (!origin) {
    callback(null, true);
    return;
  }

  // Tam eşleşme kontrolü
  if (whitelist.includes(origin)) {
    callback(null, true);
    return;
  }

  // Wildcard subdomain kontrolü
  const isAikuDomain = origin.match(
    /^https:\/\/([a-zA-Z0-9-]+\.)?aikuaiplatform\.com$/
  );
  if (isAikuDomain) {
    callback(null, true);
    return;
  }

  // Localhost ve 127.0.0.1 için port kontrolünü gevşet (development için)
  const localDevRegex = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;
  if (localDevRegex.test(origin)) {
    console.log("🧪 Yerel test origin'i kabul edildi:", origin);
    callback(null, true);
    return;
  }

  // Diğer tüm istekleri reddet
  console.log(`⛔ CORS engellendi: ${origin}`);
  logger.warn("CORS politikası tarafından engellenen istek", { origin });
  callback(new Error("CORS politikası tarafından engellendi"));
};

// CORS ayarları
const corsOptions = {
  origin: corsOriginCheck,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Origin",
    "Accept",
  ],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400, // Preflight sonuçlarını 24 saat önbelleğe al
};

// Body parsing middleware'lerini ekle
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware'ini ekle
app.use(cors(corsOptions));

// CORS hata yakalama middleware'i
app.use((err: any, req: Request, res: Response, next: any) => {
  if (err.name === "CORSError") {
    console.error("❌ CORS Hatası:", err.message);
    logger.error("CORS Hatası", {
      error: err.message,
      url: req.url,
      origin: req.headers.origin,
    });
    return res.status(403).json({
      success: false,
      message: "CORS hatası: İstek engellendi",
      error: err.message,
    });
  }
  next(err);
});

// OPTIONS istekleri için özel işleyici
app.options("*", cors(corsOptions));

// HTTP Logger middleware'ini ekle
app.use(httpLogger);

// İstek loglaması için middleware
app.use((req, res, next) => {
  const origin = req.headers.origin || "";
  const method = req.method;
  const url = req.url;

  // İstek loglaması
  console.log(`🔄 İstek - Origin: ${origin}, Method: ${method}, URL: ${url}`);

  // CORS başlıklarını kontrol et ve logla
  const corsHeaders = {
    "Access-Control-Allow-Origin": res.getHeader("Access-Control-Allow-Origin"),
    "Access-Control-Allow-Methods": res.getHeader(
      "Access-Control-Allow-Methods"
    ),
    "Access-Control-Allow-Headers": res.getHeader(
      "Access-Control-Allow-Headers"
    ),
    "Access-Control-Allow-Credentials": res.getHeader(
      "Access-Control-Allow-Credentials"
    ),
  };

  console.log("🔑 CORS Başlıkları:", corsHeaders);

  next();
});

// Test için Google OAuth sayfasıa
app.get("/test-google-auth", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Google OAuth Test</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .btn {
          display: inline-block;
          background: #4285F4;
          color: white;
          padding: 10px 20px;
          border-radius: 4px;
          text-decoration: none;
          margin: 10px 0;
        }
        .card {
          border: 1px solid #ddd;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        pre {
          background: #f5f5f5;
          padding: 10px;
          border-radius: 4px;
          overflow-x: auto;
        }
      </style>
      <script src="https://accounts.google.com/gsi/client" async defer></script>
    </head>
    <body>
      <h1>Google OAuth Test</h1>
      
      <div class="card">
        <h2>Passport.js OAuth Akışı</h2>
        <p>Bu test, sunucu tarafı Google OAuth akışını başlatır.</p>
        <a href="/api/auth/google" class="btn">Google ile Giriş Yap (Passport.js)</a>
      </div>

      <div class="card">
        <h2>Google Identity API Akışı</h2>
        <p>Bu test, Google Identity API kullanarak client-side kimlik doğrulama yapar.</p>
        <div id="g_id_onload"
             data-client_id="${process.env.GOOGLE_CLIENT_ID}"
             data-callback="handleCredentialResponse"
             data-auto_prompt="false">
        </div>
        <div class="g_id_signin"
             data-type="standard"
             data-size="large"
             data-theme="outline"
             data-text="sign_in_with"
             data-shape="rectangular"
             data-logo_alignment="left">
        </div>
      </div>

      <div class="card">
        <h2>Google Identity API Manuel</h2>
        <button id="googleLoginBtn" class="btn">Google ile Giriş (Manuel)</button>
      </div>

      <div class="card">
        <h2>Sonuç</h2>
        <pre id="result">Henüz işlem yapılmadı.</pre>
      </div>

      <div class="card">
        <h2>API Bilgileri</h2>
        <p>Client ID: ${process.env.GOOGLE_CLIENT_ID}</p>
        <p>Callback URL: ${process.env.API_URL}/api/auth/google/callback</p>
      </div>

      <div class="card">
        <h2>Yardım</h2>
        <p>Eğer test başarısız olursa:</p>
        <ol>
          <li>Google Cloud Console'da OAuth onaylı yönlendirme URI'larınızı kontrol edin</li>
          <li>Server loglarını kontrol edin</li>
          <li>.env dosyasında doğru API URL'leri olduğundan emin olun</li>
        </ol>
      </div>

      <script>
        // Google Identity API için callback
        function handleCredentialResponse(response) {
          console.log("Google Token:", response.credential);
          document.getElementById('result').textContent = 'ID Token alındı. Sunucuya gönderiliyor...';
          
          // Sunucuya token'ı gönder
          fetch('/api/auth/google/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idToken: response.credential }),
          })
          .then(response => response.json())
          .then(data => {
            console.log("Sunucu yanıtı:", data);
            document.getElementById('result').textContent = 
              'Giriş başarılı!\n\n' + JSON.stringify(data, null, 2);
          })
          .catch(error => {
            console.error('Hata:', error);
            document.getElementById('result').textContent = 
              'Hata oluştu: ' + error.message;
          });
        }

        // Manuel Google Login butonu
        document.getElementById('googleLoginBtn').addEventListener('click', () => {
          // Google OAuth popup açma
          const width = 500;
          const height = 600;
          const left = window.screenX + (window.outerWidth - width) / 2;
          const top = window.screenY + (window.outerHeight - height) / 2.5;
          
          const popup = window.open(
            '/api/auth/google',
            'GooglePopup',
            \`width=\${width},height=\${height},left=\${left},top=\${top}\`
          );
          
          // Popup kapandığında işlem yapmak için
          const checkPopup = setInterval(() => {
            if (!popup || popup.closed) {
              clearInterval(checkPopup);
              document.getElementById('result').textContent = 
                'Popup kapatıldı. Sonuç bekleniyor...';
            }
          }, 1000);
        });
      </script>
    </body>
    </html>
  `);
});

// Hata yakalama middleware'i
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error("❌ Sunucu Hatası:", err);

  // Daha detaylı hata logu
  logger.error("Sunucu Hatası", {
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code,
    },
    request: {
      url: req.url,
      method: req.method,
      path: req.path,
      query: req.query,
      params: req.params,
      headers: {
        "user-agent": req.headers["user-agent"],
        "content-type": req.headers["content-type"],
        host: req.headers.host,
      },
    },
    user: req.user
      ? {
        id: req.user.id,
        email: req.user.email,
      }
      : null,
    timestamp: new Date().toISOString(),
  });

  res.status(err.status || 500).json({
    message: err.message || "Sunucu hatası",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

// Passport middleware
app.use(passport.initialize());

// Statik dosya servisi
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Socket.io test için statik sayfa servisi
app.use("/test", express.static(path.join(__dirname, "../test")));

// Socket.io test sayfası
app.get("/socket-test", (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../test/socket-test.html"));
});

// Güvenlik başlıkları
app.use(helmet());

// XSS koruması için Content Security Policy
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "accounts.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.aikuaiplatform.com"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "accounts.google.com"],
    },
  })
);

// Rate limiting ayarları
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 dakika
  max: process.env.NODE_ENV === 'development' ? Infinity : 750, // Development'da sınırsız, production'da 200
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn("Rate limit exceeded", {
      ip: req.ip,
      realIP: req.headers["x-real-ip"],
      forwardedFor: req.headers["x-forwarded-for"],
      url: req.url,
      headers: req.headers,
    });
    res.status(429).json({
      error: "Too many requests, please try again later."
    });
  },
  // Rate limit için IP belirleme fonksiyonu
  keyGenerator: (req: Request) => {
    return req.headers["x-forwarded-for"]?.toString() ||
      req.headers["x-real-ip"]?.toString() ||
      req.ip ||
      req.connection.remoteAddress ||
      'unknown';
  }
});

// Tüm route'lara rate limiting uygula
app.use(limiter);

// Şüpheli istekleri engelle
app.use((req: Request, res: Response, next: any) => {
  const suspiciousPatterns = [
    /eval-stdin\.php/i,
    /phpunit/i,
    /think\\app/i,
    /pearcmd/i,
    /\.env/i,
    /wp-content/i,
    /wp-admin/i,
    /wp-login/i,
  ];

  const url = req.url.toLowerCase();

  if (suspiciousPatterns.some((pattern) => pattern.test(url))) {
    logger.warn("Şüpheli istek engellendi", {
      ip: req.ip,
      url: req.url,
      method: req.method,
      headers: req.headers,
    });
    return res.status(403).json({ error: "İstek engellendi" });
  }

  next();
});

const NEWS_FETCH_SCHEDULE = process.env.NEWS_FETCH_CRON_SCHEDULE || '0 3 * * *';

cron.schedule(NEWS_FETCH_SCHEDULE, () => {
  fetchAndStoreNews()
    .then(() => console.log('Haberler güncellendi'))
    .catch(err => console.error('Haber çekme hatası:', err));
});

const SUBSCRIPTION_CRON_SCHEDULE = process.env.SUBSCRIPTION_CRON_SCHEDULE || '0 4 * * *'; // her gün 04:00

cron.schedule(SUBSCRIPTION_CRON_SCHEDULE, async () => {
  try {
    logger.info('⏰ Abonelik cron çalışıyor: trial kontrol');
    const trialResult = await SubscriptionService.checkTrialEndingUsers();
    logger.info('Trial kontrol sonucu:', { trialResult });

    logger.info('⏰ Abonelik cron çalışıyor: periyodik ödeme kontrol');
    const recurringResult = await SubscriptionService.checkRecurringPayments();
    logger.info('Periyodik ödeme kontrol sonucu:', { recurringResult });

    logger.info('⏰ Abonelik cron çalışıyor: expire işlemleri');
    const expireResult = await SubscriptionService.expireEndedSubscriptions();
    logger.info('Expire işlemleri sonucu:', { expireResult });
  } catch (err) {
    logger.error('Abonelik cron hatası:', { error: err });
  }
});

// MongoDB bağlantısı
mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => {
    console.log("✅ MongoDB bağlantısı başarılı");
    logger.info("MongoDB bağlantısı başarılı");
    startOfflineUpdater();
  })
  .catch((err) => {
    console.log("❌ MongoDB bağlantı hatası:", err);
    logger.error("MongoDB bağlantı hatası", { error: err.message });
  });

// Route'ları ekle
app.use("/api/auth", authRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/product", productRoutes);
app.use("/api/team-members", teamMemberRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/academic-ai", academicAiRoutes);
app.use("/api", linkedInRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/applicants", applicantRoutes);
app.use("/api/investments", investmentRoutes);
app.use("/api", linkedinAuthRoutes);
app.use("/api", supabaseAuthRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/billing-info", billingInfoRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/exchange-rates", exchangeRateRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/click", clickTrackRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/panel-users", panelUserRoutes);
app.use('/api/investment-news', investmentNewsRoutes);
app.use("/api/hub", hubRoutes);
app.use("/api/claim-requests", claimRequestRoutes);
app.use('/api/heartbeat', heartbeatRouter);
app.use("/api/idea-favorites", startupIdeaFavoriteCountRoutes);
app.use("/api/meta", metaConversionsRoutes);
app.use("/api/modal-messages", modalMessageRoutes);
app.use("/api/revenuecat", revenueCatRoutes);

// Ana route
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "🚀 AIKU API çalışıyor" });
});

// Port ayarı
const PORT = process.env.PORT || 3004;

// Sunucuyu başlat
server.listen(PORT, () => {
  console.log(`🚀 Sunucu ${PORT} portunda çalışıyor`);
  console.log("✅ Socket.IO sistemi aktif");
  logger.info(`Sunucu başlatıldı`, { port: PORT, env: process.env.NODE_ENV });
});
