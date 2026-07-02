import { Hono } from 'hono';
import { GrowthAggregationService, LivePresenceService, LiveSnapshotService, MarketingActionService, CustomerSegmentationService } from '@haa/commerce-core';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';

const marketingRouter = new Hono();

marketingRouter.use('*', requireAuth(), requireStoreAccess());

function getPeriod(c: { req: { query: (k: string) => string | undefined } }): { dateFrom?: string; dateTo?: string } {
  return {
    dateFrom: c.req.query('dateFrom') || undefined,
    dateTo: c.req.query('dateTo') || undefined,
  };
}

marketingRouter.get('/overview', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const { dateFrom, dateTo } = getPeriod(c);
  const data = await new GrowthAggregationService().getOverview(storeId, dateFrom, dateTo);
  return c.json({ success: true, data });
});

marketingRouter.get('/products', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const { dateFrom, dateTo } = getPeriod(c);
  const data = await new GrowthAggregationService().getProductMetrics(storeId, dateFrom, dateTo);
  return c.json({ success: true, data });
});

marketingRouter.get('/sources', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const { dateFrom, dateTo } = getPeriod(c);
  const data = await new GrowthAggregationService().getSourceMetrics(storeId, dateFrom, dateTo);
  return c.json({ success: true, data });
});

marketingRouter.get('/insights', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const { dateFrom, dateTo } = getPeriod(c);
  const data = await new GrowthAggregationService().getInsights(storeId, dateFrom, dateTo);
  return c.json({ success: true, data });
});

marketingRouter.post('/aggregate', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const { dateFrom, dateTo } = getPeriod(c);
  await new GrowthAggregationService().aggregateProductPerformance(storeId, dateFrom, dateTo);
  return c.json({ success: true, data: { ok: true } });
});

// ─── Live Radar ───

const live = new LivePresenceService();
const snapshots = new LiveSnapshotService();

marketingRouter.get('/live/overview', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const data = await live.getOverview(storeId);
  return c.json({ success: true, data });
});

marketingRouter.get('/live/pages', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const data = await live.getPages(storeId);
  return c.json({ success: true, data });
});

marketingRouter.get('/live/devices', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const data = await live.getDevices(storeId);
  return c.json({ success: true, data });
});

marketingRouter.get('/live/sources', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const data = await live.getSources(storeId);
  return c.json({ success: true, data });
});

marketingRouter.get('/live/funnel', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const data = await live.getFunnel(storeId);
  return c.json({ success: true, data });
});

marketingRouter.get('/live/alerts', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const data = await live.getAlerts(storeId);
  return c.json({ success: true, data });
});

marketingRouter.get('/live/geo', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const data = await live.getGeo(storeId);
  return c.json({ success: true, data });
});

marketingRouter.get('/live/history', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const range = (c.req.query('range') ?? '24h') as '24h' | '7d';
  const interval = (c.req.query('interval') ?? '15m') as '15m' | '1h';

  if (!['24h', '7d'].includes(range)) {
    return c.json({ success: false, error: { code: 'INVALID_RANGE', message: 'Invalid range' } }, 400);
  }
  if (!['15m', '1h'].includes(interval)) {
    return c.json({ success: false, error: { code: 'INVALID_INTERVAL', message: 'Invalid interval' } }, 400);
  }

  const data = await snapshots.getHistory(storeId, range, interval);
  return c.json({ success: true, data });
});

// ─── Marketing Actions ───

const actions = new MarketingActionService();

marketingRouter.get('/actions', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const status = c.req.query('status') || undefined;
  const type = c.req.query('type') || undefined;
  const page = Number(c.req.query('page') ?? 1);
  const limit = Number(c.req.query('limit') ?? 20);
  const data = await actions.getActions(storeId, { status, type, page, limit });
  return c.json({ success: true, data });
});

marketingRouter.get('/actions/:id', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const data = await actions.getActionById(storeId, id);
  if (!data) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Action not found' } }, 404);
  }
  return c.json({ success: true, data });
});

