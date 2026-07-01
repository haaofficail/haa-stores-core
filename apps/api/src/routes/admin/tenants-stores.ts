/* eslint-disable @typescript-eslint/no-explicit-any -- admin API routes use legacy `any` for Hono context; proper typing tracked as P2-030. */
// Tenant / store / KYC / payments / dashboard admin route handlers.
// Extracted from admin.ts lines 65-259.
//
// Each export is a raw Hono handler. The aggregator in ./index.ts applies
// `requireAdminAuth()` and any other middleware when mounting the route.

import { eq, desc, sql, and, or, ilike } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { AuditLogService } from '@haa/integration-core';
import { NotificationService } from '@haa/notification-core';
import { invalidateStoreTenantCache } from '../../middleware/store-tenant-cache.js';
import { csvResponse, toCsv } from './csv-response.js';
import { recordFinancialExportAudit } from './financial-export-audit.js';

const adminTenantSelect = {
  id: s.tenants.id,
  name: s.tenants.name,
  slug: s.tenants.slug,
  email: s.tenants.email,
  phone: s.tenants.phone,
  status: s.tenants.status,
  createdAt: s.tenants.createdAt,
  updatedAt: s.tenants.updatedAt,
};

const adminStoreListSelect = {
  id: s.stores.id,
  tenantId: s.stores.tenantId,
  tenantName: s.tenants.name,
  name: s.stores.name,
  slug: s.stores.slug,
  email: s.stores.email,
  phone: s.stores.phone,
  isActive: s.stores.isActive,
  createdAt: s.stores.createdAt,
  updatedAt: s.stores.updatedAt,
};

const adminStoreMutationSelect = {
  id: s.stores.id,
  tenantId: s.stores.tenantId,
  name: s.stores.name,
  slug: s.stores.slug,
  email: s.stores.email,
  phone: s.stores.phone,
  isActive: s.stores.isActive,
  createdAt: s.stores.createdAt,
  updatedAt: s.stores.updatedAt,
};

const adminPaymentSelect = {
  id: s.payments.id,
  storeId: s.payments.storeId,
  orderId: s.payments.orderId,
  method: s.payments.provider,
  amount: s.payments.amount,
  currency: s.payments.currency,
  status: s.payments.status,
  createdAt: s.payments.createdAt,
  updatedAt: s.payments.updatedAt,
};

const PAYMENT_EXPORT_COLUMNS = [
  'id',
  'storeId',
  'orderId',
  'method',
  'amount',
  'currency',
  'status',
  'createdAt',
];

function paymentMatchesQuery(payment: Record<string, unknown>, query: string) {
  if (!query) return true;
  const haystack = [
    payment.id,
    payment.storeId,
    payment.orderId,
    payment.method,
    payment.amount,
    payment.currency,
    payment.status,
  ].map((value) => String(value ?? '').toLowerCase());
  return haystack.some((value) => value.includes(query));
}

function adminPaymentWhere(storeId?: number, query?: string) {
  const conditions = [];
  if (storeId) conditions.push(eq(s.payments.storeId, storeId));
  if (query) {
    conditions.push(or(
      ilike(s.payments.provider, `%${query}%`),
      ilike(s.payments.status, `%${query}%`),
      ilike(s.payments.currency, `%${query}%`),
      sql`${s.payments.id}::text ILIKE ${`%${query}%`}`,
      sql`${s.payments.orderId}::text ILIKE ${`%${query}%`}`,
    ));
  }
  return conditions.length ? and(...conditions) : undefined;
}

async function getAdminPaymentRows(storeId?: number, limit = 200, offset = 0, query?: string) {
  const db = createDbClient();
  return db.select(adminPaymentSelect).from(s.payments)
    .where(adminPaymentWhere(storeId, query))
    .orderBy(desc(s.payments.createdAt)).limit(limit).offset(offset);
}

