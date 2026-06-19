import { Hono } from 'hono';
import { AbandonedCartCampaignService } from '@haa/commerce-core';

export const cartRecoveryRouter = new Hono();

/**
 * GET /s/recover?token=:token
 * Public cart recovery endpoint.
 * Validates the recovery token, marks it as opened, and redirects to checkout.
 */
cartRecoveryRouter.get('/recover', async (c) => {
  const token = c.req.query('token');
  if (!token || token.length !== 64) {
    return c.json({ success: false, error: { code: 'INVALID_TOKEN', message: 'رابط الاسترداد غير صالح' } }, 400);
  }

  const service = new AbandonedCartCampaignService();
  const recovery = await service.getRecoveryByToken(token);

  if (!recovery) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'رابط الاسترداد غير موجود أو منتهي الصلاحية' } }, 404);
  }

  if (recovery.expiresAt && recovery.expiresAt < new Date()) {
    return c.json({ success: false, error: { code: 'EXPIRED', message: 'انتهت صلاحية رابط الاسترداد' } }, 410);
  }

  if (recovery.status === 'recovered') {
    return c.json({ success: false, error: { code: 'ALREADY_RECOVERED', message: 'تم إتمام الطلب مسبقاً' } }, 409);
  }

  await service.markOpened(token).catch(() => null);

  const storeUrl = process.env.STOREFRONT_URL || 'https://haastores.com';
  const checkoutUrl = `${storeUrl}/checkout?session=${recovery.checkoutSessionId}&recovery=${token}`;
  return c.redirect(checkoutUrl, 302);
});
