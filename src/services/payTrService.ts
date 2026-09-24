import crypto from "crypto";
import axios from "axios";
import logger from "../config/logger";

export interface PayTrBasketItem {
  name: string;
  price: number; // in TRY, e.g. 4990
  quantity: number;
}

export interface CreatePayTrTokenOptions {
  merchantOid: string; // Order ID, e.g. "ALH-123456"
  userEmail: string;
  userName: string;
  userAddress: string;
  userPhone: string;
  userIp: string;
  paymentAmount: number; // Total amount in TRY, e.g. 4990
  basketItems: PayTrBasketItem[];
  okUrl?: string;
  failUrl?: string;
  currency?: "TL" | "EUR" | "USD" | "GBP";
  testMode?: "0" | "1";
  noInstallment?: "0" | "1";
  maxInstallment?: "0" | "2" | "3" | "6" | "9" | "12";
}

export interface PayTrCallbackPayload {
  merchant_oid: string;
  status: "success" | "failed";
  total_amount: string; // in kuruş, e.g. "499000"
  hash: string;
  failed_reason_code?: string;
  failed_reason_msg?: string;
  test_mode?: string;
  payment_type?: string;
  currency?: string;
  payment_amount?: string;
}

export class PayTrService {
  private merchantId: string;
  private merchantKey: string;
  private merchantSalt: string;
  private isTestMode: boolean;

  constructor() {
    this.merchantId = process.env.PAYTR_MERCHANT_ID || "752683";
    this.merchantKey = process.env.PAYTR_MERCHANT_KEY || "TKyn418xq3GtzENW";
    this.merchantSalt = process.env.PAYTR_MERCHANT_SALT || "27TkfkU14iBxFP99";
    this.isTestMode = process.env.PAYTR_TEST_MODE !== "0";
  }

  /**
   * Generates a PayTR iframe token for embedding checkout.
   */
  async createIframeToken(options: CreatePayTrTokenOptions): Promise<{ token: string; iframeUrl: string }> {
    const {
      merchantOid,
      userEmail,
      userName,
      userAddress,
      userPhone,
      userIp,
      paymentAmount,
      basketItems,
      okUrl = `${process.env.FRONTEND_URL || "https://alohadijital.com"}/checkout/success`,
      failUrl = `${process.env.FRONTEND_URL || "https://alohadijital.com"}/checkout/fail`,
      currency = "TL",
      noInstallment = "0",
      maxInstallment = "0",
    } = options;

    // Convert amount to kuruş (cents) integer
    const amountInKurus = Math.round(paymentAmount * 100);

    // Prepare user basket: [ [ "Ürün Adı", "Fiyat (Örn: 49.90)", Adet ] ]
    const formattedBasket = basketItems.map((item) => [
      item.name.replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ\s\-_.,()]/g, ""),
      item.price.toFixed(2),
      item.quantity,
    ]);

    const userBasketBase64 = Buffer.from(JSON.stringify(formattedBasket)).toString("base64");
    const testMode = this.isTestMode ? "1" : "0";

    // Hash Calculation
    // hash_str = merchant_id + user_ip + merchant_oid + email + payment_amount + user_basket + no_installment + max_installment + currency + test_mode;
    const hashString =
      this.merchantId +
      userIp +
      merchantOid +
      userEmail +
      amountInKurus.toString() +
      userBasketBase64 +
      noInstallment +
      maxInstallment +
      currency +
      testMode;

    const tokenHash = crypto
      .createHmac("sha256", this.merchantKey)
      .update(hashString + this.merchantSalt)
      .digest("base64");

    const params = new URLSearchParams();
    params.append("merchant_id", this.merchantId);
    params.append("user_ip", userIp);
    params.append("merchant_oid", merchantOid);
    params.append("email", userEmail);
    params.append("payment_amount", amountInKurus.toString());
    params.append("paytr_token", tokenHash);
    params.append("user_basket", userBasketBase64);
    params.append("user_name", userName);
    params.append("user_address", userAddress || "İstanbul");
    params.append("user_phone", userPhone);
    params.append("merchant_ok_url", okUrl);
    params.append("merchant_fail_url", failUrl);
    params.append("timeout_limit", "30");
    params.append("currency", currency);
    params.append("test_mode", testMode);
    params.append("debug_on", this.isTestMode ? "1" : "0");
    params.append("no_installment", noInstallment);
    params.append("max_installment", maxInstallment);
    params.append("lang", "tr");

    try {
      const response = await axios.post("https://www.paytr.com/odeme/api/get-token", params.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 15000,
      });

      if (response.data.status === "success") {
        return {
          token: response.data.token,
          iframeUrl: `https://www.paytr.com/odeme/guvenli/${response.data.token}`,
        };
      } else {
        logger.error("PayTR Token generation failed:", response.data);
        throw new Error(response.data.reason || "PayTR token üretilemedi");
      }
    } catch (error: any) {
      logger.error("PayTR API Error:", error.message);
      throw new Error(`PayTR İletişim Hatası: ${error.message}`);
    }
  }

  /**
   * Verifies the authenticity of a PayTR callback notification.
   */
  verifyCallbackHash(payload: PayTrCallbackPayload): boolean {
    const { merchant_oid, status, total_amount, hash } = payload;
    if (!merchant_oid || !status || !total_amount || !hash) {
      return false;
    }

    // hash_str = merchant_oid + merchant_salt + status + total_amount;
    const expectedHash = crypto
      .createHmac("sha256", this.merchantKey)
      .update(merchant_oid + this.merchantSalt + status + total_amount)
      .digest("base64");

    return hash === expectedHash;
  }
}

export default new PayTrService();
