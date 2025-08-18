"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const investmentController_1 = require("../controllers/investmentController");
const auth_1 = require("../middleware/auth");
const optionalAuth_1 = require("../middleware/optionalAuth");
const router = (0, express_1.Router)();
// **Tüm Yatırım Tekliflerini Getirme (örn: GET /api/investments/all)**
router.get('/all-investments', optionalAuth_1.optionalAuth, investmentController_1.getAllInvestments);
// **Belirli Bir Şirkete Ait Yatırım Tekliflerini Getirme (örn: GET /api/investments/company/:companyId)**
router.get('/company/:companyId', investmentController_1.getInvestmentsByCompany);
// **Belirli Bir Ürüne Ait Yatırım Tekliflerini Getirme (örn: GET /api/investments/product/:productId)**
router.get('/product/:productId', investmentController_1.getInvestmentsByProduct);
// **Yeni Yatırım Teklifi Oluşturma (örn: POST /api/investments)**
router.post('/', auth_1.protect, [
    (0, express_validator_1.check)('investmentTitle', 'Başlık zorunludur').not().isEmpty(),
    (0, express_validator_1.check)('companyName', 'Şirket adı zorunludur').not().isEmpty(),
    (0, express_validator_1.check)('companyId', 'Şirket ID\'si zorunludur').not().isEmpty(),
    // check('productName', 'Ürün adı zorunludur').not().isEmpty(),
    // check('productId', 'Ürün ID\'si zorunludur').not().isEmpty(),
    (0, express_validator_1.check)('targetedInvestment', 'Hedef yatırım miktarı zorunludur').not().isEmpty(),
    (0, express_validator_1.check)('minimumTicket', 'Minimum yatırım bileti zorunludur').not().isEmpty(),
    (0, express_validator_1.check)('deadline', 'Son başvuru tarihi zorunludur').not().isEmpty(),
    (0, express_validator_1.check)('description', 'Açıklama zorunludur').not().isEmpty(),
], investmentController_1.createInvestment);
// **Belirli Bir Yatırım Teklifini Getirme (örn: GET /api/investments/:id)**
router.get('/:id', investmentController_1.getInvestmentById);
// **Yatırım Teklifini Güncelleme (örn: PUT /api/investments/:id)**
router.put('/:id', auth_1.protect, investmentController_1.updateInvestment);
// **Yatırım Teklifini Silme (örn: DELETE /api/investments/:id)**
router.delete('/:id', auth_1.protect, investmentController_1.deleteInvestment);
exports.default = router;
