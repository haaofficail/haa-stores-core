import type { NotificationProvider, NotificationMessage } from '../index.js';

/**
 * Resend email provider — https://resend.com
 * Env vars: RESEND_API_KEY, EMAIL_FROM
 */
export class ResendEmailProvider implements NotificationProvider {
  readonly channel = 'email';
  readonly name = 'Resend';

  get isAvailable(): boolean {
    return !!process.env.RESEND_API_KEY;
  }

  async send(message: NotificationMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM || 'noreply@haastores.com';

    if (!apiKey) {
      return { success: false, error: 'RESEND_API_KEY not set' };
    }

    const body: Record<string, unknown> = {
      from,
      to: [message.recipient],
      subject: message.subject || 'إشعار من هاء ستورز',
      html: message.body,
    };

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `Resend ${res.status}: ${text}` };
    }

    const data = await res.json() as { id?: string };
    return { success: true, messageId: data.id };
  }
}
