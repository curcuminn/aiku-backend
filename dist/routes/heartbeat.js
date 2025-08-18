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
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const User_1 = require("../models/User");
const router = (0, express_1.Router)();
router.post('/', auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const user = req.user;
    const userId = user.id;
    try {
        yield User_1.User.findByIdAndUpdate(userId, {
            $set: { lastSeen: new Date(), isOnline: true }
        });
        // console.log(`[Heartbeat] User ${userId} marked online at ${new Date().toISOString()}`);
        res.sendStatus(200);
    }
    catch (err) {
        console.error('Heartbeat error:', err);
        res.sendStatus(500);
    }
}));
exports.default = router;
