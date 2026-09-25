/// <reference path="../types/sib-api-v3-sdk.d.ts" />
// @ts-ignore
import SibApiV3Sdk from 'sib-api-v3-sdk';

class BrevoService {
    private apiInstance: SibApiV3Sdk.TransactionalEmailsApi;

    constructor() {
        console.log('Brevo service initializing...');
        const apiKey = process.env.BREVO_API_KEY || '';

        SibApiV3Sdk.ApiClient.instance.authentications['api-key'].apiKey = apiKey;
        this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        console.log('Brevo service initialized.');
    }

    async sendVerificationEmail(email: string, verificationToken: string): Promise<void> {
        const verificationUrl = `${process.env.API_URL}/api/auth/verify-email/${verificationToken}`;

        const sendSmtpEmail = {
            to: [{ email }],
            templateId: 1, // <-- Brevo panelinde oluşturduğun "email-verification" şablonunun ID'si
            params: {
                verification_url: verificationUrl,
            },
            headers: {
                'X-Mailin-custom': 'email-verification',
            },
        };

        try {
            console.log('Sending verification email to:', email);
            await this.apiInstance.sendTransacEmail(sendSmtpEmail);
            console.log('Email sent.');
        } catch (error) {
            console.error('Failed to send verification email:', error);
            throw new Error('Email sending failed.');
        }
    }

    async sendEmailChangeCode(newEmail: string, code: string, expiresInMinutes: number): Promise<void> {
        const sendSmtpEmail = {
            to: [{ email: newEmail }],
            templateId: 2, // <-- Brevo'daki "email-change-verification" şablonunun ID'si
            params: {
                code,
                expires: expiresInMinutes,
            },
            headers: {
                'X-Mailin-custom': 'email-change-verification',
            },
        };

        try {
            console.log('Sending email change verification code to:', newEmail);
            await this.apiInstance.sendTransacEmail(sendSmtpEmail);
        } catch (error) {
            console.error('Failed to send email change code:', error);
            throw new Error('Email sending failed.');
        }
    }

    async sendChatNotification(
        to: string,
        variables: {
            companyName: string;
            content: string;
            chatUrl: string;
        }
    ): Promise<void> {
        const sendSmtpEmail = {
            to: [{ email: to }],
            templateId: 3, // <-- chat-notification şablonunun ID'si
            params: variables,
            headers: {
                'X-Mailin-custom': 'chat-notification',
            },
        };

        try {
            await this.apiInstance.sendTransacEmail(sendSmtpEmail);
        } catch (error) {
            console.error('Failed to send chat notification:', error);
            throw new Error('Chat email sending failed.');
        }
    }

    async sendMobileVerificationCode(email: string, code: string, expiresInMinutes: number): Promise<void> {
        const sendSmtpEmail = {
            to: [{ email }],
            templateId: 13,
            params: {
                code,
                expires: expiresInMinutes,
            },
            headers: {
                'X-Mailin-custom': 'mobile-verification-code',
            },
        };

        try {
            console.log('Sending mobile verification code to:', email);
            await this.apiInstance.sendTransacEmail(sendSmtpEmail);
            console.log('Mobile verification code sent successfully');
        } catch (error) {
            console.error('Failed to send mobile verification code:', error);
            throw new Error('Mobile verification code sending failed.');
        }
    }

    async sendPasswordResetCode(email: string, code: string, expiresInMinutes: number): Promise<void> {
        const sendSmtpEmail = {
            to: [{ email }],
            templateId: 14,
            params: {
                code,
                expires: expiresInMinutes,
            },
            headers: {
                'X-Mailin-custom': 'password-reset-code',
            },
        };

        try {
            console.log('Sending password reset code to:', email);
            await this.apiInstance.sendTransacEmail(sendSmtpEmail);
            console.log('Password reset code sent successfully');
        } catch (error) {
            console.error('Failed to send password reset code:', error);
            throw new Error('Password reset code sending failed.');
        }
    }

