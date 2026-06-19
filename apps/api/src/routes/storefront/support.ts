// Support, tracking, and storefront meta routes (policies, pickup locations, payment methods, gift options).

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, and, desc } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import {
  SupportService,
  LivePresenceService,
  getAvailablePaymentMethods,
} from '@haa/commerce-core';
import { rateLimiter } from '../../middleware/rate-limiter.js';
import { eventPayloadSchema, heartbeatPayloadSchema } from '@haa/shared';
import { toPublicPolicy } from '@haa/shared/dto/storefront-dto';
import { resolveActiveStore } from './_shared.js';

export const supportRouter = new Hono();

const heartbeatRateLimit = rateLimiter({
  windowMs: 10 * 1000,
  maxRequests: 30,
  message: 'تم تجاوز حد تحديثات الحضور الحي. حاول لاحقاً.',
});

// ── Pickup & Payment & Gift ──────────────────────────────

supportRouter.get('/:slug/pickup-locations', async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const db = createDbClient();
  const locations = await db
    .select({
      id: s.pickupLocations.id,
      nameAr: s.pickupLocations.nameAr,
      nameEn: s.pickupLocations.nameEn,
      address: s.pickupLocations.address,
      mapsUrl: s.pickupLocations.mapsUrl,
      phone: s.pickupLocations.phone,
      hours: s.pickupLocations.hours,
      instructions: s.pickupLocations.instructions,
    })
    .from(s.pickupLocations)
    .where(and(
      eq(s.pickupLocations.storeId, store.id),
      eq(s.pickupLocations.isActive, true),
    ));
  return c.json({ success: true, data: locations });
});

supportRouter.get('/:slug/payment-methods', async (c) => {
  const { error } = await resolveActiveStore(c);
  if (error) return error;
  const methods = getAvailablePaymentMethods();
  return c.json({ success: true, data: methods });
});

supportRouter.get('/:slug/gift-options', async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const db = createDbClient();
  const [settings] = await db
    .select()
    .from(s.storeSettings)
    .where(eq(s.storeSettings.storeId, store.id))
    .limit(1);
  return c.json({
    success: true,
    data: {
      giftWrapAvailable: settings?.giftWrapDefaultPrice !== null && settings?.giftWrapDefaultPrice !== undefined,
      giftWrapDefaultPrice: settings?.giftWrapDefaultPrice ?? 0,
      giftMessageMaxLength: settings?.giftMessageMaxLength ?? 250,
    },
  });
});

supportRouter.get('/:slug/policies/:type', async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const type = c.req.param('type');
  const db = createDbClient();
  const [policy] = await db
    .select()
    .from(s.storePolicies)
    .where(and(
      eq(s.storePolicies.storeId, store.id),
      eq(s.storePolicies.type, type),
      eq(s.storePolicies.isPublished, true),
    ))
    .limit(1);
  if (!policy) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Policy not found' } }, 404);
  return c.json({ success: true, data: toPublicPolicy(policy as any) });
});

// ── Support tickets ─────────────────────────────────────

const ticketSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  subject: z.string().min(1),
  message: z.string().min(1),
});

const replySchema = z.object({
  message: z.string().min(1),
  accessToken: z.string().min(1).optional(),
});

supportRouter.post('/:slug/support/tickets', zValidator('json', ticketSchema), async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const body = c.req.valid('json');
  const support = new SupportService();
  const ticket = await support.createTicket({
    storeId: store.id,
    name: body.name,
    email: body.email ?? null,
    phone: body.phone ?? null,
    subject: body.subject,
    message: body.message,
  });
  return c.json({
    success: true,
    data: {
      id: ticket.id,
      accessToken: (ticket as any).accessToken,
      subject: ticket.subject,
      createdAt: ticket.createdAt,
    },
  });
});

supportRouter.get('/:slug/support/tickets/:ticketId', async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const ticketId = Number(c.req.param('ticketId'));
  // Prefer header tokens; fall back to Authorization bearer; legacy query support is kept temporarily.
  const headerToken = c.req.header('x-support-access-token') ?? c.req.header('X-Support-Access-Token');
  const authHeader = c.req.header('authorization') ?? c.req.header('Authorization');
  const bearerToken = authHeader?.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : undefined;
  const accessToken = headerToken ?? bearerToken ?? (c.req.query('accessToken') as string | undefined);
  if (!accessToken) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'رمز الدخول مطلوب.' } }, 400);
  const support = new SupportService();
  const ticket = await support.getTicketByAccessToken(accessToken);
  if (!ticket || ticket.id !== ticketId || ticket.storeId !== store.id) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'التذكرة غير موجودة.' } }, 404);
  }
  const messages = await support.getMessages(ticketId);
  return c.json({ success: true, data: { ...ticket, messages } });
});