async function getAdminPaymentCount(storeId?: number, query?: string): Promise<number> {
  const db = createDbClient();
  const [row] = await db.select({ total: sql<number>`count(*)::int` }).from(s.payments)
    .where(adminPaymentWhere(storeId, query));
  return row.total;
}

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
    const tenants = await db.select(adminTenantSelect).from(s.tenants).orderBy(desc(s.tenants.createdAt));
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
    }).returning(adminTenantSelect);
    return c.json({ success: true, data: tenant }, 201);
  },

  update: async (c: any) => {
    const id = Number(c.req.param('id'));
    const body = c.req.valid('json');
    const db = createDbClient();
    // TASK-0038 G1-G10 compliance fields. Fields that are not in the
    // standard tenant shape (name/slug/email/phone/status) are compliance
    // fields — log them to audit trail since they have regulatory
    // implications (CR, VAT, ASV, pen-test, etc.).
    const COMPLIANCE_FIELDS = new Set([
      'commercialRegistrationNumber', 'commercialRegistrationIssuedAt',
      'vatNumber', 'vatRegisteredAt',
      'ecommerceLicenseNumber', 'ecommerceLicenseIssuedAt', 'ecommerceLicenseExpiresAt',
      'dpoEmail', 'dpoPhone', 'dpoAppointedAt',
      'trademarkNumber', 'trademarkRegisteredAt', 'trademarkExpiresAt',
      'asvLastScanAt', 'asvVendor', 'asvCertificateUrl',
      'pentestLastScanAt', 'pentestVendor', 'pentestReportUrl', 'pentestPass',
      'hostingRegion', 'hostingProvider', 'hostingKsaResidency',
      'tabbyDpaSignedAt', 'tabbyDpaUrl',
      'drPlanDocumentedAt', 'drLastTabletopAt', 'drNextTabletopAt',
    ]);
    const complianceChanges: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(body)) {
      if (COMPLIANCE_FIELDS.has(key)) {
        // Read current value to capture 'from'. Single query — fine for low-volume admin path.
        const [current] = await db.select().from(s.tenants).where(eq(s.tenants.id, id));
        if (current) {
          complianceChanges[key] = { from: (current as any)[key], to: (body as any)[key] };
        }
      }
    }
    const [tenant] = await db.update(s.tenants).set({ ...body, updatedAt: new Date() }).where(eq(s.tenants.id, id)).returning(adminTenantSelect);
    if (!tenant) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } }, 404);
    // Audit log compliance changes (best-effort; do not fail the request if log write fails)
    if (Object.keys(complianceChanges).length > 0) {
      try {
        const { logAdminAction } = await import('../../services/audit-log.js');
        await logAdminAction({
          // P1-8 audit fix: the admin middleware sets 'adminAuth' (with a
          // `userId` field), not 'admin'/'id' — this line always read
          // undefined, so every compliance-field change was logged with
          // no actor identity.
          adminId: c.get('adminAuth')?.userId,
          action: 'tenant.compliance.update',
          tenantId: id,
          changes: complianceChanges,
          ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
        });
      } catch (err) {
        console.error('[audit] compliance update log failed:', err);
      }
    }
    return c.json({ success: true, data: tenant });
  },

  remove: async (c: any) => {
    // DECISION-OS-014 (beta deletion policy):
    // No direct tenant deletion as a feature in beta. No hard delete.
    // Account closure must route through compliance/support (suspend/deactivate/archive).
    // To re-enable in a future controlled release, an explicit owner ruling is required.
    const _id = Number(c.req.param('id'));
    return c.json({
      success: false,
      error: {
        code: 'FORBIDDEN_BETA_POLICY',
        message: 'Direct tenant deletion is disabled in beta (DECISION-OS-014). Use suspend (PATCH /admin/tenants/:id/status) or open a compliance/support ticket.',
      },
    }, 403);
  },

  status: async (c: any) => {
    const id = Number(c.req.param('id'));
    const { status, statusReason } = c.req.valid('json');
    const db = createDbClient();
    const [existing] = await db
      .select({ id: s.tenants.id, status: s.tenants.status, name: s.tenants.name })
      .from(s.tenants)
      .where(eq(s.tenants.id, id))
      .limit(1);
    if (!existing) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } }, 404);
    }
    // No-op when the desired status matches the current one. Don't emit
    // an audit entry for a non-change — keeps the log signal clean.
    if (existing.status === status) {
      return c.json({ success: true, data: { id, status } });
    }
    await db.update(s.tenants).set({ status, updatedAt: new Date() }).where(eq(s.tenants.id, id));
    const adminAuth = c.get('adminAuth') as { userId: number } | undefined;
    await new AuditLogService().record({
      actorUserId: adminAuth?.userId ?? null,
      tenantId: id,
      action: 'tenant_status_changed',
      entityType: 'tenant',
      entityId: id,
      oldValue: { status: existing.status },
      newValue: { status, statusReason },
      ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });
    return c.json({ success: true, data: { id, status } });
  },
};

