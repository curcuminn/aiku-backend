import { Request, Response } from "express";
import { AcademyOrder } from "../models/AcademyOrder";
import payTrService from "../services/payTrService";
import { brevoService } from "../services/brevoService";
import logger from "../config/logger";

export async function createCheckoutSession(req: Request, res: Response) {
  try {
    const { customer, invoice, items, totalAmount, paymentMethod = "paytr_card" } = req.body;

    if (!customer || !customer.firstName || !customer.lastName || !customer.email || !customer.phone) {
      return res.status(400).json({
        success: false,
        error: "Katılımcı bilgileri eksiksiz doldurulmalıdır.",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Sepette en az bir eğitim bulunmalıdır.",
      });
    }

    // Calculate subtotal and tax
    const calculatedTotal = items.reduce((acc: number, it: any) => acc + (Number(it.price) || 0) * (it.quantity || 1), 0);
    const taxAmount = Math.round(calculatedTotal - calculatedTotal / 1.2);
    const subtotal = calculatedTotal - taxAmount;

    // Generate purely alphanumeric Order ID (PayTR strictly bans hyphens & special characters)
    const timestamp = Date.now().toString();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    const orderId = `ALH${timestamp.slice(-8)}${randomSuffix}`;

    // Get client IP address
    let clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      (req.headers["x-real-ip"] as string) ||
      req.socket.remoteAddress ||
      "127.0.0.1";

    if (clientIp === "::1" || clientIp === "127.0.0.1" || clientIp.includes("127.0.0.1")) {
      clientIp = "176.240.100.1"; // PayTR local development fallback IP
    }

    // Create Order in DB
    const order = await AcademyOrder.create({
      orderId,
      customer: {
        firstName: customer.firstName.trim(),
        lastName: customer.lastName.trim(),
        email: customer.email.trim().toLowerCase(),
        phone: customer.phone.trim(),
        identityNumber: (customer.identityNumber || "11111111111").trim(),
      },
      invoice: {
        type: invoice?.type || "individual",
        companyName: invoice?.companyName?.trim(),
        taxOffice: invoice?.taxOffice?.trim(),
        taxNumber: invoice?.taxNumber?.trim(),
        city: invoice?.city?.trim() || "İstanbul",
        district: invoice?.district?.trim() || "Merkez",
        address: invoice?.address?.trim() || "İstanbul",
      },
      items: items.map((it: any) => ({
        id: it.id,
        name: it.name || it.title,
        price: it.price,
        basePrice: Math.round(it.price / 1.2),
        taxAmount: Math.round(it.price - it.price / 1.2),
        quantity: it.quantity || 1,
      })),
      subtotal,
      taxAmount,
      discount: 0,
      totalAmount: calculatedTotal,
      currency: "TRY",
      paymentMethod,
      paymentStatus: "pending",
      ipAddress: clientIp,
    });

    // If PayTR Credit / Debit Card
    if (paymentMethod === "paytr_card") {
      const clientPassedUrl =
        req.body?.frontendUrl ||
        (req.headers["x-frontend-url"] as string) ||
        req.headers.origin ||
        (req.headers.referer ? new URL(req.headers.referer).origin : null);

      let frontendUrl = (
        clientPassedUrl ||
        process.env.ALOHA_FRONTEND_URL ||
        process.env.FRONTEND_URL ||
        "https://www.alohadijital.com"
      ).replace(/\/$/, "");

      // If accessed on live server or over HTTPS, ensure redirect URL is production domain
      if (
        (req.secure || req.headers["x-forwarded-proto"] === "https" || process.env.NODE_ENV === "production") &&
        frontendUrl.includes("localhost")
      ) {
        frontendUrl = "https://www.alohadijital.com";
      }

      const tokenResult = await payTrService.createIframeToken({
        merchantOid: order.orderId,
        userEmail: order.customer.email,
        userName: `${order.customer.firstName} ${order.customer.lastName}`,
        userAddress: `${order.invoice.address}, ${order.invoice.district}/${order.invoice.city}`,
        userPhone: order.customer.phone,
        userIp: clientIp,
        paymentAmount: order.totalAmount,
        basketItems: order.items.map((it) => ({
          name: it.name,
          price: it.price,
          quantity: it.quantity,
        })),
        okUrl: `${frontendUrl}/checkout/success`,
        failUrl: `${frontendUrl}/checkout/fail`,
      });

      order.paytrToken = tokenResult.token;
      await order.save();

      return res.status(200).json({
        success: true,
        orderId: order.orderId,
        token: tokenResult.token,
        iframeUrl: tokenResult.iframeUrl,
      });
    }

    // Bank Transfer
    return res.status(200).json({
      success: true,
      orderId: order.orderId,
      message: "Havale/EFT kaydınız oluşturuldu.",
      bankInfo: {
        bankName: "Garanti BBVA",
        accountHolder: "Aloha Dijital Bilişim A.Ş.",
        iban: "TR00 0000 0000 0000 0000 0000 00",
        description: order.orderId,
      },
    });
  } catch (error: any) {
    logger.error("Academy checkout session error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Ödeme oturumu başlatılırken bir hata oluştu.",
    });
  }
}

