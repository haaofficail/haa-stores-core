// Operational admin route handlers: audit, webhooks, plans, upload, settings, users.
// Extracted from admin.ts lines 558-690.
//
// Each export is a raw Hono handler. The aggregator in ./index.ts applies
// `requireAdminAuth()` when mounting the route.

import { eq, and, desc } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { SubscriptionService } from '@haa/commerce-core';
import { createMediaAdapter } from '@haa/shared/media';
import { getWebhookDedupStats } from '@haa/integration-core';
import { getIdempotencyKeyStats } from '../../middleware/idempotency-key.js';

// ── /audit ────────────────────────────────────────────────────────────────
export async function auditRoute(c: any) {
  const tenantId = c.req.query('tenantId');
  const storeId = c.req.query('storeId');
  if (!tenantId && !storeId) {
    return c.json({ success: true, data: [] });
  }
  const db = createDbClient();
  const conditions = [];
  if (tenantId) conditions.push(eq(s.auditLogs.tenantId, Number(tenantId)));
  if (storeId) conditions.push(eq(s.auditLogs.storeId, Number(storeId)));
  const logs = await db.select().from(s.auditLogs).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(s.auditLogs.createdAt)).limit(200);
  return c.json({ success: true, data: logs });
}

// ── /webhooks/dedup-stats ─────────────────────────────────────────────────
// Per-process counters for the webhook-dedup helper. Useful when an operator
// wants to verify a noisy provider's redelivery rate or confirm the helper
// fired at all without scrolling paymentWebhookEvents.
export async function webhookDedupStatsRoute(c: any) {
  return c.json({ success: true, data: getWebhookDedupStats() });
}

// ── /idempotency-key/stats ────────────────────────────────────────────────
// Per-process counters for the Idempotency-Key middleware. Used by ops to
// verify that retries are actually being deduplicated against the cache.
export async function idempotencyKeyStatsRoute(c: any) {
  return c.json({ success: true, data: getIdempotencyKeyStats() });
}

// ── /webhooks ─────────────────────────────────────────────────────────────
export async function webhooksRoute(c: any) {
  const tenantId = c.req.query('tenantId');
  const storeId = c.req.query('storeId');
  if (!tenantId && !storeId) {
    return c.json({ success: true, data: [] });
  }
  const db = createDbClient();
  const conditions = [];
  if (tenantId) conditions.push(eq(s.webhookEvents.tenantId, Number(tenantId)));
  if (storeId) conditions.push(eq(s.webhookEvents.storeId, Number(storeId)));
  const events = await db.select().from(s.webhookEvents).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(s.webhookEvents.createdAt)).limit(100);
  return c.json({ success: true, data: events });
}

// ── /plans ────────────────────────────────────────────────────────────────
export const plansRoutes = {
  list: async (c: any) => {
    const plans = await new SubscriptionService().getAllPlans();
    return c.json({ success: true, data: plans });
  },

  update: async (c: any) => {
    const id = Number(c.req.param('id'));
    const body = c.req.valid('json');
    const plan = await new SubscriptionService().updatePlan(id, body);
    if (!plan) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Plan not found' } }, 404);
    }
    return c.json({ success: true, data: plan });
  },
};

// ── /upload ───────────────────────────────────────────────────────────────
export async function uploadRoute(c: any) {
  const body = await c.req.parseBody();
  const file = body['file'] as File | undefined;
  if (!file) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'File is required' } }, 400);
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimetype = file.type || 'image/png';
  try {
    const adapter = createMediaAdapter();
    const validationError = adapter.validateFile(buffer, mimetype, { allowPdf: true });
    if (validationError) {
      return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: validationError } }, 400);
    }
    const result = await adapter.upload(buffer, mimetype, 0, 0);
    return c.json({ success: true, data: { url: result.url, key: result.key, thumbUrl: result.thumbUrl, sizeBytes: result.sizeBytes } }, 201);
  } catch (err) {
    return c.json({ success: false, error: { code: 'UPLOAD_FAILED', message: err instanceof Error ? err.message : 'Upload failed' } }, 500);
  }
}

// ── /settings ─────────────────────────────────────────────────────────────
export const settingsRoutes = {
  get: async (c: any) => {
    const db = createDbClient();
    const [tenant] = await db.select().from(s.tenants).limit(1);
    if (!tenant) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'No platform found' } }, 404);
    return c.json({
      success: true,
      data: {
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: tenant.logoUrl ?? null,
        faviconUrl: tenant.faviconUrl ?? null,
        email: tenant.email,
        phone: tenant.phone,
      },
    });
  },

  update: async (c: any) => {
    const body = c.req.valid('json');
    const db = createDbClient();
    const [tenant] = await db.select().from(s.tenants).limit(1);
    if (!tenant) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'No platform found' } }, 404);

    const [updated] = await db.update(s.tenants).set({
      name: body.name,
      logoUrl: body.logoUrl ?? null,
      faviconUrl: body.faviconUrl ?? null,
      updatedAt: new Date(),
    }).where(eq(s.tenants.id, tenant.id)).returning();

    return c.json({
      success: true,
      data: {
        name: updated.name,
        slug: updated.slug,
        logoUrl: updated.logoUrl ?? null,
        faviconUrl: updated.faviconUrl ?? null,
      },
    });
  },
};

// ── /users ────────────────────────────────────────────────────────────────
export async function usersRoute(c: any) {
  const db = createDbClient();
  const users = await db.select().from(s.users).orderBy(desc(s.users.createdAt)).limit(100);
  return c.json({
    success: true,
    data: users.map(u => {
      const { passwordHash: _passwordHash, ...safe } = u;
      return safe;
    }),
  });
}
