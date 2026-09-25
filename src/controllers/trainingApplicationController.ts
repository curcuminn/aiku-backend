import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { TrainingApplication } from "../models/TrainingApplication";

const JWT_SECRET = process.env.JWT_SECRET || 'panel-secret-key';
const CAPACITY_PER_COMPANY = 20;

/* ---------------------------------------------------
   Helpers (claimRequestController ile aynı mantık)
--------------------------------------------------- */

// Token doğrulama
function verifyToken(req: Request): { id?: string; userId?: string; role?: string; type?: string } {
    const header = req.header("Authorization") || "";
    const token = header.replace("Bearer ", "").trim();
    if (!token) throw new Error("Token missing");
    try {
        return jwt.verify(token, JWT_SECRET) as any;
    } catch {
        try {
            return jwt.verify(token, 'panel-secret-key') as any;
        } catch {
            throw new Error("Invalid or expired token");
        }
    }
}

// Sadece admin/editor/panel izinli uçlar için
function requireAdmin(req: Request) {
    const decoded = verifyToken(req);
    if (decoded.role !== "admin" && decoded.role !== "editor" && decoded.type !== "panel") {
        const err = new Error("Forbidden: admin only");
        (err as any).status = 403;
        throw err;
    }
    return decoded;
}

/* ---------------------------------------------------
   POST /api/training-applications
   (Public) Başvuru oluştur
--------------------------------------------------- */
/**
 * Body:
 * {
 *   trainingKey: string,
 *   event: string,
 *   company: string,           // örn: "FMS Logistics - Istanbul"
 *   firstName: string,
 *   lastName: string,
 *   title: string,
 *   email: string
 * }
 */
export const createTrainingApplication = async (req: Request, res: Response) => {
    try {
        const {
            trainingKey,
            event,
            company,
            firstName,
            lastName,
            title,
            email,
        } = (req.body || {}) as {
            trainingKey?: string;
            event?: string;
            company?: string;
            firstName?: string;
            lastName?: string;
            title?: string;
            email?: string;
        };

        // basit doğrulama
        if (!trainingKey || !event || !company || !firstName || !lastName || !title || !email) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        const filter = { trainingKey, event, company };

        // mevcut main sayısı → kapasite kararını ver
        const mainCount = await TrainingApplication.countDocuments({ ...filter, status: "Main" });
        const status: "Main" | "Waitlist" = mainCount < CAPACITY_PER_COMPANY ? "Main" : "Waitlist";

        // şirket özelinde sıra
        const totalCompanyCount = await TrainingApplication.countDocuments(filter);
        const orderInCompany = totalCompanyCount + 1;

        // oluştur (unique index: trainingKey+event+company+email)
        const doc = await TrainingApplication.create({
            trainingKey,
            event,
            company: company.trim(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            title: title.trim(),
            email: email.trim().toLowerCase(),
            status,
            orderInCompany,
        });

        // kalan koltuk / waitlist pozisyonu
        const remainingMainSeats =
            Math.max(CAPACITY_PER_COMPANY - (status === "Main" ? mainCount + 1 : mainCount), 0);

        const waitlistPosition =
            status === "Waitlist"
                ? await TrainingApplication.countDocuments({ ...filter, status: "Waitlist" })
                : null;

        return res.status(201).json({
            success: true,
            message: "Application received.",
            data: {
                id: doc._id,
                trainingKey: doc.trainingKey,
                event: doc.event,
                company: doc.company,
                firstName: doc.firstName,
                lastName: doc.lastName,
                title: doc.title,
                email: doc.email,
                status: doc.status,
                orderInCompany: doc.orderInCompany,
                remainingMainSeats,
                waitlistPosition,
                createdAt: doc.createdAt,
            },
        });
    } catch (err: any) {
        if (err?.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "You have already applied for this event with this email for this company.",
            });
        }
        console.error("createTrainingApplication error:", err);
        const status = err.status || 500;
        return res.status(status).json({ success: false, message: err.message || "Server error" });
    }
};

