"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importStar(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
const xml2js_1 = require("xml2js");
dotenv_1.default.config();
class ParamPosService {
    constructor() {
        this.clientCode = process.env.PARAM_CLIENT_CODE || "";
        this.clientUsername = process.env.PARAM_CLIENT_USERNAME || "";
        this.clientPassword = process.env.PARAM_CLIENT_PASSWORD || "";
        this.guid = process.env.PARAM_GUID || "";
        this.baseUrl =
            process.env.PARAM_BASE_URL ||
                "https://posws.param.com.tr/turkpos.ws/service_turkpos_prod.asmx";
        this.successUrl = process.env.PARAM_SUCCESS_URL || "https://aikuaiplatform.com/payment";
        this.errorUrl = process.env.PARAM_ERROR_URL || "https://aiku.com.tr/payment/error";
        if (!this.clientCode ||
            !this.clientUsername ||
            !this.clientPassword ||
            !this.guid) {
            throw new Error("Param POS kimlik bilgileri eksik");
        }
    }
    validatePaymentParams(params) {
        if (!params) {
            throw new Error("Ödeme parametreleri eksik");
        }
        const { amount, cardNumber, cardHolderName, expireMonth, expireYear, cvc } = params;
        if (typeof amount !== "number" || amount <= 0) {
            throw new Error("Geçersiz ödeme tutarı");
        }
        if (!cardNumber || cardNumber.length < 15 || cardNumber.length > 16) {
            throw new Error("Geçersiz kart numarası");
        }
        if (!cardHolderName || cardHolderName.trim().length === 0) {
            throw new Error("Kart sahibi adı gerekli");
        }
        if (!expireMonth || !expireYear || !cvc) {
            throw new Error("Kart bilgileri eksik");
        }
        // Ay kontrolü (01-12)
        if (!/^(0[1-9]|1[0-2])$/.test(expireMonth)) {
            throw new Error("Geçersiz son kullanma ayı");
        }
        // Yıl kontrolü (YYYY formatında ve geçerli bir yıl)
        const currentYear = new Date().getFullYear();
        const year = parseInt(expireYear);
        if (isNaN(year) || year < currentYear) {
            throw new Error("Geçersiz son kullanma yılı");
        }
        // CVC kontrolü (3 veya 4 haneli)
        if (!/^\d{3,4}$/.test(cvc)) {
            throw new Error("Geçersiz CVC");
        }
    }
    calculateHash(params) {
        const hashStr = `${this.clientCode}${this.guid}${params.installment}${params.amount.toFixed(2).replace(".", ",")}${params.totalAmount.toFixed(2).replace(".", ",")}${params.orderId}`;
        return crypto_1.default.createHash("sha1").update(hashStr).digest("base64");
    }
    parseSoapResponse(xmlResponse) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield (0, xml2js_1.parseStringPromise)(xmlResponse);
                if (!result ||
                    !result["soap:Envelope"] ||
                    !result["soap:Envelope"]["soap:Body"]) {
                    throw new Error("Geçersiz SOAP yanıtı formatı");
                }
                const body = result["soap:Envelope"]["soap:Body"];
                if (!Array.isArray(body) || body.length === 0) {
                    throw new Error("SOAP Body boş veya geçersiz");
                }
                return body[0];
            }
            catch (error) {
                console.error("SOAP yanıtı parse edilemedi:", error);
                throw new Error("SOAP yanıtı işlenemedi");
            }
        });
    }
    calculateCommission(amount, installment) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (typeof amount !== "number" || amount <= 0) {
                    throw new Error("Geçersiz tutar");
                }
                // Komisyon oranı hesaplama için API çağrısı yapılabilir
                // Şimdilik sabit bir oran kullanıyoruz
                const commissionRate = installment > 1 ? 1.5 : 0;
                return Number((amount + (amount * commissionRate) / 100).toFixed(2));
            }
            catch (error) {
                console.error("Komisyon hesaplama hatası:", error);
                return amount;
            }
        });
    }
    // İlk adım: 3D ekranını almak için TP_WMD_UCD isteği yapma
    initializePayment(params) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this.validatePaymentParams(params);
                const { amount, cardNumber, cardHolderName, expireMonth, expireYear, cvc, installment = 1, userId, ipAddress = "127.0.0.1", } = params;
                // Kart numarasının ilk 6 hanesini güvenli şekilde logla
                if (cardNumber && cardNumber.length >= 6) {
                    console.log("Kart BIN Numarası (İlk 6 Hane):", cardNumber.substring(0, 6));
                }
                // Başarılı URL'ini logla
                console.log("3D İşlemi için Başarılı URL:", this.successUrl);
                const orderId = `ORDER_${Date.now()}_${(0, uuid_1.v4)().substring(0, 8)}`;
                const totalAmount = yield this.calculateCommission(amount, installment);
                const hash = this.calculateHash({
                    installment,
                    amount: amount,
                    totalAmount: totalAmount,
                    orderId: orderId,
                });
                const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
          <soap:Body>
            <TP_WMD_UCD xmlns="https://turkpos.com.tr/">
              <G>
                <CLIENT_CODE>${this.clientCode}</CLIENT_CODE>
                <CLIENT_USERNAME>${this.clientUsername}</CLIENT_USERNAME>
                <CLIENT_PASSWORD>${this.clientPassword}</CLIENT_PASSWORD>
              </G>
              <GUID>${this.guid}</GUID>
              <KK_Sahibi>${cardHolderName}</KK_Sahibi>
              <KK_No>${cardNumber}</KK_No>
              <KK_SK_Ay>${expireMonth}</KK_SK_Ay>
              <KK_SK_Yil>${expireYear}</KK_SK_Yil>
              <KK_CVC>${cvc}</KK_CVC>
              <KK_Sahibi_GSM></KK_Sahibi_GSM>
              <Hata_URL>${this.errorUrl}</Hata_URL>
              <Basarili_URL>${this.successUrl}</Basarili_URL>
              <Siparis_ID>${orderId}</Siparis_ID>
              <Siparis_Aciklama></Siparis_Aciklama>
              <Taksit>${installment}</Taksit>
              <Islem_Tutar>${amount.toFixed(2).replace(".", ",")}</Islem_Tutar>
              <Toplam_Tutar>${totalAmount.toFixed(2).replace(".", ",")}</Toplam_Tutar>
              <Islem_Hash>${hash}</Islem_Hash>
              <Islem_Guvenlik_Tip>3D</Islem_Guvenlik_Tip>
              <Islem_ID></Islem_ID>
              <IPAdr>${ipAddress}</IPAdr>
              <Ref_URL>${process.env.PRODUCTION_URL || "https://aiku.com.tr"}</Ref_URL>
              <Data1>${userId || ""}</Data1>
              <Data2></Data2>
              <Data3></Data3>
              <Data4></Data4>
              <Data5></Data5>
            </TP_WMD_UCD>
          </soap:Body>
        </soap:Envelope>`;
                console.log("TP_WMD_UCD İsteği:", soapEnvelope);
                const response = yield axios_1.default.post(this.baseUrl, soapEnvelope, {
                    headers: {
                        "Content-Type": "text/xml;charset=UTF-8",
                        SOAPAction: "https://turkpos.com.tr/TP_WMD_UCD",
                    },
                });
                console.log("TP_WMD_UCD Yanıtı:", response.data);
                const parsedResponse = yield this.parseSoapResponse(response.data);
                if (!parsedResponse["TP_WMD_UCDResponse"] ||
                    !parsedResponse["TP_WMD_UCDResponse"][0] ||
                    !parsedResponse["TP_WMD_UCDResponse"][0]["TP_WMD_UCDResult"] ||
                    !parsedResponse["TP_WMD_UCDResponse"][0]["TP_WMD_UCDResult"][0]) {
                    console.error("Geçersiz yanıt formatı:", parsedResponse);
                    throw new Error("Geçersiz ödeme yanıtı formatı");
                }
                const result = parsedResponse["TP_WMD_UCDResponse"][0]["TP_WMD_UCDResult"][0];
                // Başarısız işlem kontrolü - hem -1 hem de negatif değerleri kontrol et
                if (result.Sonuc && (result.Sonuc[0] === "-1" || parseInt(result.Sonuc[0]) < 0)) {
                    throw new Error(result.Sonuc_Str ? result.Sonuc_Str[0] : "Ödeme işlemi başarısız");
                }
                // HTML veya URL kontrol et - Param bazen UCD_HTML, bazen UCD_URL dönüyor
                const hasRedirectContent = (result.UCD_HTML && result.UCD_HTML[0]) ||
                    (result.UCD_URL && result.UCD_URL[0]);
                if (!hasRedirectContent) {
                    throw new Error("3D doğrulama içeriği alınamadı");
                }
                return {
                    Islem_ID: result.Islem_ID ? result.Islem_ID[0] : "",
                    Islem_GUID: result.Islem_GUID ? result.Islem_GUID[0] : "",
                    UCD_URL: result.UCD_URL ? result.UCD_URL[0] : undefined,
                    UCD_HTML: result.UCD_HTML ? result.UCD_HTML[0] : undefined,
                    UCD_MD: result.UCD_MD ? result.UCD_MD[0] : undefined,
                    Siparis_ID: result.Siparis_ID ? result.Siparis_ID[0] : orderId,
                    Sonuc: parseInt(result.Sonuc[0]),
                    Sonuc_Str: result.Sonuc_Str ? result.Sonuc_Str[0] : "",
                    Banka_Sonuc_Kod: result.Banka_Sonuc_Kod ? result.Banka_Sonuc_Kod[0] : undefined,
                    isRedirect: true,
                    status: parseInt(result.Sonuc[0]) > 0 ? "pending_3d" : "failure",
                    success: parseInt(result.Sonuc[0]) > 0,
                    message: parseInt(result.Sonuc[0]) > 0 ? "3D doğrulama bekliyor" : (result.Sonuc_Str ? result.Sonuc_Str[0] : "")
                };
            }
            catch (error) {
                console.error("Ödeme başlatma hatası:", error);
                if (error instanceof axios_1.AxiosError && error.response) {
                    console.error("SOAP Hata Detayı:", error.response.data);
                }
                throw this.handleError(error);
            }
        });
    }
    // İkinci adım: 3D doğrulama sonrası TP_WMD_Pay isteği yapma
    completePayment(params) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { ucdMD, siparisId, islemGuid } = params;
                console.log("TP_WMD_Pay Başlangıç - Tüm Parametreler:", {
                    ucdMD,
                    siparisId,
                    islemGuid,
                    clientCode: this.clientCode,
                    clientUsername: this.clientUsername,
                    guid: this.guid
                });
                if (!ucdMD || !siparisId) {
                    throw new Error("Ödeme tamamlama için gerekli parametreler eksik");
                }
                // islemGuid yoksa boş string kullan
                const transactionId = islemGuid || "";
                //console.log("3D Doğrulama Sonrası MD Değeri:", ucdMD);
                // MD değerinin ilk 6 hanesi genellikle kart numarasının başlangıcı olabilir
                if (typeof ucdMD === 'string' && ucdMD.length >= 6) {
                    console.log("Kart İlk 6 Hane:", ucdMD.substring(0, 6));
                }
                const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <TP_WMD_Pay xmlns="https://turkpos.com.tr/">
              <G>
                <CLIENT_CODE>${this.clientCode}</CLIENT_CODE>
                <CLIENT_USERNAME>${this.clientUsername}</CLIENT_USERNAME>
                <CLIENT_PASSWORD>${this.clientPassword}</CLIENT_PASSWORD>
              </G>
              <GUID>${this.guid}</GUID>
              <UCD_MD>${ucdMD}</UCD_MD>
              <Islem_GUID>${transactionId}</Islem_GUID>
              <Siparis_ID>${siparisId}</Siparis_ID>
            </TP_WMD_Pay>
          </soap:Body>
        </soap:Envelope>`;
                console.log("TP_WMD_Pay İsteği:", soapEnvelope);
                const response = yield axios_1.default.post(this.baseUrl, soapEnvelope, {
                    headers: {
                        "Content-Type": "text/xml;charset=UTF-8",
                        SOAPAction: "https://turkpos.com.tr/TP_WMD_Pay",
                    },
                });
                console.log("TP_WMD_Pay Yanıtı:", response.data);
                const parsedResponse = yield this.parseSoapResponse(response.data);
                console.log("TP_WMD_Pay Ayrıştırılmış Yanıt:", JSON.stringify(parsedResponse, null, 2));
                if (!parsedResponse["TP_WMD_PayResponse"] ||
                    !parsedResponse["TP_WMD_PayResponse"][0] ||
                    !parsedResponse["TP_WMD_PayResponse"][0]["TP_WMD_PayResult"] ||
                    !parsedResponse["TP_WMD_PayResponse"][0]["TP_WMD_PayResult"][0]) {
                    console.error("Geçersiz TP_WMD_Pay yanıt formatı:", parsedResponse);
                    throw new Error("Geçersiz ödeme tamamlama yanıtı formatı");
                }
                const result = parsedResponse["TP_WMD_PayResponse"][0]["TP_WMD_PayResult"][0];
                console.log("TP_WMD_Pay Sonuç:", JSON.stringify(result, null, 2));
                // Sonuç kontrolleri - undefined veya eksik alanlar için koruma
                if (!result.Sonuc) {
                    console.error("TP_WMD_Pay hata: Sonuç alanı bulunamadı");
                    throw new Error("Ödeme sonucu alınamadı");
                }
                // Başarısız işlem kontrolü
                if (Array.isArray(result.Sonuc) && (result.Sonuc[0] === "-1" || parseInt(result.Sonuc[0]) < 0)) {
                    // Daha detaylı hata mesajı oluştur (Sonuc_Ack varsa kullan)
                    const errorDetails = Array.isArray(result.Sonuc_Ack) && result.Sonuc_Ack.length > 0
                        ? result.Sonuc_Ack[0]
                        : (Array.isArray(result.Sonuc_Str) && result.Sonuc_Str.length > 0
                            ? result.Sonuc_Str[0]
                            : "Bilinmeyen hata");
                    console.error(`TP_WMD_Pay Hata (Kod: ${result.Sonuc[0]}): ${errorDetails}`);
                    throw new Error(`Ödeme tamamlama işlemi başarısız. ${errorDetails}`);
                }
                const paymentResponse = {
                    TURKPOS_RETVAL_Sonuc: Array.isArray(result.Sonuc) ? parseInt(result.Sonuc[0]) : 0,
                    TURKPOS_RETVAL_Sonuc_Str: Array.isArray(result.Sonuc_Str) && result.Sonuc_Str.length > 0
                        ? result.Sonuc_Str[0]
                        : (Array.isArray(result.Sonuc_Ack) && result.Sonuc_Ack.length > 0
                            ? result.Sonuc_Ack[0]
                            : "Sonuç açıklaması alınamadı"),
                    TURKPOS_RETVAL_GUID: this.guid,
                    TURKPOS_RETVAL_Islem_Tarih: new Date().toISOString(),
                    TURKPOS_RETVAL_Dekont_ID: Array.isArray(result.Dekont_ID) && result.Dekont_ID.length > 0
                        ? result.Dekont_ID[0]
                        : "",
                    TURKPOS_RETVAL_Tahsilat_Tutari: Array.isArray(result.Odeme_Tutari) && result.Odeme_Tutari.length > 0
                        ? result.Odeme_Tutari[0]
                        : "0",
                    TURKPOS_RETVAL_Odeme_Tutari: Array.isArray(result.Odeme_Tutari) && result.Odeme_Tutari.length > 0
                        ? result.Odeme_Tutari[0]
                        : "0",
                    TURKPOS_RETVAL_Siparis_ID: siparisId,
                    TURKPOS_RETVAL_Islem_ID: "", // Boş string döndür
                    // Frontend için açık durum bilgisi ekle
                    status: Array.isArray(result.Sonuc) && parseInt(result.Sonuc[0]) > 0 ? "success" : "failure",
                    success: Array.isArray(result.Sonuc) && parseInt(result.Sonuc[0]) > 0 ? true : false,
                    message: Array.isArray(result.Sonuc_Str) && result.Sonuc_Str.length > 0
                        ? result.Sonuc_Str[0]
                        : (Array.isArray(result.Sonuc_Ack) && result.Sonuc_Ack.length > 0
                            ? result.Sonuc_Ack[0]
                            : "")
                };
                console.log("TP_WMD_Pay İşlem Sonucu:", JSON.stringify(paymentResponse, null, 2));
                return paymentResponse;
            }
            catch (error) {
                console.error("Ödeme tamamlama hatası:", error);
                if (error instanceof axios_1.AxiosError && error.response) {
                    console.error("SOAP Hata Detayı:", error.response.data);
                }
                throw this.handleError(error);
            }
        });
    }
    // Eski payment metodu şimdi iki adımı kapsıyor
    payment(params) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // is3D parametresini true olarak zorla
                params.is3D = true;
                // İlk adım: 3D ekranını alma
                const initResponse = yield this.initializePayment(params);
                // Islem_GUID kontrolü yap
                if (!initResponse.Islem_GUID) {
                    console.warn("TP_WMD_UCD yanıtında Islem_GUID bulunamadı! Bu, ödeme tamamlama adımında sorunlara neden olabilir.");
                }
                else {
                    console.log("TP_WMD_UCD Islem_GUID:", initResponse.Islem_GUID);
                }
                // UCD_MD değerini logla - Bu, 3D yönlendirmeyle ilgili önemli bir bilgidir
                if (initResponse.UCD_MD) {
                    console.log("3D Yönlendirme MD Değeri:", initResponse.UCD_MD);
                    // MD değeri genelde kart numarasının ilk 6 hanesiyle başlar
                    if (typeof initResponse.UCD_MD === 'string' && initResponse.UCD_MD.length >= 6) {
                        console.log("3D MD değerindeki kart bilgisi (ilk 6):", initResponse.UCD_MD.substring(0, 6));
                    }
                }
                // 3D yönlendirme URL'ini veya HTML'ini logla
                console.log("3D Yönlendirme içeriği tipi:", initResponse.UCD_HTML ? "HTML" :
                    initResponse.UCD_URL ? "URL" : "Bilinmiyor");
                // Hangi içerik dönmüşse onu kullan (UCD_HTML veya UCD_URL)
                const redirectContent = initResponse.UCD_HTML || initResponse.UCD_URL || "";
                // 3D işleminde her zaman URL veya HTML içeriğini döndür
                return {
                    TURKPOS_RETVAL_Sonuc: initResponse.Sonuc,
                    TURKPOS_RETVAL_Sonuc_Str: initResponse.Sonuc_Str,
                    TURKPOS_RETVAL_GUID: this.guid,
                    TURKPOS_RETVAL_Islem_Tarih: new Date().toISOString(),
                    TURKPOS_RETVAL_Dekont_ID: "",
                    TURKPOS_RETVAL_Tahsilat_Tutari: params.amount.toString(),
                    TURKPOS_RETVAL_Odeme_Tutari: params.amount.toString(),
                    TURKPOS_RETVAL_Siparis_ID: initResponse.Siparis_ID,
                    TURKPOS_RETVAL_Islem_ID: initResponse.Islem_ID,
                    TURKPOS_RETVAL_Islem_GUID: initResponse.Islem_GUID,
                    UCD_URL: initResponse.UCD_URL,
                    UCD_HTML: initResponse.UCD_HTML,
                    UCD_MD: initResponse.UCD_MD,
                    isRedirect: true,
                    html: redirectContent,
                    // Frontend için durum bilgisi ekle - İlk aşama 0'dan büyük ise başarılı
                    status: initResponse.Sonuc > 0 ? "pending_3d" : "failure",
                    success: initResponse.Sonuc > 0,
                    message: initResponse.Sonuc > 0
                        ? "3D doğrulama bekliyor"
                        : initResponse.Sonuc_Str
                };
                // Not: Burada ikinci adım olan completePayment() metodu kullanıcı 3D sayfasını 
                // doğruladıktan sonra callback URL'inden çağrılacak
            }
            catch (error) {
                console.error("Ödeme hatası:", error);
                throw this.handleError(error);
            }
        });
    }
    saveCard(params) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId, cardNumber, cardHolderName, expireMonth, expireYear, cvc, } = params;
                const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
          <soap:Body>
            <KK_Sakli_Liste xmlns="https://turkpos.com.tr/">
              <G>
                <CLIENT_CODE>${this.clientCode}</CLIENT_CODE>
                <CLIENT_USERNAME>${this.clientUsername}</CLIENT_USERNAME>
                <CLIENT_PASSWORD>${this.clientPassword}</CLIENT_PASSWORD>
              </G>
              <GUID>${this.guid}</GUID>
              <KK_Sahibi>${cardHolderName}</KK_Sahibi>
              <KK_No>${cardNumber}</KK_No>
              <KK_SK_Ay>${expireMonth}</KK_SK_Ay>
              <KK_SK_Yil>${expireYear}</KK_SK_Yil>
              <KK_CVC>${cvc}</KK_CVC>
              <Data1>${userId}</Data1>
              <Data2>${process.env.CLIENT_URL}/payment/callback</Data2>
            </KK_Sakli_Liste>
          </soap:Body>
        </soap:Envelope>`;
                const response = yield axios_1.default.post(this.baseUrl, soapEnvelope, {
                    headers: {
                        "Content-Type": "text/xml;charset=UTF-8",
                        SOAPAction: "https://turkpos.com.tr/KK_Sakli_Liste",
                    },
                });
                const parsedResponse = yield this.parseSoapResponse(response.data);
                return parsedResponse.KK_Sakli_Liste_Response[0].KK_Sakli_Liste_Result[0];
            }
            catch (error) {
                console.error("Kart kaydetme hatası:", error);
                throw this.handleError(error);
            }
        });
    }
    deleteCard(cardToken) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
          <soap:Body>
            <KK_Sakli_Liste_Sil xmlns="https://turkpos.com.tr/">
              <G>
                <CLIENT_CODE>${this.clientCode}</CLIENT_CODE>
                <CLIENT_USERNAME>${this.clientUsername}</CLIENT_USERNAME>
                <CLIENT_PASSWORD>${this.clientPassword}</CLIENT_PASSWORD>
              </G>
              <GUID>${this.guid}</GUID>
              <KK_Islem_ID>${cardToken}</KK_Islem_ID>
            </KK_Sakli_Liste_Sil>
          </soap:Body>
        </soap:Envelope>`;
                const response = yield axios_1.default.post(this.baseUrl, soapEnvelope, {
                    headers: {
                        "Content-Type": "text/xml;charset=UTF-8",
                        SOAPAction: "https://turkpos.com.tr/KK_Sakli_Liste_Sil",
                    },
                });
                const parsedResponse = yield this.parseSoapResponse(response.data);
                return parsedResponse.KK_Sakli_Liste_Sil_Response[0]
                    .KK_Sakli_Liste_Sil_Result[0];
            }
            catch (error) {
                console.error("Kart silme hatası:", error);
                throw this.handleError(error);
            }
        });
    }
    handleError(error) {
        var _a;
        if (error instanceof axios_1.AxiosError) {
            const response = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data;
            if (response) {
                return new Error(`İşlem başarısız: ${response.message || error.message}`);
            }
        }
        return new Error(error.message || "Beklenmeyen bir hata oluştu");
    }
}
exports.default = new ParamPosService();
