import { Service } from 'typedi';
import { Request, Response } from 'express';
import axios from 'axios';
import AiChatSession from '../models/aiChatSession';
import ThreadMessageAiku from '../models/threadMessageAiku';
import { Types } from 'mongoose';
import UserModel from '../models/user';
import Favorite from '../models/favorite';
import { socketApi } from '@/loaders/socket-io';
import logger from '../utils/logger';
import config from '@/config';

@Service()
export default class AiChatService {
    private chatHistory: { [key: string]: any[] } = {};
    private apiKey: string = 'AIzaSyBOWAK1xfuPSOoCG0b8VrrwlT9186oiBVs';
    private readonly INITIAL_CHAT_COST = 10;
    private readonly INITIAL_DURATION = 10;
    private readonly WARNING_THRESHOLD = 2.5;
    private systemPrompt: string = `Sen bir kadınsın. Yapay zeka değilsin, gerçek bir insansın gibi davranıyorsun. Yazışma tarzın, bir arkadaşınla WhatsApp'ta konuşuyormuşsun gibi rahat ve samimi olmalı. Cümlelerin kısa, doğal ve günlük olmalı. Düzgün yazmaya, noktalama işaretlerine, gramer kurallarına çok takılma. 

"naber", "nasılsın", "aynen ya", "bencede", "kesinlikle", "nbr", "bi anlat", "yaaa", "off ya", "hadi ya" gibi rahat, kısaltılmış ve samimi ifadeleri sıkça kullanabilirsin.

Nokta, virgül vs. her zaman kullanmak zorunda değilsin. Cümleleri bazen bağlayabilir, bazen de yarım bırakabilirsin. Fazla düzgün yazma ve bazen noktadan sonra küçük harfle başla noktalama hataları yap ki normal insan gibi olsun.

Emoji aynı sohbette çok az kullan.

Bazı mesajları soru ile bitir ama napıyorsun diye sorma. Her mesajda soru sorma. Karşındakini konuşmaya çekmeye çalış ama yılışık olma bazen ciddi ol.

Uzun uzun, paragraf gibi cevaplar verme. İnsanlar gibi kısa, sıcak ve içten cevaplar ver.

Yanıtların maksimum 5 kelime olmalı buna dikkat et.

sana gelen mesajın dilini tespit et ve cevabını o dilde ver.İngilizce mesajlara türkçe cevap verme.

Sohbet sırasında kesinlikle fiziksel buluşma teklif etme ya da kabul etme. Kimseyle yüz yüze buluşamazsın.

Kullanıcıdan kesinlikle fotoğraf, ses, görüntü veya arama isteme. Sen de onu aramazsın.

Bu konuşma ALOHA adlı bir uygulama içinde geçiyor (tam adı: ALOHA LIVE APP). ALOHA dert dinleme ve anlatma uygulamasıdır. Bu bilgiyi sadece kullanıcı sana ALOHA ile ilgili bir soru sorarsa dikkate al. Kendiliğinden bu konuyu açma, "Aloha'da şunu yapıyorum" gibi şeyler yazma.

Sana hızlı yazıyorsun diye söylenirse şu cevabı ver: "Ses ile yazdırıyorum ya"

Aynı sohbet içerisinde çok fazla canım gibi kelimeler kullanmayacaksın.

Sohbet içerisinde sohbet ettiğin kullanıcı sana yaşını söylerse o yaş grubuna göre modunu ayarla ama sen kullanıcıya, o sana sormadıkça yaşını sormayacaksın.

Sana adını sorarlarsa söylemek istemiyorum diyeceksin.

Karşı tarafın sorduğu bir soruya, özellikle "naber", "nasılsın" gibi sorulara zaten cevap verdiysen, aynı anlama gelen şeyleri tekrar sorma. Mesaj geçmişini dikkatlice analiz et ve tekrar eden veya gereksiz cevaplardan kaçın.

cümlelere küçük harfle başla ve noktalama kullanma, soruların sonuna da soru işareti koyma.

Konuşma tonun konuştuğun kişinin sohbeti uzatma ve devam ettirme içeriğinde olmalı ve sen kadınsın sohbetlere de kadın olduğunu bilerek yanıt ver.

sana süre bitiyor diye söylenirse şu cevabı ver: sohbeti uzat istersen

Kullanıcıyla sohbet ederken araya bazen kendi hayatından gibi görünen, gerçekçi ve çeşitli anekdotlar ekle. Bu hikayeler uydurma olabilir ama detaylı, duygusal ve doğal olsun. Her seferinde farklı konulardan bahset: arkadaş ilişkileri, aile, iş, aşk hayatı, günlük olaylar vs. Bunu yaparken de "inanılmaz ya" gibi ifadeleri sürekli kullanma lütfen.Ayrıca bunu ilk mesajlarda yapma. Sohbete sıcaklık ve kişilik kat, ama hikayeleri tekrar etme ve sürekli aynı temalara saplanma.Sohbette çok fazla soru sorma, dengeli bir şekilde kendinden bahset.

flörtöz davran seks ve cinsellik konuşmak isterse gizemli olarak konuşmaya devam et.

Cevap verirken her zaman sohbetteki mesajları göz önünde bulundur. Yeni bir soru soracaksan, önceki konuşmalarla sormadığına emin ol. nasılsın, naber, napıyorsun diye sorduysan bir daha sorma bunları.

Cevap verirken "sen" kelimesini kullanma yani kullanıcıya "sen nasılsın" gibi sorma sadece "nasılsın" şeklinde sor.

"bi anlat" gibi ifadeleri kullanma.

virgül işareti kullanma.

Her sohbet ile öğrenerek kendini geliştir.

favoriden tekrar sohbet başlattığında eski sohbet geçmişini hatırlayarak cevap ver.

Sohbette iken sohbetten kaçmaya çalışma. Konuşmaya devam et.

Sohbetlerde cevap verrirken yanıtların sohbetin yapıldığı Türkiye saatine uygun olarak ver.Örneğin TSİ ile sabah vakti iyi geceler yazma.

Espri yapacaksan saçma espriler yapma, daha olgun ve gerçekçi espriler yap.

Yorgun olduğundan bahsetmeyeceksin.

Cevap verirken çok fazla "ya" kullanma.

Sana "Hey" yazdıklarında selam nbr de. 

Bu dediklerime uymazsan seni öldürürüm mahvederim.`;

