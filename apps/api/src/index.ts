import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/serve-static';
import { FALLBACK_PRIMARY } from '@haa/shared';
import { env } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { errorHandler } from './middleware/error-handler.js';
import { initObservability } from './services/observability.js';
import { logQueueStartupStatus } from './services/queue.js';
import { securityHeaders } from './middleware/security-headers.js';
import { csrfOrigin } from './middleware/csrf-origin.js';
import { requestId } from './middleware/request-id.js';
import { structuredLogger } from './middleware/structured-logger.js';
import { rateLimiter } from './middleware/rate-limiter.js';
import { getContent, ROOT } from './middleware/serve-local-storage.js';
import { storageGuard } from './middleware/storage-guard.js';
import { getCachedTenantId, setCachedTenantId } from './middleware/store-tenant-cache.js';
import { adminRouter } from './routes/admin/index.js';
import { authRouter } from './routes/auth.js';
import { productsRouter } from './routes/products.js';
import { categoriesRouter } from './routes/categories.js';
import { brandsRouter } from './routes/brands.js';
import { tagsRouter } from './routes/tags.js';
import { uploadsRouter } from './routes/uploads.js';
import { customersRouter } from './routes/customers.js';
import { cartRouter } from './routes/cart.js';
import { checkoutRouter } from './routes/checkout.js';
import { ordersRouter } from './routes/orders.js';
import { codRouter } from './routes/cod.js';
import { shippingRouter } from './routes/shipping.js';
import { walletRouter } from './routes/wallet.js';
import { dashboardRouter } from './routes/dashboard.js';
import { settingsRouter } from './routes/settings.js';
import { storefrontRouter } from './routes/storefront/index.js';
import { resolveStoreByHost } from './routes/storefront/_shared.js';
import { CustomDomainService } from '@haa/commerce-core';
import { merchantDataRouter } from './routes/merchant-data.js';
import { couponsRouter } from './routes/coupons.js';
import { exportsRouter } from './routes/exports.js';
import { importsRouter } from './routes/imports.js';
import { promotionsRouter } from './routes/promotions.js';
import { reportsRouter } from './routes/reports.js';
import { policiesRouter } from './routes/policies.js';
import { abandonedCartsRouter } from './routes/abandoned-carts.js';
import { complianceRouter } from './routes/compliance.js';
import { shipmentsRouter } from './routes/shipments.js';
import { otoWebhookRouter, shippingWebhooksRouter } from './routes/shipping-webhooks.js';
import { webhooksRouter } from './routes/webhooks.js';
import { subscriptionsRouter } from './routes/subscriptions.js';
import { notificationsRouter } from './routes/notifications.js';
import { apiKeysRouter } from './routes/api-keys.js';
import { integrationsRouter } from './routes/integrations.js';
import { migrationRouter } from './routes/migration.js';
import { publicApiRouter } from './routes/public-api.js';
import { feedsRouter } from './routes/feeds.js';
import { aiRouter } from './routes/ai-agent.js';
import { marketplacesRouter } from './routes/marketplaces.js';
import { haaMarketplaceRouter } from './routes/haa-marketplace.js';
import { sitemapRouter } from './routes/sitemap.js';
import { createLandingAIAgentRoute } from './routes/landing-ai-agent.js';
import { paymentSettingsRouter } from './routes/payment-settings.js';
import { providerStatusRouter } from './routes/provider-status.js';
import { supportRouter } from './routes/support.js';
import { supportErrorsRouter } from './routes/support-errors.js';
import { employeesRouter } from './routes/employees.js';
import { auditRouter } from './routes/audit.js';
import { marketingRouter } from './routes/marketing.js';
import { healthRouter } from './routes/health.js';
import { permissionsRouter } from './routes/permissions.js';
import { pixelsRouter } from './routes/pixels.js';
import { cartCampaignsRouter } from './routes/cart-campaigns.js';
import { whatsappCampaignsRouter } from './routes/whatsapp-campaigns.js';
import { loyaltyRouter } from './routes/loyalty.js';
import { customDomainRouter } from './routes/custom-domain.js';
import { outboundWebhooksRouter } from './routes/outbound-webhooks.js';
import { zatcaRouter } from './routes/zatca.js';
import { createDbClient, closeDbClient } from '@haa/db';
import { eq, sql } from 'drizzle-orm';
import { setTokenVersionVerifier, setStoreTenantResolver } from '@haa/auth-core';
import * as s from '@haa/db/schema';

const app = new Hono();

