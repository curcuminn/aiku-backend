// controllers/startupIdeaFavoriteCountController.ts
import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { User, IUser } from "../models/User";
import { StartupIdeaFavoriteCount } from "../models/StartupIdeaFavoriteCount";

/** GET /api/idea-favorites/:ideaId */
export const getFavoriteCount: RequestHandler = async (req, res) => {
  try {
    const { ideaId } = req.params as { ideaId: string };
    if (!ideaId) return res.status(400).json({ success: false, message: "ideaId gerekli" });

    const count = await StartupIdeaFavoriteCount.getCount(ideaId);
    return res.status(200).json({ success: true, data: { ideaId, count } });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Sunucu hatası", error: err.message });
  }
};

/** POST /api/idea-favorites/:ideaId/increment  body: { delta?: number } */
export const incrementFavoriteCount: RequestHandler = async (req, res) => {
  try {
    const { ideaId } = req.params as { ideaId: string };
    let deltaRaw = (req.body?.delta as unknown);
    let delta =
      typeof deltaRaw === "number" && Number.isFinite(deltaRaw)
        ? Math.floor(deltaRaw)
        : 1;

    if (delta === 0) {
      const count = await StartupIdeaFavoriteCount.getCount(ideaId);
      return res.status(200).json({ success: true, data: { ideaId, count } });
    }
    if (delta < 0) {
      return res.status(400).json({ success: false, message: "delta 0'dan büyük olmalı" });
    }

    const doc = await StartupIdeaFavoriteCount.increment(ideaId, delta);
    return res.status(200).json({ success: true, data: { ideaId, count: doc.count } });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Sunucu hatası", error: err.message });
  }
};

/** PUT /api/idea-favorites/:ideaId  body: { value: number } */
export const setFavoriteCount: RequestHandler = async (req, res) => {
  try {
    const { ideaId } = req.params as { ideaId: string };
    const value = Number(req.body?.value);
    if (!Number.isFinite(value) || value < 0) {
      return res.status(400).json({ success: false, message: "value 0 veya pozitif olmalı" });
    }
    const doc = await StartupIdeaFavoriteCount.setCount(ideaId, Math.floor(value));
    return res.status(200).json({ success: true, data: { ideaId, count: doc.count } });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Sunucu hatası", error: err.message });
  }
};

/** POST /api/idea-favorites/bulk  body: { ids: string[] } */
export const getFavoriteCountsBulk: RequestHandler = async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? (req.body.ids as string[]) : [];
    if (!ids.length) {
      return res.status(400).json({ success: false, message: "ids boş olamaz" });
    }
    const rows = await StartupIdeaFavoriteCount.find({ ideaId: { $in: ids } })
      .select({ ideaId: 1, count: 1, _id: 0 }).lean().exec();

    const map: Record<string, number> = Object.fromEntries(ids.map(id => [id, 0]));
    rows.forEach(r => { map[r.ideaId] = r.count ?? 0; });

    return res.status(200).json({ success: true, data: map });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Sunucu hatası", error: err.message });
  }
};

/** POST /api/idea-favorites/:ideaId/favorite  (auth varsa toggle, yoksa +1) */
export const favoriteIdea: RequestHandler = async (req, res) => {
  try {
    const { ideaId } = req.params as { ideaId: string };
    if (!ideaId) return res.status(400).json({ success: false, message: "ideaId gerekli" });

    // Header'ı doğru şekilde al
    const auth = (req.get("authorization") || req.headers["authorization"]) as string | undefined;

    let currentUser: IUser | null = null;
    if (auth?.startsWith("Bearer ")) {
      try {
        const decoded: any = jwt.verify(auth.slice(7), process.env.JWT_SECRET!);
        currentUser = await User.findById(decoded.id);
      } catch {
        currentUser = null; // geçersiz token → guest gibi davran
      }
    }

    // Misafir: sadece +1
    if (!currentUser) {
      const doc = await StartupIdeaFavoriteCount.increment(ideaId, 1);
      return res.status(200).json({
        success: true,
        data: { ideaId, status: "incremented", count: doc.count }
      });
    }

    // Giriş yapmış: kullanıcı listesinde toggle + sayaç ayarla
    const idStr = String(ideaId).trim();
    currentUser.favoriteIdeas = currentUser.favoriteIdeas || [];
    const already = currentUser.favoriteIdeas.includes(idStr);

    if (already) {
      currentUser.favoriteIdeas = currentUser.favoriteIdeas.filter(i => i !== idStr);
      await currentUser.save();

      const current = await StartupIdeaFavoriteCount.getCount(idStr);
      if (current > 0) await StartupIdeaFavoriteCount.increment(idStr, -1);
      const newCount = await StartupIdeaFavoriteCount.getCount(idStr);

      return res.status(200).json({ success: true, data: { ideaId: idStr, status: "removed", count: newCount } });
    } else {
      currentUser.favoriteIdeas.push(idStr);
      await currentUser.save();

      const doc = await StartupIdeaFavoriteCount.increment(idStr, 1);
      return res.status(200).json({ success: true, data: { ideaId: idStr, status: "added", count: doc.count } });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Sunucu hatası", error: err.message });
  }
};