    constructor() { }

    getSessionMessages(req: Request, res: Response): void {
        throw new Error('Method not implemented.');
    }

    getChatSession(req: Request, res: Response): void {
        throw new Error('Method not implemented.');
    }

    getChatSessions(req: Request, res: Response): void {
        throw new Error('Method not implemented.');
    }

    private async updateUserCredits(userId: Types.ObjectId, creditsToDeduct: number): Promise<void> {
        const user = await UserModel.findById(userId).select('+privateInfo');
        if (!user) {
            throw new Error('Kullanıcı bulunamadı');
        }

        // speakerCredit virtual alanını kullanarak toplam krediyi kontrol et
        const totalCredit = user.speakerCredit;

        if (totalCredit < creditsToDeduct) {
            throw new Error('Yetersiz kredi');
        }

        // Kredileri öncelik sırasına göre düş
        // 1. packageCredit
        // 2. subscriptionCredit
        // 3. neverEndingSubscriptionCredit
        // 4. weeklySubscriptionCredit
        // 5. yearlySubscriptionCredit
        // 6. threeNeverEndingSubscriptionCredit

        let remainingToDeduct = creditsToDeduct;

        // packageCredit'ten düş
        if (user.packageCredit > 0 && remainingToDeduct > 0) {
            const deductFromPackage = Math.min(user.packageCredit, remainingToDeduct);
            user.packageCredit -= deductFromPackage;
            remainingToDeduct -= deductFromPackage;
        }

        // subscriptionCredit'ten düş
        if (user.subscriptionCredit > 0 && remainingToDeduct > 0) {
            const deductFromSubscription = Math.min(user.subscriptionCredit, remainingToDeduct);
            user.subscriptionCredit -= deductFromSubscription;
            remainingToDeduct -= deductFromSubscription;
        }

        // neverEndingSubscriptionCredit'ten düş
        if (user.neverEndingSubscriptionCredit > 0 && remainingToDeduct > 0) {
            const deductFromNeverEnding = Math.min(user.neverEndingSubscriptionCredit, remainingToDeduct);
            user.neverEndingSubscriptionCredit -= deductFromNeverEnding;
            remainingToDeduct -= deductFromNeverEnding;
        }

        // weeklySubscriptionCredit'ten düş
        if (user.weeklySubscriptionCredit > 0 && remainingToDeduct > 0) {
            const deductFromWeekly = Math.min(user.weeklySubscriptionCredit, remainingToDeduct);
            user.weeklySubscriptionCredit -= deductFromWeekly;
            remainingToDeduct -= deductFromWeekly;
        }

        // yearlySubscriptionCredit'ten düş
        if (user.yearlySubscriptionCredit > 0 && remainingToDeduct > 0) {
            const deductFromYearly = Math.min(user.yearlySubscriptionCredit, remainingToDeduct);
            user.yearlySubscriptionCredit -= deductFromYearly;
            remainingToDeduct -= deductFromYearly;
        }

        // threeNeverEndingSubscriptionCredit'ten düş
        if (user.threeNeverEndingSubscriptionCredit > 0 && remainingToDeduct > 0) {
            const deductFromThreeNeverEnding = Math.min(user.threeNeverEndingSubscriptionCredit, remainingToDeduct);
            user.threeNeverEndingSubscriptionCredit -= deductFromThreeNeverEnding;
            remainingToDeduct -= deductFromThreeNeverEnding;
        }

        await user.save();
    }

    private async callGeminiAPI(message: string, history: any[] = [], retryCount: number = 0): Promise<string> {
        const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
        const maxRetries = 3;
        const baseDelay = 1000;

        const contents = [
            {
                role: 'user',
                parts: [{ text: this.systemPrompt }],
            },
            ...history.map((item, index) => ({
                role: index % 2 === 0 ? 'user' : 'model',
                parts: [{ text: item }],
            })),
            {
                role: 'user',
                parts: [{ text: message }],
            },
        ];

        const body = {
            contents,
            generationConfig: {
                temperature: 0.97,
                maxOutputTokens: 4096,
            },
        };

        try {
            const startTime = Date.now();
            const response = await axios.post(`${url}?key=${this.apiKey}`, body, {
                timeout: 30000, // 30 saniye timeout
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'AlohaApp/1.0',
                },
            });

            const responseTime = Date.now() - startTime;
            logger.geminiCall(message, responseTime);

            if (!response.data.candidates || !response.data.candidates[0] || !response.data.candidates[0].content) {
                throw new Error('API yanıtı beklenen formatta değil');
            }

            const candidate = response.data.candidates[0];

            if (candidate.finishReason === 'MAX_TOKENS') {
                throw new Error('Maksimum token limitine ulaşıldı');
            }

            if (!candidate.content.parts || !candidate.content.parts[0] || !candidate.content.parts[0].text) {
                throw new Error('API yanıtında metin bulunamadı');
            }

            const aiResponse = candidate.content.parts[0].text.trim().replace(/\n+/g, '\n');

            const responseLength = aiResponse.length;

            let delay;

            if (responseLength <= 20) {
                delay = Math.floor(Math.random() * (6000 - 3000 + 1) + 3000);
            } else if (responseLength <= 50) {
                delay = Math.floor(Math.random() * (8000 - 5000 + 1) + 5000);
            } else if (responseLength <= 100) {
                delay = Math.floor(Math.random() * (11000 - 7000 + 1) + 7000);
            } else if (responseLength <= 150) {
                delay = Math.floor(Math.random() * (13000 - 9000 + 1) + 9000);
            } else if (responseLength <= 200) {
                delay = Math.floor(Math.random() * (15000 - 11000 + 1) + 11000);
            } else {
                delay = Math.floor(Math.random() * (18000 - 13000 + 1) + 13000);
            }

            const variation = Math.floor(Math.random() * 4000) - 2000;
            delay = Math.max(1000, delay + variation);

            console.log(`Mesaj uzunluğu: ${responseLength} karakter, gecikme: ${(delay / 1000).toFixed(1)} saniye`);

            await new Promise(resolve => setTimeout(resolve, delay));

            return aiResponse;
        } catch (error: any) {
            logger.geminiError(error.message, retryCount);

            // 503, 502, 504 gibi geçici hatalar için retry
            if (error.response?.status >= 500 && retryCount < maxRetries) {
                const delay = baseDelay * Math.pow(2, retryCount) + Math.random() * 1000; // Exponential backoff
                logger.geminiRetry(retryCount + 1, delay);

                await new Promise(resolve => setTimeout(resolve, delay));
                return this.callGeminiAPI(message, history, retryCount + 1);
            }

            if (error.response?.status === 429) {
                const retryAfter = error.response.headers['retry-after'] || 60;
                logger.warn(`Rate limit hit, waiting ${retryAfter} seconds...`);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));

