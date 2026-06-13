import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { PaymentProviderSettingsService } from '@haa/commerce-core';
import { AuditLogService } from '@haa/integration-core';
import { requireAuth, requireStoreAccess, requirePermission, getAuth } from '@haa/auth-core';
import { isEncryptionKeySet } from '@haa/commerce-core/encryption';

const psRouter = new Hono();
psRouter.use('*', requireAuth(), requireStoreAccess());

const bnplProviders = ['tabby', 'tamara'] as const;

const upsertSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  mode: z.enum(['test', 'live']).optional(),
  country: z.string().length(2).optional(),
  currency: z.string().length(3).optional(),
  displayNameAr: z.string().max(100).optional(),
  displayNameEn: z.string().max(100).optional(),
  sortOrder: z.number().int().min(0).optional(),
  minOrderAmount: z.string().optional(),
  maxOrderAmount: z.string().optional(),
});

const credentialsSchema = z.object({
  tabby: z.object({
    secretKey: z.string().min(1).optional(),
    publicKey: z.string().min(1).optional(),
    merchantCode: z.string().optional(),
    webhookSecret: z.string().optional(),
  }).optional(),
  tamara: z.object({
    apiToken: z.string().min(1).optional(),
    notificationToken: z.string().min(1).optional(),
  }).optional(),
});

psRouter.get('/', requirePermission('settings:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const service = new PaymentProviderSettingsService();
  const providers = await service.list(storeId);
  return c.json({ success: true, data: providers });
});

psRouter.put('/:provider', requirePermission('settings:update'), zValidator('json', upsertSettingsSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const provider = c.req.param('provider');
  if (!provider || !bnplProviders.includes(provider as any)) {
    return c.json({ success: false, error: { code: 'INVALID_PROVIDER', message: `Unknown provider: ${provider}` } }, 400);
  }
  const body = c.req.valid('json');
  const service = new PaymentProviderSettingsService();
  const result = await service.upsertSettings(storeId, provider, body);
  await new AuditLogService().record({
    actorUserId: getAuth(c)?.userId ?? null,
    tenantId: getAuth(c)?.tenantId ?? null,
    storeId,
    action: 'payment_settings_changed',
    entityType: 'payment',
    entityId: null,
    oldValue: { provider },
    newValue: { provider, ...body },
    ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  });
  return c.json({ success: true, data: result });
});

psRouter.put('/:provider/credentials', requirePermission('settings:update'), zValidator('json', credentialsSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const provider = c.req.param('provider');
  if (!provider || !bnplProviders.includes(provider as any)) {
    return c.json({ success: false, error: { code: 'INVALID_PROVIDER', message: `Unknown provider: ${provider}` } }, 400);
  }

  if (!isEncryptionKeySet()) {
    return c.json({ success: false, error: { code: 'ENCRYPTION_NOT_CONFIGURED', message: 'PAYMENT_CREDENTIALS_ENCRYPTION_KEY is not set' } }, 500);
  }

  const body = c.req.valid('json');
  const providerInput = body[provider as 'tabby' | 'tamara'];
  if (!providerInput || Object.keys(providerInput).length === 0) {
    return c.json({ success: false, error: { code: 'BAD_REQUEST', message: `No credentials provided for ${provider}` } }, 400);
  }

  const service = new PaymentProviderSettingsService();
  await service.saveCredentials(storeId, provider, providerInput as Record<string, string>);

  // Update settings row status to configured
  await service.upsertSettings(storeId, provider, { enabled: true });

  return c.json({ success: true, data: { provider, credentialsConfigured: true } });
});

psRouter.post('/:provider/validate', requirePermission('settings:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const provider = c.req.param('provider');
  if (!provider || !bnplProviders.includes(provider as any)) {
    return c.json({ success: false, error: { code: 'INVALID_PROVIDER', message: `Unknown provider: ${provider}` } }, 400);
  }

  const service = new PaymentProviderSettingsService();
  const result = await service.validate(storeId, provider);
  return c.json({ success: true, data: result });
});

psRouter.post('/:provider/disable', requirePermission('settings:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const provider = c.req.param('provider');
  if (!provider || !bnplProviders.includes(provider as any)) {
    return c.json({ success: false, error: { code: 'INVALID_PROVIDER', message: `Unknown provider: ${provider}` } }, 400);
  }

  const service = new PaymentProviderSettingsService();
  await service.disable(storeId, provider);
  return c.json({ success: true, data: { provider, enabled: false } });
});

psRouter.delete('/:provider/credentials', requirePermission('settings:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const provider = c.req.param('provider');
  if (!provider || !bnplProviders.includes(provider as any)) {
    return c.json({ success: false, error: { code: 'INVALID_PROVIDER', message: `Unknown provider: ${provider}` } }, 400);
  }

  const service = new PaymentProviderSettingsService();
  await service.deleteCredentials(storeId, provider);
  return c.json({ success: true, data: { provider, credentialsDeleted: true } });
});

export { psRouter as paymentSettingsRouter };
