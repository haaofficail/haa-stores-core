import { createTransport, type Transporter } from 'nodemailer';
import type { NotificationProvider, NotificationMessage } from '../index.js';

/**
 * SMTP email provider — sends via the merchant's own SMTP server
 * (Hostinger, Google Workspace, Outlook 365, custom, etc.) using
 * the well-known `nodemailer` client. This is the default email
 * path for the platform when no third-party API like Resend is
 * configured; merchants control their inbox, deliverability, and
 * SPF/DKIM directly through their mail host.
 *
 * Env vars (all required for the provider to be "available"):
 *   - SMTP_HOST      — e.g. `smtp.hostinger.com`
 *   - SMTP_PORT      — typically `465` (SSL) or `587` (STARTTLS)
 *   - SMTP_USER      — full mailbox address (e.g. `hello@haastores.com`)
 *   - SMTP_PASSWORD  — mailbox password / app password
 *
 * Optional:
 *   - EMAIL_FROM     — defaults to `SMTP_USER` if unset
 *
 * Transport is constructed lazily on first send so a process that
 * doesn't actually email anything pays no cost. The transport is
 * cached per instance — instantiate once at app boot.
 */
export class SmtpEmailProvider implements NotificationProvider {
  readonly channel = 'email';
  readonly name = 'SMTP';
  private transport?: Transporter;

  get isAvailable(): boolean {
    return Boolean(
      process.env.SMTP_HOST &&
        process.env.SMTP_PORT &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASSWORD,
    );
  }

  private getTransport(): Transporter {
    if (this.transport) return this.transport;
    const port = Number(process.env.SMTP_PORT ?? 465);
    this.transport = createTransport({
      host: process.env.SMTP_HOST,
      port,
      // 465 = implicit TLS (SSL on connect). 587 = STARTTLS upgrade.
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
    return this.transport;
  }

  async send(
    message: NotificationMessage,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isAvailable) {
      return { success: false, error: 'SMTP_* env vars not fully set' };
    }
    const from = process.env.EMAIL_FROM || process.env.SMTP_USER!;
    try {
      const info = await this.getTransport().sendMail({
        from,
        to: message.recipient,
        subject: message.subject || 'إشعار من هاء ستورز',
        // The body is already plain-text Arabic with newlines — no
        // HTML escaping needed. If a future caller wants HTML, send it
        // pre-rendered and we'll add an `html` field then.
        text: message.body,
      });
      return { success: true, messageId: info.messageId };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
