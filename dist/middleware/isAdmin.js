"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = void 0;
const errors_1 = require("../utils/errors");
const isAdmin = (req, _res, next) => {
    if (!req.user || !req.user.isAdmin) {
        throw new errors_1.ForbiddenError('Bu işlem için admin yetkisi gereklidir');
    }
    next();
};
exports.isAdmin = isAdmin;