// ── /stores ────────────────────────────────────────────────────────────────
export const storesRoutes = {
  list: async (c: any) => {
    const db = createDbClient();
    const stores = await db
      .select(adminStoreListSelect)
      .from(s.stores)
      .leftJoin(s.tenants, eq(s.stores.tenantId, s.tenants.id))
      .orderBy(desc(s.stores.createdAt));
    return c.json({ success: true, data: stores });
  },

  create: async (c: any) => {
    const body = c.req.valid('json');
    const db = createDbClient();
    const slug = body.slug ?? body.domain;
    const [store] = await db.insert(s.stores).values({
      tenantId: body.tenantId,
      name: body.name,
      slug,
      email: body.email,
      phone: body.phone,
      isActive: body.isActive,
    }).returning(adminStoreMutationSelect);
    await db.insert(s.storeSettings).values({ storeId: store.id });
    return c.json({ success: true, data: store }, 201);
  },

  update: async (c: any) => {
    const id = Number(c.req.param('id'));
    const body = c.req.valid('json');
    const db = createDbClient();
    const updateBody = { ...body };
    delete updateBody.domain;
    const storePatch: Record<string, unknown> = { ...updateBody, updatedAt: new Date() };
    if (body.slug || body.domain) storePatch.slug = body.slug ?? body.domain;
    const [store] = await db.update(s.stores).set(storePatch).where(eq(s.stores.id, id)).returning(adminStoreMutationSelect);
    if (!store) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Store not found' } }, 404);
    invalidateStoreTenantCache(id);
    return c.json({ success: true, data: store });
  },

  remove: async (c: any) => {
    // DECISION-OS-014 beta hardening:
    // No direct store deletion as an admin feature in beta. No hard delete.
    // Store closure must route through status deactivation plus
    // compliance/support review until a soft-delete/archive workflow exists.
    const _id = Number(c.req.param('id'));
    return c.json({
      success: false,
      error: {
        code: 'FORBIDDEN_BETA_POLICY',
        message: 'Direct store deletion is disabled in beta (DECISION-OS-014). Use deactivate (PATCH /admin/stores/:id/status) or open a compliance/support ticket.',
      },
    }, 403);
  },

  status: async (c: any) => {
    const id = Number(c.req.param('id'));
    const { isActive, statusReason } = c.req.valid('json');
    const db = createDbClient();
    const [existing] = await db
      .select({ id: s.stores.id, tenantId: s.stores.tenantId, isActive: s.stores.isActive, name: s.stores.name })
      .from(s.stores)
      .where(eq(s.stores.id, id))
      .limit(1);
    if (!existing) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Store not found' } }, 404);
    }
    if (existing.isActive === isActive) {
      return c.json({ success: true, data: { id, isActive } });
    }
    await db.update(s.stores).set({ isActive, updatedAt: new Date() }).where(eq(s.stores.id, id));
    invalidateStoreTenantCache(id);
    const adminAuth = c.get('adminAuth') as { userId: number } | undefined;
    await new AuditLogService().record({
      actorUserId: adminAuth?.userId ?? null,
      tenantId: existing.tenantId,
      storeId: id,
      action: 'admin_store_suspended',
      entityType: 'store',
      entityId: id,
      oldValue: { isActive: existing.isActive },
      newValue: { isActive, statusReason },
      ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });
    return c.json({ success: true, data: { id, isActive } });
  },
};

