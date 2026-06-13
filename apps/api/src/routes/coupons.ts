import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { CouponsService } from '@haa/commerce-core';
import { createCouponSchema, updateCouponSchema } from '@haa/shared';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';

const couponsRouter = new Hono();

couponsRouter.use('*', requireAuth(), requireStoreAccess());

couponsRouter.get('/', requirePermission('coupons:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const search = c.req.query('search');
  const status = c.req.query('status');
  const coupons = await new CouponsService().list(storeId, { search, status });
  return c.json({ success: true, data: coupons });
});

couponsRouter.get('/:couponId', requirePermission('coupons:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const couponId = Number(c.req.param('couponId'));
  const coupon = await new CouponsService().getById(storeId, couponId);
  if (!coupon) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Coupon not found' } }, 404);
  return c.json({ success: true, data: coupon });
});

couponsRouter.post('/', requirePermission('coupons:create'), zValidator('json', createCouponSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = c.req.valid('json');

  const existing = await new CouponsService().getByCode(storeId, body.code);
  if (existing) return c.json({ success: false, error: { code: 'CONFLICT', message: 'كود الخصم موجود مسبقًا' } }, 409);

  const coupon = await new CouponsService().create(storeId, body);
  return c.json({ success: true, data: coupon }, 201);
});

couponsRouter.put('/:couponId', requirePermission('coupons:update'), zValidator('json', updateCouponSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const couponId = Number(c.req.param('couponId'));
  const body = c.req.valid('json');

  if (body.code) {
    const existing = await new CouponsService().getByCode(storeId, body.code);
    if (existing && existing.id !== couponId) return c.json({ success: false, error: { code: 'CONFLICT', message: 'كود الخصم موجود مسبقًا' } }, 409);
  }

  const coupon = await new CouponsService().update(storeId, couponId, body);
  if (!coupon) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Coupon not found' } }, 404);
  return c.json({ success: true, data: coupon });
});

couponsRouter.delete('/:couponId', requirePermission('coupons:delete'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const couponId = Number(c.req.param('couponId'));
  const coupon = await new CouponsService().delete(storeId, couponId);
  if (!coupon) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Coupon not found' } }, 404);
  return c.json({ success: true, data: coupon });
});

export { couponsRouter };