/* ---------------------------------------------------
   GET /api/training-applications
   (Admin) Hepsini listele + filtreler
--------------------------------------------------- */
/**
 * Query (opsiyonel):
 * - trainingKey
 * - event
 * - company
 * - status: Main | Waitlist
 * - limit (default 50)
 * - offset (default 0)
 */
export const listTrainingApplications = async (req: Request, res: Response) => {
    try {
        requireAdmin(req);

        const { trainingKey, event, company, status, limit = "50", offset = "0" } =
            req.query as Record<string, string>;

        const filter: any = {};
        if (trainingKey) filter.trainingKey = trainingKey;
        if (event) filter.event = event;
        if (company) filter.company = company;
        if (status === "Main" || status === "Waitlist") filter.status = status;

        const docs = await TrainingApplication.find(filter)
            .sort({ createdAt: 1 })
            .skip(parseInt(offset, 10))
            .limit(parseInt(limit, 10));

        return res.status(200).json({ success: true, data: docs });
    } catch (err: any) {
        const status = err.status || 500;
        return res.status(status).json({ success: false, message: err.message || "Server error" });
    }
};

/* ---------------------------------------------------
   PATCH /api/training-applications/:id/status
   (Admin) Statü güncelle
--------------------------------------------------- */
/**
 * Body: { status: "Main" | "Waitlist" }
 */
export const updateApplicationStatus = async (req: Request, res: Response) => {
    try {
        requireAdmin(req);

        const { id } = req.params;
        const { status } = (req.body || {}) as { status?: "Main" | "Waitlist" };

        if (status !== "Main" && status !== "Waitlist") {
            return res.status(400).json({ success: false, message: "Invalid status." });
        }

        const doc = await TrainingApplication.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!doc) {
            return res.status(404).json({ success: false, message: "Application not found" });
        }

        return res.status(200).json({ success: true, message: "Status updated.", data: doc });
    } catch (err: any) {
        const status = err.status || 500;
        return res.status(status).json({ success: false, message: err.message || "Server error" });
    }
};

/* ---------------------------------------------------
   (Opsiyonel) GET /api/training-applications/public
   (Public) Basit listeleme (örn. bir etkinlik–şirket görünümü)
--------------------------------------------------- */
/**
 * Query: trainingKey (zorunlu), event (zorunlu), company (zorunlu)
 */
export const listPublicByCompany = async (req: Request, res: Response) => {
    try {
        const { trainingKey, event, company } = req.query as Record<string, string>;
        if (!trainingKey || !event || !company) {
            return res.status(400).json({ success: false, message: "trainingKey, event and company are required." });
        }

        const filter = { trainingKey, event, company };
        const data = await TrainingApplication.find(filter).sort({ createdAt: 1 }).lean();

        const mainCount = data.filter(d => d.status === "Main").length;
        const remainingMainSeats = Math.max(CAPACITY_PER_COMPANY - mainCount, 0);

        return res.status(200).json({
            success: true,
            capacity: CAPACITY_PER_COMPANY,
            remainingMainSeats,
            data,
        });
    } catch (err: any) {
        const status = err.status || 500;
        return res.status(status).json({ success: false, message: err.message || "Server error" });
    }
};

/* ---------------------------------------------------
   DELETE /api/training-applications/:id
   (Admin) Başvuru sil
--------------------------------------------------- */
export const deleteTrainingApplication = async (req: Request, res: Response) => {
    try {
        requireAdmin(req);

        const { id } = req.params;
        const deleted = await TrainingApplication.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ success: false, message: "Application not found" });
        }

        return res.status(200).json({ success: true, message: "Application deleted successfully" });
    } catch (err: any) {
        const status = err.status || 500;
        return res.status(status).json({ success: false, message: err.message || "Server error" });
    }
};
