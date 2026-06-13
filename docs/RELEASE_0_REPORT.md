# Release 0 Report — Foundation

## 1. بنية المشروع

```
haa-stores-core/
├── apps/
│   └── api/                        # Hono API (TypeScript)
│       └── src/
│           ├── index.ts            # Entry: Hono app + CORS + logger + health
│           └── routes/auth.ts      # Auth: register, login, me, logout
├── packages/
│   ├── shared/                     # Types, Zod schemas, Constants
│   ├── db/                         # Drizzle ORM + Schema + Client + Seed
│   │   └── src/
│   │       ├── schema/            # 18 schema files → 44 tables
│   │       │   ├── tenants.ts
│   │       │   ├── users.ts
│   │       │   ├── tenant_users.ts
│   │       │   ├── stores.ts
│   │       │   ├── products.ts
│   │       │   ├── categories.ts
│   │       │   ├── customers.ts
│   │       │   ├── roles.ts
│   │       │   ├── cart.ts
│   │       │   ├── checkout.ts
│   │       │   ├── orders.ts
│   │       │   ├── payments.ts
│   │       │   ├── shipping.ts
│   │       │   ├── wallet.ts
│   │       │   ├── webhook.ts
│   │       │   └── audit.ts
│   │       ├── migrations/        # SQL migration (0000_initial)
│   │       └── seed/               # Seed script (تاجر + 8 منتجات + شحن + عملاء)
│   ├── auth-core/                  # bcrypt, JWT, RBAC middlewares
│   ├── commerce-core/              # Placeholder (Release 1)
│   ├── shipping-core/              # Placeholder (Release 1)
│   ├── wallet-core/                # Placeholder (Release 1)
│   ├── integration-core/           # Placeholder (Release 1)
│   └── notification-core/          # Placeholder (Release 2+)
├── docker-compose.yml              # Postgres 16 Alpine + MinIO
├── docs/
│   ├── DATABASE_SCOPE.md           # (هذا الملف)
│   └── RELEASE_0_REPORT.md         # (هذا الملف)
├── .env.example
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── README.md
```

## 2. الميغراشن الحالي

| الميغراشن | الجداول | الحالة |
|-----------|---------|--------|
| `0000_initial` | 44 جدول (جميعها) | ✅ منفذة |

> **ملاحظة:** الـ spec طلب 3 ميغراشن مقسمة (0001_foundation, 0002_commerce_core, 0003_checkout_orders_shipping_wallet). لكن drizzle-kit يولد snapshot واحد. التقسيم سيتم في Release 1 بإعادة هيكلة الـ migrations يدويًا.

## 3. حالة Docker

| الحاوية | الحالة |
|---------|--------|
| Docker Engine | ❌ غير مثبت على جهاز التطوير |
| Postgres Container | ❌ — يُستخدم Postgres محلي (Homebrew) بدلاً منه |
| MinIO Container | ❌ — الصور ستُحل بـ LocalStorageAdapter مؤقتًا في Release 1 |

**القرار:** Docker غير متوفر. Postgres يُشغل محليًا. MinIO سيتم استبداله بـ Local Adapter مؤقت لحين تثبيت Docker.

## 4. حالة Postgres

| البيان | القيمة |
|--------|--------|
| الإصدار | PostgreSQL 16 (Homebrew) |
| قاعدة البيانات | `haastores` |
| المستخدم | `haa` |
| كلمة المرور | `haa_secret_2024` |
| المنفذ | `5432` |
| الاتصال | ✅ يعمل |
| الـ Migrations | ✅ منفذة |
| الـ Seed | ✅ منفذ |

## 5. حالة MinIO

MinIO غير متوفر (Docker غير مثبت).

**قرار معتمد:** في Release 1، سيتم إنشاء `LocalStorageAdapter` كبديل مؤقت يقوم بحفظ الملفات محليًا في `./storage/` إلى أن يتوفر Docker/MinIO.

## 6. بيانات Seed

| البيانات | الحالة |
|----------|--------|
| تاجر تجريبي | ✅ `هاء للمتاجر` |
| مستخدم Owner | ✅ `ahmed@example.com` / `Test@123456` |
| متجر تجريبي | ✅ `متجر هاء التجريبي` (slug: `haa-demo`) |
| 8 منتجات | ✅ سماعة, ساعة, شاحن, تيشيرت, حقيبة, طقم قدور, مفرش, مكتبة |
| 3 تصنيفات | ✅ إلكترونيات, ملابس, منزل ومطبخ |
| 3 عملاء | ✅ سارة, محمد, نورة |
| إعدادات الشحن | ✅ الرياض 20, جدة 30, الدمام 30, مجاني فوق 300 |
| محفظة | ✅ رصيد 0 (جاهز) |

## 7. نتائج Typecheck / Build

| الحزمة | Build | Typecheck |
|--------|-------|-----------|
| `@haa/shared` | ✅ | ✅ |
| `@haa/auth-core` | ✅ | ✅ |
| `@haa/db` | ✅ | ✅ |
| `@haa/api` | ✅ | ✅ |
| `@haa/commerce-core` | ✅ | ✅ |
| `@haa/shipping-core` | ✅ | ✅ |
| `@haa/wallet-core` | ✅ | ✅ |
| `@haa/integration-core` | ✅ | ✅ |
| `@haa/notification-core` | ✅ | ✅ |

## 8. API Routes المنفذة

| Method | Route | Auth | الحالة |
|--------|-------|------|--------|
| `GET` | `/health` | لا | ✅ يعمل |
| `POST` | `/auth/register` | لا | ✅ يعمل |
| `POST` | `/auth/login` | لا | ✅ يعمل |
| `GET` | `/auth/me` | JWT | ✅ يعمل |
| `POST` | `/auth/logout` | JWT | ✅ يعمل |

## 9. JWT Payload

كل JWT يحتوي (مؤكد بالتجربة المباشرة):

```json
{
  "userId": 1,
  "tenantId": 1,
  "activeStoreId": 1,
  "roles": ["owner"],
  "permissions": [
    "stores:read", "stores:update",
    "products:read", "products:create", "products:update", "products:delete",
    "categories:manage",
    "orders:read", "orders:update_status", "orders:cancel", "orders:refund",
    "customers:read",
    "wallet:read", "wallet:request_payout",
    "shipping:manage",
    "settings:update",
    "staff:manage",
    "reports:read"
  ]
}
```

## 10. ملاحظات قبل Release 1

1. **جدول dormant:** 25 جدولاً من 44 غير مستخدمة. راجع `DATABASE_SCOPE.md` للتفاصيل.
2. **Docker غير مثبت:** سيتم استخدام LocalStorageAdapter مؤقتًا للصور.
3. **MinIO غير متوفر:** لا يمكن رفع الصور أو تخزينها في Release 1 إلا محليًا.
4. **جودة الكود:** الـ `auth.ts` يستورد `requirePermission` و `and` من drizzle-orm بدون استخدامها. سيتم تنظيفها.
5. **الأمان:** Rate Limiting غير مطبق بعد. سيضاف مع public endpoints.
6. **الاختبارات:** لا توجد اختبارات بعد. ستضاف في Release 4.
