import { Router } from "express";
import {
  sendChatStarted,
  sendKvkkConsent,
  sendWhatsAppClick,
  sendGeneric,
} from "../controllers/metaConversionsController";

const router = Router();

router.post("/kvkk-consent", sendKvkkConsent);
router.post("/chat-started", sendChatStarted);
router.post("/whatsapp-click", sendWhatsAppClick);
router.post("/event", sendGeneric); 

export default router;