    async sendAcademyOrderConfirmation(orderData: {
        email: string;
        firstName: string;
        lastName: string;
        phone?: string;
        orderId: string;
        items: Array<{ name: string; price: number; quantity?: number }>;
        totalAmount: number;
        paidAt?: Date;
        paymentMethod?: string;
    }): Promise<void> {
        const templateId = Number(process.env.BREVO_ACADEMY_TEMPLATE_ID || 141);
        const fullName = `${orderData.firstName} ${orderData.lastName}`.trim();
        const formattedDate = (orderData.paidAt || new Date()).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
        const formattedTotal = `${orderData.totalAmount.toLocaleString('tr-TR')} TL`;
        const whatsappUrl = `https://wa.me/908507579427?text=Merhaba,%20${orderData.orderId}%20numarali%20egitim%20kaydim%20hakkinda%20bilgi%20almak%20istiyorum.`;

        // HTML courses list
        const coursesHtml = orderData.items
            .map(
                (item) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 14px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; color: #0f172a;">
                        ${item.name}
                        <div style="font-size: 12px; font-weight: 400; color: #64748b; margin-top: 2px;">Canlı & Uygulamalı Eğitim Programı</div>
                    </td>
                    <td style="padding: 14px 0; text-align: right; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 700; color: #7c5dc4;">
                        ${item.price.toLocaleString('tr-TR')} TL
                    </td>
                </tr>
            `
            )
            .join('');

        const formattedItems = orderData.items.map((item) => ({
            name: item.name,
            price: `${item.price.toLocaleString('tr-TR')} TL`,
            rawPrice: item.price,
            quantity: item.quantity || 1,
        }));

        const params = {
            FIRST_NAME: orderData.firstName,
            LAST_NAME: orderData.lastName,
            CUSTOMER_NAME: fullName,
            ORDER_ID: orderData.orderId,
            ORDER_DATE: formattedDate,
            TOTAL_AMOUNT: formattedTotal,
            COURSES_HTML: coursesHtml,
            PHONE: orderData.phone || '',
            SUPPORT_WHATSAPP: whatsappUrl,
            ITEMS: formattedItems,
        };

        const sendSmtpEmailWithTemplate = {
            to: [{ email: orderData.email, name: fullName }],
            templateId: templateId,
            params: params,
            headers: {
                'X-Mailin-custom': 'aloha-dijital-academy-order',
            },
        };

        try {
            console.log(`[Brevo] Sending academy order confirmation email to ${orderData.email} (Template #${templateId})...`);
            await this.apiInstance.sendTransacEmail(sendSmtpEmailWithTemplate);
            console.log(`[Brevo] Academy order confirmation sent successfully to ${orderData.email}`);
        } catch (error: any) {
            console.warn(`[Brevo] Template #${templateId} send failed (${error?.message || error}), attempting direct HTML fallback...`);
            
            // Fallback to direct HTML sending if template is inactive or failing
            try {
                const directHtml = generateAcademyOrderEmailHtml({
                    firstName: orderData.firstName,
                    lastName: orderData.lastName,
                    orderId: orderData.orderId,
                    orderDate: formattedDate,
                    totalAmount: formattedTotal,
                    items: orderData.items,
                    whatsappUrl: whatsappUrl,
                });

                const directSmtpEmail = {
                    sender: {
                        name: 'Aloha Dijital Akademi',
                        email: process.env.BREVO_SENDER_EMAIL || 'akademi@alohadijital.com',
                    },
                    to: [{ email: orderData.email, name: fullName }],
                    subject: `🎓 Eğitim Kaydınız Onaylandı: ${orderData.orderId} - Aloha Dijital Akademi`,
                    htmlContent: directHtml,
                    headers: {
                        'X-Mailin-custom': 'aloha-dijital-academy-order-direct',
                    },
                };

                await this.apiInstance.sendTransacEmail(directSmtpEmail);
                console.log(`[Brevo] Direct HTML fallback email sent successfully to ${orderData.email}`);
            } catch (fallbackError: any) {
                console.error('[Brevo] Both template and direct HTML email failed:', fallbackError);
                throw fallbackError;
            }
        }
    }
}

export function generateAcademyOrderEmailHtml(data: {
    firstName: string;
    lastName: string;
    orderId: string;
    orderDate: string;
    totalAmount: string;
    items: Array<{ name: string; price: number }>;
    whatsappUrl: string;
}): string {
    const coursesRows = data.items
        .map(
            (item) => `
            <tr>
                <td style="padding: 16px 0; border-bottom: 1px solid #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; color: #09090b;">
                    ${item.name}
                    <div style="font-size: 12px; font-weight: normal; color: #64748b; margin-top: 3px;">Canlı & Uygulamalı Eğitim Programı</div>
                </td>
                <td style="padding: 16px 0; border-bottom: 1px solid #f1f5f9; text-align: right; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 700; color: #7c5dc4;">
                    ${item.price.toLocaleString('tr-TR')} TL
                </td>
            </tr>
        `
        )
        .join('');

    return `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Eğitim Kaydınız Onaylandı - Aloha Dijital Akademi</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 30px 15px;">
        <tr>
            <td align="center">
                <!-- Main Container -->
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                    
                    <!-- Header Banner (Light Purple-Yellow Gradient Theme) -->
                    <tr>
                        <td style="background-color: #faf7ff; background: linear-gradient(135deg, #f3eaff 0%, #ffffff 52%, #fff9e6 100%); border-bottom: 1px solid #f1eef8; padding: 38px 32px 30px 32px; text-align: center;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <!-- Aloha Dijital Akademi Logo -->
                                        <img src="https://i.imgur.com/ypM7TN8.png" alt="Aloha Dijital Akademi" width="170" style="display: block; width: 170px; max-width: 100%; height: auto; margin: 0 auto 16px auto; border: 0;" />
                                        
                                        <div style="display: inline-block; background-color: rgba(253, 205, 61, 0.25); border: 1px solid rgba(253, 205, 61, 0.7); border-radius: 100px; padding: 4px 14px; margin-bottom: 10px;">
                                            <span style="color: #854d0e; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">Eğitim Kayıt Onayı</span>
                                        </div>
                                        <h1 style="color: #0f172a; font-size: 24px; font-weight: 800; margin: 0; line-height: 1.3;">
                                            Kaydınız Başarıyla Onaylandı 🎉
                                        </h1>
                                        <p style="color: #64748b; font-size: 13px; margin: 6px 0 0 0;">
                                            Geleceğin teknolojilerine bir adım daha yaklaştınız.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 36px 32px;">
                            
                            <!-- Greeting -->
                            <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
                                Sayın <strong>${data.firstName} ${data.lastName}</strong>,
                            </p>
                            <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 28px 0;">
                                Aloha Dijital Akademi eğitim programına kaydınız ve ödemeniz başarıyla tamamlandı. Aşağıda satın aldığınız eğitimler ve sipariş detayları yer almaktadır.
                            </p>

                            <!-- Order Reference Card -->
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 28px;">
                                <tr>
                                    <td style="padding: 18px 20px;">
                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                            <tr>
                                                <td style="font-size: 12px; color: #64748b; font-weight: 500;">Sipariş Kodu</td>
                                                <td style="font-size: 12px; color: #64748b; font-weight: 500; text-align: right;">Kayıt Tarihi</td>
                                            </tr>
                                            <tr>
                                                <td style="font-size: 16px; color: #09090b; font-weight: 700; font-family: monospace; padding-top: 4px;">
                                                    ${data.orderId}
                                                </td>
                                                <td style="font-size: 13px; color: #09090b; font-weight: 600; text-align: right; padding-top: 4px;">
                                                    ${data.orderDate}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Enrolled Courses -->
                            <div style="font-size: 14px; font-weight: 700; color: #09090b; margin-bottom: 12px;">
                                📚 Kayıt Olunan Eğitim Programları
                            </div>
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin-bottom: 24px;">
                                ${coursesRows}
                                <tr>
                                    <td style="padding: 16px 0 0 0; font-size: 15px; font-weight: 700; color: #09090b;">
                                        Toplam Tutar (KDV Dahil)
                                    </td>
                                    <td style="padding: 16px 0 0 0; text-align: right; font-size: 18px; font-weight: 800; color: #7c5dc4;">
                                        ${data.totalAmount}
                                    </td>
                                </tr>
                            </table>

                            <!-- Next Steps Section -->
                            <div style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 16px; padding: 22px; margin-bottom: 30px;">
                                <div style="font-size: 14px; font-weight: 700; color: #581c87; margin-bottom: 12px;">
                                    🚀 Sırada Ne Var?
                                </div>
                                <ul style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.6; color: #6b21a8;">
                                    <li style="margin-bottom: 8px;">
                                        <strong>1. Zoom & Takvim Davetiyesi:</strong> Canlı ders başlangıç linkleri ve program takvimi ders gününden önce e-posta ve WhatsApp üzerinden iletilecektir.
                                    </li>
                                    <li style="margin-bottom: 8px;">
                                        <strong>2. Öğrenci Topluluğu:</strong> Eğitim danışmanlarımız sizi eğitmeniniz ve sınıf arkadaşlarınızla iletişimde kalacağınız WhatsApp grubuna ekleyecektir.
                                    </li>
                                    <li>
                                        <strong>3. e-Devlet Onaylı Sertifika:</strong> Eğitimi tamamlayıp bitirme projenizi teslim ettiğinizde resmi sertifikanız e-Devlet sisteminize tanımlanacaktır.
                                    </li>
                                </ul>
                            </div>

                            <!-- Buttons -->
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="padding-bottom: 12px;">
                                        <a href="${data.whatsappUrl}" target="_blank" style="display: block; width: 100%; max-width: 320px; background-color: #16a34a; color: #ffffff; text-decoration: none; text-align: center; font-size: 14px; font-weight: 700; padding: 14px 24px; border-radius: 100px; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.25);">
                                            💬 WhatsApp Danışmanına Bağlan
                                        </a>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center">
                                        <a href="https://alohadijital.com/academy" target="_blank" style="display: inline-block; color: #64748b; text-decoration: underline; font-size: 13px; font-weight: 500;">
                                            Akademi Sayfasını Ziyaret Et
                                        </a>
                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center;">
                            <p style="font-size: 12px; color: #64748b; margin: 0 0 6px 0; font-weight: 600;">
                                Aloha Dijital Bilişim A.Ş. — Aloha Dijital Akademi
                            </p>
                            <p style="font-size: 11px; color: #94a3b8; margin: 0 0 10px 0;">
                                info@alohadijital.com • +90 (850) 757 94 27 • Maslak, İstanbul
                            </p>
                            <p style="font-size: 10px; color: #cbd5e1; margin: 0;">
                                Bu e-posta, Aloha Dijital Akademi üzerinden gerçekleştirdiğiniz siparişe istinaden otomatik olarak gönderilmiştir.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

export const brevoService = new BrevoService();

