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
            templateId: 2, // <-- Email change template'ini kullan (aynı parametreler)
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
}

export const brevoService = new BrevoService();
