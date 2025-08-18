"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/newsRoutes.ts
const express_1 = require("express");
const newsController_1 = require("../controllers/newsController");
const router = (0, express_1.Router)();
// Opsiyonel: elle çekmek istersen
router.get('/fetch', newsController_1.manualFetchNews);
// Haber listeleme ve detay
router.get('/', newsController_1.getNews);
router.get('/:id', newsController_1.getNewsById);
router.get('/:id/full', newsController_1.fetchFullContentById); // tek id için
router.post('/full/all', newsController_1.fetchFullContentAll); // tümü için
router.post('/full/missing', newsController_1.fetchMissingFullContent);
exports.default = router;
