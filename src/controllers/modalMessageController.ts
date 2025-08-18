import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ModalMessage } from '../models/ModalMessage';

// Aktif modal mesajını getir (yalnızca mobile)
export const getActiveModalForMobile = async (_req: Request, res: Response) => {
  try {
    const message = await ModalMessage.findOne({ isActive: true })
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: message || null });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};

// Admin: yeni modal mesaj oluştur
export const createModalMessage = async (req: Request, res: Response) => {
  try {
    const message = await ModalMessage.create(req.body);
    return res.status(201).json({ success: true, data: message });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};

// Admin: modal mesaj güncelle
export const updateModalMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Geçersiz ID' });
    }

    const updated = await ModalMessage.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Kayıt bulunamadı' });
    }

    return res.status(200).json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};

// Admin: modal mesaj sil
export const deleteModalMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Geçersiz ID' });
    }

    const deleted = await ModalMessage.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Kayıt bulunamadı' });
    }

    return res.status(200).json({ success: true, message: 'Silindi' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};

// Admin: listele
export const listModalMessages = async (_req: Request, res: Response) => {
  try {
    const items = await ModalMessage.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: items });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};


