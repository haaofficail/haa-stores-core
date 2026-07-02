import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { NotificationService } from '@haa/notification-core';
import { isValidWhatsappPhone, normalizeWhatsappPhone } from '@haa/commerce-core';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';

const notificationsRouter = new Hono();
notificationsRouter.use('*', requireAuth(), requireStoreAccess());

// P1-10 audit fix: UI gates /notifications on the catalog's dedicated
// `notifications:view`/`notifications:update` (see
// packages/shared/src/permissions.ts) — these routes still checked the
// coarser `settings:read`/`settings:update`.
notificationsRouter.get('/preferences', requirePermission('notifications:view'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const prefs = await new NotificationService().getPreferences(storeId);
  return c.json({ success: true, data: prefs });
});

notificationsRouter.put('/preferences', requirePermission('notifications:update'), zValidator('json', z.object({
  emailEnabled: z.boolean().optional(),
  emailAddress: z.string().email().optional(),
  smsEnabled: z.boolean().optional(),
  smsPhone: z.string().optional(),
  whatsappEnabled: z.boolean().optional(),
  whatsappPhone: z.string().optional().transform((value) => normalizeWhatsappPhone(value) ?? undefined),
  orderCreated: z.boolean().optional(),
  paymentSuccess: z.boolean().optional(),
  paymentFailed: z.boolean().optional(),
  shippingUpdate: z.boolean().optional(),
  lowStock: z.boolean().optional(),
  abandonedCart: z.boolean().optional(),
}).superRefine((body, ctx) => {
  if ((body.whatsappEnabled || body.whatsappPhone) && !isValidWhatsappPhone(body.whatsappPhone)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['whatsappPhone'],
      message: 'WhatsApp phone must be E.164, for example +9665XXXXXXXX',
    });
  }
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const prefs = await new NotificationService().updatePreferences(storeId, c.req.valid('json'));
  return c.json({ success: true, data: prefs });
});

notificationsRouter.get('/logs', requirePermission('notifications:view'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const channel = c.req.query('channel');
  const logs = await new NotificationService().getLogs(storeId, { channel });
  return c.json({ success: true, data: logs });
});

notificationsRouter.get('/templates', requirePermission('notifications:view'), async (c) => {
  const templates = await new NotificationService().getTemplates();
  return c.json({ success: true, data: templates });
});

export { notificationsRouter };
