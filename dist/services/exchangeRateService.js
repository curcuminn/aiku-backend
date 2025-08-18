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
exports.ExchangeRateService = void 0;
const axios_1 = __importDefault(require("axios"));
const cacheUtils_1 = require("../utils/cacheUtils");
const logger_1 = __importDefault(require("../config/logger"));
// Döviz kuru servisi
class ExchangeRateService {
    constructor() {
        this.API_URL = 'https://open.er-api.com/v6/latest/USD';
        this.CACHE_KEY = 'usd_exchange_rates';
        this.CACHE_DURATION_MS = 12 * 60 * 60 * 1000; // 12 saat
        this.lastFetchFromApi = false; // Son veri çekiminin API'den olup olmadığını izler
        this.cache = cacheUtils_1.ExchangeRateCache.getInstance();
    }
    // Singleton pattern ile tek instance oluştur
    static getInstance() {
        if (!ExchangeRateService.instance) {
            ExchangeRateService.instance = new ExchangeRateService();
        }
        return ExchangeRateService.instance;
    }
    // Son veri çekiminin API'den olup olmadığını döndür
    isLastFetchFromApi() {
        return this.lastFetchFromApi;
    }
    // Döviz kurlarını getir (cache'den veya API'den)
    getExchangeRates() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Cache'den veriyi kontrol et
                const cachedData = this.cache.get(this.CACHE_KEY);
                // Eğer cache'de veri varsa ve süresi dolmamışsa, cache'den döndür
                if (cachedData.data && !cachedData.expired) {
                    console.log('💰 Döviz kurları cache\'den alındı');
                    logger_1.default.debug('Döviz kurları cache\'den alındı', { cacheKey: this.CACHE_KEY });
                    this.lastFetchFromApi = false; // Cache'den veri alındı
                    return cachedData.data;
                }
                // Cache'de veri yoksa veya süresi dolduysa, API'den yeni veri al
                console.log('🔄 Döviz kurları API\'den güncelleniyor...');
                logger_1.default.info('Döviz kurları API\'den güncelleniyor', { url: this.API_URL });
                const response = yield axios_1.default.get(this.API_URL);
                // API yanıtını cache'e kaydet
                yield this.cache.set(this.CACHE_KEY, response.data, this.CACHE_DURATION_MS);
                console.log('✅ Döviz kurları başarıyla güncellendi');
                logger_1.default.info('Döviz kurları başarıyla güncellendi', {
                    lastUpdateUTC: response.data.time_last_update_utc,
                    nextUpdateUTC: response.data.time_next_update_utc
                });
                this.lastFetchFromApi = true; // API'den veri alındı
                return response.data;
            }
            catch (error) {
                console.error('❌ Döviz kurları alınırken hata:', error);
                logger_1.default.error('Döviz kurları alınırken hata', {
                    error: error.message,
                    stack: error.stack,
                    url: this.API_URL
                });
                // Hata durumunda, eğer cache'de eski veri varsa onu döndür
                const cachedData = this.cache.get(this.CACHE_KEY);
                if (cachedData.data) {
                    console.log('⚠️ API hatası nedeniyle eski cache verisi kullanılıyor');
                    logger_1.default.warn('API hatası nedeniyle eski cache verisi kullanılıyor', {
                        cacheKey: this.CACHE_KEY,
                        cacheAge: cachedData.data.time_last_update_utc
                    });
                    this.lastFetchFromApi = false; // Cache'den veri alındı
                    return cachedData.data;
                }
                // Cache'de de veri yoksa hata fırlat
                throw new Error('Döviz kurları alınamadı ve cache\'de veri bulunamadı');
            }
        });
    }
    // Belirli bir para birimi için döviz kurunu getir
    getExchangeRate(currencyCode) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const exchangeRates = yield this.getExchangeRates();
                const upperCaseCurrencyCode = currencyCode.toUpperCase();
                if (exchangeRates.rates && exchangeRates.rates[upperCaseCurrencyCode]) {
                    return exchangeRates.rates[upperCaseCurrencyCode];
                }
                return null; // Para birimi bulunamadı
            }
            catch (error) {
                console.error(`❌ ${currencyCode} kuru alınırken hata:`, error);
                logger_1.default.error(`${currencyCode} kuru alınırken hata`, {
                    error: error.message,
                    stack: error.stack,
                    currencyCode
                });
                throw error;
            }
        });
    }
    // Cache'i temizle ve zorla güncelle
    forceRefreshRates() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // API'den yeni veri al
                console.log('🔄 Döviz kurları zorla güncelleniyor...');
                logger_1.default.info('Döviz kurları zorla güncelleniyor', { url: this.API_URL });
                const response = yield axios_1.default.get(this.API_URL);
                // API yanıtını cache'e kaydet
                yield this.cache.set(this.CACHE_KEY, response.data, this.CACHE_DURATION_MS);
                console.log('✅ Döviz kurları başarıyla güncellendi');
                logger_1.default.info('Döviz kurları başarıyla güncellendi', {
                    lastUpdateUTC: response.data.time_last_update_utc,
                    nextUpdateUTC: response.data.time_next_update_utc
                });
                this.lastFetchFromApi = true; // API'den veri alındı
                return response.data;
            }
            catch (error) {
                console.error('❌ Döviz kurları güncellenirken hata:', error);
                logger_1.default.error('Döviz kurları güncellenirken hata', {
                    error: error.message,
                    stack: error.stack,
                    url: this.API_URL
                });
                throw error;
            }
        });
    }
}
exports.ExchangeRateService = ExchangeRateService;
