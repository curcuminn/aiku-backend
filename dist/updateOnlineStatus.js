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
exports.startOfflineUpdater = startOfflineUpdater;
// src/updateOnlineStatus.ts
const User_1 = require("./models/User");
// 30 saniyelik eşik (ms)
const OFFLINE_THRESHOLD = 30 * 1000;
function startOfflineUpdater() {
    setInterval(() => __awaiter(this, void 0, void 0, function* () {
        try {
            const cutoff = new Date(Date.now() - OFFLINE_THRESHOLD);
            // lastSeen < cutoff && isOnline === true olanları false yap
            yield User_1.User.updateMany({ lastSeen: { $lt: cutoff }, isOnline: true }, { isOnline: false });
        }
        catch (err) {
            console.error('❌ updateOnlineStatus hata:', err);
        }
    }), OFFLINE_THRESHOLD);
}
