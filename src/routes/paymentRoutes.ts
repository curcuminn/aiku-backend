import express, { Request, Response } from "express";
import {
  processPayment,
  getPaymentHistory,
  recordFreePayment,
  addPaymentMethod,
  getPaymentMethods,
  deletePaymentMethod,
  updateDefaultPaymentMethod,
} from "../controllers/paymentController";
import { protect } from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";
import ParamPosService from "../services/ParamPosService";
import { User, IUser } from "../models/User";
import logger from "../config/logger";
import { CouponService } from "../services/couponService";
import { z } from "zod";

const router = express.Router();
const couponService = new CouponService();

// Zod validation schemas
const processPaymentSchema = z.object({
  cardNumber: z.string().length(16, "Please enter a valid card number"),
  cardHolderName: z.string().min(1, "Card holder name is required"),
  expireMonth: z.string().length(2, "Please enter a valid expiration month"),
  expireYear: z.string().length(4, "Please enter a valid expiration year (YYYY)"),
  cvc: z.string().length(3, "Please enter a valid CVC"),
  amount: z.number().min(0.01, "Please enter a valid amount"),
  installment: z.number().min(1).optional()
});

const completePaymentSchema = z.object({
  ucdMD: z.string().min(1, "UCD_MD value is required"),
  siparisId: z.string().min(1, "Order ID is required"),
  islemGuid: z.string().optional()
});

const recordFreePaymentSchema = z.object({
  amount: z.number().min(0, "Please enter a valid amount"),
  description: z.string().min(1, "Description is required"),
  planName: z.string().min(1, "Plan name is required"),
  billingCycle: z.enum(["monthly", "yearly"]).describe("Please enter a valid billing cycle"),
  originalPrice: z.number().optional(),
  isFirstPayment: z.boolean().optional(),
  paymentDate: z.string().datetime().optional()
});

const addPaymentMethodSchema = z.object({
  cardHolderName: z.string().min(1, "Card holder name is required"),
  cardNumber: z.string().length(16, "Please enter a valid card number"),
  expireMonth: z.string().length(2, "Please enter a valid expiration month"),
  expireYear: z.string().length(4, "Please enter a valid expiration year (YYYY)"),
  cvc: z.string().length(3, "Please enter a valid CVC"),
  isDefault: z.boolean().optional()
});

router.post("/pay", processPayment);

