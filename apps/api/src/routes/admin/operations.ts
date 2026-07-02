// Operational admin route handlers: audit, webhooks, plans, upload, settings, users.
// Extracted from admin.ts lines 558-690.
//
// Each export is a raw Hono handler. The aggregator in ./index.ts applies
// `requireAdminAuth()` when mounting the route.

import type { Context } from 'hono';
import { eq, and, desc, sql, type SQL } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { SubscriptionService } from '@haa/commerce-core';
import { createMediaAdapter } from '@haa/shared/media';
import { getWebhookDedupStats } from '@haa/integration-core';
import { getIdempotencyKeyStats } from '../../middleware/idempotency-key.js';
import { sha256Hex, signAdminUploadIntegrity } from '../../services/admin-upload-integrity.js';

type AdminRouteContext = Context;
type JsonRouteContext<T> = Context<{ Variables: Record<string, unknown> }, string, { out: { json: T } }>;
type PlanUpdateInput = {
  name?: string;
  code?: string;
  description?: string | null;
  priceMonthly?: string;
  priceAnnual?: string;
  productLimit?: number;
  staffLimit?: number;
  storageLimitMb?: number;
  orderLimit?: number;
  trialDays?: number;
  isActive?: boolean;
  sortOrder?: number;
};
type PlatformSettingsInput = {
  name: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
};

const platformSettingsTenantSelect = {
  id: s.tenants.id,
  name: s.tenants.name,
  slug: s.tenants.slug,
  logoUrl: s.tenants.logoUrl,
  faviconUrl: s.tenants.faviconUrl,
  email: s.tenants.email,
  phone: s.tenants.phone,
};

const adminUserListSelect = {
  id: s.users.id,
  name: s.users.name,
  email: s.users.email,
  phone: s.users.phone,
  isAdmin: s.users.isAdmin,
  isActive: s.users.isActive,
  createdAt: s.users.createdAt,
};

// ── /audit ────────────────────────────────────────────────────────────────
// P1-9 audit fix (two bugs, same route):
//   1. Hard-capped at 200 rows with no page/limit params and no total
//      count — silently only showed the most recent 200 events with no
//      indicator older ones existed.
//   2. The admin-dashboard's /audit page (AuditLogs.tsx) has NO
//      tenantId/storeId filter UI and always called this endpoint
//      unscoped — but this route returned an empty array whenever BOTH
//      were absent. The page has therefore always rendered zero rows,
//      regardless of how much audit history existed. Fixed by allowing
//      an unscoped (platform-wide) paginated query — requireAdminAuth +
//      requireAdminPermission('audit.read') already gate who can reach
//      this route at all, so an unscoped view is consistent with what an
//      admin holding that permission is meant to see.
// Mirrors the page/limit/offset/total/totalPages contract already
// established for /marketplace/products (see marketplace.ts).
export async function auditRoute(c: AdminRouteContext) {
  const tenantId = c.req.query('tenantId');
  const storeId = c.req.query('storeId');
  const page = Math.max(1, Number(c.req.query('page')) || 1);
  const limit = Math.min(200, Math.max(1, Number(c.req.query('limit')) || 50));
  const offset = (page - 1) * limit;
  const db = createDbClient();
  const conditions: SQL[] = [];
  if (tenantId) conditions.push(eq(s.auditLogs.tenantId, Number(tenantId)));
  if (storeId) conditions.push(eq(s.auditLogs.storeId, Number(storeId)));
  const where = conditions.length ? and(...conditions) : undefined;
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(s.auditLogs).where(where);
  const logs = await db.select().from(s.auditLogs).where(where).orderBy(desc(s.auditLogs.createdAt)).limit(limit).offset(offset);
  return c.json({
    success: true,
    data: logs,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
}

// ── /webhooks/dedup-stats ─────────────────────────────────────────────────
// Per-process counters for the webhook-dedup helper. Useful when an operator
// wants to verify a noisy provider's redelivery rate or confirm the helper
// fired at all without scrolling paymentWebhookEvents.
export async function webhookDedupStatsRoute(c: AdminRouteContext) {
  return c.json({ success: true, data: getWebhookDedupStats() });
}

// ── /idempotency-key/stats ────────────────────────────────────────────────
// Per-process counters for the Idempotency-Key middleware. Used by ops to
// verify that retries are actually being deduplicated against the cache.
export async function idempotencyKeyStatsRoute(c: AdminRouteContext) {
  return c.json({ success: true, data: getIdempotencyKeyStats() });
}

// ── /webhooks ─────────────────────────────────────────────────────────────
export async function webhooksRoute(c: AdminRouteContext) {
  const tenantId = c.req.query('tenantId');
  const storeId = c.req.query('storeId');
  if (!tenantId && !storeId) {
    return c.json({ success: true, data: [] });
  }
  const db = createDbClient();
  const conditions: SQL[] = [];
  if (tenantId) conditions.push(eq(s.webhookEvents.tenantId, Number(tenantId)));
  if (storeId) conditions.push(eq(s.webhookEvents.storeId, Number(storeId)));
  const events = await db.select().from(s.webhookEvents).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(s.webhookEvents.createdAt)).limit(100);
  return c.json({ success: true, data: events });
}

// ── /plans ────────────────────────────────────────────────────────────────
export const plansRoutes = {
  list: async (c: AdminRouteContext) => {
    const plans = await new SubscriptionService().getAllPlans();
    return c.json({ success: true, data: plans });
  },

  update: async (c: JsonRouteContext<PlanUpdateInput>) => {
    const id = Number(c.req.param('id'));
    const body = c.req.valid('json') as PlanUpdateInput;
    const plan = await new SubscriptionService().updatePlan(id, body);
    if (!plan) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Plan not found' } }, 404);
    }
    return c.json({ success: true, data: plan });
  },
};

