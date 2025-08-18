"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureGuest = void 0;
const uuid_1 = require("uuid");
const ensureGuest = (req, res, next) => {
    var _a;
    let gid = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.gid;
    if (!gid) {
        gid = (0, uuid_1.v4)();
        res.cookie("gid", gid, {
            httpOnly: true,
            sameSite: "lax",
            maxAge: 1000 * 60 * 60 * 24 * 365 // 1 yıl
        });
    }
    req.guestId = gid;
    next();
};
exports.ensureGuest = ensureGuest;
