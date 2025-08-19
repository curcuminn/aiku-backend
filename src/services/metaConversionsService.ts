import axios from "axios";
import crypto from "crypto";

interface ConversionsUserData {
  email?: string;
  phone?: string;
  leadId?: string | number;
  fbp?: string; // Meta cookie value
  fbc?: string; // Meta click id
  clientIpAddress?: string;
  clientUserAgent?: string;
}

export interface ConversionsEventInput {
  eventName: string;
  eventTime?: number; // unix seconds
  leadEventSource?: string; // CRM name
  actionSource?: "system_generated";
  eventSource?: "crm";
  user: ConversionsUserData;
  testEventCode?: string;
}

export class MetaConversionsService {
  private readonly apiVersion: string;
  private readonly datasetId: string;
  private readonly accessToken?: string;
  private readonly leadEventSourceDefault: string;

  constructor() {
    this.apiVersion = process.env.META_API_VERSION || "v23.0";
    this.datasetId = process.env.META_DATASET_ID || "1389532595173830"; // fallback given by user
    this.accessToken = process.env.META_ACCESS_TOKEN;
    this.leadEventSourceDefault = process.env.META_LEAD_EVENT_SOURCE || "Aloha CRM";
  }

  private get endpoint(): string {
    return `https://graph.facebook.com/${this.apiVersion}/${this.datasetId}/events`;
  }

  private sha256(input: string): string {
    return crypto.createHash("sha256").update(input).digest("hex");
  }

  private normalizeEmail(email?: string): string | undefined {
    if (!email) return undefined;
    return email.trim().toLowerCase();
  }

  private normalizePhone(phone?: string): string | undefined {
    if (!phone) return undefined;
    const digits = phone.replace(/[^0-9+]/g, "");
    return digits;
  }

  private buildUserData(user: ConversionsUserData) {
    const result: Record<string, any> = {};
    const normalizedEmail = this.normalizeEmail(user.email);
    const normalizedPhone = this.normalizePhone(user.phone);

    if (normalizedEmail) {
      result.em = [this.sha256(normalizedEmail)];
    }

    if (normalizedPhone) {
      result.ph = [this.sha256(normalizedPhone)];
    }

    if (user.leadId) {
      result.lead_id = user.leadId;
    }

    if (user.fbp) result.fbp = user.fbp;
    if (user.fbc) result.fbc = user.fbc;
    if (user.clientIpAddress) result.client_ip_address = user.clientIpAddress;
    if (user.clientUserAgent) result.client_user_agent = user.clientUserAgent;

    return result;
  }

  async sendEvent(input: ConversionsEventInput) {
    if (!this.accessToken) {
      console.warn("[MetaConversions] META_ACCESS_TOKEN is not set. Event not sent.");
      return { skipped: true } as const;
    }

    const payload = {
      data: [
        {
          action_source: input.actionSource || "system_generated",
          custom_data: {
            event_source: input.eventSource || "crm",
            lead_event_source: input.leadEventSource || this.leadEventSourceDefault,
          },
          event_name: input.eventName,
          event_time: input.eventTime || Math.floor(Date.now() / 1000),
          user_data: this.buildUserData(input.user),
        },
      ],
      // test_event_code: input.testEventCode, // only include if provided
    } as any;

    if (input.testEventCode) {
      payload.test_event_code = input.testEventCode;
    }

    const params = { access_token: this.accessToken };

    const res = await axios.post(this.endpoint, payload, { params });
    return res.data;
  }
}

export default MetaConversionsService;