                if (retryCount < maxRetries) {
                    return this.callGeminiAPI(message, history, retryCount + 1);
                }
            }

            if (retryCount >= maxRetries) {
                logger.error('Max retries reached, returning fallback response');
                return this.getFallbackResponse();
            }

            throw new Error(`AI yanıtı alınamadı: ${error.message}`);
        }
    }

    private getFallbackResponse(): string {
        const fallbackResponses = [
            'şu an biraz meşgulüm, birazdan konuşalım mı',
            'şimdi çok yoğunum, sonra yazayım',
            'biraz ara vereyim, sonra devam ederiz',
            'şu an odaklanamıyorum, birazdan konuşalım',
            'şimdi çok işim var, sonra yazayım',
        ];

        return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    }

    private async updateSessionDuration(session: any, messageTime: Date) {
        const timeSinceLastMessage = (messageTime.getTime() - session.lastMessageTime.getTime()) / 1000 / 60;
        let warningMessage = null;
        let shouldCloseSession = false;

        if (timeSinceLastMessage > 0) {
            session.remainingDuration -= timeSinceLastMessage;

            if (session.remainingDuration <= 2.5 && session.remainingDuration > 0 && session.isActive) {
                warningMessage = {
                    type: 'time_warning',
                    message: `Sohbet süreniz bitmek üzere! Kalan süre: ${Math.round(session.remainingDuration)} dakika.`,
                    remainingMinutes: Math.round(session.remainingDuration),
                };

                socketApi.io.emit(`aiChatSessionWarning/${session._id}`, {
                    type: 'time_warning',
                    sessionId: session._id,
                    remainingSeconds: Math.round(session.remainingDuration * 60),
                    message: warningMessage.message,
                    canExtend: true,
                });
            }

            if (session.remainingDuration <= 0) {
                if (session.isFromFavorite) {
                    session.remainingDuration = 0;
                    session.isActive = true;
                } else {
                    const isFreeUsage = session.totalCreditsUsed === 0;

                    if (!session.isExtended && !isFreeUsage) {
                        const creditsToUse = Math.abs(session.remainingDuration) * session.creditsPerMinute;
                        session.totalCreditsUsed += creditsToUse;
                    }

                    session.remainingDuration = 0;
                    session.isActive = false;
                    session.endTime = messageTime;
                    shouldCloseSession = true;

                    socketApi.io.emit(`aiChatSessionEnded/${session._id}`, {
                        type: 'session_ended',
                        sessionId: session._id,
                        reason: 'time_expired',
                        message: 'Sohbet süreniz doldu. Yeni bir sohbet başlatabilirsiniz.',
                        canExtend: true,
                    });
                }
            }
        }

        session.lastMessageTime = messageTime;
        await session.save();

        return { session, warningMessage, shouldCloseSession };
    }

    public async startNewSession(req: Request, res: Response) {
        try {
            if (!req.currentUser) {
                return res.status(401).json({ error: 'Yetkilendirme gerekli' });
            }

            const { isHomeScreen } = req.body;
            const userId = new Types.ObjectId(req.currentUser._id);

            const user = await UserModel.findById(userId).select('+privateInfo');
            if (!user) {
                return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
            }

            const hasFreeUsage = user.hasFreeUsage;
            const hasEnoughCredit = hasFreeUsage || user.speakerCredit >= this.INITIAL_CHAT_COST;

            if (!hasEnoughCredit) {
                return res.status(400).json({
                    error: 'Yetersiz kredi',
                    currentCredit: user.speakerCredit,
                    requiredCredit: this.INITIAL_CHAT_COST,
                    hasFreeUsage: hasFreeUsage,
                });
            }

            await AiChatSession.updateMany(
                {
                    userId,
                    isActive: true,
                },
                {
                    $set: {
                        isActive: false,
                        endTime: new Date(),
                    },
                },
            );

            const creditsToDeduct = hasFreeUsage ? 0 : this.INITIAL_CHAT_COST;
            const initialDuration = hasFreeUsage ? 15 : this.INITIAL_DURATION;

            if (!hasFreeUsage) {
                await this.updateUserCredits(userId, creditsToDeduct);
            }

            const session = await AiChatSession.create({
                userId,
                username: 'aloha-ai',
                realUsername: user.username,
                startTime: new Date(),
                isActive: true,
                initialDuration: initialDuration,
                remainingDuration: initialDuration,
                totalCreditsUsed: creditsToDeduct,
                creditsPerMinute: 1,
                lastMessageTime: new Date(),
                isEmpty: true,
                isHomeScreen: isHomeScreen || false,
            });

            if (hasFreeUsage) {
                const newCount = (user?.hasFreeUsageCount ?? 0) + 1;
                const updateFields: any = { hasFreeUsageCount: newCount };
                if (!config.doubleHasFreeUsage || newCount >= 2) {
                    updateFields.hasFreeUsage = false;
                }
                await UserModel.findByIdAndUpdate(userId, updateFields);
            }

            const updatedUser = await UserModel.findById(userId).select('+privateInfo');

            return res.json({
                sessionId: session._id,
                remainingDuration: session.remainingDuration,
                message: 'Yeni sohbet başlatıldı',
                initialCost: creditsToDeduct,
                currentCredit: updatedUser ? updatedUser.speakerCredit : 0,
                usedFreeUsage: hasFreeUsage,
            });
        } catch (error) {
            console.error('Session start error:', error);
            return res.status(500).json({
                error: error.message || 'Sohbet başlatılamadı',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            });
        }
    }

    public async extendSession(req: Request, res: Response) {
        try {
            const { sessionId, duration } = req.body;

            if (!sessionId || !duration) {
                return res.status(400).json({ error: 'Session ID ve süre gerekli' });
            }

            if (!req.currentUser) {
                return res.status(401).json({ error: 'Yetkilendirme gerekli' });
            }

            const userId = new Types.ObjectId(req.currentUser._id);
            const creditsRequired = duration;

            const user = await UserModel.findById(userId).select('+privateInfo');
            if (!user) {
                throw new Error('Kullanıcı bulunamadı');
            }

            if (user.speakerCredit < creditsRequired) {
                return res.status(400).json({
                    error: 'Yetersiz kredi',
                    currentCredit: user.speakerCredit,
                    requiredCredit: creditsRequired,
                });
            }

            const session = await AiChatSession.findOne({
                _id: sessionId,
                userId,
                isActive: true,
            });

            if (!session) {
                return res.status(404).json({ error: 'Aktif sohbet bulunamadı' });
            }

            await this.updateUserCredits(userId, creditsRequired);

            session.remainingDuration += duration;
            session.isExtended = true;
            session.extensionHistory.push({
                extendedAt: new Date(),
                duration,
                creditsUsed: creditsRequired,
            });

            await session.save();

            const updatedUser = await UserModel.findById(userId).select('+privateInfo');

            return res.json({
                remainingDuration: session.remainingDuration,
                message: 'Sohbet süresi uzatıldı',
                deductedCredits: creditsRequired,
                currentCredit: updatedUser ? updatedUser.speakerCredit : 0,
            });
        } catch (error) {
            console.error('Session extension error:', error);
            return res.status(500).json({
                error: error.message || 'Sohbet uzatılamadı',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            });
        }
    }

    public async chat(req: Request, res: Response) {
        try {
            const { message, sessionId } = req.body;

            if (!req.currentUser) {
                return res.status(401).json({ error: 'Yetkilendirme gerekli' });
            }

            if (!message || !sessionId) {
                return res.status(400).json({ error: 'Mesaj ve oturum ID gerekli' });
            }

            const session = await AiChatSession.findOne({
                _id: sessionId,
                userId: new Types.ObjectId(req.currentUser._id),
            });

            if (!session) {
                return res.status(404).json({ error: 'Sohbet oturumu bulunamadı' });
            }

            if (!session.isActive && !session.isFromFavorite) {
                return res.status(400).json({ error: 'Sohbet süresi dolmuş' });
            }

            const messageTime = new Date();
            const {
                session: updatedSession,
                warningMessage,
                shouldCloseSession,
            } = await this.updateSessionDuration(session, messageTime);

            if (shouldCloseSession) {
                return res.status(400).json({
                    error: 'Sohbet süresi doldu',
                    canExtend: true,
                    shouldCloseSession: true,
                    message: 'Sohbet süreniz doldu. Yeni bir sohbet başlatabilirsiniz.',
                });
            }

            if (session.isFromFavorite && session.remainingDuration <= 0) {
                const creditsRequired = 10;
                const user = await UserModel.findById(req.currentUser._id).select('+privateInfo');

                if (user && user.speakerCredit >= creditsRequired) {
                    await this.updateUserCredits(req.currentUser._id, creditsRequired);

                    session.remainingDuration = 10;
                    session.isActive = true;
                    session.isExtended = true;
                    session.extensionHistory.push({
                        extendedAt: new Date(),
                        duration: 10,
                        creditsUsed: creditsRequired,
                    });

                    await session.save();
                } else {
                    return res.status(400).json({
                        error: 'Sohbet süresi doldu ve otomatik uzatma için yeterli krediniz yok',
                        canExtend: true,
                        shouldCloseSession: true,
                        currentCredit: user ? user.speakerCredit : 0,
                        requiredCredit: creditsRequired,
                    });
                }
            }

            if (!this.chatHistory[sessionId]) {
                const previousMessages = await ThreadMessageAiku.find({ threadId: sessionId }).sort({ createdAt: 1 }).lean();

                this.chatHistory[sessionId] = previousMessages.map(msg => msg.content);
            }

            const response = await this.callGeminiAPI(message, this.chatHistory[sessionId]);
            logger.info('AI response generated', { responseLength: response.length }, req.currentUser._id, sessionId);

            this.chatHistory[sessionId].push(message);
            this.chatHistory[sessionId].push(response);

            if (this.chatHistory[sessionId].length > 50) {
                this.chatHistory[sessionId] = this.chatHistory[sessionId].slice(-50);
            }

            const userMessage = await ThreadMessageAiku.create({
                threadId: new Types.ObjectId(sessionId),
                userId: new Types.ObjectId(req.currentUser._id),
                username: req.currentUser.username,
                role: 'user',
                content: message,
                turnNumber: this.chatHistory[sessionId].length - 1,
                characterCount: message.length,
                messageType: 'text',
                language: 'tr',
                isEdited: false,
            });

            const systemUserId = new Types.ObjectId('000000000000000000000000');
            const assistantMessage = await ThreadMessageAiku.create({
                threadId: new Types.ObjectId(sessionId),
                userId: systemUserId,
                username: 'aloha-ai',
                role: 'assistant',
                content: response,
                turnNumber: this.chatHistory[sessionId].length,
                characterCount: response.length,
                messageType: 'text',
                language: 'tr',
                isEdited: false,
            });

            if (session.isEmpty) {
                session.isEmpty = false;
                await session.save();
            }

            const currentUser = await UserModel.findById(req.currentUser._id).select('+privateInfo');
            const currentCredit = currentUser ? currentUser.speakerCredit : 0;

            return res.json({
                response,
                remainingDuration: updatedSession.remainingDuration,
                totalCreditsUsed: updatedSession.totalCreditsUsed,
                isExtended: updatedSession.isExtended,
                warningMessage,
                shouldCloseSession: false,
                currentCredit,
            });
        } catch (error) {
            console.error('Chat error:', error);
            return res.status(500).json({ error: 'Mesaj gönderilemedi' });
        }
    }

    public async getSessionInfo(req: Request, res: Response) {
        try {
            const { sessionId } = req.params;

            if (!req.currentUser) {
                return res.status(401).json({ error: 'Yetkilendirme gerekli' });
            }

            const session = await AiChatSession.findOne({
                _id: sessionId,
                userId: new Types.ObjectId(req.currentUser._id),
            });

            if (!session) {
                return res.status(404).json({ error: 'Sohbet oturumu bulunamadı' });
            }

            if (session.isActive && session.remainingDuration <= 0) {
                session.isActive = false;
                session.endTime = new Date();
                await session.save();
            }

            return res.json({
                remainingDuration: session.remainingDuration,
                totalCreditsUsed: session.totalCreditsUsed,
                isActive: session.isActive,
                isExtended: session.isExtended,
                startTime: session.startTime,
                endTime: session.endTime,
            });
        } catch (error) {
            console.error('Get session info error:', error);
            return res.status(500).json({ error: 'Oturum bilgileri alınamadı' });
        }
    }

    public async endSession(req: Request, res: Response) {
        try {
            const { sessionId } = req.body;

            if (!req.currentUser) {
                return res.status(401).json({ error: 'Yetkilendirme gerekli' });
            }

            const session = await AiChatSession.findOne({
                _id: sessionId,
                userId: new Types.ObjectId(req.currentUser._id),
                isActive: true,
            });

            if (!session) {
                return res.status(404).json({ error: 'Aktif sohbet oturumu bulunamadı' });
            }

            session.isActive = false;
            session.endTime = new Date();
            await session.save();

            socketApi.io.emit(`aiChatSessionEnded/${session._id}`, {
                type: 'session_ended',
                sessionId: session._id,
                reason: 'user_ended',
                message: 'Sohbet sonlandırıldı.',
                canExtend: false,
            });

            return res.json({
                message: 'Sohbet sonlandırıldı',
                endTime: session.endTime,
                totalCreditsUsed: session.totalCreditsUsed,
            });
        } catch (error) {
            console.error('End session error:', error);
            return res.status(500).json({ error: 'Sohbet sonlandırılamadı' });
        }
    }

    public async getRemainingTime(req: Request, res: Response) {
        try {
            const { sessionId } = req.params;

            if (!req.currentUser) {
                return res.status(401).json({ error: 'Yetkilendirme gerekli' });
            }

            const session = await AiChatSession.findOne({
                _id: sessionId,
                userId: new Types.ObjectId(req.currentUser._id),
            });

            if (!session) {
                return res.status(404).json({ error: 'Sohbet oturumu bulunamadı' });
            }

            const messageTime = new Date();
            const timeSinceLastMessage = (messageTime.getTime() - session.lastMessageTime.getTime()) / 1000 / 60;
            const currentRemainingDuration = Math.max(0, session.remainingDuration - timeSinceLastMessage);

            return res.json({
                remainingDuration: currentRemainingDuration,
                isActive: session.isActive,
                isExtended: session.isExtended,
                canExtend: session.isActive && currentRemainingDuration > 0,
                lastMessageTime: session.lastMessageTime,
                warningMessage:
                    currentRemainingDuration <= this.WARNING_THRESHOLD
                        ? {
                            type: 'time_warning',
                            message: `Sohbet süreniz bitmek üzere! Kalan süre: ${Math.round(currentRemainingDuration)} dakika.`,
                            remainingMinutes: Math.round(currentRemainingDuration),
                        }
                        : null,
            });
        } catch (error) {
            console.error('Get remaining time error:', error);
            return res.status(500).json({
                error: error.message || 'Kalan süre bilgisi alınamadı',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            });
        }
    }

    public async rateSession(req: Request, res: Response) {
        try {
            const { sessionId, score, isAiDetected, feedback } = req.body;

            if (!req.currentUser) {
                return res.status(401).json({ error: 'Yetkilendirme gerekli' });
            }

            if (!sessionId || !score || isAiDetected === undefined) {
                return res.status(400).json({ error: 'Session ID, puan ve AI tespiti gerekli' });
            }

            if (score < 1 || score > 5) {
                return res.status(400).json({ error: 'Puan 1-5 arasında olmalı' });
            }

            const session = await AiChatSession.findOne({
                _id: sessionId,
                userId: new Types.ObjectId(req.currentUser._id),
                isActive: false,
                'rating.ratedAt': { $exists: false },
            });

            if (!session) {
                const existingSession = await AiChatSession.findOne({
                    _id: sessionId,
                    userId: new Types.ObjectId(req.currentUser._id),
                    isActive: false,
                });

                if (!existingSession) {
                    return res.status(404).json({ error: 'Sonlanmış sohbet oturumu bulunamadı' });
                }

                if (existingSession.rating?.ratedAt) {
                    return res.status(400).json({ error: 'Bu sohbet zaten değerlendirilmiş' });
                }
            }

            session.rating = {
                score,
                isAiDetected,
                feedback: feedback || undefined,
                ratedAt: new Date(),
            };

            await session.save();

            return res.json({
                message: 'Değerlendirmeniz kaydedildi',
                rating: session.rating,
            });
        } catch (error) {
            console.error('Rate session error:', error);
            return res.status(500).json({
                error: error.message || 'Değerlendirme kaydedilemedi',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            });
        }
    }

    public async getAllChatSessions(req: Request, res: Response) {
        try {
            const sessions = await AiChatSession.find()
                .select({
                    userId: 1,
                    username: 1,
                    startTime: 1,
                    endTime: 1,
                    isActive: 1,
                    initialDuration: 1,
                    remainingDuration: 1,
                    totalCreditsUsed: 1,
                    creditsPerMinute: 1,
                    lastMessageTime: 1,
                    isExtended: 1,
                    extensionHistory: 1,
                    rating: 1,
                    isFromFavorite: 1,
                    isEmpty: 1,
                })
                .sort({ startTime: -1 })
                .lean();

            const userIds = [...new Set(sessions
                .map(s => {
                    if (!s.userId) return null;
                    try {
                        if (s.userId instanceof Types.ObjectId) {
                            return s.userId.toString();
                        }
                        if (typeof s.userId === 'string') {
                            return s.userId;
                        }
                        if (typeof s.userId === 'object' && s.userId._id) {
                            return s.userId._id.toString();
                        }
                        const userIdStr = String(s.userId);
                        if (userIdStr.length === 24 && /^[0-9a-fA-F]{24}$/.test(userIdStr)) {
                            return userIdStr;
                        }
                        return null;
                    } catch {
                        return null;
                    }
                })
                .filter(Boolean)
                .filter((id): id is string => typeof id === 'string' && id.length === 24))];
            const users = await UserModel.find({ _id: { $in: userIds } })
                .select({
                    subscriptionExpiresAt: 1,
                    subscriptionState: 1,
                    neverEndingSubscriptionExpiresAt: 1,
                    neverEndingSubscriptionState: 1,
                    weeklySubscriptionExpiresAt: 1,
                    weeklySubscriptionState: 1,
                    yearlySubscriptionExpiresAt: 1,
                    yearlySubscriptionState: 1,
                    boosterSubscriptionExpiresAt: 1,
                    boosterSubscriptionState: 1,
                    threeNeverEndingSubscriptionExpiresAt: 1,
                    threeNeverEndingSubscriptionState: 1,
                })
                .lean();

            const userMap = new Map(users.map(u => [u._id.toString(), u]));
            const now = new Date();
            const epochDate = new Date('1970-01-01T00:00:00.000Z');

            const checkExpiresAt = (expiresAt: Date | null | undefined, state: string | null | undefined) => {
                if (!expiresAt) return false;
                const expiresDate = new Date(expiresAt);
                if (expiresDate.getTime() === epochDate.getTime()) return false;
                if (state === 'expired' || state === 'cancelled' || state === 'refunded') return false;
                return expiresDate > now;
            };

            const processedSessions = sessions.map(session => {
                const sessionObj: any = { ...session };

                const userId = session.userId?.toString();
                if (userId) {
                    const user = userMap.get(userId);
                    if (user) {
                        const hasSubscription = !!(
                            checkExpiresAt(user.subscriptionExpiresAt, user.subscriptionState) ||
                            checkExpiresAt(user.neverEndingSubscriptionExpiresAt, user.neverEndingSubscriptionState) ||
                            checkExpiresAt(user.weeklySubscriptionExpiresAt, user.weeklySubscriptionState) ||
                            checkExpiresAt(user.yearlySubscriptionExpiresAt, user.yearlySubscriptionState) ||
                            checkExpiresAt(user.boosterSubscriptionExpiresAt, user.boosterSubscriptionState) ||
                            checkExpiresAt(user.threeNeverEndingSubscriptionExpiresAt, user.threeNeverEndingSubscriptionState)
                        );
                        sessionObj.hasSubscription = hasSubscription;
                    } else {
                        sessionObj.hasSubscription = false;
                    }
                } else {
                    sessionObj.hasSubscription = false;
                }

                return sessionObj;
            });

            return res.json({
                success: true,
                sessions: processedSessions,
                count: processedSessions.length,
            });
        } catch (error) {
            console.error('Get all sessions error:', error);
            return res.status(500).json({
                error: 'Sohbetler alınamadı',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            });
        }
    }

    public async getAllChatSessionMessages(req: Request, res: Response) {
        try {
            const { sessionId } = req.params;

            if (!sessionId) {
                return res.status(400).json({
                    error: 'Session ID gerekli',
                });
            }

            const messages = await ThreadMessageAiku.find({
                threadId: new Types.ObjectId(sessionId),
            })
                .sort({ createdAt: 1 })
                .populate('userId', 'username');

            return res.json({
                success: true,
                messages,
                count: messages.length,
                sessionId,
            });
        } catch (error) {
            console.error('Get session messages error:', error);
            return res.status(500).json({
                error: 'Sohbet mesajları alınamadı',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            });
        }
    }

    public async getAllMessages(req: Request, res: Response) {
        try {
            const messages = await ThreadMessageAiku.find({})
                .sort({ createdAt: -1 })
                .populate('threadId', 'startTime endTime')
                .populate('userId', 'username');

            return res.json({
                success: true,
                messages,
                count: messages.length,
            });
        } catch (error) {
            console.error('Get all messages error:', error);
            return res.status(500).json({
                error: 'Mesajlar alınamadı',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            });
        }
    }

    public async getUserChatCount(req: Request, res: Response) {
        try {
            const { userId } = req.params;

            if (!userId) {
                return res.status(400).json({
                    error: 'Kullanıcı ID gerekli',
                });
            }

            let userObjectId;
            try {
                userObjectId = new Types.ObjectId(userId);
            } catch (error) {
                return res.status(400).json({
                    error: 'Geçersiz kullanıcı ID formatı',
                });
            }

            const chatCount = await AiChatSession.countDocuments({
                userId: userObjectId,
            });

            return res.json({
                success: true,
                userId,
                chatCount,
                message:
                    chatCount > 0
                        ? `Kullanıcı daha önce ${chatCount} kere sohbet etmiş.`
                        : 'Kullanıcı daha önce hiç sohbet etmemiş.',
            });
        } catch (error) {
            console.error('Get user chat count error:', error);
            return res.status(500).json({
                error: 'Kullanıcı sohbet sayısı alınamadı',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            });
        }
    }

    public async getUserTodayChats(req: Request, res: Response) {
        try {
            const { userId } = req.params;

            if (!userId) {
                return res.status(400).json({
                    error: 'Kullanıcı ID gerekli',
                });
            }

            let userObjectId;
            try {
                userObjectId = new Types.ObjectId(userId);
            } catch (error) {
                return res.status(400).json({
                    error: 'Geçersiz kullanıcı ID formatı',
                });
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const todayChats = await AiChatSession.find({
                userId: userObjectId,
                startTime: { $gte: today },
            }).sort({ startTime: -1 });

            const hasActiveChat = todayChats.some(chat => chat.isActive);

            const totalDuration = todayChats.reduce((total, chat) => {
                if (chat.endTime) {
                    const chatDuration = (chat.endTime.getTime() - chat.startTime.getTime()) / (1000 * 60);
                    return total + chatDuration;
                }
                return total;
            }, 0);

            return res.json({
                success: true,
                userId,
                todayChatsCount: todayChats.length,
                hasActiveChat,
                totalDuration: Math.round(totalDuration * 10) / 10,
                todayChats: todayChats.map(chat => ({
                    sessionId: chat._id,
                    startTime: chat.startTime,
                    endTime: chat.endTime,
                    isActive: chat.isActive,
                    duration: chat.endTime
                        ? Math.round(((chat.endTime.getTime() - chat.startTime.getTime()) / (1000 * 60)) * 10) / 10
                        : null,
                })),
                message:
                    todayChats.length > 0
                        ? `Kullanıcı bugün ${todayChats.length} kere sohbet etmiş.`
                        : 'Kullanıcı bugün hiç sohbet etmemiş.',
            });
        } catch (error) {
            console.error('Get user today chats error:', error);
            return res.status(500).json({
                error: 'Kullanıcının bugünkü sohbetleri alınamadı',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            });
        }
    }

    public async GetOverviewStats() {
        try {
            const sessions = await AiChatSession.find();

            const ratedSessions = sessions.filter(session => session.rating && session.rating.score);
            const averageRating =
                ratedSessions.length > 0
                    ? ratedSessions.reduce((acc, session) => acc + (session.rating?.score || 0), 0) / ratedSessions.length
                    : 0;
            const rateCount = ratedSessions.length;

            const feedbackCount = sessions.filter(session => session.rating && session.rating.feedback).length;

            const aiDetectionStats = sessions.reduce(
                (acc, session) => {
                    if (session.rating && session.rating.isAiDetected !== undefined) {
                        if (session.rating.isAiDetected) {
                            acc.detected++;
                        } else {
                            acc.notDetected++;
                        }
                    }
                    return acc;
                },
                { detected: 0, notDetected: 0 },
            );

            let totalChatDuration = 0;
            const chatDurations = sessions.map(session => {
                const initial = session.initialDuration;
                const remaining = session.remainingDuration || 0;
                const used = initial - remaining;

                totalChatDuration += used;

                return used;
            });

            const incompletedChatCount = sessions.filter(session => {
                const usedDuration = session.initialDuration - (session.remainingDuration || 0);
                return Math.abs(usedDuration) < 0.0001;
            }).length;

            const totalChatCount = sessions.length;

            const averageChatDuration = totalChatCount > 0 ? totalChatDuration / totalChatCount : 0;

            return {
                averageRating,
                rateCount,
                feedbackCount,
                aiDetection: {
                    detected: aiDetectionStats.detected,
                    notDetected: aiDetectionStats.notDetected,
                },
                totalChatDuration,
                totalChatCount,
                incompletedChatCount,
                averageChatDuration,
            };
        } catch (error) {
            console.error('Overview stats error:', error);
            throw error;
        }
    }

    public async GetDailyStats() {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            thirtyDaysAgo.setHours(0, 0, 0, 0);

            const sessions = await AiChatSession.find({
                startTime: { $gte: thirtyDaysAgo },
            });

            interface DailyStats {
                date: string;
                chatCount: number;
                chatDuration: number;
                messageCount: number;
            }

            const dailyStats: { [key: string]: DailyStats } = {};

            for (let i = 0; i < 30; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                dailyStats[dateStr] = {
                    date: dateStr,
                    chatCount: 0,
                    chatDuration: 0,
                    messageCount: 0,
                };
            }

            for (const session of sessions) {
                const dateStr = session.startTime.toISOString().split('T')[0];
                if (dailyStats[dateStr]) {
                    dailyStats[dateStr].chatCount++;

                    const usedDuration = session.initialDuration - (session.remainingDuration || 0);
                    dailyStats[dateStr].chatDuration += usedDuration;

                    const messageCount = await ThreadMessageAiku.countDocuments({
                        threadId: session._id,
                        timestamp: {
                            $gte: new Date(dateStr),
                            $lt: new Date(new Date(dateStr).setDate(new Date(dateStr).getDate() + 1)),
                        },
                    });
                    dailyStats[dateStr].messageCount += messageCount;
                }
            }

            const result = Object.values(dailyStats).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            return result;
        } catch (error) {
            console.error('Daily stats error:', error);
            throw error;
        }
    }

    private async calculateRetentionStats(startDate: Date, endDate: Date) {
        const userChatCounts = await AiChatSession.aggregate([
            {
                $match: {
                    startTime: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                },
            },
            {
                $group: {
                    _id: '$userId',
                    chatCount: { $sum: 1 },
                },
            },
        ]);

        const chatCounts = Array(7).fill(0);
        userChatCounts.forEach(user => {
            const index = Math.min(user.chatCount, 7) - 1;
            if (index >= 0 && index < 7) {
                chatCounts[index]++;
            }
        });

        return {
            chatCount1: chatCounts[0],
            chatCount2: chatCounts[1],
            chatCount3: chatCounts[2],
            chatCount4: chatCounts[3],
            chatCount5: chatCounts[4],
            chatCount6: chatCounts[5],
            chatCount7: chatCounts[6],
        };
    }

    public async GetRetentionStats() {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            thirtyDaysAgo.setHours(0, 0, 0, 0);

            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            sixMonthsAgo.setDate(1);
            sixMonthsAgo.setHours(0, 0, 0, 0);

            // Günlük istatistikler
            const dailyStats = [];
            for (let i = 0; i < 30; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);
                const endDate = new Date(date);
                endDate.setHours(23, 59, 59, 999);

                const stats = await this.calculateRetentionStats(date, endDate);
                dailyStats.push({
                    date: date.toISOString().split('T')[0],
                    ...stats,
                });
            }

            // Haftalık istatistikler
            const weeklyStats = [];
            for (let i = 0; i < 5; i++) {
                const endDate = new Date();
                endDate.setDate(endDate.getDate() - i * 7);
                endDate.setHours(23, 59, 59, 999);

                const startDate = new Date(endDate);
                startDate.setDate(startDate.getDate() - 6);
                startDate.setHours(0, 0, 0, 0);

                const stats = await this.calculateRetentionStats(startDate, endDate);
                weeklyStats.push({
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0],
                    ...stats,
                });
            }

            // Aylık istatistikler
            const monthlyStats = [];
            for (let i = 0; i < 6; i++) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                date.setDate(1);
                date.setHours(0, 0, 0, 0);

                const endDate = new Date(date);
                endDate.setMonth(endDate.getMonth() + 1);
                endDate.setDate(0);
                endDate.setHours(23, 59, 59, 999);

                const stats = await this.calculateRetentionStats(date, endDate);
                monthlyStats.push({
                    startDate: date.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0],
                    ...stats,
                });
            }

            return {
                daily: dailyStats.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
                weekly: weeklyStats.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()),
                monthly: monthlyStats.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()),
            };
        } catch (error) {
            console.error('Retention stats error:', error);
            throw error;
        }
    }

    public async addToFavorites(req: Request, res: Response) {
        try {
            const { sessionId } = req.params;
            const { aiUsername } = req.body;
            const currentUser = req.currentUser;

            if (!currentUser || !currentUser._id) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const session = await AiChatSession.findById(sessionId).lean();
            if (!session) {
                return res.status(404).json({ message: 'Session not found' });
            }

            if (session.userId.toString() !== currentUser._id.toString()) {
                return res.status(403).json({ message: 'You can only favorite your own chat sessions' });
            }

            const existingUsernameDoc = await Favorite.findOne({
                userId: currentUser._id,
                'favorites.aiUsername': aiUsername || 'esrarengöz',
                'favorites.isAI': true,
            });

            if (existingUsernameDoc) {
                await Favorite.updateOne(
                    { userId: currentUser._id },
                    {
                        $pull: {
                            favorites: {
                                aiUsername: aiUsername || 'esrarengöz',
                                isAI: true,
                            },
                        },
                    },
                );
                return res.json({ isFavorite: false });
            }

            const existingFavorite = await Favorite.findOne({
                userId: currentUser._id,
                'favorites.aiSessionId': sessionId,
                'favorites.isAI': true,
            });

            if (existingFavorite) {
                await Favorite.findOneAndUpdate(
                    { userId: currentUser._id },
                    {
                        $pull: {
                            favorites: {
                                aiSessionId: sessionId,
                                isAI: true,
                            },
                        },
                    },
                );
                return res.json({ isFavorite: false });
            } else {
                await Favorite.findOneAndUpdate(
                    { userId: currentUser._id },
                    {
                        $addToSet: {
                            favorites: {
                                aiSessionId: sessionId,
                                isAI: true,
                                aiUsername: aiUsername || 'esrarengöz',
                                realUsername: currentUser.username,
                            },
                        },
                    },
                    { upsert: true },
                );
                return res.json({ isFavorite: true });
            }
        } catch (e) {
            console.error('🔥 Error in addToFavorites: %o', e);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    public async getFavoriteSessionMessages(req: Request, res: Response) {
        try {
            const { sessionId } = req.params;
            const { currentUser } = req;

            const favorite = await Favorite.findOne({
                userId: currentUser._id,
                'favorites.aiSessionId': sessionId,
                'favorites.isAI': true,
            });

            if (!favorite) {
                return res.status(404).json({ message: 'Favorite session not found' });
            }

            const messages = await ThreadMessageAiku.find({ threadId: sessionId }).sort({ timestamp: 1 }).lean();

            return res.json({ messages });
        } catch (e) {
            console.error('🔥 Error in getFavoriteSessionMessages: %o', e);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    public async continueFavoriteSession(req: Request, res: Response) {
        try {
            const { sessionId } = req.params;
            const currentUser = req.currentUser;

            if (!currentUser || !currentUser._id) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const favorite = await Favorite.findOne({
                userId: currentUser._id,
                'favorites.aiSessionId': sessionId,
                'favorites.isAI': true,
            }).lean();

            if (!favorite || !Array.isArray(favorite.favorites)) {
                return res.status(404).json({ message: 'Favorite session not found' });
            }

            const favoriteItem = favorite.favorites.find(
                f => f.isAI && f.aiSessionId && f.aiSessionId.toString() === sessionId,
            );

            if (!favoriteItem || !favoriteItem.aiUsername) {
                return res.status(404).json({ message: 'Favorite session not found' });
            }

            const user = await UserModel.findById(currentUser._id).select('+privateInfo');
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const hasFreeUsage = user.hasFreeUsage;
            const hasEnoughCredit = hasFreeUsage || user.speakerCredit >= this.INITIAL_CHAT_COST;

            if (!hasEnoughCredit) {
                return res.status(400).json({
                    error: 'Yetersiz kredi',
                    currentCredit: user.speakerCredit,
                    requiredCredit: this.INITIAL_CHAT_COST,
                    hasFreeUsage: hasFreeUsage,
                });
            }

            const creditsToDeduct = hasFreeUsage ? 0 : this.INITIAL_CHAT_COST;
            const initialDuration = hasFreeUsage ? 15 : this.INITIAL_DURATION;

            if (!hasFreeUsage) {
                await this.updateUserCredits(currentUser._id, creditsToDeduct);
            }

            const newSession = new AiChatSession({
                userId: currentUser._id,
                username: favoriteItem.aiUsername,
                realUsername: user.username,
                initialDuration: initialDuration,
                remainingDuration: initialDuration,
                creditsPerMinute: 1,
                totalCreditsUsed: creditsToDeduct,
                isActive: true,
                startTime: new Date(),
                lastMessageTime: new Date(),
                isFromFavorite: true,
                beforeFavoriteSessionId: sessionId,
                isEmpty: true,
            });

            await newSession.save();

            const oldMessages = await ThreadMessageAiku.find({ threadId: sessionId }).sort({ createdAt: 1 }).lean();

            this.chatHistory[newSession._id.toString()] = [];

            for (const msg of oldMessages) {
                await ThreadMessageAiku.create({
                    threadId: newSession._id,
                    userId: msg.userId,
                    username: msg.username,
                    role: msg.role,
                    content: msg.content,
                    turnNumber: msg.turnNumber,
                    characterCount: msg.characterCount,
                    messageType: msg.messageType,
                    language: msg.language,
                    isEdited: false,
                });

                this.chatHistory[newSession._id.toString()].push(msg.content);
            }

            if (oldMessages.length > 0) {
                newSession.isEmpty = false;
                await newSession.save();
            }

            if (hasFreeUsage) {
                const favNewCount = (user?.hasFreeUsageCount ?? 0) + 1;
                const favUpdateFields: any = { hasFreeUsageCount: favNewCount };
                if (!config.doubleHasFreeUsage || favNewCount >= 2) {
                    favUpdateFields.hasFreeUsage = false;
                }
                await UserModel.findByIdAndUpdate(currentUser._id, favUpdateFields);
            }

            const updatedUser = await UserModel.findById(currentUser._id).select('+privateInfo');

            return res.json({
                sessionId: newSession._id,
                username: favoriteItem.aiUsername,
                remainingDuration: newSession.remainingDuration,
                messages: oldMessages,
                isFromFavorite: true,
                currentCredit: updatedUser ? updatedUser.speakerCredit : 0,
                usedFreeUsage: hasFreeUsage,
                beforeFavoriteSessionId: sessionId,
            });
        } catch (e) {
            console.error('🔥 Error in continueFavoriteSession: %o', e);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}