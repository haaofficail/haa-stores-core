# Database Scope — Release 0

## مقدمة

ملف يوثق حالة جداول قاعدة البيانات في Release 0.
الهدف: منع استخدام جداول لم تنضج بعد، وتوضيح الفرق بين الجداول النشطة والجداول الخاملة (dormant).

## إجمالي الجداول

| البيان | القيمة |
|--------|--------|
| إجمالي الجداول المنشأة | 44 |
| الجداول النشطة في Release 0 | 19 |
| الجداول الخاملة (Dormant) | 25 |
| الجداول المطلوبة في Core MVP | 27 |
| الجداول الإضافية (Early Created) | 17 |

## سبب وجود 44 جدولاً بدلاً من 27

الـ Core MVP Schedule كان يستهدف 27 جدولاً فقط. لكن أثناء التطبيق، أضيفت جداول إضافية للأسباب التالية:

1. **جداول الـ RBAC** (roles, permissions, role_permissions, user_store_roles):
   - أضيفت لأن نظام الصلاحيات مطلوب من البداية لتأمين API.
   - لو أُجلت، كان سيتطلب تغيير كلmiddleware لاحقًا.

2. **جداول الشحن الموسعة** (shipping_providers, shipping_provider_accounts, shipment_packages, shipment_labels, shipment_errors):
   - أضيفت لأن Shipping Core صمم كطبقة مستقبلية متكاملة.
   - بعضها (shipping_providers) يُستخدم فعليًا في seed.

3. **جداول الدفع الموسعة** (payment_transactions, payment_webhook_events):
   - أضيفت لدعم الـ idempotency وتتبع webhooks.
   - بدونها يصعب تطبيق outbox pattern لاحقًا.

4. **جداول المنتجات الموسعة** (product_options, product_option_values):
   - أضيفت لدعم المنتجات ذات الـ variants مستقبلًا.

5. **جداول Webhook** (webhook_endpoints, webhook_deliveries):
   - أضيفت كجزء من outbox pattern المتوقع في Release 1.

## الجداول النشطة (Active) — مستخدمة في Release 0

هذه الجداول مستخدمة فعليًا بواسطة seed data أو كود التشغيل:

| # | الجدول | الاستخدام |
|---|--------|-----------|
| 1 | `tenants` | إنشاء التاجر في register |
| 2 | `users` | إنشاء المستخدم + تسجيل الدخول |
| 3 | `tenant_users` | ربط المستخدم بالتاجر + الدور |
| 4 | `stores` | إنشاء المتجر + عرضه في /auth/me |
| 5 | `store_settings` | إنشاء تلقائي عند تسجيل المتجر |
| 6 | `products` | 8 منتجات في seed |
| 7 | `product_images` | صور لكل منتج في seed |
| 8 | `categories` | 3 تصنيفات في seed |
| 9 | `product_categories` | ربط المنتجات بالتصنيفات |
| 10 | `customers` | 3 عملاء في seed |
| 11 | `shipping_providers` | مزود الشحن اليدوي في seed |
| 12 | `shipping_methods` | 3 طرق شحن في seed |
| 13 | `shipping_zones` | 3 مناطق شحن في seed |
| 14 | `shipping_rates` | أسعار الشحن في seed |
| 15 | `wallet_accounts` | محفظة المتجر في seed |
| 16 | `roles` | دور owner في register |
| 17 | `permissions` | (منشأة لكن غير مستخدمة مباشرة) |
| 18 | `role_permissions` | (منشأة لكن غير مستخدمة) |
| 19 | `user_store_roles` | (منشأة لكن غير مستخدمة) |

## الجداول الخاملة (Dormant) — لا تستخدم في Release 0

**تحذير: هذه الجداول منشأة هيكليًا فقط. لا يوجد كود يقرأها أو يكتبها.**
استخدامها قبل Release 1+ سيؤدي إلى أخطاء أو بيانات غير متسقة.

### سيتم تفعيلها في Release 1 (Commerce Core):
| الجدول | سيستخدم في |
|--------|-----------|
| `carts` | Cart Service |
| `cart_items` | Cart Service |
| `checkout_sessions` | Checkout Service |
| `orders` | Orders Service |
| `order_items` | Orders Service |
| `order_status_history` | Orders State Machine |
| `payments` | Payments Service |
| `payment_attempts` | Payments Service |
| `shipments` | Shipping Shipment Service |
| `shipment_tracking_events` | Shipping Tracking |
| `wallet_entries` | Wallet Ledger Engine |
| `webhook_events` | Webhook Outbox Worker |
| `audit_logs` | Audit Logger |

### سيتم تفعيلها في Release 2+ (متقدم):
| الجدول | سيستخدم في |
|--------|-----------|
| `product_variants` | Product Variants |
| `product_options` | Product Options |
| `product_option_values` | Product Option Values |
| `customer_addresses` | Address Management |
| `payment_transactions` | Payment Transactions |
| `payment_webhook_events` | Payment Webhooks |
| `shipping_provider_accounts` | Provider Integration |
| `shipment_packages` | Shipment Packages |
| `shipment_labels` | Label Generation |
| `shipment_errors` | Error Tracking |
| `webhook_endpoints` | Webhook Config |
| `webhook_deliveries` | Webhook Delivery Log |

## قواعد صارمة

1. **ممنوع** كتابة كود يقرأ أو يكتب جداول Dormant قبل Release المخصص لها.
2. **ممنوع** الاعتماد على جداول Dormant في Business Logic.
3. **مسموح** بإضافة Seed Data إلى جداول Dormant في Release المخصص.
4. **مسموح** بإضافة Foreign Keys من جداول Active إلى Dormant (موجودة فعلًا).
5. أي كود جديد في Release 1 يجب أن يبدأ باستخدام الجدول فقط بعد إضافة Service Layer له.

## خريطة الطريق

```
Release 0 ─── 19 Active + 25 Dormant
Release 1 ─── 30 Active (carts → webhook_events تنتقل من Dormant)
Release 2 ─── 38 Active (product_variants → shipment_errors تنتقل)
Release 3+ ── الجداول المتبقية والجديدة
```