// ── /kyc ───────────────────────────────────────────────────────────────────
export const kycRoutes = {
  list: async (c: any) => {
    const db = createDbClient();
    const profiles = await db.select().from(s.kycProfiles).orderBy(desc(s.kycProfiles.createdAt));
    const allDocs = await db.select({
      id: s.kycDocuments.id,
      storeId: s.kycDocuments.storeId,
      type: s.kycDocuments.type,
      filename: s.kycDocuments.filename,
      fileUrl: s.kycDocuments.fileUrl,
      mimeType: s.kycDocuments.mimeType,
      status: s.kycDocuments.status,
      uploadedAt: s.kycDocuments.uploadedAt,
    }).from(s.kycDocuments);
    const docsByStore: Record<number, typeof allDocs> = {};
    for (const doc of allDocs) {
      if (!docsByStore[doc.storeId]) docsByStore[doc.storeId] = [];
      docsByStore[doc.storeId].push(doc);
    }
    return c.json({
      success: true,
      data: profiles.map(p => {
        const { nationalIdOrIqama: _nationalIdOrIqama, ...safe } = p as any;
        return { ...safe, documents: docsByStore[p.storeId] ?? [] };
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
      rejectionReason: status === 'approved' ? null : (rejectionReason || null),
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
    // Notify merchant of KYC decision (best-effort — do not fail request on notification error)
    if (status === 'approved' || status === 'rejected' || status === 'needs_more_info') {
      try {
        const templateCode = status === 'approved' ? 'kyc_approved'
          : status === 'rejected' ? 'kyc_rejected'
          : 'kyc_needs_more_info';
        const notif = new NotificationService(db);
        await notif.send(profile.storeId, templateCode, {
          legalName: profile.legalName ?? '',
          rejectionReason: rejectionReason ?? '',
        });
      } catch (err) {
        console.error('[kyc-review] notification send failed:', err);
      }
    }
    return c.json({ success: true, data: { id, status } });
  },
};

// ── /kyc/bank-accounts ─────────────────────────────────────────────────────
export const kycBankRoutes = {
  list: async (c: any) => {
    const db = createDbClient();
    // Batch 4D: NEVER return the full IBAN from this list. Server-side masking
    // (last 4 only) — the full IBAN is available solely via the audited
    // /settlements/:payoutId/reveal-iban route.
    const accounts = await db.select({
      id: s.merchantBankAccounts.id,
      storeId: s.merchantBankAccounts.storeId,
      accountHolderName: s.merchantBankAccounts.accountHolderName,
      bankName: s.merchantBankAccounts.bankName,
      ibanLast4: s.merchantBankAccounts.ibanLast4,
      status: s.merchantBankAccounts.status,
      isDefault: s.merchantBankAccounts.isDefault,
      createdAt: s.merchantBankAccounts.createdAt,
    }).from(s.merchantBankAccounts).orderBy(desc(s.merchantBankAccounts.createdAt));
    const masked = accounts.map((a) => ({ ...a, maskedIban: a.ibanLast4 ? `****${a.ibanLast4}` : null }));
    return c.json({ success: true, data: masked });
  },

  review: async (c: any) => {
    const id = Number(c.req.param('id'));
    const { status, reviewReason } = c.req.valid('json');
    const db = createDbClient();
    const [existing] = await db.select().from(s.merchantBankAccounts).where(eq(s.merchantBankAccounts.id, id)).limit(1);
    if (!existing) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Bank account not found' } }, 404);
    await db.update(s.merchantBankAccounts).set({ status, updatedAt: new Date() }).where(eq(s.merchantBankAccounts.id, id));
    const adminAuth = c.get('adminAuth') as { userId: number } | undefined;
    await new AuditLogService().record({
      actorUserId: adminAuth?.userId ?? null,
      storeId: existing.storeId,
      action: 'bank_account_changed',
      entityType: 'bank_account',
      entityId: id,
      oldValue: { status: existing.status },
      newValue: { status, reviewReason },
      ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });
    // Notify merchant of bank account decision
    if (status === 'verified' || status === 'rejected') {
      try {
        const templateCode = status === 'verified' ? 'bank_account_verified' : 'bank_account_rejected';
        const notif = new NotificationService(db);
        await notif.send(existing.storeId, templateCode, {
          bankName: existing.bankName,
          ibanLast4: existing.ibanLast4 ?? '',
          reviewReason,
        });
      } catch (err) {
        console.error('[bank-review] notification send failed:', err);
      }
    }
    return c.json({ success: true, data: { id, status } });
  },
};

// ── /stores/:storeId/settlement-readiness ──────────────────────────────────
export const settlementReadinessRoutes = {
  get: async (c: any) => {
    const storeId = Number(c.req.param('storeId'));
    const db = createDbClient();
    const [row] = await db.select().from(s.walletSettlementReadiness)
      .where(eq(s.walletSettlementReadiness.storeId, storeId)).limit(1);
    return c.json({ success: true, data: row ?? {
      storeId, safeguardedAccountConfigured: false,
      pspSettlementPartnerConfirmed: false, merchantOfRecordConfirmed: false,
      samaComplianceStatus: 'unconfirmed',
    }});
  },

  update: async (c: any) => {
    const storeId = Number(c.req.param('storeId'));
    const body = c.req.valid('json');
    const db = createDbClient();
    await db.insert(s.walletSettlementReadiness).values({ storeId, ...body })
      .onConflictDoUpdate({ target: s.walletSettlementReadiness.storeId, set: { ...body } });
    const [row] = await db.select().from(s.walletSettlementReadiness)
      .where(eq(s.walletSettlementReadiness.storeId, storeId)).limit(1);
    return c.json({ success: true, data: row });
  },
};

// ── /stores/:storeId/payment-settings ──────────────────────────────────────
export const paymentSettingsRoutes = {
  list: async (c: any) => {
    const storeId = Number(c.req.param('storeId'));
    const db = createDbClient();
    const settings = await db.select().from(s.merchantPaymentProviderSettings)
      .where(eq(s.merchantPaymentProviderSettings.storeId, storeId));
    return c.json({ success: true, data: settings });
  },

  upsert: async (c: any) => {
    const storeId = Number(c.req.param('storeId'));
    const body = c.req.valid('json');
    const db = createDbClient();
    const enabled = body.enabled ?? body.isEnabled;
    const insertValues = {
      storeId,
      providerCode: body.providerCode,
      enabled: enabled ?? false,
      mode: body.mode ?? 'test',
      status: body.status ?? 'not_configured',
      supportedPaymentMethod: body.supportedPaymentMethod ?? 'card',
    };
    const updateData: Partial<typeof s.merchantPaymentProviderSettings.$inferInsert> = { updatedAt: new Date() };
    if (enabled !== undefined) updateData.enabled = enabled;
    if (body.mode !== undefined) updateData.mode = body.mode;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.supportedPaymentMethod !== undefined) updateData.supportedPaymentMethod = body.supportedPaymentMethod;

    await db.insert(s.merchantPaymentProviderSettings)
      .values(insertValues)
      .onConflictDoUpdate({
        target: [s.merchantPaymentProviderSettings.storeId, s.merchantPaymentProviderSettings.providerCode],
        set: updateData,
      });
    const [row] = await db.select().from(s.merchantPaymentProviderSettings)
      .where(and(
        eq(s.merchantPaymentProviderSettings.storeId, storeId),
        eq(s.merchantPaymentProviderSettings.providerCode, body.providerCode),
      )).limit(1);
    return c.json({ success: true, data: row });
  },
};

// ── /payments ──────────────────────────────────────────────────────────────
// P1-9 audit fix: this used to hard-cap at 100/200 rows with no page/limit
// params and no total count — the admin table's own client-side "search"
// and pagination silently operated on a truncated slice with no indicator
// the platform had more payments than what was shown. Mirrors the
// page/limit/offset/total/totalPages contract already established for
// /marketplace/products (see marketplace.ts).
export async function paymentsRoute(c: any) {
  const storeIdParam = c.req.query('storeId');
  const storeId = storeIdParam ? Number(storeIdParam) : undefined;
  const query = (c.req.query('q') ?? '').trim();
  const page = Math.max(1, Number(c.req.query('page')) || 1);
  const limit = Math.min(200, Math.max(1, Number(c.req.query('limit')) || 50));
  const offset = (page - 1) * limit;
  const [total, payments] = await Promise.all([
    getAdminPaymentCount(storeId, query || undefined),
    getAdminPaymentRows(storeId, limit, offset, query || undefined),
  ]);
  return c.json({
    success: true,
    data: payments,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
}

export async function paymentsExportRoute(c: any) {
  const params = c.req.valid('query') as { storeId?: number; q?: string };
  const storeId = params.storeId;
  const query = (params.q ?? '').trim().toLowerCase();
  const payments = await getAdminPaymentRows(storeId, 1000);
  const rows = payments
    .filter((payment) => paymentMatchesQuery(payment as Record<string, unknown>, query))
    .map((payment) => ({
      id: payment.id,
      storeId: payment.storeId,
      orderId: payment.orderId,
      method: payment.method,
      amount: payment.amount,
      currency: payment.currency ?? 'SAR',
      status: payment.status,
      createdAt: payment.createdAt,
    }));

  await recordFinancialExportAudit(c, {
    report: 'payments',
    rowCount: rows.length,
    storeId: storeId ?? null,
    filters: { storeId: storeId ?? null, q: query || null },
  });

  return csvResponse(c, toCsv(PAYMENT_EXPORT_COLUMNS, rows), 'payments.csv');
}
