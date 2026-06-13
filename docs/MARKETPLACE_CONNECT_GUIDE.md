# دليل ربط الأسواق — Marketplace Connection Guide

## نظرة عامة

لوحة تحكم هاء متاجر تدعم الربط مع 4 منصات بيع:
- **سلة** — OAuth 2.0
- **زد** — OAuth 2.0 + X-Manager-Token
- **نون** — JWT (مفاتيح خاصة)
- **أمازون** — SP-API (AWS Signature V4)

---

## 1. سلة (Salla)

### المتطلبات
- حساب تاجر في [سلة](https://salla.sa)
- تطبيق (Application) مسجل في [Salla Partners](https://partners.salla.sa)
- Client ID و Client Secret من التطبيق
- Redirect URI مضبوط في التطبيق

### طريقة الربط

```
🧑‍💼 التاجر:
1. افتح "قنوات البيع" ← اختر "سلة"
2. اضغط "ربط سلة"
3. سيتم تحويلك إلى صفحة تسجيل الدخول في سلة
4. سجل الدخول ووافق على الصلاحيات
5. سيتم إعادتك تلقائياً إلى لوحة التحكم
```

### متغيرات البيئة (للمطور)

```env
SALLA_CLIENT_ID=your_client_id
SALLA_CLIENT_SECRET=your_client_secret
SALLA_REDIRECT_URI=http://localhost:3000/api/merchant/{storeId}/marketplaces/salla/oauth/callback
```

### نطاق الصلاحيات المطلوبة
- `products.read` — قراءة المنتجات
- `products.write` — إدارة المنتجات
- `orders.read` — قراءة الطلبات
- `inventory.read` — قراءة المخزون
- `inventory.write` — تحديث المخزون

---

## 2. زد (Zid)

### المتطلبات
- حساب تاجر في [زد](https://zid.sa)
- تطبيق مسجل في [Zid Partners](https://partners.zid.sa)
- Client ID و Client Secret
- X-Manager-Token (صلاحية سنة، من لوحة تحكم زد)
- Redirect URI مضبوط

### طريقة الربط

```
🧑‍💼 التاجر:
1. افتح "قنوات البيع" ← اختر "زد"
2. اضغط "ربط زد"
3. سيتم تحويلك إلى صفحة تسجيل الدخول في زد
4. سجل الدخول ووافق على الصلاحيات
5. سيتم إعادتك تلقائياً إلى لوحة التحكم
```

### متغيرات البيئة (للمطور)

```env
ZID_CLIENT_ID=your_client_id
ZID_CLIENT_SECRET=your_client_secret
ZID_REDIRECT_URI=http://localhost:3000/api/merchant/{storeId}/marketplaces/zid/oauth/callback
```

### ملاحظات
- التوثيق يتطلب `Authorization` (JWT) + `X-Manager-Token` في كل طلب
- X-Manager-Token يُجدد من لوحة تحكم زد كل سنة

---

## 3. نون (Noon)

### المتطلبات
- حساب تاجر في [نون](https://noon.com/partner)
- Client ID (من نون بارتنرز)
- Private Key (مفتاح RSA خاص، من نون بارتنرز)
- Partner ID (اختياري)
- Seller Name (اختياري)

### طريقة الربط

```
🧑‍💼 التاجر:
1. افتح "قنوات البيع" ← اختر "نون"
2. أملأ الحقول التالية:
   - Client ID — من حساب نون بارتنرز
   - Private Key — المفتاح الخاص الكامل (يبدأ بـ -----BEGIN RSA PRIVATE KEY-----)
   - Seller Name — اختياري
   - Partner ID — اختياري
3. اضغط "ربط نون"
```

### مهم
- Private Key يجب أن يكون المفتاح كاملاً مع سطري البداية والنهاية
- لا حاجة لمتغيرات بيئة — البيانات تدخل من الواجهة مباشرة
- JWT يتم توليده تلقائياً من المفتاح الخاص لكل طلب

---

## 4. أمازون (Amazon SP-API)

### المتطلبات
1. حساب بائع في [Amazon Seller Central](https://sellercentral.amazon.com)
2. تطبيق SP-API مسجل في [Seller Central Partner Network](https://developer.amazonservices.com)
3. مستخدم IAM في حساب AWS مع الصلاحيات المناسبة
4. **البيانات المطلوبة:**
   - Client ID — من تطبيق SP-API
   - Client Secret — من تطبيق SP-API
   - Refresh Token — من عملية OAuth (مرة واحدة)
   - AWS Access Key — من مستخدم IAM
   - AWS Secret Key — من مستخدم IAM
   - Marketplace ID — السوق المستهدف

### طريقة الربط

```
🧑‍💼 التاجر:
1. افتح "قنوات البيع" ← اختر "أمازون"
2. أملأ الحقول التالية:
   - Client ID — من تطبيق SP-API
   - Client Secret — من تطبيق SP-API
   - Refresh Token — كود التحديث من أمازون
   - AWS Access Key — من AWS IAM
   - AWS Secret Key — من AWS IAM
   - السوق: السعودية / الإمارات / مصر / أمريكا / بريطانيا / ألمانيا
3. اضغط "ربط أمازون"
```

### متغيرات البيئة الإضافية (للمطور، عند استخدام OAuth callback)

```env
AMAZON_CLIENT_ID=your_sp_api_client_id
AMAZON_CLIENT_SECRET=your_sp_api_client_secret
AMAZON_AWS_ACCESS_KEY=your_aws_access_key
AMAZON_AWS_SECRET_KEY=your_aws_secret_key
AMAZON_APP_CLIENT_ID=your_app_client_id
```

### الأسواق المدعومة

| الدولة | Marketplace ID | الـ endpoint |
|--------|---------------|--------------|
| السعودية | `A2E3T7L0C1Z0XH` | `sellingpartnerapi-me.amazon.com` |
| الإمارات | `A2VIGQ35RCS4UG` | `sellingpartnerapi-me.amazon.com` |
| مصر | `ARBP9OOSHTCHU` | `sellingpartnerapi-me.amazon.com` |
| أمريكا | `ATVPDKIKX0DER` | `sellingpartnerapi-na.amazon.com` |
| بريطانيا | `A1F83G8C2ARO7P` | `sellingpartnerapi-eu.amazon.com` |
| ألمانيا | `A1PA6795UKMFR9` | `sellingpartnerapi-eu.amazon.com` |

### ملاحظات فنية
- التوثيق: LWA (Login With Amazon) للحصول على Access Token + AWS Signature V4 لتوقيع الطلبات
- AWS SigV4 يتم تطبيقه تلقائياً — لا حاجة لأي AWS SDK
- Refresh Token يُستخدم لكل طلب للحصول على Access Token جديد
- الصلاحية: 0 تبعيات خارجية

---

## بعد الربط

بعد ربط أي سوق، يمكنك:

### مركز الربط
افتح `/channels/hub` من لوحة التحكم لعرض:
- لوحة تحكم موحدة لجميع الأسواق المتصلة
- إجمالي المبيعات والطلبات المستوردة
- حالة كل سوق (متصل/غير متصل)
- آخر مزامنة لكل سوق
- زر **مزامنة الكل** لمزامنة جميع الأسواق المتصلة دفعة واحدة
- سجل المزامنة (آخر 10 عمليات)

### المزامنة
1. **استيراد الطلبات** — `/channels/:provider` ← سحب الطلبات من السوق
2. **مزامنة الكل** — `/channels/hub` ← مزامنة جميع الأسواق بنقرة واحدة
3. **مزامنة المنتجات** — `/channels/:provider/listings` ← عرض وإدارة المنتجات المسوقة
4. **مزامنة المخزون** — تحديث الكميات في السوق

### إدارة المنتجات
1. من صفحة **المنتجات**، اضغط على أيقونة 🌐 في آخر كل منتج
2. اختر السوق المستهدف (سلة/زد/نون/أمازون)
3. اضغط **نشر** — سيتم إنشاء المنتج في السوق مباشرة

### التقارير
- **تقارير المبيعات** — عرض إجمالي المبيعات والطلبات لكل سوق
- **سجل المزامنة** — `/channels/sync-logs` — سجل كامل بفلترة حسب النوع (طلبات/منتجات/مخزون)

### الإدارة
- **دليل الربط التفاعلي** — `/channels/guide` — شرح خطوة بخطوة لكل سوق
- **فصل السوق** — إلغاء الربط في أي وقت

### نقاط API المتاحة

| الطريقة | المسار | الوظيفة |
|---------|--------|---------|
| GET | `/merchant/:storeId/marketplaces` | قائمة الأسواق مع حالة الاتصال |
| GET | `/merchant/:storeId/marketplaces/hub` | لوحة تحكم موحدة (مبيعات + حالة + سجل) |
| GET | `/merchant/:storeId/marketplaces/summary` | ملخص المبيعات لجميع الأسواق |
| GET | `/merchant/:storeId/marketplaces/sync-logs` | سجل المزامنة مع تصفية وصفحات |
| POST | `/merchant/:storeId/marketplaces/sync-all` | مزامنة جميع الأسواق المتصلة |
| POST | `/merchant/:storeId/marketplaces/:provider/sync/orders` | استيراد الطلبات من سوق معين |
| POST | `/merchant/:storeId/marketplaces/:provider/sync/inventory` | مزامنة المخزون |
| POST | `/merchant/:storeId/marketplaces/:provider/publish` | نشر منتج في السوق |
| GET | `/merchant/:storeId/marketplaces/:provider/listings` | قائمة منتجات السوق |
| POST | `/merchant/:storeId/marketplaces/:provider/listings` | إنشاء منتج في السوق |
| GET | `/merchant/:storeId/marketplaces/:provider/sales` | تقارير مبيعات السوق |

### الصلاحية للوصول API
- قراءة: `settings:read`، `products:read`، `orders:read`، `reports:read`
- كتابة: `settings:update`، `products:create`، `products:update`، `products:delete`

---

## تجهيز البيئة — خطوة بخطوة

### 1. سلة
1. سجل دخولك في [Salla Partners](https://partners.salla.sa)
2. اضغط **"Create New App"**
3. اختر النوع: **"Private App"** (لتطبيق خاص لمتجرك)
4. أضف `Redirect URI`:
   ```
   http://localhost:3000/api/merchant/{storeId}/marketplaces/salla/oauth/callback
   ```
   استبدل `{storeId}` برقم متجرك الفعلي
5. فعّل الصلاحيات: `products.read`, `products.write`, `orders.read`, `inventory.read`, `inventory.write`
6. انسخ `Client ID` و `Client Secret` إلى `.env`:
   ```env
   SALLA_CLIENT_ID=xxx
   SALLA_CLIENT_SECRET=xxx
   SALLA_REDIRECT_URI=http://localhost:3000/api/merchant/{storeId}/marketplaces/salla/oauth/callback
   ```

### 2. زد
1. سجل دخولك في [Zid Partners](https://partners.zid.sa)
2. أنشئ تطبيقاً جديداً واختار **"Private Integration"**
3. أضف `Redirect URI`:
   ```
   http://localhost:3000/api/merchant/{storeId}/marketplaces/zid/oauth/callback
   ```
4. انسخ `Client ID` و `Client Secret`
5. من لوحة تحكم زد → الإعدادات → **X-Manager-Token** → أنشئ توكن جديد
6. أضف إلى `.env`:
   ```env
   ZID_CLIENT_ID=xxx
   ZID_CLIENT_SECRET=xxx
   ZID_REDIRECT_URI=http://localhost:3000/api/merchant/{storeId}/marketplaces/zid/oauth/callback
   ```
7. الصلاحية: توكن X-Manager-Token صالح لمدة **سنة** — ضع تذكيراً للتجديد

### 3. نون
1. سجل دخولك في [Noon Partners](https://partners.noon.com)
2. اذهب إلى **"API Integration"** ← **"Generate Credentials"**
3. اختر `RS256` كخوارزمية التوقيع
4. سيتم توليد:
   - `Client ID`
   - `Private Key` (مفتاح RSA) — انسخه **كاملاً** (بما في ذلك `-----BEGIN RSA PRIVATE KEY-----`)
5. أضف إلى ملف `.env` (اختياري، يمكن إدخالها من الواجهة):
   ```env
   NOON_CLIENT_ID=xxx
   NOON_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
   ```
6. **مهم:** Private Key يُدخل من واجهة المستخدم، متغيرات البيئة اختيارية

### 4. أمازون
1. سجل دخولك في [Seller Central](https://sellercentral.amazon.com)
2. اذهب إلى **"Partner Network"** ← **"Develop Apps"** ← **"Register New Application"**
3. اختر نوع التطبيق: **"SP-API Application"**
4. سجل:
   - `Client ID` و `Client Secret` من التطبيق
5. اذهب إلى **AWS Console** → **IAM** → **Users** → **Add User**
   - اسم: `haa-sp-api`
   - الصلاحية: **"Attach policies directly"** → ابحث عن `AmazonSellingPartnerApi`
6. أنشئ **Access Key** و **Secret Key** للمستخدم
7. احصل على **Refresh Token**:
   - استخدم [LWA Authorization](https://sellercentral.amazon.com/apps/authorize/consent?application_id=YOUR_APP_ID)
   - أو اتصل بـ `https://api.amazon.com/auth/o2/token` مع `grant_type=authorization_code`
8. أضف إلى `.env`:
   ```env
   AMAZON_CLIENT_ID=xxx
   AMAZON_CLIENT_SECRET=xxx
   AMAZON_REFRESH_TOKEN=xxx
   AMAZON_AWS_ACCESS_KEY=xxx
   AMAZON_AWS_SECRET_KEY=xxx
   AMAZON_MARKETPLACE_ID=A2E3T7L0C1Z0XH
   ```

---

## تشغيل البيئة محلياً

لتشغيل كامل المنصة (API + Dashboard + Storefront):

```bash
pnpm dev:all
```

أو كل على حدة:

```bash
pnpm dev:api          # http://localhost:3000
pnpm dev:dashboard    # http://localhost:5173
pnpm dev:storefront   # http://localhost:5175
```

**المتجر التجريبي (ها ديمو):** افتح `http://localhost:5174/s/haa-demo` من المتصفح.

---

## استكشاف الأخطاء

### OAuth فشل
- تأكد من صحة `Client ID` و `Client Secret`
- تأكد من تطابق `Redirect URI` بين التطبيق والكود
- جرب إعادة الربط من البداية

### نون فشل
- Private Key يجب أن يبدأ بـ `-----BEGIN RSA PRIVATE KEY-----`
- تأكد من أن Client ID صحيح
- جرب الاتصال بـ `/sellers/me` لتأكيد صلاحية البيانات

### أمازون فشل
- تأكد من صلاحية IAM user للوصول إلى SP-API
- Refresh Token ينتهي — قد تحتاج لإعادة تفويض
- بعض الأسواق تتطلب تكوين خاص في Seller Central

### خطأ "Invalid Signature" (أمازون)
- هذا يحدث تلقائياً — تأكد من صحة AWS Access Key و Secret Key
- تأكد من أن المنطقة (region) صحيحة للسوق المستهدف
