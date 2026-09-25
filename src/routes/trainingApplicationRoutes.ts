// src/routes/trainingApplicationRoutes.ts

import { Router } from "express";
import {
    createTrainingApplication,
    listTrainingApplications,
    updateApplicationStatus,
    listPublicByCompany,
    deleteTrainingApplication,
} from "../controllers/trainingApplicationController";

const router = Router();

/**
 * PUBLIC: Başvuru oluştur
 * POST /api/training-applications
 * Body: { trainingKey, event, company, firstName, lastName, title, email }
 */
router.post("/", createTrainingApplication);

/**
 * PUBLIC: Belirli trainingKey + event + company için basit görünüm
 * GET /api/training-applications/public?trainingKey=...&event=...&company=...
 */
router.get("/public", listPublicByCompany);

/**
 * (Admin): Tüm başvuruları listele (opsiyonel filtrelerle)
 * GET /api/training-applications?trainingKey=...&event=...&company=...&status=Main|Waitlist&limit=&offset=
 */
router.get("/", listTrainingApplications);

/**
 * (Admin): Statü güncelle (ör. manuel terfi/iptal)
 * PATCH /api/training-applications/:id/status
 * Body: { status: "Main" | "Waitlist" }
 */
router.patch("/:id/status", updateApplicationStatus);

/**
 * (Admin): Başvuru sil
 * DELETE /api/training-applications/:id
 */
router.delete("/:id", deleteTrainingApplication);

export default router;