supportRouter.post('/:slug/support/tickets/:ticketId/reply', zValidator('json', replySchema), async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const ticketId = Number(c.req.param('ticketId'));
  const body = c.req.valid('json');
  // Prefer header tokens; fall back to Authorization bearer; legacy query/body support is kept temporarily.
  const headerToken = c.req.header('x-support-access-token') ?? c.req.header('X-Support-Access-Token');
  const authHeader = c.req.header('authorization') ?? c.req.header('Authorization');
  const bearerToken = authHeader?.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : undefined;
  const accessToken = headerToken ?? bearerToken ?? (c.req.query('accessToken') as string | undefined) ?? body.accessToken;
  if (!accessToken) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'الرسالة ورمز الدخول مطلوبان.' } }, 400);
  const support = new SupportService();
  const ticket = await support.getTicketByAccessToken(accessToken);
  if (!ticket || ticket.id !== ticketId || ticket.storeId !== store.id) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'التذكرة غير موجودة.' } }, 404);
  }
  const msg = await support.addMessage({
    ticketId, authorType: 'customer', authorId: null, message: body.message, isStaffReply: false,
  });
  await support.updateTicketStatus(ticketId, store.id, 'waiting_on_customer');
  return c.json({ success: true, data: msg });
});

supportRouter.get('/:slug/support/kb', async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const db = createDbClient();
  const articles = await db
    .select()
    .from(s.knowledgeBaseArticles)
    .where(and(
      eq(s.knowledgeBaseArticles.storeId, store.id),
      eq(s.knowledgeBaseArticles.isPublished, true),
    ))
    .orderBy(desc(s.knowledgeBaseArticles.createdAt));
  return c.json({ success: true, data: articles });
});

supportRouter.get('/:slug/support/kb/:articleSlug', async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const articleSlug = c.req.param('articleSlug');
  const db = createDbClient();
  const [article] = await db
    .select()
    .from(s.knowledgeBaseArticles)
    .where(and(
      eq(s.knowledgeBaseArticles.storeId, store.id),
      eq(s.knowledgeBaseArticles.slug, articleSlug),
    ))
    .limit(1);
  if (!article) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Article not found' } }, 404);
  return c.json({ success: true, data: article });
});

// ── Tracking ────────────────────────────────────────────

supportRouter.post('/:slug/events', zValidator('json', eventPayloadSchema), async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const body = c.req.valid('json');
  const db = createDbClient();
  const baseValues = {
    storeId: store.id,
    eventType: body.eventType,
    sessionId: body.sessionId ?? 'unknown',
    productId: body.productId ?? null,
    customerId: body.customerId ?? null,
    cartId: body.cartId ?? null,
    orderId: body.orderId ?? null,
    path: body.path ?? null,
    referrer: body.referrer ?? null,
    deviceType: body.deviceType ?? null,
    utmSource: body.utmSource ?? null,
    utmMedium: body.utmMedium ?? null,
    utmCampaign: body.utmCampaign ?? null,
    utmContent: body.utmContent ?? null,
    utmTerm: body.utmTerm ?? null,
    metadata: body.metadata ?? null,
  };
  try {
    await db.insert(s.marketingEvents).values(baseValues);
  } catch (err: any) {
    if (err?.code === '23503') {
      // FK violation (ISSUE-0006): referenced product/customer/order doesn't exist.
      // Retry with FK fields nulled — the event is still recorded for session analytics.
      try {
        await db.insert(s.marketingEvents).values({
          ...baseValues,
          productId: null,
          customerId: null,
          orderId: null,
        });
      } catch {
        // Tracking never breaks user experience — silent on final failure.
      }
    } else {
      console.error('[events] marketing_events insert failed:', err);
    }
  }
  return c.json({ success: true });
});

supportRouter.post('/:slug/heartbeat', heartbeatRateLimit, zValidator('json', heartbeatPayloadSchema), async (c) => {
  const { store, error } = await resolveActiveStore(c);
  if (error) return error;
  const body = c.req.valid('json');
  const presence = new LivePresenceService();
  await presence.heartbeat(store.id, body);
  return c.json({ success: true });
});
