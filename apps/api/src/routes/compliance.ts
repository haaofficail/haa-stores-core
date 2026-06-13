import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { KycService, ComplianceChecklistService } from '@haa/commerce-core';
import { AuditLogService } from '@haa/integration-core';
import { requireAuth, requireStoreAccess, requirePermission, getAuth } from '@haa/auth-core';

const complianceRouter = new Hono();
complianceRouter.use('*', requireAuth(), requireStoreAccess());

complianceRouter.get('/profile', requirePermission('compliance:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const profile = await new KycService().getProfile(storeId);
  if (!profile) {
    return c.json({ success: true, data: { businessType: 'individual', status: 'not_started' } });
  }
  const safe = { ...profile };
  delete (safe as any).nationalIdOrIqama;
  return c.json({ success: true, data: safe });
});

complianceRouter.put('/profile', requirePermission('compliance:write'), zValidator('json', z.object({
  businessType: z.enum(['individual', 'establishment', 'company', 'freelancer', 'productive_family']).optional(),
  legalName: z.string().max(255).optional(),
  commercialName: z.string().max(255).optional(),
  nationalIdOrIqama: z.string().max(20).optional(),
  commercialRegistrationNumber: z.string().max(50).optional(),
  freelanceDocumentNumber: z.string().max(50).optional(),
  vatNumber: z.string().max(50).optional(),
  city: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const tenantId = getAuth(c)?.tenantId ?? 0;
  const body = c.req.valid('json');
  try {
    const existing = await new KycService().getProfile(storeId);
    const profile = await new KycService().upsertProfile(storeId, tenantId, body);
    const auditActions: Array<{ field: string; action: 'commercial_registration_updated' | 'vat_number_updated' }> = [];
    if (body.commercialRegistrationNumber && body.commercialRegistrationNumber !== existing?.commercialRegistrationNumber) {
      auditActions.push({ field: 'commercialRegistrationNumber', action: 'commercial_registration_updated' });
    }
    if (body.vatNumber && body.vatNumber !== existing?.vatNumber) {
      auditActions.push({ field: 'vatNumber', action: 'vat_number_updated' });
    }
    for (const { field, action } of auditActions) {
      await new AuditLogService().record({
        actorUserId: getAuth(c)?.userId ?? null,
        tenantId,
        storeId,
        action,
        entityType: 'kyc',
        entityId: profile.id,
        oldValue: { [field]: (existing as any)?.[field] ?? null },
        newValue: { [field]: (body as any)[field] },
        ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
        userAgent: c.req.header('user-agent'),
      });
    }
    const safe = { ...profile };
    delete (safe as any).nationalIdOrIqama;
    return c.json({ success: true, data: safe });
  } catch (e) {
    return c.json({ success: false, error: { code: 'PROFILE_ERROR', message: e instanceof Error ? e.message : 'Update failed' } }, 400);
  }
});

complianceRouter.post('/submit', requirePermission('compliance:submit'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  try {
    const profile = await new KycService().submitProfile(storeId);
    return c.json({ success: true, data: { status: profile.status } });
  } catch (e) {
    return c.json({ success: false, error: { code: 'SUBMIT_ERROR', message: e instanceof Error ? e.message : 'Submit failed' } }, 400);
  }
});

complianceRouter.get('/status', requirePermission('compliance:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const status = await new KycService().getStatus(storeId);
  return c.json({ success: true, data: status });
});

complianceRouter.get('/documents', requirePermission('compliance:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const docs = await new KycService().getDocuments(storeId);
  const safe = docs.map(d => ({
    id: d.id, type: d.type, filename: d.filename, mimeType: d.mimeType, status: d.status, uploadedAt: d.uploadedAt,
  }));
  return c.json({ success: true, data: safe });
});

complianceRouter.post('/documents', requirePermission('compliance:documents'), zValidator('json', z.object({
  type: z.enum(['commercial_registration', 'freelance_document', 'vat_certificate', 'national_id', 'iban_certificate', 'bank_letter', 'other']),
  fileUrl: z.string().min(1).max(500),
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z.number().int().positive(),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');
  try {
    const doc = await new KycService().uploadDocument(storeId, body);
    return c.json({ success: true, data: doc }, 201);
  } catch (e) {
    return c.json({ success: false, error: { code: 'DOCUMENT_ERROR', message: e instanceof Error ? e.message : 'Upload failed' } }, 400);
  }
});

complianceRouter.delete('/documents/:documentId', requirePermission('compliance:documents'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const documentId = Number(c.req.param('documentId'));
  try {
    await new KycService().deleteDocument(storeId, documentId);
    return c.json({ success: true, data: { deleted: true } });
  } catch (e) {
    return c.json({ success: false, error: { code: 'DOCUMENT_ERROR', message: e instanceof Error ? e.message : 'Delete failed' } }, 400);
  }
});

complianceRouter.get('/bank-account', requirePermission('compliance:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const accounts = await new KycService().getBankAccounts(storeId);
  const safe = accounts.map(a => ({
    id: a.id, accountHolderName: a.accountHolderName, bankName: a.bankName,
    ibanLast4: a.ibanLast4, isDefault: a.isDefault, status: a.status,
  }));
  return c.json({ success: true, data: safe });
});

complianceRouter.put('/bank-account', requirePermission('compliance:write'), zValidator('json', z.object({
  accountHolderName: z.string().min(1).max(255),
  bankName: z.string().min(1).max(100),
  iban: z.string().min(1).max(34),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');
  try {
    const account = await new KycService().upsertBankAccount(storeId, body);
    return c.json({ success: true, data: account });
  } catch (e) {
    return c.json({ success: false, error: { code: 'BANK_ERROR', message: e instanceof Error ? e.message : 'Bank update failed' } }, 400);
  }
});

complianceRouter.get('/checklist', requirePermission('compliance:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const tenantId = getAuth(c)?.tenantId ?? 0;
  try {
    const result = await new ComplianceChecklistService().run(storeId, tenantId);
    return c.json({ success: true, data: result });
  } catch (e) {
    return c.json({ success: false, error: { code: 'CHECKLIST_ERROR', message: e instanceof Error ? e.message : 'Checklist failed' } }, 500);
  }
});

export { complianceRouter };
