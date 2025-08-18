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
exports.validateRequest = void 0;
const zod_1 = require("zod");
const errors_1 = require("../utils/errors");
const validateRequest = (schema) => {
    return (req, _res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const data = yield schema.parseAsync(req.body);
            req.body = data;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                throw new errors_1.BadRequestError(error.errors.map(e => e.message).join(', '));
            }
            throw error;
        }
    });
};
exports.validateRequest = validateRequest;
