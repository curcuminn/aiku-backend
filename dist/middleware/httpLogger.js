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
const logger_1 = __importDefault(require("../config/logger"));
const geoip_lite_1 = __importDefault(require("geoip-lite"));
const UAParser = __importStar(require("ua-parser-js"));
/**
 * Gerçek IP adresini tespit eden yardımcı fonksiyon
 */
const getClientIP = (req) => {
    // Öncelik sırası:
    // 1. X-Real-IP (Nginx tarafından ayarlanır)
    // 2. X-Forwarded-For'un ilk IP'si (proxy zincirinin başlangıç noktası)
    // 3. req.ip (Express'in tespit ettiği IP)
    // 4. Socket remote address
    const realIP = req.headers['x-real-ip'];
    if (realIP)
        return realIP;
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        // İlk IP'yi al (proxy zincirinin başlangıç noktası)
        const ips = forwardedFor.split(',').map(ip => ip.trim());
        return ips[0];
    }
    return req.ip || req.socket.remoteAddress || '';
};
/**
 * İstek detaylarını hazırlayan yardımcı fonksiyon
 */
const prepareRequestDetails = (req) => {
    if (!req)
        return null;
    // IP adresi tespiti
    const clientIP = getClientIP(req);
    // GeoIP bilgisi
    const geo = clientIP ? geoip_lite_1.default.lookup(clientIP) : null;
    // Proxy bilgileri
    const proxyInfo = {
        realIP: req.headers['x-real-ip'],
        forwardedFor: req.headers['x-forwarded-for'],
        via: req.headers['via'],
        forwarded: req.headers['forwarded']
    };
    // User-Agent parser
    const parser = new UAParser.UAParser();
    const userAgent = req.headers['user-agent'] || '';
    const result = parser.setUA(userAgent).getResult();
    return {
        ip: clientIP,
        proxy: proxyInfo,
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
/**
 * Hassas verileri temizleyen fonksiyon
 */
const sanitizeRequestBody = (body) => {
    if (!body)
        return undefined;
    const sanitized = Object.assign({}, body);
    const sensitiveFields = [
        'password', 'token', 'apiKey', 'secret', 'creditCard',
        'cardNumber', 'cvv', 'pin', 'ssn', 'accessToken',
        'refreshToken', 'authorization'
    ];
    for (const field of sensitiveFields) {
        if (sanitized[field]) {
            sanitized[field] = '********';
        }
    }
    return sanitized;
};
/**
 * HTTP isteklerini loglayan middleware
 */
const httpLogger = (req, res, next) => {
    // İstek başlangıç zamanı
    const requestStartTime = Date.now();
    // İstek detaylarını hazırla
    const requestDetails = prepareRequestDetails(req);
    // Başlangıç logu
    if (!req.url.includes('/health')) { // Health check isteklerini loglama
        logger_1.default.info(`${req.method} ${req.url} başladı`, requestDetails);
    }
    // Response'u dinle
    res.on('finish', () => {
        const responseTime = Date.now() - requestStartTime;
        // Yanıt detayları
        const responseDetails = Object.assign(Object.assign({}, requestDetails), { response: {
                statusCode: res.statusCode,
                statusMessage: res.statusMessage,
                responseTime: `${responseTime}ms`,
                headers: res.getHeaders()
            } });
        // Status code'a göre log seviyesini belirle
        if (res.statusCode >= 500) {
            logger_1.default.error(`${req.method} ${req.url} - ${res.statusCode}`, responseDetails);
        }
        else if (res.statusCode >= 400) {
            logger_1.default.warn(`${req.method} ${req.url} - ${res.statusCode}`, responseDetails);
        }
        else if (!req.url.includes('/health')) { // Health check isteklerini loglama
            logger_1.default.info(`${req.method} ${req.url} - ${res.statusCode}`, responseDetails);
        }
    });
    next();
};
exports.default = httpLogger;
