# Haa Stores Core Architecture

## Overview

A **local-first, multi-tenant e-commerce platform** built as a monorepo with three application entry points (API, Dashboard, Storefront) and shared core packages. Designed to be independent from the Haa platform, with future integration via API/webhooks.

```
┌─────────────────────────────────────────┐
│           apps/storefront              │
│   Public customer UI (port 5174)       │
│   No auth, Arabic RTL, mobile-first    │
├─────────────────────────────────────────┤
│         apps/merchant-dashboard         │
│   Merchant admin UI (port 5173)        │
│   JWT auth, store-scoped operations    │
├─────────────────────────────────────────┤
│            apps/api                     │
│   Hono REST API (port 3000)            │
│   Auth | Merchant | Public routes       │
├─────────────────────────────────────────┤
│            packages/                    │
│   ── auth-core      JWT + middleware    │
│   ── commerce-core  Products/Orders/Cart│
│   ── shipping-core  Manual shipping     │
│   ── wallet-core    Wallet ledger       │
│   ── integration-core Webhooks/Audit    │
│   ── notification-core  (dormant)       │
│   ── db             Drizzle schema+seed │
│   ── shared         Constants/types     │
└─────────────────────────────────────────┘
```

## Key Design Decisions

1. **Multi-tenancy**: Every entity carries `storeId`. JWT scoped with `activeStoreId`. Middleware chain: `requireAuth() → requireStoreAccess() → requirePermission()`.

2. **Public vs Merchant separation**: Storefront routes under `/s/:slug`, no auth. Merchant routes under `/merchant/:storeId`, JWT required.

3. **Idempotent checkout**: `idempotencyKey` prevents duplicate session creation. `checkoutSessionId` guard prevents duplicate order creation.

4. **Wallet ledger**: All financial actions use `WalletLedger` recording credit/debit entries. Entries created inside the same DB transaction as the order.

5. **Manual shipping only**: No real carrier integration. Tracking numbers entered manually by the merchant.

6. **Fake payment**: `FakePaymentProvider` simulates success/failure. No real payment processing.

7. **Arabic RTL first**: Default language is Arabic, RTL layout throughout Dashboard and Storefront.

## Packages

| Package | Purpose |
|---------|---------|
| `auth-core` | JWT creation/verification, middleware (requireAuth, requireStoreAccess, requirePermission) |
| `commerce-core` | ProductsService, CategoriesService, CartService, CheckoutService, OrdersService, CustomersService |
| `shipping-core` | ShippingService (methods, zones, rates, shipments), ManualShippingProvider |
| `wallet-core` | WalletLedger (recordEntry, getBalance, listEntries) |
| `integration-core` | WebhookOutboxService, AuditLogService |
| `db` | Drizzle schema (44 tables), migrations, seed, DbClient |
| `shared` | Constants (ORDER_STATUS_TRANSITIONS, ROLE_PERMISSIONS), Zod schemas |

## Apps

| App | Port | Purpose |
|-----|------|---------|
| API | 3000 | Hono REST API |
| Merchant Dashboard | 5173 | React admin panel |
| Storefront | 5174 | React customer UI |

## Independence from Haa

The platform operates fully independently. The "Haa Stores Core" name reflects the origin as a spin-off from the Haa ecosystem. Future release may add:

- Webhook integration with Haa
- OAuth with Haa accounts
- Marketplace listing on Haa

But the MVP is fully self-contained.

## Haa Stores Differentiation Strategy / استراتيجية تفوق هاء متاجر

### الرؤية

هاء متاجر **لا تنافس بعدد المزايا**، بل بثلاثة أبعاد:

1. **الوضوح المالي** — كل ريال مسجل في المحفظة، كل رسم مفهوم، كشف حساب دقيق
2. **بساطة التشغيل** — تاجر غير تقني يدير متجره بدون تدريب
3. **سرعة الإطلاق** — من التسجيل إلى أول طلب في أقل وقت

### الأولويات التقنية (انعكاس على Architecture)

| الأولوية | الأثر على العمارة |
|----------|-------------------|
| إطلاق سريع | 3 apps فقط (API + Dashboard + Storefront)، لا خدمات معقدة |
| إدارة سهلة | Commerce-core بسيط، no caching layer in MVP |
| Checkout واضح | Session-based checkout، idempotency guards |
| شحن مفهوم | Manual shipping only، لا carriers |
| محفظة دقيقة | WalletLedger مع double-entry في كل transaction |
| تجربة سعودية | RTL أولاً، لا ترجمة إنجليزية مؤقتًا |

### القرارات الممنوعة (حاليًا)

- ❌ ميزات Marketplace
- ❌ AI / recommendations
- ❌ تطبيق موبايل
- ❌ CMS كامل (About/Contact صفحات ثابتة)
- ❌ تكامل حسابات (محاسبة، مخزون متقدم)

انظر `docs/PRODUCT_STRATEGY.md` للتفاصيل الكاملة وخارطة التفوق.
