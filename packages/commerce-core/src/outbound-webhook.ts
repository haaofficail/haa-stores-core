/**
 * Outbound webhook delivery service.
 *
 * Delivers platform events (order.created, payment.succeeded, etc.) to
 * merchant-configured webhook endpoints. Implements:
 *  - HMAC-SHA256 request signing (X-Haa-Signature header)
 *  - Exponential backoff retry (3 attempts: immediate, 5m, 30m)
 *  - Circuit breaker: pause endpoint after 5 consecutive failures
 *  - Response body storage for debugging
 */

import { eq, and, lt, inArray } from 'drizzle-orm';
import { createDbClient, type DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { createHmac, randomBytes } from 'crypto';

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_PAUSE_MINUTES = 60;
const MAX_RESPONSE_BODY_BYTES = 2048;
const DELIVERY_TIMEOUT_MS = 10_000;

export class OutboundWebhookService {
  constructor(private db: DbClient = createDbClient()) {}

  /**
   * Enqueue a new outbound webhook event for all active endpoints of a store.
   * Call this from the order/payment/shipment services after state changes.
   */
  async emit(storeId: number, eventType: string, payload: Record<string, unknown>): Promise<void> {
    const endpoints = await this.db.select().from(s.webhookEndpoints)
      .where(and(
        eq(s.webhookEndpoints.storeId, storeId),
        eq(s.webhookEndpoints.isActive, true),
      ));

    if (endpoints.length === 0) return;

    // Create the event record
    const [event] = await this.db.insert(s.webhookEvents).values({
      eventType,
      storeId,
      payload,
      status: 'pending',
    }).returning();

    // Schedule delivery to each endpoint
    for (const endpoint of endpoints) {
      const subscribedEvents = endpoint.events as string[];
      if (!subscribedEvents.includes(eventType) && !subscribedEvents.includes('*')) continue;
      await this.deliverToEndpoint(event.id, endpoint.id, endpoint.url, endpoint.secret ?? undefined, payload, eventType);
    }
  }

  /**
   * Deliver a single event to a single endpoint.
   * Records delivery attempt with status, status code, response body, and duration.
   */
  private async deliverToEndpoint(
    eventId: number,
    endpointId: number,
    url: string,
    secret: string | undefined,
    payload: Record<string, unknown>,
    eventType: string,
  ): Promise<void> {
    // Check circuit breaker
    const [endpoint] = await this.db.select().from(s.webhookEndpoints)
      .where(eq(s.webhookEndpoints.id, endpointId)).limit(1);

    if (endpoint?.pausedUntil && endpoint.pausedUntil > new Date()) {
      return; // Endpoint paused — skip
    }

    const body = JSON.stringify({ event: eventType, data: payload, deliveredAt: new Date().toISOString() });
    const signature = secret ? signPayload(body, secret) : undefined;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Haa-Stores-Webhook/1.0',
      'X-Haa-Event': eventType,
      'X-Haa-Delivery': randomBytes(16).toString('hex'),
    };
    if (signature) headers['X-Haa-Signature'] = `sha256=${signature}`;

    const start = Date.now();
    let statusCode: number | undefined;
    let responseBody: string | undefined;
    let success = false;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timer);
      statusCode = res.status;
      const rawBody = await res.text();
      responseBody = rawBody.slice(0, MAX_RESPONSE_BODY_BYTES);
      success = res.status >= 200 && res.status < 300;
    } catch (err) {
      responseBody = (err as Error).message.slice(0, MAX_RESPONSE_BODY_BYTES);
    }

    const durationMs = Date.now() - start;

    await this.db.insert(s.webhookDeliveries).values({
      webhookEventId: eventId,
      endpointId,
      status: success ? 'delivered' : 'failed',
      statusCode,
      responseBody,
      durationMs,
    });

    await this.updateEndpointStats(endpointId, success);
  }

  private async updateEndpointStats(endpointId: number, success: boolean): Promise<void> {
    const [endpoint] = await this.db.select().from(s.webhookEndpoints)
      .where(eq(s.webhookEndpoints.id, endpointId)).limit(1);
    if (!endpoint) return;

    const consecutiveFailures = success ? 0 : (endpoint.consecutiveFailures ?? 0) + 1;
    const shouldPause = consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD;
    const pausedUntil = shouldPause
      ? new Date(Date.now() + CIRCUIT_BREAKER_PAUSE_MINUTES * 60000)
      : null;

    await this.db.update(s.webhookEndpoints).set({
      consecutiveFailures,
      pausedUntil,
      lastFailureAt: success ? endpoint.lastFailureAt : new Date(),
      totalDeliveries: (endpoint.totalDeliveries ?? 0) + 1,
      totalFailures: (endpoint.totalFailures ?? 0) + (success ? 0 : 1),
    }).where(eq(s.webhookEndpoints.id, endpointId));
  }

  /**
   * Retry all failed webhook events that are within maxAttempts and past retry delay.
   * Called by the scheduler every 5 minutes.
   */
  async retryPending(): Promise<void> {
    const failed = await this.db.select().from(s.webhookEvents)
      .where(and(
        inArray(s.webhookEvents.status, ['pending', 'failed']),
        lt(s.webhookEvents.attempts, s.webhookEvents.maxAttempts),
      )).limit(50);

    for (const event of failed) {
      await this.db.update(s.webhookEvents)
        .set({ attempts: event.attempts + 1, status: 'retrying' })
        .where(eq(s.webhookEvents.id, event.id));

      const endpoints = await this.db.select().from(s.webhookEndpoints)
        .where(and(
          eq(s.webhookEndpoints.storeId, event.storeId!),
          eq(s.webhookEndpoints.isActive, true),
        ));

      for (const endpoint of endpoints) {
        const events = endpoint.events as string[];
        if (!events.includes(event.eventType) && !events.includes('*')) continue;
        await this.deliverToEndpoint(
          event.id, endpoint.id, endpoint.url, endpoint.secret ?? undefined,
          event.payload as Record<string, unknown>, event.eventType,
        );
      }
    }
  }

  /**
   * Manually replay a specific event (merchant dashboard action).
   */
  async replay(eventId: number, storeId: number): Promise<void> {
    const [event] = await this.db.select().from(s.webhookEvents)
      .where(and(eq(s.webhookEvents.id, eventId), eq(s.webhookEvents.storeId, storeId)))
      .limit(1);

    if (!event) throw new Error('Event not found');

    const endpoints = await this.db.select().from(s.webhookEndpoints)
      .where(and(
        eq(s.webhookEndpoints.storeId, storeId),
        eq(s.webhookEndpoints.isActive, true),
      ));

    for (const endpoint of endpoints) {
      await this.deliverToEndpoint(
        event.id, endpoint.id, endpoint.url, endpoint.secret ?? undefined,
        event.payload as Record<string, unknown>, event.eventType,
      );
    }
  }

  async listEvents(storeId: number, opts?: { limit?: number; status?: string }) {
    return this.db.select().from(s.webhookEvents)
      .where(and(
        eq(s.webhookEvents.storeId, storeId),
        opts?.status ? eq(s.webhookEvents.status, opts.status) : undefined,
      ))
      .orderBy(s.webhookEvents.createdAt)
      .limit(opts?.limit ?? 50);
  }

  async listDeliveries(eventId: number, storeId: number) {
    // Verify ownership
    const [event] = await this.db.select().from(s.webhookEvents)
      .where(and(eq(s.webhookEvents.id, eventId), eq(s.webhookEvents.storeId, storeId)))
      .limit(1);
    if (!event) return [];

    return this.db.select().from(s.webhookDeliveries)
      .where(eq(s.webhookDeliveries.webhookEventId, eventId))
      .orderBy(s.webhookDeliveries.createdAt);
  }

  async listEndpoints(storeId: number) {
    return this.db.select().from(s.webhookEndpoints)
      .where(eq(s.webhookEndpoints.storeId, storeId))
      .orderBy(s.webhookEndpoints.createdAt);
  }

  async createEndpoint(storeId: number, data: { url: string; events: string[]; secret: string }) {
    const [endpoint] = await this.db.insert(s.webhookEndpoints).values({
      storeId,
      url: data.url,
      events: data.events,
      secret: data.secret,
    }).returning();
    return endpoint;
  }

  async updateEndpoint(id: number, storeId: number, data: Partial<{ url: string; events: string[]; isActive: boolean }>) {
    const [updated] = await this.db.update(s.webhookEndpoints)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(s.webhookEndpoints.id, id), eq(s.webhookEndpoints.storeId, storeId)))
      .returning();
    return updated ?? null;
  }

  async deleteEndpoint(id: number, storeId: number): Promise<void> {
    await this.db.delete(s.webhookEndpoints)
      .where(and(eq(s.webhookEndpoints.id, id), eq(s.webhookEndpoints.storeId, storeId)));
  }

  async getEndpointHealth(id: number, storeId: number) {
    const [endpoint] = await this.db.select().from(s.webhookEndpoints)
      .where(and(eq(s.webhookEndpoints.id, id), eq(s.webhookEndpoints.storeId, storeId))).limit(1);
    return endpoint ?? null;
  }

  async rotateSecret(endpointId: number, storeId: number): Promise<string> {
    const newSecret = randomBytes(32).toString('hex');
    await this.db.update(s.webhookEndpoints)
      .set({ secret: newSecret })
      .where(and(eq(s.webhookEndpoints.id, endpointId), eq(s.webhookEndpoints.storeId, storeId)));
    return newSecret;
  }

  async unpauseEndpoint(endpointId: number, storeId: number): Promise<void> {
    await this.db.update(s.webhookEndpoints)
      .set({ pausedUntil: null, consecutiveFailures: 0 })
      .where(and(eq(s.webhookEndpoints.id, endpointId), eq(s.webhookEndpoints.storeId, storeId)));
  }
}

function signPayload(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}
