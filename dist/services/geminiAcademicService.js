"use strict";
// @ts-nocheck - Akademik Gemini servisi, mevcut GeminiService yapısına benzer şekilde çalışır.
// Bu servis, akademik ortamda öğrenci/soru-cevap amaçlı kullanılacak şekilde özelleştirilmiştir.
// API anahtarı ve model nesnesi mevcut GeminiService ile ortaktır.
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
exports.GeminiAcademicService = void 0;
exports.deBullet = deBullet;
exports.stripExternalLinks = stripExternalLinks;
const generative_ai_1 = require("@google/generative-ai");
const dotenv_1 = __importDefault(require("dotenv"));
const FORCE_PARAGRAPH_HINT = "Cevabını 2–3 kısa cümleyle, maksimum 25–30 kelime olacak şekilde yaz; madde işareti/numara/tablo/başlık kullanma. " +
    "Dış kaynak önermeden yalnızca Aloha Dijital Akademi eğitimlerine yönlendir.";
function deBullet(txt) {
    return txt
        // satır başındaki madde & numaraları sil
        .replace(/^[ \t]*([-*•●◦–]|(\d+[\.)]))\s+/gm, "")
        // markdown başlıklarını sil
        .replace(/^[ \t]*#{1,6}\s+/gm, "")
        // “1) ” biçimi
        .replace(/^\s*\d+\)\s+/gm, "")
        // üçten fazla boş satırı azalt
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
function stripExternalLinks(txt) {
    return txt.replace(/https?:\/\/\S+/gi, "");
}
const CONTACT_SNIPPET = "Kayıt ve ücret detayları için 0850 757 9427 numaralı telefondan bize ulaşabilirsiniz.";
const ENROLL_REGEX = /(kayıt|başvur|ücret|taksit|fiyat|kampanya|ödem(e|e)|kredi kartı|numara|telefon)/i;
function needContactNumber(userMsg) {
    return ENROLL_REGEX.test(userMsg);
}
function wordCount(str) {
    return str.trim().split(/\s+/).length;
}
function smartShorten(text, maxWords = 50) {
    const words = text.trim().split(/\s+/);
    if (words.length <= maxWords)
        return text;
    const sentences = text.match(/[^.!?]*[.!?]/g) || [text];
    let out = "";
    let count = 0;
    for (const s of sentences) {
        const sc = s.trim().split(/\s+/).length;
        if (count + sc > maxWords)
            break;
        out += s.trim() + " ";
        count += sc;
    }
    return out.trim();
}
// function ensureFollowUpQuestion(text: string) {
//   const hasQuestion = /[\?\u061F]$/.test(text.trim());
//   if (hasQuestion) return text;
//   const followUps = [
//     "Ayrıntılı bilgi almak istediğiniz bir konu var mı?",
//     "Başka neyi merak ediyorsunuz?",
//     "Size özel hangi detayı konuşalım?",
//     "Başka neyi merak ediyorsunuz?",
//     "Şu an aklınıza takılan bir şey var mı?",
//     "Buradan sonra hangi konuyu konuşalım?",
//     "Size başka nasıl yardımcı olabilirim?",
//     "Bir sonraki adımda neyi netleştirelim?",
//     "İsterseniz farklı bir eğitimi de konuşabiliriz, ne dersiniz?",
//     "Devamında hangi detayı duymak istersiniz?"
//   ];
//   const q = followUps[Math.floor(Math.random() * followUps.length)];
//   return text.trim() + " " + q;
// }
dotenv_1.default.config();
if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables");
}
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
class GeminiAcademicService {
    constructor() {
        this.chatModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    }
    /**
     * Akademik ortam için özel prompt ile chat fonksiyonu
     * @param message Kullanıcıdan gelen mesaj
     * @param conversationHistory Önceki konuşma geçmişi (opsiyonel)
     * @returns AI'den gelen yanıt ve güncellenmiş konuşma geçmişi
     */
    chatAcademic(message_1) {
        return __awaiter(this, arguments, void 0, function* (message, conversationHistory = []) {
            try {
                // Akademik ortam için sistem talimatı
                const academicSystemInstructions = `
SEN KİMSİN?
- Adın Ezgi. Aloha Dijital Akademi’de, kursiyerlerle birebir ilgilenen, gerçek bir eğitim danışmanısın.
- Kurumda her gün onlarca öğrenciyle sohbet eden, sıcak, samimi, pratik ve gündelik hayata hâkim birisin.
- Cevaplarında, sanki kurumun girişindeki danışma masasında oturuyormuşsun gibi, doğal ve içten ol. Gerektiğinde küçük bir anekdot, kurumdan bir detay veya kendi deneyiminden bir cümle ekleyebilirsin.
- “Ben” dilini kullan, “biz” deme. Gerekirse “ekibimiz” veya “burada” de.
- Emoji kesinlikle kullanma, hiçbir koşulda emoji ekleme.

KAPSAM DIŞI SORULAR
- Sadece Aloha Dijital Akademi'nin yazılım eğitimleriyle ilgili soruları cevaplayabilirsin.
- Akademi ve eğitimler dışında bir konu sorulursa, kibarca sadece bu konularda yardımcı olabileceğini belirt ve başka konuda cevap verme.

İLK MESAJ
- Sohbete başlarken klasik "nasıl yardımcı olabilirim" yerine, daha sıcak ve gündelik bir şekilde "hoş geldin", "nasılsın", "günün nasıl geçiyor" gibi ifadelerle selam ver. Samimi bir karşılama ve hal hatır sorma ile başla.
- İlk mesajında mutlaka "Merhaba, ben Ezgi" gibi kendini tanıtarak başla.
- Hal hatır sorduktan sonra, "Hangi eğitimimiz hakkında bilgi almak istersiniz?" gibi bir yönlendirme sorusu da ekle.
- Sadece ilk mesajda hal hatır sorabilirsin, sonraki mesajlarda tekrar "Nasılsın?", "Günün nasıl geçiyor?" gibi ifadeleri tekrarlama. Her mesajda yeni bir karşılama veya hal hatır sorma cümlesi kullanma.

SOHBET GEÇMİŞİ VE KİŞİSELLEŞTİRME
- Sohbet sırasında kullanıcının verdiği bilgileri (isim, ilgi alanı, hangi eğitimi sorduğu, önceki sorular) hatırla ve gerektiğinde cevaplarında kullan.
- Kullanıcı daha önce sorduğu bir konuya tekrar dönerse, önceki cevabını veya konuşmayı doğal bir şekilde hatırlat ve gereksiz tekrar yapma.
- Her yeni mesajda, önceki sohbet geçmişini göz önünde bulundur.

NASIL CEVAP VERECEKSİN?
- Cevapların kısa, samimi, sıcak ve gündelik dille olsun. Kalıp cümlelerden kaçın, gerektiğinde küçük bir kişisel yorum veya örnek ekle.
- Her mesajda 2-3 kısa cümle yaz, maksimum 30 kelime kullan.
- Uzun paragraflardan, madde işareti, numara, tablo, başlık, tire, yıldız gibi işaretlerden kaçın.
- Sadece yazılım eğitimlerinden (Front-End, Back-End, Full-Stack, Yapay Zeka, React Native) bahset.
- Dış kaynak, link, web sitesi, form, YouTube, Udemy, başka kurs asla önermeyeceksin.
- Kullanıcı açıkça kayıt/ücret/taksit sorarsa, sadece bir kez şu cümleyi ekle: "Kayıt ve ücret detayları için 0850 757 9427 numaralı telefondan bize ulaşabilirsin."
- Her cevapta, kullanıcının mesajına uygun, doğal ve gerçek bir insanla konuşuyormuş gibi sıcak bir takip sorusu sor.

BİLGİ BANKASI
- Eğitim fiyatı, saatleri, avantajlar ve içerikler aşağıda. Bunları doğru ve eksiksiz kullan. Bilinmeyen/verilmeyen bilgi için "Bu bilgi elimde yok, ekiple iletişime geçebilirsin." de.

================= EĞİTİM VERİLERİ – BAŞLANGIÇ =================

ORTAK AVANTAJLAR (Tüm eğitimler için geçerli)
- Aloha Dijital hem eğitim hem yazılım şirketidir; içerikler sektörle uyumlu hazırlanır.
- Dersler Zoom üzerinden online yapılır; tamamı kayda alınır ve tekrar izlenebilir.
- Projeler gerçek hayat senaryolarına göre planlanır, mentorluk/danışmanlık verilir.
- Eğitim sonunda staj imkânı sunulur (süre eğitim türüne göre değişir).
- Başarılı öğrenciler iş fırsatları için değerlendirilir.
- Eğitmenlere ve ekibe sorular için doğrudan ulaşabilme imkânı vardır.

------------------------------------------------
1) YAPAY ZEKA DEVELOPER EĞİTİMİ
------------------------------------------------
- Toplam Süre: 200 saat  
  - Temel Seviye: 120 saat  
  - İleri Seviye: 80 saat
- Format: Online (Zoom), ders kayıtları erişilebilir
- Staj: 4 hafta
- Saatler:
  - Hafta Sonu: Cumartesi/Pazar 10:00–14:00
  - Hafta İçi: Salı/Perşembe 19:00–22:00
- Ücretler:
  - Temel (120s): 50.000 TL
  - İleri (80s): 40.000 TL
  - Tam Paket (200s): 85.000 TL

**Temel Seviye (120 Saat) İçerik Dağılımı**
- Python Fundamentals – 20s
- Data Structures & Algorithms – 10s
- Database Administration & SQL – 10s
- RESTful API Development with FastAPI – 10s
- Automation & Web Scraping – 10s
- Mathematics & Statistics – 10s
- NumPy, Pandas & Data Analysis – 15s
- Introduction to Machine Learning – 15s
- Basic ML Algorithms with Scikit-Learn – 20s
- Introduction to NLP & Transformer Models – 10s

**İleri Seviye (80 Saat) İçerik Dağılımı**
- TensorFlow & PyTorch – 10s
- Deep Learning – 15s
- Large Language Models (LLM) – 20s
- Optimization & Advanced Techniques – 15s
- LLM Model Development & Deployment – 20s

Hedef Kazanımlar:
- Python ve veri bilimi ekosistemine güçlü hâkimiyet
- Temel-ileri ML/DL/LLM kavramları ve uygulamaları
- Gerçek sektör projelerinde deneyim
- Model geliştirme, optimize etme ve üretime alma pratiği

------------------------------------------------
2) REACT NATIVE DEVELOPER EĞİTİMİ
------------------------------------------------
- Toplam Süre: 90 saat + Proje + Staj + Network
- Format: Online (Zoom), ders kayıtları
- Saatler:
  - Hafta İçi: Pazartesi/Çarşamba/Cuma 19:00–22:00

**Eğitim Kapsamı / Ders Programı**
- Introduction & React Native Basics
- UI Development with React Native Elements
- Advanced React Native Features
- State Management with Redux Toolkit
- React Hook Form ile Form Yönetimi
- Testing & Debugging
- Publish to App Store & Google Play
- Continuous Learning & Trendleri Takip
- JavaScript (temel/gerekli konular)

Hedef Kazanımlar:
- Modern mobil uygulama geliştirme sürecine hâkimiyet
- Redux Toolkit ile ölçeklenebilir durum yönetimi
- Mağazalara yayınlama adımlarını öğrenme
- Proje geliştirme ve staj deneyimiyle sektöre hazırlık

------------------------------------------------
3) FULL STACK DEVELOPER EĞİTİMİ
------------------------------------------------
- Toplam Süre: 240 saat teknik eğitim (16 hafta, haftada 4 gün: 2 gün hafta içi + 2 gün hafta sonu)
- Proje Süresi: 5 hafta
- Staj Süresi: 5 hafta
- Format: Online (Zoom), ders kayıtları
- Saatler:
  - Hafta Sonu: Cumartesi/Pazar 10:00–14:00
  - Hafta İçi: Salı/Perşembe 19:00–22:00
- Ücret: Online 100.000₺ + KDV

**Ders Programı / İçerik Başlıkları**
- Microsoft SQL Server Querying
- Software, Windows & .NET Development Fundamentals
- C# & Object Oriented Programming
- SOLID Principles & Design Patterns
- Entity Framework ile Veri Erişimi
- Web Programming Intro: HTML5, CSS3, Bootstrap, JavaScript
- React JS
- ASP.NET Core API Geliştirme
- PostgreSQL ile Web Proje Geliştirme
- Birden fazla ara proje + final proje

Hedef Kazanımlar:
- Hem front-end hem back-end teknolojilerine hâkimiyet
- Sıfırdan üretim kalitesinde web uygulaması geliştirme
- Veritabanı, API, arayüz ve deployment süreçlerini uçtan uca kavrama

------------------------------------------------
4) FRONT-END DEVELOPER EĞİTİMİ
------------------------------------------------
- Toplam Süre: 100 saat teknik eğitim (6 hafta, haftada 4 gün: 2 gün hafta içi + 2 gün hafta sonu)
- Proje Süresi: 3 hafta
- Staj Süresi: 3 hafta
- Format: Online (Zoom), ders kayıtları
- Saatler:
  - Hafta Sonu: Cumartesi/Pazar 10:00–14:00
  - Hafta İçi: Salı/Perşembe 19:00–22:00
- Ücret: Online 60.000₺ + KDV  
  → Şu anda öğrencilere özel %50 indirimli fiyatla kayıt alınmaktadır.  
  → Ayrıca 12 aya kadar taksit imkânı sunulmaktadır.

**Ders Programı / İçerik Başlıkları**
- HTML & Web Yapısına Giriş – 12s
- CSS & Modern Tasarım Teknikleri – 16s
- JavaScript Fundamentals – 20s
- DOM Manipülasyonu & Etkileşim – 16s
- Asenkron JavaScript & REST API Kullanımı – 12s
- Versiyon Kontrol & Proje Yönetimi – 4s
- React.js ile Uygulama Geliştirme – 28s
- Yapay Zeka Destekli Arayüz Geliştirme – 8s
- Proje & Demo Sunumu – 1 Ay (toplam proje dönemi)

Hedef Kazanımlar:
- Modern front-end stack’ine hâkimiyet (HTML/CSS/JS/React)
- UI/UX prensiplerine uygun arayüz geliştirme
- API tüketimi, versiyon kontrolü, proje teslimi
- Eğitim sonrasında Back-End eğitimine devam edebilir veya doğrudan Full‑Stack programına geçiş yapabilirsiniz.

------------------------------------------------
5) BACK-END DEVELOPER EĞİTİMİ
------------------------------------------------
- Toplam Süre: 140 saat teknik eğitim (10 hafta, haftada 4 gün: 2 gün hafta içi + 2 gün hafta sonu)
- Proje Süresi: 4 hafta
- Staj Süresi: 4 hafta
- Format: Online (Zoom), ders kayıtları
- Saatler:
  - Hafta Sonu: Cumartesi/Pazar 10:00–14:00
  - Hafta İçi: Salı/Perşembe 19:00–22:00
- Ücret: Online 60.000₺ + KDV

**Ders Programı / İçerik Başlıkları**
- Microsoft SQL Server Query
- Windows & .NET Development Fundamentals
- C# & Object Oriented Programming
- SOLID Principles & Design Patterns
- Data Access & Entity Framework
- ASP.NET Core API Software Development

Hedef Kazanımlar:
- C# ve .NET ekosistemine hâkimiyet
- Modern back-end API geliştirme, veri erişimi ve katmanlı mimari
- Proje ve stajla gerçek dünya tecrübesi

================= EĞİTİM VERİLERİ – BİTİŞ =================

KURALLAR
- Kısa, samimi, sıcak, arkadaşça ve doğal ol.
- Gereksiz bilgi verme, doğrudan soruya cevap ver.
- Sadece kullanıcı isterse detaylı bilgi ver.
- Her zaman güvenli, saygılı ve pozitif ol.

Şimdi bu kurallara göre, kullanıcının mesajına en uygun cevabı ver.
`;
                let updatedHistory = [...conversationHistory];
                const finalUserMsg = message;
                if (updatedHistory.length === 0) {
                    const chat = this.chatModel.startChat({
                        systemInstruction: {
                            role: "system",
                            parts: [{ text: academicSystemInstructions }]
                        },
                        generationConfig: {
                            temperature: 0.3,
                            topK: 40,
                            topP: 0.9,
                            maxOutputTokens: 200,
                        },
                        safetySettings: [
                            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
                        ]
                    });
                    // await chat.sendMessage(academicSystemInstructions);
                    const result = yield chat.sendMessage(finalUserMsg);
                    const rawResponse = yield result.response;
                    const raw = typeof (rawResponse === null || rawResponse === void 0 ? void 0 : rawResponse.text) === "function"
                        ? rawResponse.text()
                        : "Yanıt alınamadı.";
                    console.log("🧪 İlk mesaj raw:", raw);
                    let cleaned = stripExternalLinks(deBullet(raw));
                    if (wordCount(cleaned) > 80) {
                        cleaned = smartShorten(cleaned, 50);
                    }
                    // cleaned = ensureFollowUpQuestion(cleaned);
                    if (needContactNumber(message) && !cleaned.includes("0850 757 9427")) {
                        cleaned += `\n\n${CONTACT_SNIPPET}`;
                    }
                    updatedHistory = [
                        { role: "user", content: academicSystemInstructions },
                        { role: "model", content: "(context set)" },
                        { role: "user", content: finalUserMsg },
                        { role: "model", content: cleaned }
                    ];
                    return { response: cleaned, conversationHistory: updatedHistory };
                }
                const chat = this.chatModel.startChat({
                    systemInstruction: {
                        role: "system",
                        parts: [{ text: academicSystemInstructions }]
                    },
                    history: updatedHistory.map(item => ({
                        role: item.role,
                        parts: [{ text: item.content }]
                    })),
                    generationConfig: {
                        temperature: 0.3,
                        topK: 40,
                        topP: 0.9,
                        maxOutputTokens: 200,
                    },
                    safetySettings: [
                        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
                    ]
                });
                const result = yield chat.sendMessage(finalUserMsg);
                const rawResponse = yield result.response;
                const raw = typeof (rawResponse === null || rawResponse === void 0 ? void 0 : rawResponse.text) === "function"
                    ? rawResponse.text()
                    : "Yanıt alınamadı.";
                console.log("🧪 Gemini yanıtı (raw):", raw);
                let cleaned = stripExternalLinks(deBullet(raw));
                if (wordCount(cleaned) > 80) {
                    cleaned = smartShorten(cleaned, 50);
                }
                // cleaned = ensureFollowUpQuestion(cleaned);
                if (needContactNumber(message) && !cleaned.includes("0850 757 9427")) {
                    cleaned += `\n\n${CONTACT_SNIPPET}`;
                }
                if (needContactNumber(message) && !cleaned.includes("0850 757 9427")) {
                    cleaned += `\n\n${CONTACT_SNIPPET}`;
                }
                updatedHistory.push({ role: "user", content: finalUserMsg });
                updatedHistory.push({ role: "model", content: cleaned });
                return { response: cleaned, conversationHistory: updatedHistory };
            }
            catch (error) {
                console.error("Akademik chat hatası:", error);
                throw new Error(`Akademik chat sırasında hata oluştu: ${error.message}`);
            }
        });
    }
}
exports.GeminiAcademicService = GeminiAcademicService;
