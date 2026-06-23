import { eq } from 'drizzle-orm';
import { createDbClient, type DbOrTx } from '@haa/db';
import * as s from '@haa/db/schema';
import type { WebhookEventType } from '@haa/shared';

export class WebhookOutboxService {
  constructor(private db: DbOrTx = createDbClient()) {}

  async recordEvent(eventType: WebhookEventType, storeId: number, tenantId: number, payload: Record<string, unknown>) {
    // Safety: check if this is a demo store and skip webhook events
    const [store] = await this.db.select({ isDemo: s.stores.isDemo })
      .from(s.stores).where(eq(s.stores.id, storeId)).limit(1);
    if (store?.isDemo) {
      console.log(`[DEMO WEBHOOK] Skipping webhook event ${eventType} for demo store ${storeId}`);
      return null;
    }

    const [event] = await this.db.insert(s.webhookEvents).values({
      eventType,
      storeId,
      tenantId,
      payload,
      status: 'pending',
    }).returning();
    return event;
  }

  async listPending() {
    return this.db.select().from(s.webhookEvents)
      .where(eq(s.webhookEvents.status, 'pending'))
      .orderBy(s.webhookEvents.createdAt);
  }

  async markDelivered(id: number) {
    await this.db.update(s.webhookEvents).set({
      status: 'delivered', deliveredAt: new Date(),
    }).where(eq(s.webhookEvents.id, id));
  }

  async markFailed(id: number, error: string) {
    const [ev] = await this.db.select({ attempts: s.webhookEvents.attempts, maxAttempts: s.webhookEvents.maxAttempts })
      .from(s.webhookEvents).where(eq(s.webhookEvents.id, id)).limit(1);
    if (!ev) return;
    const newAttempts = ev.attempts + 1;
    const newStatus = newAttempts >= (ev.maxAttempts ?? 3) ? 'failed' : 'pending';
    await this.db.update(s.webhookEvents).set({
      attempts: newAttempts, lastError: error, status: newStatus,
    }).where(eq(s.webhookEvents.id, id));
  }
}
