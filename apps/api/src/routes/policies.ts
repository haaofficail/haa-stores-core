import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { PoliciesService, SaudiPolicyGenerator } from '@haa/commerce-core';
import { AcknowledgementService } from '@haa/commerce-core';
import { AuditLogService } from '@haa/integration-core';
import { requireAuth, requireStoreAccess, requirePermission, getAuth } from '@haa/auth-core';

const policiesRouter = new Hono();

policiesRouter.use('*', requireAuth(), requireStoreAccess());

const upsertSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
});

const validTypes = ['privacy', 'terms', 'shipping', 'returns', 'about'] as const;

policiesRouter.get('/', requirePermission('settings:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const policies = await new PoliciesService().list(storeId);
  return c.json({ success: true, data: policies });
});

policiesRouter.get('/:type', requirePermission('settings:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const type = c.req.param('type') as string;
  if (!validTypes.includes(type as any)) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid policy type' } }, 400);

  const policy = await new PoliciesService().getByType(storeId, type);
  if (!policy) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Policy not found' } }, 404);
  return c.json({ success: true, data: policy });
});

policiesRouter.put('/:type', requirePermission('settings:update'), zValidator('json', upsertSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const type = c.req.param('type') as string;
  if (!validTypes.includes(type as any)) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid policy type' } }, 400);

  const body = c.req.valid('json');
  const existing = await new PoliciesService().getByType(storeId, type);
  const policy = await new PoliciesService().upsert(storeId, type, body);
  await new AuditLogService().record({
    actorUserId: getAuth(c)?.userId ?? null,
    tenantId: getAuth(c)?.tenantId ?? null,
    storeId,
    action: 'policy_updated',
    entityType: 'policy',
    entityId: policy.id,
    oldValue: existing ? { title: existing.title, content: existing.content?.substring(0, 200) } : null,
    newValue: { title: body.title, content: body.content?.substring(0, 200) },
    ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  });
  return c.json({ success: true, data: policy });
});

policiesRouter.post('/:type/publish', requirePermission('settings:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const type = c.req.param('type') as string;
  if (!validTypes.includes(type as any)) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid policy type' } }, 400);

  const body = await c.req.json().catch(() => ({}));
  const publish = body.publish !== false;

  const existing = await new PoliciesService().getByType(storeId, type);
  if (publish) {
    const policy = await new PoliciesService().publish(storeId, type);
    if (!policy) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Policy not found' } }, 404);
    await new AuditLogService().record({
      actorUserId: getAuth(c)?.userId ?? null,
      tenantId: getAuth(c)?.tenantId ?? null,
      storeId,
      action: 'policy_published',
      entityType: 'policy',
      entityId: policy.id,
      oldValue: { isPublished: existing?.isPublished ?? false },
      newValue: { isPublished: true },
      ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });
    return c.json({ success: true, data: policy });
  }

  const policy = await new PoliciesService().unpublish(storeId, type);
  if (!policy) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Policy not found' } }, 404);
  await new AuditLogService().record({
    actorUserId: getAuth(c)?.userId ?? null,
    tenantId: getAuth(c)?.tenantId ?? null,
    storeId,
    action: 'policy_unpublished',
    entityType: 'policy',
    entityId: policy.id,
    oldValue: { isPublished: existing?.isPublished ?? true },
    newValue: { isPublished: false },
    ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  });
  return c.json({ success: true, data: policy });
});

const generatePreviewSchema = z.object({
  storeName: z.string().min(1),
  legalName: z.string().optional(),
  commercialRegistrationNumber: z.string().optional(),
  vatNumber: z.string().optional(),
  supportEmail: z.string().optional(),
  supportPhone: z.string().optional(),
  businessAddress: z.string().optional(),
  paymentMethods: z.array(z.string()).optional(),
  shippingMethods: z.array(z.string()).optional(),
  shippingFee: z.number().optional(),
  freeShippingThreshold: z.number().optional(),
  deliveryMinDays: z.number().optional(),
  deliveryMaxDays: z.number().optional(),
  returnWindowDays: z.number().nullable().optional(),
  refundProcessingDays: z.number().optional(),
  excludedReturnCategories: z.array(z.string()).optional(),
  carriers: z.array(z.string()).optional(),
  privacyContactEmail: z.string().optional(),
  delayCancellationNotice: z.string().nullable().optional(),
});

const applyGeneratedSchema = z.object({
  confirmation: z.literal(true),
  generatedPolicies: z.array(z.object({
    type: z.string(),
    title: z.string(),
    content: z.string(),
  })),
});

policiesRouter.post('/generate-preview', requirePermission('settings:read'), zValidator('json', generatePreviewSchema), async (c) => {
  const input = c.req.valid('json');
  const generator = new SaudiPolicyGenerator();
  const result = generator.generate(input);
  return c.json({ success: true, data: result });
});

policiesRouter.post('/apply-generated', requirePermission('settings:update'), zValidator('json', applyGeneratedSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');

  if (!body.confirmation) {
    return c.json({ success: false, error: { code: 'CONFIRMATION_REQUIRED', message: 'يجب تأكيد التطبيق' } }, 400);
  }

  const ackService = new AcknowledgementService();
  const ackStatus = await ackService.getStatus(storeId);
  if (!ackStatus.acknowledged) {
    return c.json({ success: false, error: { code: 'MERCHANT_ACKNOWLEDGEMENT_REQUIRED', message: 'الإقرار مطلوب قبل تطبيق السياسات' } }, 403);
  }

  const policiesService = new PoliciesService();
  const auditService = new AuditLogService();
  const actorUserId = getAuth(c)?.userId ?? null;
  const tenantId = getAuth(c)?.tenantId ?? null;
  const ipAddress = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip');
  const userAgent = c.req.header('user-agent');

  const results = [];
  for (const generated of body.generatedPolicies) {
    if (!validTypes.includes(generated.type as any)) continue;

    const existing = await policiesService.getByType(storeId, generated.type);
    const policy = await policiesService.upsert(storeId, generated.type, {
      title: generated.title,
      content: generated.content,
    });

    await auditService.record({
      actorUserId,
      tenantId,
      storeId,
      action: 'policy_updated',
      entityType: 'policy',
      entityId: policy.id,
      oldValue: existing ? { title: existing.title, content: existing.content?.substring(0, 200) } : null,
      newValue: { title: generated.title, content: generated.content?.substring(0, 200) },
      ipAddress,
      userAgent,
    });

    results.push(policy);
  }

  return c.json({ success: true, data: results });
});

export { policiesRouter };
