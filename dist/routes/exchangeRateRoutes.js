"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const exchangeRateController_1 = require("../controllers/exchangeRateController");
const router = express_1.default.Router();
const exchangeRateController = new exchangeRateController_1.ExchangeRateController();
/**
 * @route   GET /api/exchange-rates
 * @desc    Tüm döviz kurlarını getir
 * @access  Public
 */
router.get('/', exchangeRateController.getAllRates);
/**
 * @route   GET /api/exchange-rates/currency/:currencyCode
 * @desc    Belirli bir para birimi için döviz kurunu getir
 * @access  Public
 */
router.get('/currency/:currencyCode', exchangeRateController.getRate);
/**
 * @route   GET /api/exchange-rates/try
 * @desc    USD/TRY kurunu getir
 * @access  Public
 */
router.get('/try', exchangeRateController.getTRYRate);
/**
 * @route   POST /api/exchange-rates/refresh
 * @desc    Döviz kurlarını zorla güncelle
 * @access  Public (Gerçek uygulamada bu işlem için yetkilendirme gerekebilir)
 */
router.post('/refresh', exchangeRateController.refreshRates);
exports.default = router;