// ── /upload ───────────────────────────────────────────────────────────────
export async function uploadRoute(c: AdminRouteContext) {
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
    const sha256 = result.sha256 ?? sha256Hex(buffer);
    const uploadIntegritySignature = signAdminUploadIntegrity({
      key: result.key,
      sha256,
      fileMimeType: mimetype,
    });
    return c.json({
      success: true,
      data: {
        url: result.url,
        key: result.key,
        thumbUrl: result.thumbUrl,
        sizeBytes: result.sizeBytes,
        sha256,
        uploadIntegritySignature,
      },
    }, 201);
  } catch (err) {
    return c.json({ success: false, error: { code: 'UPLOAD_FAILED', message: err instanceof Error ? err.message : 'Upload failed' } }, 500);
  }
}

// ── /settings ─────────────────────────────────────────────────────────────
export const settingsRoutes = {
  get: async (c: AdminRouteContext) => {
    const db = createDbClient();
    const [tenant] = await db.select(platformSettingsTenantSelect).from(s.tenants).limit(1);
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

  update: async (c: JsonRouteContext<PlatformSettingsInput>) => {
    const body = c.req.valid('json') as PlatformSettingsInput;
    const db = createDbClient();
    const [tenant] = await db.select(platformSettingsTenantSelect).from(s.tenants).limit(1);
    if (!tenant) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'No platform found' } }, 404);

    const [updated] = await db.update(s.tenants).set({
      name: body.name,
      logoUrl: body.logoUrl ?? null,
      faviconUrl: body.faviconUrl ?? null,
      updatedAt: new Date(),
    }).where(eq(s.tenants.id, tenant.id)).returning(platformSettingsTenantSelect);

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
export async function usersRoute(c: AdminRouteContext) {
  const db = createDbClient();
  const page = Math.max(1, Number(c.req.query('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit')) || 20));
  const offset = (page - 1) * limit;
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(s.users);
  const users = await db.select(adminUserListSelect).from(s.users).orderBy(desc(s.users.createdAt)).limit(limit).offset(offset);
  return c.json({
    success: true,
    data: users,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
}
