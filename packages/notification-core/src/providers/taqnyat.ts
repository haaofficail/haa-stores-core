import type { NotificationProvider, NotificationMessage } from '../index.js';

/**
 * Taqnyat SMS provider — https://taqnyat.sa (popular in Saudi Arabia)
 * Env vars: TAQNYAT_BEARER_TOKEN, TAQNYAT_SENDER_ID
 */
export class TaqnyatSmsProvider implements NotificationProvider {
  readonly channel = 'sms';
  readonly name = 'Taqnyat SMS';

  get isAvailable(): boolean {
    return !!process.env.TAQNYAT_BEARER_TOKEN;
  }

  async send(message: NotificationMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const token = process.env.TAQNYAT_BEARER_TOKEN;
    const sender = process.env.TAQNYAT_SENDER_ID || 'HaaStores';

    if (!token) return { success: false, error: 'TAQNYAT_BEARER_TOKEN not set' };

    const res = await fetch('https://api.taqnyat.sa/v1/messages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender,
        recipients: [message.recipient],
        body: message.body,
      }),
    });

    const data = await res.json() as { statusCode?: number; messageId?: string; statusDesc?: string };

    if (!res.ok || (data.statusCode !== undefined && data.statusCode !== 0)) {
      return { success: false, error: data.statusDesc || `Taqnyat ${res.status}` };
    }

    return { success: true, messageId: data.messageId };
  }
}
