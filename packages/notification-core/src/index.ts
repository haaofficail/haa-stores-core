export const NOTIFICATION_CORE_VERSION = '0.3.0';

export { ResendEmailProvider } from './providers/resend.js';
export { SmtpEmailProvider } from './providers/smtp.js';
export { UnifoncSmsProvider, UnifoncWhatsAppProvider } from './providers/unifonic.js';
export { TaqnyatSmsProvider } from './providers/taqnyat.js';
export { renderHaaEmail, escapeHtml, type HaaEmailOptions } from './email-template.js';
export {
  renderOrderCreatedEmail,
  renderOrderStatusChangeEmail,
  renderOrderRefundEmail,
  renderMerchantNewOrderEmail,
  type OrderEmailContext,
  type OrderStatusChangeContext,
  type OrderRefundContext,
} from './order-emails.js';
export {
  renderMerchantWelcomeEmail,
  renderStorePublishedEmail,
  type MerchantWelcomeContext,
  type StorePublishedContext,
} from './welcome-emails.js';

export interface NotificationMessage {
  recipient: string;
  subject?: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationProvider {
  readonly channel: string;
  readonly name: string;
  readonly isAvailable: boolean;
  send(message: NotificationMessage): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export class ConsoleNotificationProvider implements NotificationProvider {
  readonly channel = 'email';
  readonly name = 'Console (Mock)';
  readonly isAvailable = false;

  async send(message: NotificationMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // لا نطبع المستلم/محتوى الرسالة (PII) إلا عند تفعيل debug صراحةً
    if (process.env.NOTIFICATION_DEBUG === '1') {
      console.log(`[NOTIFICATION] [${this.channel}] To: ${message.recipient} | Subject: ${message.subject || '-'}`);
    }
    return {
      success: false,
      error: 'Simulated: No real email/SMS/WhatsApp provider is configured. Notifications are console-only. Set up a provider in production.',
    };
  }
}

import { eq, desc, and } from 'drizzle-orm';
import { createDbClient, type DbOrTx } from '@haa/db';
import * as s from '@haa/db/schema';
import { isDemoStore } from '@haa/shared';
import { ResendEmailProvider } from './providers/resend.js';
import { UnifoncSmsProvider, UnifoncWhatsAppProvider } from './providers/unifonic.js';
import { TaqnyatSmsProvider } from './providers/taqnyat.js';

/**
 * Auto-wire real providers from env vars.
 * Falls back to ConsoleNotificationProvider when no env var is set.
 * Priority: Resend > console (email), Unifonic > Taqnyat (sms), Unifonic (whatsapp).
 */
function buildDefaultProviders(): NotificationProvider[] {
  const providers: NotificationProvider[] = [];

  // Email
  const resend = new ResendEmailProvider();
  providers.push(resend.isAvailable ? resend : new ConsoleNotificationProvider());

  // SMS — prefer Unifonic; fall back to Taqnyat if configured
  const unifoncSms = new UnifoncSmsProvider();
  const taqnyat = new TaqnyatSmsProvider();
  if (unifoncSms.isAvailable) providers.push(unifoncSms);
  else if (taqnyat.isAvailable) providers.push(taqnyat);

  // WhatsApp
  const unifoncWa = new UnifoncWhatsAppProvider();
  if (unifoncWa.isAvailable) providers.push(unifoncWa);

  return providers;
}

export class NotificationService {
  private providers: NotificationProvider[];
  private isDemoProvider: boolean;

  constructor(private db: DbOrTx = createDbClient(), private store?: { id: number; isDemo?: boolean | null }) {
    this.providers = buildDefaultProviders();
    this.isDemoProvider = isDemoStore(store) ?? false;
  }

  addProvider(provider: NotificationProvider) {
    this.providers.push(provider);
  }

  async send(storeId: number, templateCode: string, data: Record<string, string>, channel?: string) {
    // Demo stores: log only, no real notification delivery
    if (this.isDemoProvider) {
      console.log(`[DEMO NOTIFICATION] [${templateCode}] Demo store — notification suppressed (logged only)`);
      return [];
    }

    const [template] = await this.db.select().from(s.notificationTemplates)
      .where(eq(s.notificationTemplates.code, templateCode)).limit(1);
    if (!template || !template.isActive) return;

    const [prefs] = await this.db.select().from(s.notificationPreferences)
      .where(eq(s.notificationPreferences.storeId, storeId)).limit(1);

    const channels = channel ? [channel] : ['email', 'sms', 'whatsapp'];
    const results = [];

    for (const ch of channels) {
      if (!this.shouldSend(prefs, templateCode, ch)) continue;

      const subject = this.fillTemplate(template.subjectTemplate || '', data);
      const body = this.fillTemplate(template.bodyTemplate || '', data);
      const recipient = this.getRecipient(prefs, ch);

      if (!recipient) continue;

      for (const provider of this.providers) {
        if (provider.channel !== ch) continue;
        const result = await provider.send({ recipient, subject, body, metadata: { templateCode, storeId } });

        await this.db.insert(s.notificationLogs).values({
          storeId,
          channel: ch,
          recipient,
          subject,
          body,
          status: result.success ? 'sent' : 'failed',
          templateCode,
          errorMessage: result.error || null,
        });

        results.push(result);
      }
    }

    return results;
  }

  async getPreferences(storeId: number) {
    const [prefs] = await this.db.select().from(s.notificationPreferences)
      .where(eq(s.notificationPreferences.storeId, storeId)).limit(1);
    return prefs || null;
  }

  async updatePreferences(storeId: number, data: Partial<typeof s.notificationPreferences.$inferInsert>) {
    const existing = await this.getPreferences(storeId);
    if (existing) {
      const [updated] = await this.db.update(s.notificationPreferences)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(s.notificationPreferences.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await this.db.insert(s.notificationPreferences)
      .values({ storeId, ...data }).returning();
    return created;
  }

  async getLogs(storeId: number, opts?: { limit?: number; channel?: string }) {
    const conditions = [eq(s.notificationLogs.storeId, storeId)];
    if (opts?.channel) conditions.push(eq(s.notificationLogs.channel, opts.channel));
    return this.db.select().from(s.notificationLogs)
      .where(and(...conditions))
      .orderBy(desc(s.notificationLogs.sentAt))
      .limit(opts?.limit ?? 50);
  }

  async getTemplates() {
    return this.db.select().from(s.notificationTemplates)
      .where(eq(s.notificationTemplates.isActive, true));
  }

  private fillTemplate(template: string, data: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || `{{${key}}}`);
  }

  private shouldSend(prefs: typeof s.notificationPreferences.$inferSelect | undefined | null, templateCode: string, channel: string): boolean {
    if (!prefs) return channel === 'email';
    if (channel === 'email' && !prefs.emailEnabled) return false;
    if (channel === 'sms' && !prefs.smsEnabled) return false;
    if (channel === 'whatsapp' && !prefs.whatsappEnabled) return false;
    const eventMap: Record<string, string> = {
      'order_created': 'orderCreated',
      'payment_success': 'paymentSuccess',
      'payment_failed': 'paymentFailed',
      'shipping_update': 'shippingUpdate',
      'low_stock': 'lowStock',
      'abandoned_cart': 'abandonedCart',
      'order_ready_for_pickup': 'orderReadyForPickup',
      'order_picked_up': 'orderPickedUp',
    };
    const prefKey = eventMap[templateCode];
    if (prefKey && (prefs as unknown as Record<string, unknown>)[prefKey] === false) return false;
    return true;
  }

  private getRecipient(prefs: typeof s.notificationPreferences.$inferSelect | undefined | null, channel: string): string {
    if (!prefs) return '';
    if (channel === 'email') return prefs.emailAddress || '';
    if (channel === 'sms') return prefs.smsPhone || '';
    if (channel === 'whatsapp') return prefs.whatsappPhone || '';
    return '';
  }
}
