/* eslint-disable @typescript-eslint/no-explicit-any -- admin API routes use legacy `any` for Hono context; proper typing tracked as P2-030. */
// Tenant / store / KYC / payments / dashboard admin route handlers.
// Extracted from admin.ts lines 65-259.
//
// Each export is a raw Hono handler. The aggregator in ./index.ts applies
// `requireAdminAuth()` and any other middleware when mounting the route.

import { eq, desc, sql, and } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { AuditLogService } from '@haa/integration-core';
import { NotificationService } from '@haa/notification-core';
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
    const [tenant] = await db.update(s.tenants).set({ ...body, updatedAt: new Date() }).where(eq(s.tenants.id, id)).returning();
    if (!tenant) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } }, 404);
    // Audit log compliance changes (best-effort; do not fail the request if log write fails)
    if (Object.keys(complianceChanges).length > 0) {
      try {
        const { logAdminAction } = await import('../../services/audit-log.js');
        await logAdminAction({
          adminId: c.get('admin')?.id,
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
export async function paymentsRoute(c: any) {
  const storeId = c.req.query('storeId');
  const db = createDbClient();
  const payments = storeId
    ? await db.select().from(s.payments).where(eq(s.payments.storeId, Number(storeId))).orderBy(desc(s.payments.createdAt)).limit(100)
    : await db.select().from(s.payments).orderBy(desc(s.payments.createdAt)).limit(200);
  return c.json({ success: true, data: payments });
}