router.post(
  "/process-payment",
  protect,
  validateRequest(processPaymentSchema),
  async (req: Request, res: Response) => {
    try {
      const {
        cardNumber,
        cardHolderName,
        expireMonth,
        expireYear,
        cvc,
        amount,
        installment = 1,
      } = req.body;

      // User objesini IUser tipine çevir
      const user = req.user as IUser | undefined;

      const result = await ParamPosService.payment({
        amount: amount,
        cardNumber,
        cardHolderName,
        expireMonth,
        expireYear,
        cvc,
        installment,
        is3D: false,
        userId: user && user._id ? user._id.toString() : undefined,
        ipAddress: req.headers["x-forwarded-for"]?.toString() || req.ip,
      });

      // Kullanıcıyı bul ve ödeme geçmişini güncelle
      if (user && user._id) {
        const updatedUser = await User.findById(user._id);
        if (updatedUser) {
          // Abonelik durumunu aktif olarak güncelle
          updatedUser.subscriptionStatus = "active";
          updatedUser.subscriptionStartDate = new Date();
          updatedUser.isSubscriptionActive = true;

          // Bir sonraki ödeme tarihini belirle
          const nextPaymentDate = new Date();
          if (updatedUser.subscriptionPeriod === "monthly") {
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
          } else {
            nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
          }
          updatedUser.nextPaymentDate = nextPaymentDate;
          updatedUser.lastPaymentDate = new Date();

          // Ödeme geçmişini güncelle
          if (!updatedUser.paymentHistory) updatedUser.paymentHistory = [];
          updatedUser.paymentHistory.push({
            amount: amount,
            date: new Date(),
            status: "success",
            transactionId: result.TURKPOS_RETVAL_Islem_ID,
            description: `Ödeme başarılı: ${amount} TL, İşlem ID: ${result.TURKPOS_RETVAL_Islem_ID}`,
          });
          await updatedUser.save();
        }
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      // Hata durumunda da ödeme geçmişine ekle (başarısız olarak)
      try {
        // User objesini IUser tipine çevir
        const user = req.user as IUser | undefined;

        if (user && user._id) {
          const updatedUser = await User.findById(user._id);
          if (updatedUser) {
            const numericAmount = parseFloat(req.body.amount);
            if (!updatedUser.paymentHistory) updatedUser.paymentHistory = [];
            updatedUser.paymentHistory.push({
              amount: numericAmount,
              date: new Date(),
              status: "failed",
              description: `Ödeme başarısız: ${numericAmount} TL, Hata: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            });
            await updatedUser.save();
          }
        }
      } catch (saveError) {
        console.error("Ödeme hatası kaydedilirken hata oluştu:", saveError);
        logger.error("Ödeme hatası kaydedilirken hata oluştu", {
          error:
            saveError instanceof Error ? saveError.message : "Unknown error",
          stack: saveError instanceof Error ? saveError.stack : undefined,
          userId: (req.user as IUser)?._id?.toString(),
        });
      }

      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Payment process failed",
      });
    }
  }
);

// Yeni eklenen complete-payment endpoint'i
router.post(
  "/complete-payment",
  protect,
  validateRequest(completePaymentSchema),
  async (req: Request, res: Response) => {
    try {
      const { ucdMD, siparisId, islemGuid } = req.body;

      // Callback'ten gelen md değerini kontrol et ve kullan
      const callbackMD = req.body.callbackMD || ucdMD;

      console.log("3D ödeme tamamlama isteği:", {
        callbackMD,
        ucdMD,
        siparisId,
        islemGuid,
      });
      logger.info("3D ödeme tamamlama isteği", {
        callbackMD,
        ucdMD,
        siparisId,
        islemGuid,
      });

      console.log("Kullanıcı bilgisi:", req.user);
      logger.info("3D ödeme kullanıcı bilgisi", {
        userId: (req.user as IUser)?._id?.toString(),
      });

      console.log("Auth token var mı:", !!req.headers.authorization);
      logger.debug("3D ödeme auth token kontrolü", {
        hasToken: !!req.headers.authorization,
      });

      // TP_WMD_Pay metodunu çağır
      const result = await ParamPosService.completePayment({
        ucdMD: callbackMD, // Callback'ten gelen md değerini kullan
        siparisId,
        islemGuid,
      });

      console.log("3D ödeme tamamlama sonucu:", result);
      logger.info("3D ödeme tamamlama sonucu", {
        islemId: result.TURKPOS_RETVAL_Islem_ID,
        sonuc: result.TURKPOS_RETVAL_Sonuc,
        sonucStr: result.TURKPOS_RETVAL_Sonuc_Str,
      });

      // Kullanıcıyı bul ve ödeme geçmişini güncelle
      const user = req.user as IUser | undefined;
      if (user && user._id) {
        console.log("Kullanıcı ID ile aranıyor:", user._id);
        logger.debug("Kullanıcı ID ile aranıyor", {
          userId: user._id.toString(),
        });

        const updatedUser = await User.findById(user._id);

        if (updatedUser) {
          console.log("Kullanıcı bulundu, abonelik durumu güncelleniyor");
          logger.info("Kullanıcı bulundu, abonelik durumu güncelleniyor", {
            userId: user._id.toString(),
          });

          // Abonelik durumunu aktif olarak güncelle
          updatedUser.subscriptionStatus = "active";
          updatedUser.subscriptionStartDate = new Date();
          updatedUser.isSubscriptionActive = true;

          // Bir sonraki ödeme tarihini belirle
          const nextPaymentDate = new Date();
          if (updatedUser.subscriptionPeriod === "monthly") {
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
          } else {
            nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
          }
          updatedUser.nextPaymentDate = nextPaymentDate;
          updatedUser.lastPaymentDate = new Date();

          // Ödeme geçmişini güncelle
          if (!updatedUser.paymentHistory) updatedUser.paymentHistory = [];

          const paymentAmount =
            parseFloat(result.TURKPOS_RETVAL_Odeme_Tutari.replace(",", ".")) ||
            0;
          console.log("Ödeme tutarı:", paymentAmount);
          logger.info("Ödeme tutarı", {
            userId: user._id.toString(),
            amount: paymentAmount,
            currency: "TRY",
          });

          updatedUser.paymentHistory.push({
            amount: paymentAmount,
            date: new Date(),
            status: "success",
            transactionId: result.TURKPOS_RETVAL_Islem_ID,
            description: `3D Ödeme başarılı: ${
              result.TURKPOS_RETVAL_Odeme_Tutari || "0"
            } TL, İşlem ID: ${result.TURKPOS_RETVAL_Islem_ID}`,
          });

          await updatedUser.save();
          console.log("Kullanıcı bilgileri güncellendi");
          logger.info("Kullanıcı ödeme bilgileri güncellendi", {
            userId: user._id.toString(),
            subscriptionStatus: "active",
            nextPaymentDate,
          });
        } else {
          console.log("Kullanıcı bulunamadı:", user._id);
          logger.warn("Ödeme sonrası kullanıcı bulunamadı", {
            userId: user._id.toString(),
          });
        }
      } else {
        console.log("Kullanıcı bilgisi yok veya ID eksik");
        logger.warn("Ödeme işleminde kullanıcı bilgisi yok veya ID eksik");
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("3D ödeme tamamlama hatası:", error);
      logger.error("3D ödeme tamamlama hatası", {
        error: error.message,
        stack: error.stack,
        userId: (req.user as IUser)?._id?.toString(),
      });

      // Hata durumunda da ödeme geçmişine ekle (başarısız olarak)
      try {
        const user = req.user as IUser | undefined;
        if (user && user._id) {
          const updatedUser = await User.findById(user._id);
          if (updatedUser) {
            if (!updatedUser.paymentHistory) updatedUser.paymentHistory = [];
            updatedUser.paymentHistory.push({
              amount: 0,
              date: new Date(),
              status: "failed",
              description: `3D Ödeme tamamlama başarısız. Hata: ${
                error instanceof Error ? error.message : "Bilinmeyen hata"
              }`,
            });
            await updatedUser.save();
            logger.info("Başarısız ödeme kaydedildi", {
              userId: user._id.toString(),
            });
          }
        }
      } catch (saveError: any) {
        console.error("Ödeme hatası kaydedilirken hata oluştu:", saveError);
        logger.error("Ödeme hatası kaydedilirken hata oluştu", {
          error: saveError.message,
          stack: saveError.stack,
          userId: (req.user as IUser)?._id?.toString(),
        });
      }

      res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Ödeme tamamlama işlemi başarısız",
      });
    }
  }
);

// 3D Secure callback endpoint'i
router.post("/callback", async (req: Request, res: Response) => {
  try {
    console.log("3D Secure callback verileri (body):", req.body);
    console.log("3D Secure callback verileri (query):", req.query);
    logger.info("3D Secure callback verileri alındı", {
      body: req.body,
      query: req.query,
    });

    // Banka tarafından gönderilen verileri al
    const {
      md,
      mdStatus,
      orderId,
      transactionAmount,
      islemGUID,
      islemHash,
      bankResult,
    } = req.body;

    // mdStatus kontrolü
    if (mdStatus !== "1") {
      console.error("3D Secure doğrulaması başarısız:", {
        mdStatus,
        bankResult,
      });
      logger.error("3D Secure doğrulaması başarısız", {
        mdStatus,
        bankResult,
        orderId,
      });
      throw new Error(
        `3D Secure doğrulaması başarısız: ${bankResult || "Bilinmeyen hata"}`
      );
    }

    // Ödemeyi tamamla
    const result = await ParamPosService.completePayment({
      ucdMD: md, // Bankadan gelen md değeri
      siparisId: orderId, // Bankadan gelen orderId değeri
      islemGuid: islemGUID, // Bankadan gelen islemGUID değeri
    });

    console.log("Ödeme tamamlama sonucu:", result);
    logger.info("Ödeme tamamlama sonucu", {
      result: result.TURKPOS_RETVAL_Sonuc,
      resultStr: result.TURKPOS_RETVAL_Sonuc_Str,
      transactionId: result.TURKPOS_RETVAL_Islem_ID,
    });

    // Sonuca göre frontend'e yönlendir
    const frontendUrl =
      process.env.FRONTEND_URL || "https://aikuaihub.com";
    const redirectUrl = `${frontendUrl}/payment/callback?status=${
      result.TURKPOS_RETVAL_Sonuc === 1 ? "success" : "error"
    }&data=${encodeURIComponent(JSON.stringify(result))}`;

    // Başarılı yanıt döndür ve frontend'e yönlendir
    res.redirect(redirectUrl);
  } catch (error: any) {
    console.error("Callback hatası:", error);
    logger.error("Callback hatası", {
      error: error.message,
      stack: error.stack,
    });

    // Hata durumunda frontend'e yönlendir
    const frontendUrl =
      process.env.FRONTEND_URL || "https://aikuaihub.com";
    res.redirect(
      `${frontendUrl}/payment/callback?status=error&message=${encodeURIComponent(
        (error as Error).message
      )}`
    );
  }
});

/**
 * @route   POST /api/payments/record-free-payment
 * @desc    Ücretsiz abonelik için ödeme kaydı oluşturur
 * @access  Private
 */
router.post(
  "/record-free-payment",
  protect,
  validateRequest(recordFreePaymentSchema),
  recordFreePayment
);

/**
 * @route   GET /api/payments/history
 * @desc    Kullanıcının ödeme geçmişini getirir
 * @access  Private
 */
router.get("/history", protect, getPaymentHistory);

/**
 * @route   POST /api/payments/methods
 * @desc    Yeni ödeme yöntemi (kart) ekler
 * @access  Private
 */
router.post(
  "/methods",
  protect,
  validateRequest(addPaymentMethodSchema),
  addPaymentMethod
);

/**
 * @route   GET /api/payments/methods
 * @desc    Kullanıcının kayıtlı ödeme yöntemlerini getirir
 * @access  Private
 */
router.get("/methods", protect, getPaymentMethods);

/**
 * @route   DELETE /api/payments/methods/:cardId
 * @desc    Kullanıcının kayıtlı ödeme yöntemini siler
 * @access  Private
 */
router.delete("/methods/:cardId", protect, deletePaymentMethod);

/**
 * @route   PUT /api/payments/methods/:cardId/default
 * @desc    Kullanıcının varsayılan ödeme yöntemini günceller
 * @access  Private
 */
router.put("/methods/:cardId/default", protect, updateDefaultPaymentMethod);

// Kupon doğrulama endpoint'i
router.post(
  "/validate-coupon",
  protect,
  async (req: Request, res: Response) => {
    try {
      const { couponCode } = req.body;
      const userId = req.user.id;
      const planType = req.body.planType || "MONTHLY";

      const coupon = await couponService.validateCoupon(
        couponCode,
        userId,
        planType
      );

      res.json({
        isValid: true,
        discountRate: coupon.discountRate,
        planType: coupon.planType,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Kupon doğrulama hatası",
      });
    }
  }
);

export default router;
