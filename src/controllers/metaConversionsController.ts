import { Request, Response } from "express";
import { MetaConversionsService } from "../services/metaConversionsService";

const meta = new MetaConversionsService();

export const sendKvkkConsent = async (req: Request, res: Response) => {
  try {
    const { email, phone, leadId, fbc, fbp } = req.body || {};
    const result = await meta.sendEvent({
      eventName: "KVKK_Consent_Accepted",
      user: { email, phone, leadId, fbc, fbp, clientIpAddress: req.ip, clientUserAgent: req.headers["user-agent"] as string },
    });
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const sendChatStarted = async (req: Request, res: Response) => {
  try {
    const { email, phone, leadId, fbc, fbp } = req.body || {};
    const result = await meta.sendEvent({
      eventName: "AcademicChat_Started",
      user: { email, phone, leadId, fbc, fbp, clientIpAddress: req.ip, clientUserAgent: req.headers["user-agent"] as string },
    });
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const sendWhatsAppClick = async (req: Request, res: Response) => {
  try {
    const { email, phone, leadId, fbc, fbp } = req.body || {};
    const result = await meta.sendEvent({
      eventName: "WhatsApp_Click",
      user: { email, phone, leadId, fbc, fbp, clientIpAddress: req.ip, clientUserAgent: req.headers["user-agent"] as string },
    });
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const sendGeneric = async (req: Request, res: Response) => {
  try {
    const { eventName, testEventCode, leadEventSource, email, phone, leadId, fbc, fbp } = req.body || {};
    if (!eventName) return res.status(400).json({ success: false, message: "eventName is required" });
    const result = await meta.sendEvent({
      eventName,
      testEventCode,
      leadEventSource,
      user: { email, phone, leadId, fbc, fbp, clientIpAddress: req.ip, clientUserAgent: req.headers["user-agent"] as string },
    });
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};



