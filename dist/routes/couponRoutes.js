"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const couponController_1 = require("../controllers/couponController");
const auth_1 = require("../middleware/auth");
const validateRequest_1 = require("../middleware/validateRequest");
const router = express_1.default.Router();
const couponController = new couponController_1.CouponController();
// Routes (admin kontrolü olmadan)
router.post('/', auth_1.authenticateToken, (0, validateRequest_1.validateRequest)(couponController_1.createCouponSchema), couponController.createCoupon);
router.get('/', auth_1.authenticateToken, couponController.listCoupons);
router.delete('/:code', auth_1.authenticateToken, couponController.deactivateCoupon);
// User routes
router.post('/validate', auth_1.authenticateToken, (0, validateRequest_1.validateRequest)(couponController_1.validateCouponSchema), couponController.validateCoupon);
router.post('/apply', auth_1.authenticateToken, (0, validateRequest_1.validateRequest)(couponController_1.applyCouponSchema), couponController.applyCoupon);
exports.default = router;
