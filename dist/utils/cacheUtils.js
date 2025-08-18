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
exports.ExchangeRateCache = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
// Cache yönetim sınıfı
class ExchangeRateCache {
    constructor() {
        this.cacheMap = new Map();
        // Cache dosyasının yolu
        this.cacheDir = path_1.default.join(process.cwd(), 'cache');
        this.cacheFile = path_1.default.join(this.cacheDir, 'exchange_rates.json');
        // Cache klasörünü oluştur (eğer yoksa)
        this.ensureCacheDirectory();
        // Başlangıçta cache dosyasını yükle
        this.loadCacheFromDisk();
    }
    // Singleton pattern ile tek instance oluştur
    static getInstance() {
        if (!ExchangeRateCache.instance) {
            ExchangeRateCache.instance = new ExchangeRateCache();
        }
        return ExchangeRateCache.instance;
    }
    // Cache klasörünün varlığını kontrol et ve yoksa oluştur
    ensureCacheDirectory() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield fs_1.promises.mkdir(this.cacheDir, { recursive: true });
            }
            catch (error) {
                console.error('Cache dizini oluşturulurken hata:', error);
            }
        });
    }
    // Cache verisini diskten yükle
    loadCacheFromDisk() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield fs_1.promises.readFile(this.cacheFile, 'utf-8');
                const parsedData = JSON.parse(data);
                // JSON'dan Map'e dönüştür
                Object.keys(parsedData).forEach(key => {
                    this.cacheMap.set(key, parsedData[key]);
                });
                console.log('💾 Döviz kuru cache dosyası başarıyla yüklendi');
            }
            catch (error) {
                // Dosya yoksa veya okuma hatası olursa boş cache ile devam et
                console.log('💾 Döviz kuru cache dosyası bulunamadı, yeni oluşturulacak');
            }
        });
    }
    // Cache verisini diske kaydet
    saveCacheToDisk() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Map'i JSON'a dönüştür
                const cacheObject = {};
                this.cacheMap.forEach((value, key) => {
                    cacheObject[key] = value;
                });
                yield fs_1.promises.writeFile(this.cacheFile, JSON.stringify(cacheObject, null, 2), 'utf-8');
                console.log('💾 Döviz kuru cache dosyası güncellendi');
            }
            catch (error) {
                console.error('Cache dosyası kaydedilirken hata:', error);
            }
        });
    }
    // Veriyi cache'e ekle veya güncelle
    set(key_1, data_1) {
        return __awaiter(this, arguments, void 0, function* (key, data, expirationMs = 12 * 60 * 60 * 1000) {
            const now = Date.now();
            const cacheItem = {
                data,
                timestamp: now,
                nextUpdate: now + expirationMs
            };
            this.cacheMap.set(key, cacheItem);
            yield this.saveCacheToDisk();
        });
    }
    // Cache'den veri al
    get(key) {
        const cacheItem = this.cacheMap.get(key);
        if (!cacheItem) {
            return { data: null, expired: true };
        }
        const now = Date.now();
        const expired = now >= cacheItem.nextUpdate;
        return {
            data: cacheItem.data,
            expired
        };
    }
    // Belirli bir anahtara ait cache'i temizle
    remove(key) {
        return __awaiter(this, void 0, void 0, function* () {
            this.cacheMap.delete(key);
            yield this.saveCacheToDisk();
        });
    }
    // Tüm cache'i temizle
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            this.cacheMap.clear();
            yield this.saveCacheToDisk();
        });
    }
}
exports.ExchangeRateCache = ExchangeRateCache;