export async function handlePayTrCallback(req: Request, res: Response) {
  try {
    const payload = req.body;
    logger.info("Received PayTR webhook callback:", payload);

    // Verify callback hash
    const isValid = payTrService.verifyCallbackHash(payload);
    if (!isValid) {
      logger.warn("PayTR callback BAD_HASH detected for merchant_oid:", payload?.merchant_oid);
      return res.status(400).send("PAYTR notification failed: bad hash");
    }

    const { merchant_oid, status, failed_reason_code, failed_reason_msg } = payload;

    const order = await AcademyOrder.findOne({ orderId: merchant_oid });
    if (!order) {
      logger.warn("PayTR callback order not found:", merchant_oid);
      return res.status(200).send("OK");
    }

    if (status === "success") {
      order.paymentStatus = "paid";
      order.paidAt = new Date();
      order.meta = { ...order.meta, paytrCallback: payload };
      await order.save();
      logger.info(`Academy order ${merchant_oid} successfully PAID via PayTR!`);

      // Trigger Brevo confirmation email
      try {
        await brevoService.sendAcademyOrderConfirmation({
          email: order.customer.email,
          firstName: order.customer.firstName,
          lastName: order.customer.lastName,
          phone: order.customer.phone,
          orderId: order.orderId,
          items: order.items,
          totalAmount: order.totalAmount,
          paidAt: order.paidAt,
          paymentMethod: "PayTR 3D Secure",
        });
        logger.info(`Brevo confirmation email sent for order ${merchant_oid} to ${order.customer.email}`);
      } catch (mailErr) {
        logger.error(`Failed to send Brevo confirmation email for order ${merchant_oid}:`, mailErr);
      }
    } else {
      order.paymentStatus = "failed";
      order.meta = {
        ...order.meta,
        failedReasonCode: failed_reason_code,
        failedReasonMsg: failed_reason_msg,
      };
      await order.save();
      logger.warn(`Academy order ${merchant_oid} payment FAILED: ${failed_reason_msg}`);
    }

    // PayTR strictly requires response "OK"
    return res.status(200).send("OK");
  } catch (error: any) {
    logger.error("PayTR callback processing error:", error);
    return res.status(500).send("INTERNAL_SERVER_ERROR");
  }
}

export async function sendTestAcademyEmail(req: Request, res: Response) {
  try {
    const {
      email = "mert_uysal@hotmail.com",
      firstName = "Mert",
      lastName = "Uysal",
      orderId = "ALH" + Date.now().toString().slice(-8),
    } = req.body || {};

    await brevoService.sendAcademyOrderConfirmation({
      email,
      firstName,
      lastName,
      phone: "0555 555 55 55",
      orderId,
      items: [
        {
          name: "30 Saatte Kendi Mobil Uygulamanı Geliştir",
          price: 30000,
          quantity: 1,
        },
      ],
      totalAmount: 30000,
      paidAt: new Date(),
      paymentMethod: "PayTR 3D Secure",
    });

    return res.status(200).json({
      success: true,
      message: `Test e-postası ${email} adresine Brevo üzerinden gönderildi.`,
      orderId,
    });
  } catch (error: any) {
    logger.error("Send test academy email error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "E-posta gönderilemedi.",
    });
  }
}

export async function getOrderDetails(req: Request, res: Response) {
  try {
    const { orderId } = req.params;
    const order = await AcademyOrder.findOne({ orderId });

    if (!order) {
      return res.status(404).json({ success: false, error: "Sipariş bulunamadı." });
    }

    return res.status(200).json({
      success: true,
      order: {
        orderId: order.orderId,
        customer: {
          firstName: order.customer.firstName,
          lastName: order.customer.lastName,
          email: order.customer.email,
        },
        items: order.items,
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
      },
    });
  } catch (error: any) {
    logger.error("Get order details error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
