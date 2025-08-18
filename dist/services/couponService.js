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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponService = void 0;
const Coupon_1 = __importDefault(require("../models/Coupon"));
const errors_1 = require("../utils/errors");
class CouponService {
    createCoupon(code, planType, discountRate) {
        return __awaiter(this, void 0, void 0, function* () {
            const existingCoupon = yield Coupon_1.default.findOne({ code: code.toUpperCase() });
            if (existingCoupon) {
                throw new errors_1.BadRequestError("Coupon code already exists");
            }
            const coupon = new Coupon_1.default({
                code: code.toUpperCase(),
                planType,
                discountRate,
            });
            return yield coupon.save();
        });
    }
    validateCoupon(code, userId, planType) {
        return __awaiter(this, void 0, void 0, function* () {
            const coupon = yield Coupon_1.default.findOne({ code: code.toUpperCase() });
            if (!coupon) {
                throw new errors_1.NotFoundError("Coupon not found");
            }
            if (!coupon.isActive) {
                throw new errors_1.BadRequestError("This coupon is no longer valid");
            }
            if (coupon.usedBy.some((id) => id.toString() === userId)) {
                throw new errors_1.BadRequestError("You have already used this coupon");
            }
            if (coupon.planType !== planType) {
                throw new errors_1.BadRequestError("This coupon is not valid for the selected plan");
            }
            return coupon;
        });
    }
    applyCoupon(couponCode, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const coupon = yield Coupon_1.default.findOne({ code: couponCode.toUpperCase() });
            if (!coupon) {
                throw new errors_1.NotFoundError("Coupon not found");
            }
            coupon.usedBy.push(userId);
            return yield coupon.save();
        });
    }
    listCoupons(isActive) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = isActive !== undefined ? { isActive } : {};
            return yield Coupon_1.default.find(query);
        });
    }
    deactivateCoupon(code) {
        return __awaiter(this, void 0, void 0, function* () {
            const coupon = yield Coupon_1.default.findOne({ code: code.toUpperCase() });
            if (!coupon) {
                throw new errors_1.NotFoundError("Coupon not found");
            }
            coupon.isActive = false;
            return yield coupon.save();
        });
    }
}
exports.CouponService = CouponService;
