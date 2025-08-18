"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const billingInfoController_1 = require("../controllers/billingInfoController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Tüm rotaları koruma altına alıyoruz çünkü fatura bilgileri özel verilerdir
router.use(auth_1.protect);
// /api/billingInfo
router
    .route("/")
    .post(billingInfoController_1.createBillingInfo) // Yeni fatura bilgisi oluştur
    .get(billingInfoController_1.getBillingInfos); // Kullanıcının tüm fatura bilgilerini getir
// /api/billingInfo/default
router.route("/default").get(billingInfoController_1.getDefaultBillingInfo); // Varsayılan fatura bilgisini getir
// /api/billingInfo/:id
router
    .route("/:id")
    .get(billingInfoController_1.getBillingInfoById) // Belirli bir fatura bilgisini getir
    .put(billingInfoController_1.updateBillingInfo) // Fatura bilgisini güncelle
    .delete(billingInfoController_1.deleteBillingInfo); // Fatura bilgisini sil
// /api/billingInfo/:id/set-default
router.route("/:id/set-default").put(billingInfoController_1.setDefaultBillingInfo); // Belirli bir fatura bilgisini varsayılan yap
exports.default = router;
