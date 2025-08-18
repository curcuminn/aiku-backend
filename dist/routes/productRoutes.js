"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const productController_1 = require("../controllers/productController");
const auth_1 = require("../middleware/auth");
const optionalAuth_1 = require("../middleware/optionalAuth");
const router = (0, express_1.Router)();
// Validation‐result’ı kontrol edip hataları JSON olarak dönen middleware
const validate = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};
// **Tüm Ürünleri Getirme**
router.get('/all', optionalAuth_1.optionalAuth, productController_1.getAllProducts);
// **Kullanıcının Ürünlerini Getirme**
router.get('/user', auth_1.protect, productController_1.getProductsByUser);
// **Şirkete Ait Ürünleri Getirme**
router.get('/company/:companyId', productController_1.getProductsByCompany);
// **Belirtilen ID'ye Sahip Ürünü Getirme**
router.get('/:id', productController_1.getProductById);
// **Ürün Oluşturma**
router.post('/', auth_1.protect, [
    (0, express_validator_1.check)('productName', 'Ürün adı zorunludur').notEmpty(),
    (0, express_validator_1.check)('productCategory', 'Ürün kategorisi zorunludur').notEmpty(),
    (0, express_validator_1.check)('productDescription', 'Ürün açıklaması zorunludur').notEmpty(),
    (0, express_validator_1.check)('detailedDescription', 'Detaylı açıklama zorunludur').notEmpty(),
    (0, express_validator_1.check)('pricingModel', 'Fiyatlandırma modeli zorunludur').notEmpty(),
    (0, express_validator_1.check)('companyId', "Şirket ID'si zorunludur").notEmpty(),
    // Sadece buraya ekledik:
    (0, express_validator_1.check)('productWebsite')
        .optional({ nullable: true, checkFalsy: true })
        .isURL()
        .withMessage('Please enter a valid URL'),
], validate, // ← validationResult kontrolü
productController_1.createProduct);
// **Ürün Güncelleme**
router.put('/:id', auth_1.protect, [
    // Yine sadece URL kontrolünü ekliyoruz; diğer alanlar zaten controller’da updateProduct içinde ele alınıyorsa buraya eklemeye gerek yok
    (0, express_validator_1.check)('productWebsite')
        .optional({ nullable: true, checkFalsy: true })
        .isURL()
        .withMessage('Please enter a valid URL'),
], validate, // ← validationResult kontrolü
productController_1.updateProduct);
// **Ürün Silme**
router.delete('/:id', auth_1.protect, productController_1.deleteProduct);
exports.default = router;
