"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlockedIPs = exports.removeBlockedIP = exports.addBlockedIP = exports.ipBlocker = void 0;
// Engellenen IP'ler listesi
const BLOCKED_IPS = new Set([
    "154.83.103.179",
    "23.27.46.35",
    "168.76.20.229",
    "164.92.207.75",
]);
// IP engelleyici middleware
const ipBlocker = (req, res, next) => {
    const clientIP = req.ip || req.socket.remoteAddress || "";
    if (BLOCKED_IPS.has(clientIP)) {
        // IP engellenmişse 403 hatası döndür
        return res.status(403).json({
            status: "error",
            message: "Bu IP adresi engellenmiştir.",
            code: "IP_BLOCKED",
        });
    }
    next();
};
exports.ipBlocker = ipBlocker;
// IP ekleme ve kaldırma fonksiyonları
const addBlockedIP = (ip) => {
    BLOCKED_IPS.add(ip);
};
exports.addBlockedIP = addBlockedIP;
const removeBlockedIP = (ip) => {
    BLOCKED_IPS.delete(ip);
};
exports.removeBlockedIP = removeBlockedIP;
const getBlockedIPs = () => {
    return Array.from(BLOCKED_IPS);
};
exports.getBlockedIPs = getBlockedIPs;
