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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExchangeRateController = void 0;
const exchangeRateService_1 = require("../services/exchangeRateService");
// Döviz kuru controller sınıfı
class ExchangeRateController {
    constructor() {
        // Tüm döviz kurlarını getir
        this.getAllRates = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.exchangeRateService.getExchangeRates();
                const fromCache = !this.exchangeRateService.isLastFetchFromApi();
                res.status(200).json({
                    success: true,
                    message: 'Döviz kurları başarıyla alındı',
                    data: result,
                    fromCache: fromCache
                });
            }
            catch (error) {
                console.error('Döviz kurları alınırken hata:', error);
                res.status(500).json({
                    success: false,
                    message: 'Döviz kurları alınırken bir hata oluştu',
                    error: error instanceof Error ? error.message : 'Bilinmeyen hata'
                });
            }
        });
        // Belirli bir para birimi için döviz kurunu getir
        this.getRate = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { currencyCode } = req.params;
                if (!currencyCode) {
                    res.status(400).json({
                        success: false,
                        message: 'Para birimi kodu belirtilmedi'
                    });
                    return;
                }
                const rate = yield this.exchangeRateService.getExchangeRate(currencyCode);
                const fromCache = !this.exchangeRateService.isLastFetchFromApi();
                if (rate === null) {
                    res.status(404).json({
                        success: false,
                        message: `${currencyCode} para birimi için kur bilgisi bulunamadı`
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    message: `${currencyCode} para birimi için kur bilgisi başarıyla alındı`,
                    data: {
                        currency: currencyCode.toUpperCase(),
                        rate: rate
                    },
                    fromCache: fromCache
                });
            }
            catch (error) {
                console.error('Döviz kuru alınırken hata:', error);
                res.status(500).json({
                    success: false,
                    message: 'Döviz kuru alınırken bir hata oluştu',
                    error: error instanceof Error ? error.message : 'Bilinmeyen hata'
                });
            }
        });
        // Özellikle TRY (Türk Lirası) kuru için endpoint
        this.getTRYRate = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const rate = yield this.exchangeRateService.getExchangeRate('TRY');
                const fromCache = !this.exchangeRateService.isLastFetchFromApi();
                if (rate === null) {
                    res.status(404).json({
                        success: false,
                        message: 'TRY para birimi için kur bilgisi bulunamadı'
                    });
                    return;
                }
                res.status(200).json({
                    success: true,
                    message: 'USD/TRY kuru başarıyla alındı',
                    data: {
                        currency: 'TRY',
                        base: 'USD',
                        rate: rate
                    },
                    fromCache: fromCache
                });
            }
            catch (error) {
                console.error('TRY kuru alınırken hata:', error);
                res.status(500).json({
                    success: false,
                    message: 'TRY kuru alınırken bir hata oluştu',
                    error: error instanceof Error ? error.message : 'Bilinmeyen hata'
                });
            }
        });
        // Cache'i zorla güncelle
        this.refreshRates = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const rates = yield this.exchangeRateService.forceRefreshRates();
                res.status(200).json({
                    success: true,
                    message: 'Döviz kurları başarıyla güncellendi',
                    data: rates,
                    fromCache: false // Zorla güncellendiği için kesinlikle API'den alınmıştır
                });
            }
            catch (error) {
                console.error('Döviz kurları güncellenirken hata:', error);
                res.status(500).json({
                    success: false,
                    message: 'Döviz kurları güncellenirken bir hata oluştu',
                    error: error instanceof Error ? error.message : 'Bilinmeyen hata'
                });
            }
        });
        this.exchangeRateService = exchangeRateService_1.ExchangeRateService.getInstance();
    }
}
exports.ExchangeRateController = ExchangeRateController;
