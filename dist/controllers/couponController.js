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
exports.CouponController = exports.applyCouponSchema = exports.validateCouponSchema = exports.createCouponSchema = void 0;
const couponService_1 = require("../services/couponService");
const zod_1 = require("zod");
const couponService = new couponService_1.CouponService();
// Validation schemas
exports.createCouponSchema = zod_1.z.object({
    code: zod_1.z
        .string()
        .min(3, "Coupon code must be at least 3 characters")
        .max(20, "Coupon code must be at most 20 characters"),
    planType: zod_1.z.enum([
        "STARTUP_MONTHLY",
        "STARTUP_YEARLY",
        "BUSINESS_MONTHLY",
        "BUSINESS_YEARLY",
        "INVESTOR_MONTHLY",
        "INVESTOR_YEARLY",
    ]),
    discountRate: zod_1.z
        .number()
        .min(0, "Discount rate must be at least 0")
        .max(100, "Discount rate must be at most 100"),
});
exports.validateCouponSchema = zod_1.z.object({
    couponCode: zod_1.z.string(),
    planType: zod_1.z.enum([
        "STARTUP_MONTHLY",
        "STARTUP_YEARLY",
        "BUSINESS_MONTHLY",
        "BUSINESS_YEARLY",
        "INVESTOR_MONTHLY",
        "INVESTOR_YEARLY",
    ]),
});
exports.applyCouponSchema = zod_1.z.object({
    couponCode: zod_1.z.string(),
    planType: zod_1.z.enum([
        "STARTUP_MONTHLY",
        "STARTUP_YEARLY",
        "BUSINESS_MONTHLY",
        "BUSINESS_YEARLY",
        "INVESTOR_MONTHLY",
        "INVESTOR_YEARLY",
    ]),
});
class CouponController {
    createCoupon(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { code, planType, discountRate } = req.body;
                const coupon = yield couponService.createCoupon(code, planType, discountRate);
                res.status(201).json(coupon);
            }
            catch (error) {
                const err = error;
                res.status(400).json({ error: err.message });
            }
        });
    }
    validateCoupon(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { couponCode, planType } = req.body;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(401).json({ error: "Unauthorized" });
                }
                const coupon = yield couponService.validateCoupon(couponCode, userId, planType);
                res.json({
                    isValid: true,
                    discountRate: coupon.discountRate,
                    planType: coupon.planType,
                });
            }
            catch (error) {
                const err = error;
                res.status(400).json({ error: err.message });
            }
        });
    }
    applyCoupon(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!req.user || !req.user.id) {
                    return res.status(401).json({
                        success: false,
                        message: "Oturum açmanız gerekiyor",
                    });
                }
                const { couponCode, planType } = req.body;
                const userId = req.user.id;
                if (!couponCode) {
                    return res.status(400).json({
                        success: false,
                        message: "Kupon kodu gereklidir",
                    });
                }
                yield couponService.validateCoupon(couponCode, userId, planType);
                const coupon = yield couponService.applyCoupon(couponCode, userId);
                res.json({
                    success: true,
                    coupon,
                });
            }
            catch (error) {
                const err = error;
                res.status(err.status || 400).json({
                    success: false,
                    message: err.message || "Kupon uygulanırken bir hata oluştu",
                });
            }
        });
    }
    listCoupons(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const isActive = req.query.isActive === "true"
                ? true
                : req.query.isActive === "false"
                    ? false
                    : undefined;
            const coupons = yield couponService.listCoupons(isActive);
            res.json(coupons);
        });
    }
    deactivateCoupon(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { code } = req.params;
            const coupon = yield couponService.deactivateCoupon(code);
            res.json(coupon);
        });
    }
}
exports.CouponController = CouponController;
