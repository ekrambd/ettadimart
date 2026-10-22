import { createHash } from 'node:crypto';

// Keep the allowlist tight so only conversion-relevant events can be sent server-side.
const ALLOWED_EVENTS = new Set(['Purchase', 'InitiateCheckout']);

function sha256(value?: string) {
  if (!value?.trim()) return undefined;
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function normalizePhone(value?: string) {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('0')) return `88${digits}`;
  return digits;
}

export class FacebookCapiService {
  static async sendEvent(eventName: string, eventData: any, userData: any) {
    const pixelId = process.env.META_PIXEL_ID;
    const metaApiToken = process.env.META_CAPI_TOKEN;
    const testEventCode = process.env.META_TEST_EVENT_CODE?.trim();

    if (!pixelId || !metaApiToken) {
      return { success: false, status: 503, message: 'Meta CAPI is not configured on the server' };
    }
    if (!ALLOWED_EVENTS.has(eventName)) {
      return { success: false, status: 400, message: 'Unsupported Meta event' };
    }

    try {
      const response = await fetch(`https://graph.facebook.com/v23.0/${encodeURIComponent(pixelId)}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [{
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            event_id: eventData.eventId,
            event_source_url: eventData.eventSourceUrl,
            action_source: "website",
            user_data: {
              ph: sha256(normalizePhone(userData?.phone)),
              em: sha256(userData?.email),
              client_ip_address: userData?.clientIpAddress,
              client_user_agent: eventData.userAgent
            },
            custom_data: eventData.customData
          }],
          access_token: metaApiToken,
          ...(testEventCode ? { test_event_code: testEventCode } : {})
        })
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        console.error('FB CAPI rejected event:', result);
        return { success: false, status: response.status || 502, message: result.error?.message || 'Meta rejected the event' };
      }
      return { success: true, result };
    } catch (error) {
      console.error("FB CAPI error:", error);
      return { success: false, status: 502, message: "Meta CAPI dispatch failed" };
    }
  }
}
