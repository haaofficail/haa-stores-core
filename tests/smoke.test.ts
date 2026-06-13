/**
 * Smoke Test — Full Local E2E Journey
 *
 * Requires the full local stack running:
 *   pnpm setup   # docker up + migrate + seed
 *   pnpm dev:api # API on :3000
 *
 * Run: pnpm smoke
 */

import { describe, it, expect } from 'vitest';

const API = 'http://localhost:3000';

let authToken = '';
let storeId = 1;
let productSlug = '';

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...extra,
  };
}

async function api(path: string, opts: Record<string, any> = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: headers(opts.headers),
    ...opts,
  });
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text), headers: res.headers };
  } catch {
    return { status: res.status, body: text, headers: res.headers };
  }
}

describe('Smoke Test — Full Local Journey', () => {
  // ── 1. Health Check ────────────────────────────────
  it('1. Health endpoint returns ok', async () => {
    const { status, body } = await api('/health');
    expect(status).toBe(200);
    expect(body.api).toBe('ok');
    expect(body.db).toBe('connected');
  });

  // ── 2. Merchant Login ──────────────────────────────
  it('2. Merchant login succeeds', async () => {
    const { status, body } = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'ahmed@example.com', password: 'Test@123456' }),
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.token).toBeTruthy();
    expect(body.data.user).toBeTruthy();
    expect(body.data.store).toBeTruthy();
    authToken = body.data.token;
    storeId = body.data.store.id;
  });

  // ── 3. Storefront Home ────────────────────────────
  it('3. Storefront home loads store data', async () => {
    const { status, body } = await api('/s/haa-demo');
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.name).toBeTruthy();
    expect(body.data.slug).toBe('haa-demo');
  });

  // ── 4. Storefront Product List ─────────────────────
  it('4. Storefront shows products', async () => {
    const { status, body } = await api('/s/haa-demo/products?limit=5');
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    const products = body.data.data;
    expect(products.length).toBeGreaterThanOrEqual(1);
    productSlug = products[0].slug;
  });

  // ── 5. Storefront Product Detail ───────────────────
  it('5. Storefront product detail has correct fields', async () => {
    expect(productSlug).toBeTruthy();
    const { status, body } = await api(`/s/haa-demo/products/${productSlug}`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    const product = body.data;
    expect(product.name).toBeTruthy();
    expect(product.price).toBeTruthy();
    expect(product).not.toHaveProperty('cost');
    expect(product).not.toHaveProperty('storeId');
  });

  // ── 6. Coupon Validation ──────────────────────────
  it('6. Valid coupon validates successfully', async () => {
    const { status, body } = await api('/s/haa-demo/checkout/validate-coupon', {
      method: 'POST',
      body: JSON.stringify({ code: 'SAVE10', subtotal: 200, shippingCost: 20 }),
    });
    expect(status).toBe(200);
    expect(body.data.valid).toBe(true);
    expect(body.data.discount).toBeGreaterThan(0);
  });

  it('7. Invalid coupon returns valid false', async () => {
    const { status, body } = await api('/s/haa-demo/checkout/validate-coupon', {
      method: 'POST',
      body: JSON.stringify({ code: 'INVALID', subtotal: 200, shippingCost: 20 }),
    });
    expect(status).toBe(200);
    expect(body.data.valid).toBe(false);
  });

  it('8. Expired coupon is rejected', async () => {
    const { status, body } = await api('/s/haa-demo/checkout/validate-coupon', {
      method: 'POST',
      body: JSON.stringify({ code: 'EXPIRED50', subtotal: 200, shippingCost: 20 }),
    });
    expect(status).toBe(200);
    expect(body.data.valid).toBe(false);
  });

  // ── 7. Storefront Policies ────────────────────────
  it('9. Storefront published policy by type', async () => {
    const { status, body } = await api('/s/haa-demo/policies/privacy');
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.isPublished).toBe(true);
  });

  it('10. Invalid policy type returns 400', async () => {
    const { status } = await api('/s/haa-demo/policies/invalid');
    expect(status).toBe(400);
  });

  // ── 8. Storefront Categories ──────────────────────
  it('11. Storefront categories listed', async () => {
    const { status, body } = await api('/s/haa-demo/categories');
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  // ── 9. Dashboard: Products ────────────────────────
  it('12. Dashboard lists products', async () => {
    expect(authToken).toBeTruthy();
    const { status, body } = await api(`/merchant/${storeId}/products`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.data?.length).toBeGreaterThanOrEqual(1);
  });

  // ── 10. Dashboard: Orders ──────────────────────────
  it('13. Dashboard lists orders', async () => {
    expect(authToken).toBeTruthy();
    const { status, body } = await api(`/merchant/${storeId}/orders`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.data?.length).toBeGreaterThanOrEqual(1);
  });

  // ── 11. Reports ────────────────────────────────────
  it('14. Reports sales summary', async () => {
    expect(authToken).toBeTruthy();
    const { status, body } = await api(`/merchant/${storeId}/reports/sales-summary`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.totalSales).toBeDefined();
  });

  it('15. Reports top products', async () => {
    expect(authToken).toBeTruthy();
    const { status, body } = await api(`/merchant/${storeId}/reports/top-products`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('16. Reports low stock', async () => {
    expect(authToken).toBeTruthy();
    const { status, body } = await api(`/merchant/${storeId}/reports/low-stock`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  // ── 12. Abandoned Carts ────────────────────────────
  it('17. Abandoned carts list', async () => {
    expect(authToken).toBeTruthy();
    const { status, body } = await api(`/merchant/${storeId}/abandoned-carts`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('18. Abandoned carts stats', async () => {
    expect(authToken).toBeTruthy();
    const { status, body } = await api(`/merchant/${storeId}/abandoned-carts/stats`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.count).toBeDefined();
  });

  // ── 13. Storefront Cart ────────────────────────────
  it('19. Storefront cart can be created', async () => {
    expect(productSlug).toBeTruthy();
    const { status, body } = await api('/s/haa-demo/cart', {
      method: 'POST',
    });
    expect([200, 201]).toContain(status);
    expect(body.success).toBe(true);
    expect(body.data.id).toBeTruthy();
  });

  // ── 14. Dashboard: Coupons ────────────────────────
  it('20. Dashboard coupons list', async () => {
    expect(authToken).toBeTruthy();
    const { status, body } = await api(`/merchant/${storeId}/coupons`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  // ── 15. Dashboard: Exports ─────────────────────────
  it('21. Export products CSV', async () => {
    expect(authToken).toBeTruthy();
    const { status, body } = await api(`/merchant/${storeId}/exports/products`);
    expect(status).toBe(200);
    expect(typeof body).toBe('string');
    expect(body).toContain('name');
  });

  // ── 16. Dashboard: Imports Template ────────────────
  it('22. Import template CSV', async () => {
    expect(authToken).toBeTruthy();
    const { status, body } = await api(`/merchant/${storeId}/imports/products/template`);
    expect(status).toBe(200);
    expect(typeof body).toBe('string');
    expect(body).toContain('name');
  });

  // ── 17. Negative Tests ─────────────────────────────
  it('23. Invalid login returns 401', async () => {
    const { status } = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'wrong@example.com', password: 'wrongpassword' }),
    });
    expect(status).toBe(401);
  });

  it('24. Unauthenticated request to merchant returns 401', async () => {
    const saved = authToken;
    authToken = '';
    const { status } = await api(`/merchant/${storeId}/orders`);
    expect(status).toBe(401);
    authToken = saved;
  });

  // ── 18. Order Tracking ─────────────────────────────
  it('25. Tracking requires phone', async () => {
    const { status } = await api('/s/haa-demo/track/HAA-1000');
    expect(status).toBe(400);
  });

  it('26. Tracking succeeds with valid order and phone', async () => {
    const { status, body } = await api('/s/haa-demo/track/HAA-1000?phone=966511111111');
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.orderNumber).toBe('HAA-1000');
    expect(body.data).not.toHaveProperty('idempotencyKey');
    expect(body.data).not.toHaveProperty('checkoutSessionId');
  });

  // ── 19. Wallet ─────────────────────────────────────
  it('27. Wallet summary', async () => {
    expect(authToken).toBeTruthy();
    const { status, body } = await api(`/merchant/${storeId}/wallet/summary`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.balance).toBeDefined();
  });

  // ── 20. Response Safety ────────────────────────────
  it('28. Public product responses omit internal fields', async () => {
    expect(productSlug).toBeTruthy();
    const { status, body } = await api(`/s/haa-demo/products/${productSlug}`);
    expect(status).toBe(200);
    const p = body.data;
    expect(p).not.toHaveProperty('cost');
    expect(p).not.toHaveProperty('storeId');
  });

  // ── 21. Subscriptions ───────────────────────────────
  it('29. Subscription plans list', async () => {
    const { status, body } = await api(`/merchant/${storeId}/subscriptions/plans`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('30. Current subscription status', async () => {
    const { status, body } = await api(`/merchant/${storeId}/subscriptions/current`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.planCode).toBeTruthy();
  });

  // ── 22. Notifications ───────────────────────────────
  it('31. Notification preferences', async () => {
    const { status, body } = await api(`/merchant/${storeId}/notifications/preferences`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  // ── 23. Shipping (Storefront) ───────────────────────
  it('32. Storefront shipping methods list', async () => {
    const { status, body } = await api('/s/haa-demo/shipping-methods');
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    // Safety: no internal fields leaked
    if (body.data.length > 0) {
      expect(body.data[0]).not.toHaveProperty('storeId');
      expect(body.data[0]).not.toHaveProperty('config');
      expect(body.data[0]).not.toHaveProperty('providerAccountId');
    }
  });

  // ── 24. Integrations ────────────────────────────────
  it('33. Integrations API keys list', async () => {
    const { status, body } = await api(`/merchant/${storeId}/integrations/api-keys`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  // ── 25. KYC / Compliance ───────────────────────────
  it('34. KYC profile status', async () => {
    const { status, body } = await api(`/merchant/${storeId}/compliance/status`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.completionPercent).toBeDefined();
  });

  // ── 26. Dashboard: Shipments ────────────────────────
  it('35. Dashboard shipments list', async () => {
    const { status, body } = await api(`/merchant/${storeId}/shipments`);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  // ── 27. Category Safety ─────────────────────────────
  it('36. Public categories omit internal fields', async () => {
    const { status, body } = await api('/s/haa-demo/categories');
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    if (body.data.length > 0) {
      expect(body.data[0]).not.toHaveProperty('storeId');
      expect(body.data[0]).not.toHaveProperty('tenantId');
    }
  });

  // ── 28. Migration Hub ───────────────────────────────
  it('37. Migration template downloads', async () => {
    const { status, body } = await api(`/merchant/${storeId}/migration/template/csv`);
    expect(status).toBe(200);
    expect(body).toContain('name');
  });

  // ── 29. Public API v1 ───────────────────────────────
  it('38. Public API products endpoint (unauthenticated returns 401)', async () => {
    const { status } = await api('/api/v1/products');
    expect(status).toBe(401);
  });

  // ── 30. Gift & Pickup Features ──────────────────────
  it('39. Enable giftWrap, sendAsGift, pickup features', async () => {
    expect(authToken).toBeTruthy();
    const { status, body } = await api(`/merchant/${storeId}/settings/product-features`, {
      method: 'PUT',
      body: JSON.stringify({
        giftWrap: true, sendAsGift: true, pickup: true,
        badgeMaroof: false, badgeSaudiBusinessCenter: false, badgeSaudiMade: false,
        imageLightbox: true, stickyCart: true, trustBadges: true, reviews: true,
        shareButton: true, deliveryEstimate: true, sizeGuide: true, alsoBought: true,
        recentlyViewed: true, priceAlert: true, stockBar: true, liveViewers: true, compareBadges: true,
      }),
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('40. Config gift options', async () => {
    expect(authToken).toBeTruthy();
    const { status, body } = await api(`/merchant/${storeId}/settings/gift-options`, {
      method: 'PUT',
      body: JSON.stringify({
        giftWrapDefaultPrice: '15.00',
        giftMessageMaxLength: 200,
        giftWrapInstructions: 'تغليف فاخر',
        pickupInstructions: 'استلام من الفرع خلال ساعات العمل',
      }),
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('41. Create a pickup location', async () => {
    expect(authToken).toBeTruthy();
    const { status, body } = await api(`/merchant/${storeId}/settings/pickup-locations`, {
      method: 'POST',
      body: JSON.stringify({
        nameAr: 'الفرع الرئيسي',
        nameEn: 'Main Branch',
        address: 'الرياض، حي النرجس',
        mapsUrl: 'https://maps.google.com',
        hours: { sat: '9:00-21:00', sun: '9:00-21:00', mon_thu: '9:00-21:00', fri: '14:00-21:00' },
        instructions: 'استلام من الفرع',
        isActive: true,
      }),
    });
    expect([200, 201]).toContain(status);
    expect(body.success).toBe(true);
    expect(body.data.id).toBeTruthy();
  });

  it('42. Storefront shows product features', async () => {
    const { status, body } = await api('/s/haa-demo/product-features');
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.giftWrap).toBe(true);
    expect(body.data.sendAsGift).toBe(true);
    expect(body.data.pickup).toBe(true);
  });

  it('43. Storefront shows pickup locations', async () => {
    const { status, body } = await api('/s/haa-demo/pickup-locations');
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0].nameAr).toBe('الفرع الرئيسي');
  });

  it('44. Storefront shows gift options', async () => {
    const { status, body } = await api('/s/haa-demo/gift-options');
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.giftWrapDefaultPrice).toBeDefined();
    expect(body.data.giftMessageMaxLength).toBeGreaterThan(0);
  });

  it('45. Enable gift wrap on a product', async () => {
    expect(authToken).toBeTruthy();
    // Get first product
    const { body: prodList } = await api(`/merchant/${storeId}/products`);
    const product = prodList.data.data[0];
    expect(product).toBeTruthy();

    const { status, body } = await api(`/merchant/${storeId}/products/${product.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        giftWrapAvailable: true,
        giftWrapPriceOverride: '20.00',
      }),
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('46. Full checkout with gift wrap + send as gift + pickup', async () => {
    // 1. Get a product
    const { body: pubProds } = await api('/s/haa-demo/products?limit=1');
    const product = pubProds.data.data[0];
    expect(product).toBeTruthy();
    expect(product.giftWrapAvailable).toBe(true);

    // 2. Create cart
    const { body: cart } = await api('/s/haa-demo/cart', { method: 'POST' });
    expect(cart.success).toBe(true);
    const cartId = cart.data.id;

    // 3. Add item with gift options
    const { body: addRes } = await api(`/s/haa-demo/cart/${cartId}/items`, {
      method: 'POST',
      body: JSON.stringify({
        productId: product.id,
        quantity: 1,
        giftWrapSelected: true,
        sendAsGift: true,
        giftMessage: 'كل عام وأنت بخير',
      }),
    });
    expect(addRes.success).toBe(true);
    const cartItem = addRes.data.items[0];
    expect(cartItem.giftWrapSelected).toBe(true);
    expect(cartItem.giftWrapPrice).toBeTruthy();
    expect(cartItem.sendAsGift).toBe(true);
    expect(cartItem.giftMessage).toBe('كل عام وأنت بخير');

    // 4. Get pickup locations
    const { body: locs } = await api('/s/haa-demo/pickup-locations');
    const pickupLocId = locs.data[0].id;
    expect(pickupLocId).toBeTruthy();

    // 5. Create checkout session with pickup + gift
    const idempotencyKey = crypto.randomUUID();
    const { body: sessionRes } = await api('/s/haa-demo/checkout/sessions', {
      method: 'POST',
      body: JSON.stringify({
        cartId,
        customerName: 'أحمد اختبار',
        customerPhone: '966500000000',
        customerEmail: 'test@example.com',
        fulfillmentType: 'local_pickup',
        pickupLocationId: pickupLocId,
        paymentMethod: 'fake_card_success',
        idempotencyKey,
      }),
    });
    expect(sessionRes.success).toBe(true);
    const sessionId = sessionRes.data.id;

    // 6. Confirm the session
    const { body: confirmRes } = await api(`/s/haa-demo/checkout/sessions/${sessionId}/confirm`, {
      method: 'POST',
    });
    expect(confirmRes.success).toBe(true);
    const order = confirmRes.data.order;
    expect(order.fulfillmentType).toBe('local_pickup');
    expect(order.pickupLocationId).toBe(pickupLocId);

    // 7. Verify order via tracking — check that fulfillmentType returns structured data
    const { body: trackRes } = await api(`/s/haa-demo/track/${order.orderNumber}?phone=966500000000`);
    expect(trackRes.success).toBe(true);
    expect(trackRes.data.fulfillmentType).toBe('local_pickup');
    expect(trackRes.data.pickupLocationId).toBe(pickupLocId);
    // The frontend uses fulfillmentType to show "استلام من الفرع" via translation, not raw text

    // 8. Verify order from merchant dashboard
    const { body: dashOrders } = await api(`/merchant/${storeId}/orders`);
    const dashOrder = dashOrders.data.data.find((o: any) => o.orderNumber === order.orderNumber);
    expect(dashOrder).toBeTruthy();
    expect(dashOrder.fulfillmentType).toBe('local_pickup');
    expect(dashOrder.pickupLocationId).toBe(pickupLocId);

    // 9. Test pickup status flow: processing -> ready_for_pickup -> picked_up (terminal)
    const orderId = dashOrder.id;
    // First transition from confirmed -> processing
    const { body: processRes } = await api(`/merchant/${storeId}/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'processing' }),
    });
    expect(processRes.success).toBe(true);
    expect(processRes.data.status).toBe('processing');

    const { body: readyRes } = await api(`/merchant/${storeId}/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ready_for_pickup' }),
    });
    expect(readyRes.success).toBe(true);
    expect(readyRes.data.status).toBe('ready_for_pickup');

    // picked_up is the terminal status for pickup orders
    const { body: pickedRes } = await api(`/merchant/${storeId}/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'picked_up' }),
    });
    expect(pickedRes.success).toBe(true);
    expect(pickedRes.data.status).toBe('picked_up');
    // Verify it's marked complete operationally
    expect(pickedRes.data.completedAt).toBeTruthy();
    expect(pickedRes.data.fulfillmentStatus).toBe('fulfilled');

    // Verify no further transitions from picked_up (terminal state)
    const { body: transRes } = await api(`/merchant/${storeId}/orders/${orderId}/transitions`);
    expect(transRes.success).toBe(true);
    expect(transRes.data.allowedTransitions).toEqual([]);
  });
});
