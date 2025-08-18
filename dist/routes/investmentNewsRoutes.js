"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const investmentNewsController_1 = require("../controllers/investmentNewsController");
const router = (0, express_1.Router)();
// Yatırım haberi oluştur
router.post('/', investmentNewsController_1.createInvestmentNews);
// Tüm yatırım haberlerini getir
router.get('/', investmentNewsController_1.getAllInvestmentNews);
// Belirli bir haberi getir
router.get('/:id', investmentNewsController_1.getInvestmentNewsById);
// Belirli bir haberi güncelle
router.put('/:id', investmentNewsController_1.updateInvestmentNews);
// Belirli bir haberi sil
router.delete('/:id', investmentNewsController_1.deleteInvestmentNews);
exports.default = router;
