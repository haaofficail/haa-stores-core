// Tenant / store / KYC / payments / dashboard admin route handlers.
// Extracted from admin.ts lines 65-259.
//
// Each export is a raw Hono handler. The aggregator in ./index.ts applies
// `requireAdminAuth()` and any other middleware when mounting the route.

import { eq, and, desc, sql } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { AuditLogService } from '@haa/integration-core';
import { invalidateStoreTenantCache } from '../../middleware/store-tenant-cache.js';

// ── /dashboard ─────────────────────────────────────────────────────────────
export async function dashboardRoute(c: any) {
  const db = createDbClient();
  const [tenantCount] = await db.select({ count: sql<number>`count(*)` }).from(s.tenants);
  const [storeCount] = await db.select({ count: sql<number>`count(*)` }).from(s.stores);
  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(s.users).where(eq(s.users.isAdmin, false));
  const [orderCount] = await db.select({ count: sql<number>`count(*)` }).from(s.orders);
  const [pendingKyc] = await db.select({ count: sql<number>`count(*)` }).from(s.kycProfiles).where(eq(s.kycProfiles.status, 'submitted'));

  return c.json({ success: true, data: {
    tenants: Number(tenantCount.count),
    stores: Number(storeCount.count),
    users: Number(userCount.count),
    orders: Number(orderCount.count),
    pendingKyc: Number(pendingKyc.count),
  }});
}

// ── /tenants ───────────────────────────────────────────────────────────────
export const tenantsRoutes = {
  list: async (c: any) => {
    const db = createDbClient();
    const tenants = await db.select().from(s.tenants).orderBy(desc(s.tenants.createdAt));
    return c.json({ success: true, data: tenants });
  },

  create: async (c: any) => {
    const body = c.req.valid('json');
    const db = createDbClient();
    const [tenant] = await db.insert(s.tenants).values({
      name: body.name,
      slug: body.slug,
      email: body.email,
      phone: body.phone,
      status: body.status,
    }).returning();
    return c.json({ success: true, data: tenant }, 201);
  },

  update: async (c: any) => {
    const id = Number(c.req.param('id'));
    const body = c.req.valid('json');
    const db = createDbClient();
    const [tenant] = await db.update(s.tenants).set({ ...body, updatedAt: new Date() }).where(eq(s.tenants.id, id)).returning();
    if (!tenant) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } }, 404);
    return c.json({ success: true, data: tenant });
  },

  remove: async (c: any) => {
    const id = Number(c.req.param('id'));
    const db = createDbClient();
    const [tenant] = await db.delete(s.tenants).where(eq(s.tenants.id, id)).returning({ id: s.tenants.id });
    if (!tenant) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } }, 404);
    return c.json({ success: true, data: { deleted: true, id: tenant.id } });
  },

  status: async (c: any) => {
    const id = Number(c.req.param('id'));
    const { status } = c.req.valid('json');
    const db = createDbClient();
    await db.update(s.tenants).set({ status, updatedAt: new Date() }).where(eq(s.tenants.id, id));
    return c.json({ success: true, data: { id, status } });
  },
};

// ── /stores ────────────────────────────────────────────────────────────────
export const storesRoutes = {
  list: async (c: any) => {
    const db = createDbClient();
    const stores = await db.select().from(s.stores).orderBy(desc(s.stores.createdAt));
    return c.json({ success: true, data: stores });
  },

  create: async (c: any) => {
    const body = c.req.valid('json');
    const db = createDbClient();
    const [store] = await db.insert(s.stores).values({
      tenantId: body.tenantId,
      name: body.name,
      slug: body.slug,
      email: body.email,
      phone: body.phone,
      isActive: body.isActive,
    }).returning();
    await db.insert(s.storeSettings).values({ storeId: store.id });
    return c.json({ success: true, data: store }, 201);
  },

  update: async (c: any) => {
    const id = Number(c.req.param('id'));
    const body = c.req.valid('json');
    const db = createDbClient();
    const [store] = await db.update(s.stores).set({ ...body, updatedAt: new Date() }).where(eq(s.stores.id, id)).returning();
    if (!store) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Store not found' } }, 404);
    invalidateStoreTenantCache(id);
    return c.json({ success: true, data: store });
  },

  remove: async (c: any) => {
    const id = Number(c.req.param('id'));
    const db = createDbClient();
    const [store] = await db.delete(s.stores).where(eq(s.stores.id, id)).returning({ id: s.stores.id });
    if (!store) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Store not found' } }, 404);
    invalidateStoreTenantCache(id);
    return c.json({ success: true, data: { deleted: true, id: store.id } });
  },

  status: async (c: any) => {
    const id = Number(c.req.param('id'));
    const { isActive } = c.req.valid('json');
    const db = createDbClient();
    await db.update(s.stores).set({ isActive, updatedAt: new Date() }).where(eq(s.stores.id, id));
    return c.json({ success: true, data: { id, isActive } });
  },
};

// ── /kyc ───────────────────────────────────────────────────────────────────
export const kycRoutes = {
  list: async (c: any) => {
    const db = createDbClient();
    const profiles = await db.select().from(s.kycProfiles).orderBy(desc(s.kycProfiles.createdAt));
    return c.json({
      success: true,
      data: profiles.map(p => {
        const { nationalIdOrIqama, ...safe } = p as any;
        return safe;
      }),
    });
  },

  review: async (c: any) => {
    const id = Number(c.req.param('id'));
    const adminAuth = c.get('adminAuth') as { userId: number } | undefined;
    const { status, rejectionReason } = c.req.valid('json');
    const db = createDbClient();
    const audit = new AuditLogService();
    const ipAddress = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip');
    const [profile] = await db.select().from(s.kycProfiles).where(eq(s.kycProfiles.id, id)).limit(1);
    if (!profile) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'KYC profile not found' } }, 404);
    if (profile.status !== 'submitted' && profile.status !== 'under_review') {
      return c.json({ success: false, error: { code: 'INVALID_STATUS', message: 'Can only review submitted/under_review profiles' } }, 400);
    }
    await db.update(s.kycProfiles).set({
      status,
      reviewedAt: new Date(),
      reviewedBy: adminAuth?.userId,
      rejectionReason: status === 'rejected' ? (rejectionReason || null) : null,
      updatedAt: new Date(),
    }).where(eq(s.kycProfiles.id, id));
    await audit.record({
      actorUserId: adminAuth?.userId,
      action: 'kyc_reviewed',
      entityType: 'kyc_profile',
      entityId: id,
      oldValue: { status: profile.status },
      newValue: { status, rejectionReason },
      ipAddress,
      userAgent: c.req.header('user-agent'),
    });
    return c.json({ success: true, data: { id, status } });
  },
};

// ── /payments ──────────────────────────────────────────────────────────────
export async function paymentsRoute(c: any) {
  const storeId = c.req.query('storeId');
  if (!storeId) {
    return c.json({ success: true, data: [] });
  }
  const db = createDbClient();
  const payments = await db.select().from(s.payments).where(eq(s.payments.storeId, Number(storeId))).orderBy(desc(s.payments.createdAt)).limit(100);
  return c.json({ success: true, data: payments });
}
