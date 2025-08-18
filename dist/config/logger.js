"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatResponseLog = exports.formatRequestLog = void 0;
const winston_1 = __importDefault(require("winston"));
require("winston-daily-rotate-file");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const geoip_lite_1 = __importDefault(require("geoip-lite"));
const UAParser = __importStar(require("ua-parser-js"));
// Log dosyaları için klasör oluşturma
const logDir = path_1.default.join(process.cwd(), 'logs');
if (!fs_1.default.existsSync(logDir)) {
    fs_1.default.mkdirSync(logDir);
}
// Log seviye tanımları
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};
// Mevcut ortam kontrolü (development, production, test)
const level = () => {
    const env = process.env.NODE_ENV || 'development';
    return env === 'development' ? 'debug' : 'info';
};
// Log renkleri
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
};
// Winston renk teması ayarı
winston_1.default.addColors(colors);
// İstek detaylarını hazırlayan yardımcı fonksiyon
const prepareRequestDetails = (req) => {
    if (!req)
        return null;
    // IP adresi tespiti
    const ip = (req.headers['x-forwarded-for'] ||
        req.socket.remoteAddress ||
        req.ip || '').split(',')[0].trim();
    // GeoIP bilgisi
    const geo = ip ? geoip_lite_1.default.lookup(ip) : null;
    // User-Agent parser
    const parser = new UAParser.UAParser();
    const userAgent = req.headers['user-agent'] || '';
    const result = parser.setUA(userAgent).getResult();
    return {
        ip,
        geoLocation: geo ? {
            country: geo.country,
            region: geo.region,
            city: geo.city,
            ll: geo.ll,
            timezone: geo.timezone
        } : null,
        device: {
            browser: {
                name: result.browser.name,
                version: result.browser.version
            },
            os: {
                name: result.os.name,
                version: result.os.version
            },
            device: {
                type: result.device.type,
                vendor: result.device.vendor,
                model: result.device.model
            }
        },
        request: {
            method: req.method,
            url: req.url,
            path: req.path,
            protocol: req.protocol,
            host: req.get('host'),
            headers: {
                'user-agent': req.headers['user-agent'],
                'accept-language': req.headers['accept-language'],
                'content-type': req.headers['content-type'],
                'referer': req.headers['referer'],
                'origin': req.headers['origin']
            },
            query: req.query
        },
        user: req.user ? {
            id: req.user.id,
            email: req.user.email
        } : null
    };
};
// Hassas verileri temizleyen fonksiyon
const sanitizeData = (data) => {
    if (!data)
        return data;
    if (typeof data === 'object') {
        const sanitized = Array.isArray(data) ? [...data] : Object.assign({}, data);
        const sensitiveFields = [
            'password', 'token', 'apiKey', 'secret', 'creditCard',
            'cardNumber', 'cvv', 'pin', 'ssn', 'accessToken',
            'refreshToken', 'authorization'
        ];
        for (const key in sanitized) {
            if (sensitiveFields.includes(key.toLowerCase())) {
                sanitized[key] = '********';
            }
            else if (typeof sanitized[key] === 'object') {
                sanitized[key] = sanitizeData(sanitized[key]);
            }
        }
        return sanitized;
    }
    return data;
};
// Log formatı
const format = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }), winston_1.default.format.printf((info) => {
    // Meta bilgileri hazırla
    const meta = {
        timestamp: info.timestamp,
        level: info.level,
        message: info.message
    };
    // Ek bilgileri ekle
    Object.keys(info).forEach(key => {
        if (!['timestamp', 'level', 'message'].includes(key)) {
            meta[key] = info[key];
        }
    });
    // Express Request objesi varsa detayları ekle
    if (info.req) {
        meta.requestDetails = prepareRequestDetails(info.req);
    }
    // Hassas verileri temizle
    const sanitizedMeta = sanitizeData(meta);
    // Stack trace varsa ekle
    if (info.stack) {
        sanitizedMeta.stack = info.stack;
    }
    // JSON formatında döndür
    return JSON.stringify(sanitizedMeta, null, 2);
}));
// Terminal için renkli log formatı
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize({ all: true }), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }), winston_1.default.format.printf((info) => {
    const meta = {
        timestamp: info.timestamp,
        level: info.level,
        message: info.message
    };
    // Ek bilgileri ekle
    Object.keys(info).forEach(key => {
        if (!['timestamp', 'level', 'message'].includes(key)) {
            meta[key] = info[key];
        }
    });
    if (info.req) {
        meta.requestDetails = prepareRequestDetails(info.req);
    }
    const sanitizedMeta = sanitizeData(meta);
    return JSON.stringify(sanitizedMeta, null, 2);
}));
// Döner dosya transport ayarı (error logları için)
const errorRotateTransport = new winston_1.default.transports.DailyRotateFile({
    filename: path_1.default.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'error',
});
// Döner dosya transport ayarı (tüm loglar için)
const combinedRotateTransport = new winston_1.default.transports.DailyRotateFile({
    filename: path_1.default.join(logDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
});
// HTTP requestleri için özel döner dosya transport
const httpRotateTransport = new winston_1.default.transports.DailyRotateFile({
    filename: path_1.default.join(logDir, 'http-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'http',
});
// Transport'lar
const transports = [
    // Console transport
    new winston_1.default.transports.Console({
        format: consoleFormat,
    }),
    // Dosya transport'ları
    errorRotateTransport,
    combinedRotateTransport,
    httpRotateTransport,
];
// Logger oluşturma
const logger = winston_1.default.createLogger({
    level: level(),
    levels,
    format,
    transports,
});
// Logger'ı dışa aktar
exports.default = logger;
// Yardımcı fonksiyonları da dışa aktar
const formatRequestLog = (req) => prepareRequestDetails(req);
exports.formatRequestLog = formatRequestLog;
const formatResponseLog = (res, responseTime) => ({
    statusCode: res.statusCode,
    statusMessage: res.statusMessage,
    responseTime: responseTime ? `${responseTime}ms` : undefined,
    headers: res.getHeaders()
});
exports.formatResponseLog = formatResponseLog;
