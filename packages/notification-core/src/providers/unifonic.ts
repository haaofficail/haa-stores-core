import type { NotificationProvider, NotificationMessage } from '../index.js';

/**
 * Unifonic SMS provider — https://unifonic.com
 * Env vars: UNIFONIC_APP_SID, UNIFONIC_SENDER_ID
 *
 * Also handles WhatsApp via the same account when UNIFONIC_WHATSAPP_SENDER is set.
 */
export class UnifoncSmsProvider implements NotificationProvider {
  readonly channel = 'sms';
  readonly name = 'Unifonic SMS';

  get isAvailable(): boolean {
    return !!process.env.UNIFONIC_APP_SID;
  }

  async send(message: NotificationMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const appSid = process.env.UNIFONIC_APP_SID;
    const senderId = process.env.UNIFONIC_SENDER_ID || 'HaaStores';

    if (!appSid) return { success: false, error: 'UNIFONIC_APP_SID not set' };

    const params = new URLSearchParams({
      AppSid: appSid,
      SenderID: senderId,
      Body: message.body,
      Recipient: message.recipient,
      responseType: 'JSON',
    });

    const res = await fetch('https://el.cloud.unifonic.com/rest/SMS/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await res.json() as { Success?: boolean; MessageID?: string; message?: string };

    if (!res.ok || !data.Success) {
      return { success: false, error: data.message || `Unifonic ${res.status}` };
    }

    return { success: true, messageId: data.MessageID };
  }
}

/**
 * Unifonic WhatsApp provider.
 * Env vars: UNIFONIC_APP_SID, UNIFONIC_WHATSAPP_SENDER (WhatsApp sender number)
 */
export class UnifoncWhatsAppProvider implements NotificationProvider {
  readonly channel = 'whatsapp';
  readonly name = 'Unifonic WhatsApp';

  get isAvailable(): boolean {
    return !!(process.env.UNIFONIC_APP_SID && process.env.UNIFONIC_WHATSAPP_SENDER);
  }

  async send(message: NotificationMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const appSid = process.env.UNIFONIC_APP_SID;
    const sender = process.env.UNIFONIC_WHATSAPP_SENDER;

    if (!appSid || !sender) {
      return { success: false, error: 'UNIFONIC_APP_SID or UNIFONIC_WHATSAPP_SENDER not set' };
    }

    const res = await fetch('https://api.unifonic.com/rest/WA/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        AppSid: appSid,
        Sender: sender,
        Recipient: message.recipient,
        Body: { type: 'text', text: { body: message.body } },
      }),
    });

    const data = await res.json() as { Success?: boolean; MessageID?: string; message?: string };

    if (!res.ok || !data.Success) {
      return { success: false, error: data.message || `Unifonic WA ${res.status}` };
    }

    return { success: true, messageId: data.MessageID };
  }
}