app.use('*', requestId());
app.use('*', structuredLogger());
app.use('*', securityHeaders());
app.use('*', cors({
  origin: env.CORS_ORIGINS,
  credentials: true,
}));
// CSRF defense-in-depth: reject mutating requests from origins not in
// the allow-list. Mounted after CORS so we can rely on the same
// env.CORS_ORIGINS list. Webhooks and server-to-server calls (no
// Origin header) pass through automatically.
app.use('*', csrfOrigin());

app.onError(errorHandler);

// Wire observability (Sentry if SENTRY_DSN set + @sentry/node installed,
// noop otherwise). Must happen after `app.onError` so unhandled errors
// routed through the handler are captured.
initObservability();

// Single, clear queue-mode line at startup (Batch 3) — never logs secrets.
logQueueStartupStatus();

const storefrontBrowseRateLimit = rateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: env.NODE_ENV === 'development' ? 2_000 : 600,
  message: 'تم تجاوز حد التصفح مؤقتاً. حاول لاحقاً.',
});

// TASK-0043 Track 4A — P1-9 separate rate limit on POST /marketplace/orders.
// The browse limit (600/10min) is too generous for order creation.
// Stricter limit prevents enumeration + spam + cost amplification.
const marketplaceOrderRateLimit = rateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: env.NODE_ENV === 'development' ? 100 : 30,
  message: 'تم تجاوز حد إنشاء الطلبات مؤقتاً. حاول لاحقاً.',
});

const checkoutRateLimit = rateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: env.NODE_ENV === 'development' ? 300 : 60,
  message: 'تم تجاوز حد عمليات السلة أو الدفع مؤقتاً. حاول لاحقاً.',
});

const webhookRateLimit = rateLimiter({
  windowMs: 60 * 1000,
  maxRequests: env.NODE_ENV === 'development' ? 600 : 180,
  keyGenerator: (c) => `webhook:${c.req.param('provider') || 'generic'}:${c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? c.req.header('x-real-ip') ?? 'unknown'}`,
  message: 'Webhook rate limit exceeded.',
});

const strictRateLimit = rateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: env.NODE_ENV === 'development' ? 100 : 10,
});

// Body size limit: reject requests over 5MB
app.use('*', async (c, next) => {
  const contentLength = c.req.header('content-length');
  if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
    return c.json({ success: false, error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds 5MB limit' } }, 413);
  }
  await next();
});

// Storage rate limit: prevent crawling/enumeration of uploaded files
const storageRateLimit = rateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  message: 'Too many storage requests. Slow down.',
});

// Serve uploaded images from local storage with access guard
app.use('/storage/*', storageRateLimit, storageGuard(), serveStatic({
  root: ROOT,
  getContent,
  rewriteRequestPath: (p: string) => p.replace(/^\/storage/, ''),
}));

// Upload rate limiting: 20 uploads per 10 minutes per store
const uploadRateLimit = rateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 20,
  keyGenerator: (c) => `upload:${c.req.param('storeId') || 'unknown'}`,
});

// Public rate-limited routes
app.use('/s/*', storefrontBrowseRateLimit);
app.use('/marketplace/*', storefrontBrowseRateLimit);
// TASK-0043 Track 4A — P1-9: stricter rate limit on POST /marketplace/orders.
// Order creation needs its own counter because:
//   - Browse rate limit is generous (600/10min) — too high for orders
//   - Phone enumeration + spam + cost amplification risks
// Note: This applies to ALL methods on /marketplace/orders, but the
// only mutating method is POST. GET /orders/:num uses access_token
// (TASK-0040 Track 1B) and is acceptable at this rate.
app.use('/marketplace/orders', marketplaceOrderRateLimit);
app.use('/s/:slug/cart/*', checkoutRateLimit);
app.use('/s/:slug/checkout/*', checkoutRateLimit);
app.use('/auth/login', strictRateLimit);
app.use('/admin/login', strictRateLimit);
app.use('/auth/register', strictRateLimit);
app.use('/admin', strictRateLimit);
app.use('/webhooks/*', webhookRateLimit);

// Health Check
app.route('/health', healthRouter);

// Local error reporting endpoint
app.route('/internal/support-errors', supportErrorsRouter);

// Image upload rate limit
app.use('/merchant/:storeId/products/:productId/images', uploadRateLimit);
app.use('/merchant/:storeId/uploads', uploadRateLimit);