// WRITE — requires promotions:update (not reports:read). The previous
// permission allowed any reports-only role to mutate marketing
// actions; the dashboard route in App.tsx gates the page on
// `promotions:read`, but a careful reader of the audit could call
// PATCH directly. See audit P0 #8 (2026-06-25).
marketingRouter.patch('/actions/:id', requirePermission('promotions:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const body = await c.req.json();

  const validStatuses = ['active', 'dismissed', 'done', 'snoozed'];
  if (!body.status || !validStatuses.includes(body.status)) {
    return c.json({ success: false, error: { code: 'INVALID_STATUS', message: 'Invalid status' } }, 400);
  }

  if (body.status === 'snoozed' && !body.snoozedUntil) {
    return c.json({ success: false, error: { code: 'MISSING_SNOOZED_UNTIL', message: 'snoozedUntil is required when snoozing' } }, 400);
  }

  const data = await actions.updateActionState(storeId, id, {
    status: body.status,
    snoozedUntil: body.snoozedUntil,
  });

  if (!data) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Action not found' } }, 404);
  }
  return c.json({ success: true, data });
});

// WRITE — generation triggers a heavy server pass. promotions:update
// matches the "edit marketing campaigns" intent and gates expensive
// recomputation behind a write permission.
marketingRouter.post('/actions/generate', requirePermission('promotions:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const generated = await actions.generateActions(storeId);
  return c.json({ success: true, data: { generated: generated.length } });
});

marketingRouter.get('/actions/:id/logs', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const id = Number(c.req.param('id'));
  const action = await actions.getActionById(storeId, id);
  if (!action) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Action not found' } }, 404);
  }
  const data = await actions.getLogs(storeId, action.actionFingerprint);
  return c.json({ success: true, data });
});

// ─── Marketing Settings ───

marketingRouter.get('/settings', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const data = await actions.getSettings(storeId);
  return c.json({ success: true, data });
});

marketingRouter.get('/settings/thresholds', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const data = await actions.getThresholds(storeId);
  return c.json({ success: true, data });
});

// WRITE — updates marketing thresholds. promotions:update is the
// natural fit; the read-side endpoint above stays on reports:read.
marketingRouter.patch('/settings', requirePermission('promotions:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = await c.req.json();

  if (!body.key || typeof body.key !== 'string') {
    return c.json({ success: false, error: { code: 'INVALID_KEY', message: 'key is required' } }, 400);
  }
  if (!body.valueJson || typeof body.valueJson !== 'object') {
    return c.json({ success: false, error: { code: 'INVALID_VALUE', message: 'valueJson is required' } }, 400);
  }

  await actions.updateSetting(storeId, body.key, body.valueJson);
  return c.json({ success: true, data: { ok: true } });
});

// ─── Customer Segmentation ───

// P1-10 audit fix: the merchant-dashboard UI gates
// /sales/customers/segments on `customers:read` (it's customer PII/
// behavior data nested under the Customers section), but this route
// checked the coarser `reports:read` — an employee with `customers:read`
// but not `reports:read` (e.g. the `orders_manager` preset) saw the page
// load then got 403 on every call; conversely `reports:read`-only roles
// like `marketing` could hit the API directly even though the UI hid the
// page from them.
const segments = new CustomerSegmentationService();

marketingRouter.get('/segments/summary', requirePermission('customers:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const data = await segments.getSummary(storeId);
  return c.json({ success: true, data });
});

marketingRouter.get('/segments/:type', requirePermission('customers:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const type = c.req.param('type') ?? '';
  const validTypes = ['high_value', 'repeat_buyers', 'new_customers', 'inactive', 'cart_abandoners', 'at_risk', 'one_time_buyers', 'coupon_users'];
  if (!validTypes.includes(type)) {
    return c.json({ success: false, error: { code: 'INVALID_SEGMENT', message: 'Invalid segment type' } }, 400);
  }
  const page = Number(c.req.query('page') ?? 1);
  const limit = Number(c.req.query('limit') ?? 20);
  // The runtime `validTypes` check above narrows `type` to the
  // CustomerSegmentType union, but TypeScript can't follow `includes()`
  // narrowing on a `string[]` literal — `type` stays `string`. The
  // cast is safe because the line below is unreachable for invalid
  // values.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await segments.getSegmentMembers(storeId, type as any, { page, limit });
  return c.json({ success: true, data });
});

marketingRouter.get('/segments/settings/thresholds', requirePermission('customers:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const data = await segments.getThresholds(storeId);
  return c.json({ success: true, data });
});

marketingRouter.patch('/segments/settings/thresholds', requirePermission('customers:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const body = await c.req.json();
  await segments.updateThresholds(storeId, body);
  return c.json({ success: true, data: { ok: true } });
});

export { marketingRouter };