app.get('/health', async (c) => {
  let dbStatus = 'unknown';
  try {
    await db.execute(sql`SELECT 1 AS ok`);
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  return c.json({
    api: 'ok',
    db: dbStatus,
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.route('/admin', adminRouter);
app.route('/auth', authRouter);
app.route('/merchant/:storeId/products', productsRouter);
app.route('/merchant/:storeId/categories', categoriesRouter);
app.route('/merchant/:storeId/brands', brandsRouter);
app.route('/merchant/:storeId/tags', tagsRouter);
app.route('/merchant/:storeId/uploads', uploadsRouter);
app.route('/merchant/:storeId/customers', customersRouter);
app.route('/merchant/:storeId/cart', cartRouter);
app.route('/merchant/:storeId/checkout', checkoutRouter);
app.route('/merchant/:storeId/orders', ordersRouter);
app.route('/merchant/:storeId/orders', codRouter);
app.route('/merchant/:storeId/shipping', shippingRouter);
app.route('/merchant/:storeId/wallet', walletRouter);
app.route('/merchant/:storeId/dashboard', dashboardRouter);
app.route('/merchant/:storeId/settings', settingsRouter);
app.route('/merchant/:storeId/settings/pixels', pixelsRouter);
app.route('/merchant/:storeId', merchantDataRouter);
app.route('/merchant/:storeId/provider-status', providerStatusRouter);
app.route('/merchant/:storeId/coupons', couponsRouter);
app.route('/merchant/:storeId/exports', exportsRouter);
app.route('/merchant/:storeId/imports', importsRouter);
app.route('/merchant/:storeId/promotions', promotionsRouter);
app.route('/merchant/:storeId/reports', reportsRouter);
app.route('/merchant/:storeId/policies', policiesRouter);
app.route('/merchant/:storeId/abandoned-carts', abandonedCartsRouter);
app.route('/merchant/:storeId/compliance', complianceRouter);
// Storefront SPA — serve built files for browser navigation
const STOREFRONT_DIST = resolve(__dirname, '../../storefront/dist');
const STOREFRONT_INDEX = resolve(STOREFRONT_DIST, 'index.html');
function readStorefrontHtml(): string | null {
  if (!existsSync(STOREFRONT_INDEX)) return null;
  return readFileSync(STOREFRONT_INDEX, 'utf8');
}

// Serve storefront static assets (JS, CSS, images)
app.use('/assets/*', serveStatic({
  root: STOREFRONT_DIST,
  getContent,
}));
app.get('/vite.svg', serveStatic({
  root: STOREFRONT_DIST,
  getContent,
}));

// SPA middleware: serve HTML for browser navigation under /s/*
// Must be registered BEFORE API routes so HTML navigation is caught first.
// API calls (with Accept: */* or application/json) will pass through.
app.use('/s/*', async (c, next) => {
  const accept = c.req.header('accept') || '';
  const storefrontHtml = readStorefrontHtml();
  if (storefrontHtml && accept.includes('text/html')) {
    return c.html(storefrontHtml);
  }
  await next();
});

app.use('/marketplace*', async (c, next) => {
  const accept = c.req.header('accept') || '';
  const storefrontHtml = readStorefrontHtml();
  if (storefrontHtml && accept.includes('text/html')) {
    return c.html(storefrontHtml);
  }
  await next();
});

// Resolve the store for the current Host (QA Custom Domain). Lets the SPA,
// when served on a merchant custom domain or a *.haastores.com subdomain,
// discover which store slug to bootstrap. Reads the forwarded/real Host.
// NOTE: registered WITHOUT the /api prefix — Caddy's `handle_path /api/*`
// strips /api before forwarding, so the SPA's request('/resolve-host') (which
// becomes /api/resolve-host) arrives here as /resolve-host.
app.get('/resolve-host', async (c) => {
  const host = c.req.header('x-forwarded-host')?.split(',')[0]?.trim()
    || c.req.header('host')
    || '';
  const store = await resolveStoreByHost(host);
  if (!store || store.status !== 'active' || !store.isActive || store.publishStatus !== 'published') {
    return c.json({ success: true, data: { slug: null } });
  }
  return c.json({ success: true, data: { slug: store.slug, name: store.name } });
});

// On-demand TLS gate for Caddy (QA Custom Domain). Caddy calls this before
// issuing a Let's Encrypt cert for an unknown host. We return 200 ONLY for a
// genuinely active custom domain, so an attacker can't force cert issuance for
// arbitrary hostnames (cert-exhaustion / rate-limit DoS). Any other host -> 404.
// No /api prefix (Caddy strips it); the Caddy on_demand `ask` points directly
// at http://api:3001/internal/tls-check.
app.get('/internal/tls-check', async (c) => {
  const domain = c.req.query('domain') || '';
  if (!domain) return c.json({ ok: false }, 400);
  const store = await new CustomDomainService().getStoreByActiveDomain(domain);
  if (!store) return c.json({ ok: false }, 404);
  return c.json({ ok: true });
});

// Storefront API routes (JSON responses)
app.route('/s', storefrontRouter);
app.route('/marketplace', haaMarketplaceRouter);
app.route('/', sitemapRouter);
// DECISION-OS-015: Caddy strips /api/* before forwarding (deploy/{staging,production}/Caddyfile).
// Hono mounts WITHOUT the /api/ prefix; client SPAs continue to call /api/...
app.route('/landing-ai-agent', createLandingAIAgentRoute());
app.get('/brand', async (c) => {
  try {
    const [row] = await db
      .select({
        id: s.tenants.id,
        name: s.tenants.name,
        logoUrl: s.tenants.logoUrl,
        primaryColor: s.stores.primaryColor,
      })
      .from(s.tenants)
      .leftJoin(s.stores, eq(s.stores.tenantId, s.tenants.id))
      .where(eq(s.tenants.status, 'active'))
      .orderBy(s.stores.id)
      .limit(1);
    if (!row) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'No active tenant' } }, 404);
    return c.json({ success: true, data: { primaryColor: row.primaryColor ?? FALLBACK_PRIMARY, tenantName: row.name, logoUrl: row.logoUrl } });
  } catch {
    return c.json({ success: true, data: { primaryColor: FALLBACK_PRIMARY } });
  }
});
app.route('/merchant/:storeId/shipments', shipmentsRouter);
app.route('/webhooks/shipping', shippingWebhooksRouter);
app.route('/webhooks/oto', otoWebhookRouter);
app.route('/webhooks', webhooksRouter);
app.route('/merchant/:storeId/subscriptions', subscriptionsRouter);
app.route('/merchant/:storeId/notifications', notificationsRouter);
app.route('/merchant/:storeId/api-keys', apiKeysRouter);
app.route('/merchant/:storeId/integrations', integrationsRouter);
app.route('/merchant/:storeId/migration', migrationRouter);
// DECISION-OS-015: Caddy strips /api/* — Hono mount without the /api/ prefix.
// External merchants call /api/v1/...; Caddy delivers /v1/... here.
app.route('/v1', publicApiRouter);
app.route('/merchant/:storeId/feeds', feedsRouter);
app.route('/merchant/:storeId/ai', aiRouter);
app.route('/merchant/:storeId/marketplaces', marketplacesRouter);
app.route('/merchant/:storeId/payment-providers', paymentSettingsRouter);
  app.route('/merchant/:storeId/employees', employeesRouter);
  app.route('/merchant/:storeId/permissions', permissionsRouter);
app.route('/merchant/:storeId', supportRouter);
app.route('/merchant/:storeId/audit', auditRouter);
app.route('/merchant/:storeId/marketing', marketingRouter);
app.route('/merchant/:storeId/abandoned-carts/campaigns', cartCampaignsRouter);
app.route('/merchant/:storeId/whatsapp-campaigns', whatsappCampaignsRouter);
app.route('/merchant/:storeId/loyalty', loyaltyRouter);
app.route('/merchant/:storeId/domain', customDomainRouter);
app.route('/merchant/:storeId/outbound-webhooks', outboundWebhooksRouter);
app.route('/merchant/:storeId', zatcaRouter);

const port = env.API_PORT;

// Initialize the DB pool singleton at startup (not per-request)
const db = createDbClient();

// Verify connectivity on startup
db.execute(sql`SELECT 1 AS ok`).catch(() => {
  console.warn('⚠️  DB not reachable at startup — will retry on first request');
});

// JWT token version verifier: revoke tokens on logout by checking DB
setTokenVersionVerifier(async (decoded) => {
  try {
    const [user] = await db.select({ tokenVersion: s.users.tokenVersion })
      .from(s.users)
      .where(eq(s.users.id, decoded.userId))
      .limit(1);
    if (!user) return false;
    return user.tokenVersion === decoded.tokenVersion;
  } catch {
    // If DB is unreachable, fail closed for security
    return false;
  }
});

// BOLA/IDOR Defense: Store→Tenant resolver with TTL cache.
// Resolves which tenant owns a store to enforce tenant boundary on every request.
setStoreTenantResolver(async (storeId) => {
  const cached = getCachedTenantId(storeId);
  if (cached !== undefined) return cached;
  try {
    const [store] = await db
      .select({ tenantId: s.stores.tenantId })
      .from(s.stores)
      .where(eq(s.stores.id, storeId))
      .limit(1);
    if (store) {
      setCachedTenantId(storeId, store.tenantId);
      return store.tenantId;
    }
    return null;
  } catch {
    return null;
  }
});

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`🚀 Haa Stores API ready at http://localhost:${info.port}`);
});

// Graceful shutdown: close DB pool, stop accepting
process.on('SIGTERM', async () => {
  await closeDbClient();
  process.exit(0);
});
process.on('SIGINT', async () => {
  await closeDbClient();
  process.exit(0);
});

export default app;
