# دليل نظام التصميم — HAA Stores Core

> **النسخة:** 1.0  
> **آخر تحديث:** يونيو 2026  
> **الجمهور المستهدف:** فريق تطوير الواجهة الأمامية  
> **اللغة:** العربية (اتجاه النص من اليمين إلى اليسار)

---

## جدول المحتويات

1. [المبادئ الأساسية](#المبادئ-الأساسية)
2. [نظام الألوان (Tokens)](#نظام-الألوان-tokens)
   - 2.1 [الألوان الأساسية (Primary)](#الألوان-الأساسية-primary)
   - 2.2 [الألوان المحايدة (Neutral)](#الألوان-المحايدة-neutral)
   - 2.3 [الألوان الدلالية (Semantic)](#الألوان-الدلالية-semantic)
3. [الأسطح والنصوص (Surface & Text)](#الأسطح-والنصوص-surface--text)
   - 3.1 [أسطح الخلفية](#أسطح-الخلفية)
   - 3.2 [ألوان النصوص](#ألوان-النصوص)
   - 3.3 [الحدود (Borders)](#الحدود-borders)
4. [نظام المسافات (Spacing)](#نظام-المسافات-spacing)
5. [نظام الزوايا (Radii)](#نظام-الزوايا-radii)
6. [الظلال (Shadows)](#الظلال-shadows)
7. [الطباعة (Typography)](#الطباعة-typography)
8. [الحركة (Motion)](#الحركة-motion)
9. [المكونات (Components)](#المكونات-components)
   - 9.1 [StoreContainer](#storecontainer)
   - 9.2 [StoreCard](#storecard)
   - 9.3 [StoreButton](#storebutton)
   - 9.4 [StoreIconButton](#storeiconbutton)
   - 9.5 [StoreBadge](#storebadge)
   - 9.6 [StorePrice](#storeprice)
   - 9.7 [StoreInput](#storeinput)
   - 9.8 [StoreSelect](#storeselect)
   - 9.9 [StoreTextarea](#storetextarea)
   - 9.10 [StoreAlert](#storealert)
   - 9.11 [StoreEmptyState](#storeemptystate)
   - 9.12 [StoreSkeleton](#storeskeleton)
   - 9.13 [StoreSection](#storesection)
   - 9.14 [StoreStepIndicator](#storestepindicator)
   - 9.15 [StoreQuantitySelector](#storequantityselector)
   - 9.16 [StoreBreadcrumbs](#storebreadcrumbs)
   - 9.17 [StoreSearchInput](#storesearchinput)
10. [نظام الوضع المُظلم (Dark Mode)](#نظام-الوضع-المُظلم-dark-mode)
11. [قواعد RTL (من اليمين إلى اليسار)](#قواعد-rtl-من-اليمين-إلى-اليسار)
12. [قواعد الوصول (Accessibility)](#قواعد-الوصول-accessibility)
13. [الأيقونات (Icons)](#الأيقونات-icons)
14. [إرشادات عامة — افعل ولا تفعل](#إرشادات-عامة--افعل-ولا-تفعل)
15. [أسئلة شائعة (FAQ)](#أسئلة-شائعة-faq)

---

## المبادئ الأساسية

- **التناسق أولاً:** كل عنصر في الواجهة يستخدم نفس مجموعة المتغيرات (CSS Custom Properties). لا توجد ألوان صلبة (hardcoded).
- **دعم RTL أصلاً:** المكتبة مبنية للعربية وتتعامل مع الاتجاه ديناميكيًا.
- **الوصول (Accessibility):** كل عنصر تفاعلي يجب أن يكون قابلاً للوصول عبر لوحة المفاتيح، مع `focus-visible` وحجم لمس لا يقل عن 44px.
- **الوضع المُظلم:** يتم التبديل عبر الخاصية `data-theme="dark"` على عنصر `<html>`، وليس عبر كلاسات Tailwind `dark:`.
- **إعادة الاستخدام:** لا تصمم مكونًا من الصفر إذا كان المكوّن موجودًا بالفعل في هذه المكتبة.

---

## نظام الألوان Tokens

جميع الألوان معرفة كمتغيرات CSS (Custom Properties) في ملفات `tokens.css`. يُمنع منعًا باتًا استخدام قيم ألوان صلبة (hardcoded).

### الألوان الأساسية Primary

| Token | القيمة | الاستخدام |
|-------|--------|-----------|
| `--color-primary-50` | `#f2f5ff` | خلفية الخفيفة |
| `--color-primary-100` | `#e0e8ff` | توهج/Hover خفيف |
| `--color-primary-200` | `#b3c6ff` | حدود تفاعلية |
| `--color-primary-300` | `#80a4ff` | |
| `--color-primary-400` | `#4082ff` | حالات focus |
| `--color-primary-500` | `#007aff` | **اللون الأساسي** — الأزرار، الروابط |
| `--color-primary-600` | `#0066d6` | Hover على الأساسي |
| `--color-primary-700` | `#0055b3` | |
| `--color-primary-800` | `#004499` | |
| `--color-primary-900` | `#003380` | |
| `--color-primary-950` | `#002266` | |

```css
/* الاستخدام الصحيح */
.button-primary {
  background-color: var(--color-primary-500);
  color: white;
}

/* خطأ ❌ — لا تستخدم قيمًا صلبة */
.button-primary {
  background-color: #007aff; /* ممنوع */
}
```

### الألوان المحايدة Neutral

مقياس من `--color-neutral-50` (الأفتح) إلى `--color-neutral-950` (الأغمق). في الوضع المُظلم تنعكس القيم (`950` يصبح `50` والعكس).

| Token | الوضع الفاتح | الوضع المُظلم |
|-------|-------------|---------------|
| `--color-neutral-50` | `#f9fafb` | `#18181b` |
| `--color-neutral-100` | `#f3f4f6` | `#27272a` |
| `--color-neutral-200` | `#e5e7eb` | `#3f3f46` |
| `--color-neutral-300` | `#d1d5db` | `#52525b` |
| `--color-neutral-400` | `#9ca3af` | `#71717a` |
| `--color-neutral-500` | `#6b7280` | `#a1a1aa` |
| `--color-neutral-600` | `#4b5563` | `#d4d4d8` |
| `--color-neutral-700` | `#374151` | `#e4e4e7` |
| `--color-neutral-800` | `#1f2937` | `#f4f4f5` |
| `--color-neutral-900` | `#111827` | `#fafafa` |
| `--color-neutral-950` | `#030712` | `#ffffff` |

### الألوان الدلالية Semantic

| الاسم | Token القيمة | Token النص | Token الخلفية الخفيفة |
|-------|-------------|------------|----------------------|
| نجاح (Success) | `--color-success: #34c759` | `--color-success-text: #ffffff` | `--color-success-subtle: #e8f8ee` |
| تحذير (Warning) | `--color-warning: #ff9500` | `--color-warning-text: #1d1d1f` | `--color-warning-subtle: #fff4e5` |
| خطأ (Danger) | `--color-danger: #ff3b30` | `--color-danger-text: #ffffff` | `--color-danger-subtle: #ffebeb` |
| معلومات (Info) | `--color-info: #007aff` | `--color-info-text: #ffffff` | `--color-info-subtle: #e8f2ff` |

```css
/* الاستخدام الصحيح */
.alert-success {
  background-color: var(--color-success-subtle);
  border-color: var(--color-success);
  color: var(--color-success);
}

/* الوضع المُظلم — الخلفيات الخفيفة تتحول إلى rgba */
[data-theme="dark"] {
  --color-success-subtle: rgba(52, 199, 89, 0.1);
  --color-warning-subtle: rgba(255, 149, 0, 0.1);
  --color-danger-subtle: rgba(255, 59, 48, 0.1);
  --color-info-subtle: rgba(0, 122, 255, 0.1);
}
```

---

## الأسطح والنصوص Surface & Text

### أسطح الخلفية

| Token | الوصف |
|-------|-------|
| `surface-1` | الخلفية الرئيسية (الأفتح) |
| `surface-2` | خلفية البطاقات والعناصر الثانوية |
| `surface-3` | خلفية التمييز (Hover) |
| `surface-inverse` | خلفية معكوسة (داكنة في الوضع الفاتح) |

```tsx
/* الاستخدام في Tailwind */
<div className="bg-surface-1">
  <div className="bg-surface-2">محتوى</div>
</div>
```

### ألوان النصوص

| Token | الوصف |
|-------|-------|
| `text-primary` | النص الأساسي |
| `text-secondary` | النص الثانوي (رمادي) |
| `text-tertiary` | النص المساعد (رمادي فاتح) |
| `text-disabled` | النص المعطّل |
| `text-link` | النص الرابط — يستخدم `--color-primary-500` |

### الحدود Borders

| Token | الوصف |
|-------|-------|
| `border-border` | الحدود الافتراضية |
| `border-border-hover` | حدود عند التمرير |
| `border-border-focus` | حدود عند التركيز |
| `border-border-disabled` | حدود معطّلة |

```tsx
/* الاستخدام الصحيح */
<div className="border border-border rounded-card">
  <input className="border-0 bg-surface-2 rounded-xl focus-visible:ring-2 focus-visible:ring-primary-400" />
</div>
```

---

## نظام المسافات Spacing

يتبع نظام Tailwind مع متغيرات `--spacing-*`. القيم تمثل مضاعفات 4px.

| Token Tailwind | القيمة | مثال |
|----------------|--------|------|
| `p-0` | `0` | `padding: 0` |
| `p-1` | `4px` | `--spacing-1` |
| `p-2` | `8px` | `--spacing-2` |
| `p-3` | `12px` | `--spacing-3` |
| `p-4` | `16px` | `--spacing-4` |
| `p-5` | `20px` | `--spacing-5` |
| `p-6` | `24px` | `--spacing-6` |
| `p-8` | `32px` | `--spacing-8` |
| `p-10` | `40px` | `--spacing-10` |
| `p-12` | `48px` | `--spacing-12` |

```tsx
/* مثال على المسافات */
<div className="p-4 sm:p-6 lg:p-8">
  <div className="space-y-4">
    <div className="p-3">عنصر</div>
    <div className="p-3">عنصر</div>
  </div>
</div>
```

---

## نظام الزوايا Radii

| Token | القيمة | الاستخدام |
|-------|--------|-----------|
| `rounded-xs` | `6px` | زوايا صغيرة جدًا |
| `rounded-sm` | `8px` | زوايا صغيرة |
| `rounded-md` | `12px` | الزاوية الافتراضية |
| `rounded-lg` | `20px` | زوايا متوسطة |
| `rounded-xl` | `24px` | زوايا كبيرة (inputs, buttons) |
| `rounded-2xl` | `16px` | زوايا متوسطة بديلة |
| `rounded-card` | `16px` | البطاقات (Cards) |
| `rounded-modal` | `24px` | النوافذ المنبثقة |
| `rounded-pill` | `9999px` | أزرار دائرية كاملة |
| `rounded-badge` | `9999px` | الشارات (Badges) |

```tsx
/* أمثلة */
<StoreCard className="rounded-card p-6">...</StoreCard>
<StoreButton className="rounded-xl">...</StoreButton>
<StoreBadge className="rounded-badge">جديد</StoreBadge>
```

---

## الظلال Shadows

| Token | القيمة | الاستخدام |
|-------|--------|-----------|
| `shadow-card` | `0 2px 8px rgb(0 0 0 / 0.06)` | البطاقات العادية |
| `shadow-card-hover` | `0 8px 24px rgb(0 0 0 / 0.08)` | البطاقات عند hover |
| `shadow-popover` | `0 4px 16px rgb(0 0 0 / 0.1)` | القوائم المنبثقة |
| `shadow-modal` | `0 16px 48px rgb(0 0 0 / 0.15)` | النوافذ المنبثقة |

```tsx
<div className="shadow-card hover:shadow-card-hover transition-shadow">
  بطاقة
</div>
```

---

## الطباعة Typography

### أحجام الخطوط الأساسية

| Token | الحجم | الاستخدام |
|-------|-------|-----------|
| `text-xs` | `12px` | أصغر نص، Badges |
| `text-sm` | `13px` | نصوص مساعدة |
| `text-base` | `14px` | **النص الافتراضي** |
| `text-md` | `15px` | نصوص أكبر قليلاً |

### أحجام عناوين المنتجات والمحتوى

| Token | الحجم | الاستخدام |
|-------|-------|-----------|
| `text-product-title` | `14px` | عنوان المنتج في البطاقات |
| `text-product-price` | `16px` | سعر المنتج |
| `text-section-title` | `18px` | عنوان القسم |
| `text-page-title` | `24px` | عنوان الصفحة |
| `text-hero-title` | `32px` | العنوان الرئيسي (Hero) |

```tsx
/* أمثلة */
<h1 className="text-page-title font-bold">عنوان الصفحة</h1>
<h2 className="text-section-title font-semibold">قسم المنتجات</h2>
<span className="text-product-price font-bold text-primary-500">٩٩ ر.س</span>
<p className="text-sm text-text-secondary">نص مساعد</p>
```

---

## الحركة Motion

| Token | المدة | الاستخدام |
|-------|-------|-----------|
| `fade-in` | `0.3s ease-out` | ظهور العناصر |
| `slide-up` | `0.4s ease-out` | انزلاق للأعلى |
| `scale-in` | `0.2s ease-out` | تكبير عند الظهور |
| `carousel` | `20s linear infinite` | الكاروسيل التلقائي |

```css
/* Custom Animations — مضمنة في tailwind.config */
@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}
```

```tsx
/* استخدام الحركة */
<div className="animate-fade-in">
  <div className="animate-slide-up">
    <div className="animate-scale-in">
      محتوى متحرك
    </div>
  </div>
</div>
```

---

## المكونات Components

### StoreContainer

حاوية الصفحة الرئيسية — تحدّد العرض الأقصى وتوسّط المحتوى.

```tsx
import { StoreContainer } from '@/components/store/StoreContainer'

function Page() {
  return (
    <StoreContainer className="py-8">
      <h1 className="text-page-title">الصفحة الرئيسية</h1>
    </StoreContainer>
  )
}
```

| Prop | النوع | الوصف |
|------|-------|-------|
| `children` | `ReactNode` | المحتوى |
| `className` | `string` | كلاسات إضافية |
| `id` | `string` | معرف اختياري |

**الإعدادات الداخلية:**
- `max-w-[1280px]` — العرض الأقصى
- `px-4 sm:px-6 lg:px-8` — الحشو المتجاوب
- `mx-auto` — التوسيط الأفقي

---

### StoreCard

بطاقة لعرض المحتوى.

```tsx
import { StoreCard } from '@/components/store/StoreCard'

function ProductCard() {
  return (
    <StoreCard variant="interactive" className="p-6">
      <h3 className="text-product-title">اسم المنتج</h3>
      <p className="text-sm text-text-secondary">وصف</p>
    </StoreCard>
  )
}
```

| Prop | النوع | الوصف |
|------|-------|-------|
| `children` | `ReactNode` | المحتوى |
| `variant` | `'default' \| 'interactive' \| 'highlight'` | شكل البطاقة |
| `className` | `string` | كلاسات إضافية |

**الأنواع:**
- `default` — `shadow-card` فقط
- `interactive` — `shadow-card hover:shadow-card-hover hover:-translate-y-0.5`
- `highlight` — `shadow-card border border-primary-200`

جميع الأنواع تشمل `bg-surface-1 rounded-card`.

---

### StoreButton

الزر الأساسي في النظام. يدعم التحميل والأيقونات والروابط.

```tsx
import { StoreButton } from '@/components/store/StoreButton'
import { ShoppingCart } from 'lucide-react'

function Example() {
  return (
    <>
      <StoreButton variant="primary" size="md" loading>
        جارٍ التحميل…
      </StoreButton>

      <StoreButton variant="secondary" size="lg" icon={<ShoppingCart size={18} />}>
        أضف إلى السلة
      </StoreButton>

      <StoreButton variant="outline" size="sm" href="/s/category">
        تصفح
      </StoreButton>

      <StoreButton variant="ghost" size="md" iconStart={<ShoppingCart size={18} />}>
        سلة التسوق
      </StoreButton>

      <StoreButton variant="danger" size="md" disabled>
        لا يمكن الحذف
      </StoreButton>
    </>
  )
}
```

| Prop | النوع | الوصف |
|------|-------|-------|
| `variant` | `'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'danger'` | نوع الزر |
| `size` | `'sm' \| 'md' \| 'lg'` | حجم الزر |
| `loading` | `boolean` | حالة التحميل |
| `icon` | `ReactNode` | أيقونة مفردة |
| `iconStart` | `ReactNode` | أيقونة في البداية |
| `iconEnd` | `ReactNode` | أيقونة في النهاية |
| `href` | `string` | إذا وُجد، يتحول الزر إلى رابط (`Link`) |
| `disabled` | `boolean` | تعطيل الزر |
| `children` | `ReactNode` | النص |
| `...` | `ButtonHTMLAttributes` | أي خاصية HTML إضافية |

**أنماط الـ variant:**

| Variant | الخلفية | النص | Hover |
|---------|---------|------|-------|
| `primary` | `bg-primary-500` | `text-white` | `hover:bg-primary-600` |
| `secondary` | `bg-surface-2` | `text-text-primary` | `hover:bg-surface-3` |
| `outline` | `bg-surface-1` | `text-text-secondary` | `hover:bg-surface-2` border |
| `ghost` | شفاف | `text-primary-500` | `hover:bg-primary-50` |
| `danger` | `bg-danger` | `text-danger-text` | `hover:opacity-90` |

**أحجام الـ size:**

| Size | الطول | الحشو | حجم الخط | الزوايا |
|------|-------|-------|----------|---------|
| `sm` | `min-h-[32px]` | `px-3` | `text-xs` | `rounded-lg` |
| `md` | `min-h-[44px]` | `px-4` | `text-sm` | `rounded-xl` |
| `lg` | `min-h-[48px]` | `px-6` | `text-sm` | `rounded-xl` |

جميع الأزرار لها `focus-visible:ring-2 focus-visible:ring-primary-400`.

> **ملاحظة:** استخدم `icon` للأيقونة الوحيدة (بدون نص)، و `iconStart`/`iconEnd` للأيقونة مع نص.

---

### StoreIconButton

زر أيقونة فقط — يجب أن يحتوي على `aria-label`.

```tsx
import { StoreIconButton } from '@/components/store/StoreIconButton'
import { X, Heart } from 'lucide-react'

function Example() {
  return (
    <>
      <StoreIconButton variant="ghost" size="md" aria-label="إغلاق">
        <X size={16} />
      </StoreIconButton>

      <StoreIconButton variant="outline" size="lg" aria-label="إضافة إلى المفضلة">
        <Heart size={20} />
      </StoreIconButton>

      <StoreIconButton variant="soft" size="md" aria-label="تعديل" loading>
        <X size={16} />
      </StoreIconButton>

      <StoreIconButton variant="danger" size="md" aria-label="حذف">
        <X size={16} />
      </StoreIconButton>
    </>
  )
}
```

| Prop | النوع | الوصف |
|------|-------|-------|
| `variant` | `'ghost' \| 'outline' \| 'soft' \| 'danger'` | نوع الزر |
| `size` | `'md' \| 'lg'` | الحجم |
| `aria-label` | `string` | **مطلوب** — وصف الزر لمستخدمي قارئات الشاشة |
| `loading` | `boolean` | حالة التحميل |
| `disabled` | `boolean` | تعطيل الزر |
| `children` | `ReactNode` | الأيقونة |

**أنماط الـ variant:**

| Variant | النص | Hover |
|---------|------|-------|
| `ghost` | `text-text-secondary` | `hover:bg-surface-2` |
| `outline` | `text-text-secondary` | `hover:bg-surface-2` (مع border) |
| `soft` | `text-primary-600` bg `primary-50` | `hover:bg-primary-100` |
| `danger` | `text-danger` | `hover:bg-danger-soft` (خلفية خطأ خفيفة) |

**أحجام الـ size:**

| Size | العرض والارتفاع الأدنى |
|------|-----------------------|
| `md` | `min-w-[44px] min-h-[44px]` |
| `lg` | `min-w-[48px] min-h-[48px]` |

---

### StoreBadge

شارة لعرض التصنيفات والحالات.

```tsx
import { StoreBadge } from '@/components/store/StoreBadge'
import { Gift, Tag, Clock } from 'lucide-react'

function Example() {
  return (
    <div className="flex gap-2 flex-wrap">
      <StoreBadge variant="new" size="md">جديد</StoreBadge>
      <StoreBadge variant="discount" size="md" icon={<Gift size={10} />}>هدية</StoreBadge>
      <StoreBadge variant="success" size="sm" icon={<Tag size={8} />}>متوفر</StoreBadge>
      <StoreBadge variant="warning" size="sm">لفترة محدودة</StoreBadge>
      <StoreBadge variant="danger" size="md">نفذ من المخزون</StoreBadge>
      <StoreBadge variant="info" size="md">معلومات</StoreBadge>
      <StoreBadge variant="neutral" size="sm">عام</StoreBadge>
      <StoreBadge variant="stock" size="md" icon={<Clock size={10} />}>توصيل في 24 ساعة</StoreBadge>
    </div>
  )
}
```

| Prop | النوع | الوصف |
|------|-------|-------|
| `variant` | `'neutral' \| 'success' \| 'warning' \| 'danger' \| 'info' \| 'discount' \| 'stock' \| 'new'` | نوع الشارة |
| `size` | `'sm' \| 'md'` | الحجم |
| `children` | `ReactNode` | النص |
| `icon` | `ReactNode` | أيقونة اختيارية |
| `className` | `string` | كلاسات إضافية |

**الأحجام:**
- `sm`: `text-[10px]` — حشو صغير (`4px` عمودي / `1.5px` أفقي)
- `md`: `text-xs` — حشو قياسي (`8px` عمودي / `2px` أفقي)

جميع الشارات ذات زوايا `rounded-badge` (`9999px`).

---

### StorePrice

عرض السعر مع دعم السعر المقارن والعملة والتخفيض. **اتجاه النص LTR تلقائيًا.**

```tsx
import { StorePrice } from '@/components/store/StorePrice'

function Example() {
  return (
    <div className="space-y-2">
      <StorePrice price={99.99} currency="ر.س" size="md" />
      <StorePrice price={79.99} compareAtPrice={149.99} currency="ر.س" size="lg" />
      <StorePrice price={49.99} size="sm" />
    </div>
  )
}
```

| Prop | النوع | الوصف |
|------|-------|-------|
| `price` | `number` | السعر الحالي |
| `compareAtPrice` | `number` (اختياري) | السعر قبل الخصم — يظهر نسبة التخفيض |
| `currency` | `string` (اختياري) | رمز العملة — الافتراضي أيقونة الريال |
| `size` | `'sm' \| 'md' \| 'lg'` | الحجم |

**ميزات تلقائية:**
- `dir="ltr"` مضمن — لا حاجة لإضافته يدويًا
- إذا وُجد `compareAtPrice`، يُحتسب الخصم ويُعرض كـ "٪٣٠ خصم" مع شارة
- أيقونة العملة الافتراضية: `SarIcon`

---

### StoreInput

حقل إدخال نصي.

```tsx
import { StoreInput } from '@/components/store/StoreInput'
import { Search, User } from 'lucide-react'

function Example() {
  return (
    <div className="space-y-4">
      <StoreInput
        label="البريد الإلكتروني"
        placeholder="أدخل بريدك الإلكتروني"
        dir="ltr"
        iconStart={<User size={16} />}
      />
      <StoreInput
        label="كلمة المرور"
        type="password"
        error="كلمة المرور يجب أن تكون 8 أحرف على الأقل"
      />
      <StoreInput
        label="رقم الجوال"
        dir="ltr"
        hint="مثال: 0555000000"
      />
    </div>
  )
}
```

| Prop | النوع | الوصف |
|------|-------|-------|
| `label` | `string` | عنوان الحقل |
| `error` | `string` (اختياري) | رسالة الخطأ |
| `hint` | `string` (اختياري) | نص مساعد |
| `iconStart` | `ReactNode` (اختياري) | أيقونة في بداية الحقل |
| `iconEnd` | `ReactNode` (اختياري) | أيقونة في نهاية الحقل |
| `dir` | `string` (اختياري) | اتجاه النص (`"ltr"` للأرقام والإيميلات) |
| `...` | `InputHTMLAttributes` | أي خاصية HTML إضافية |

**التصميم:**
- الارتفاع: `44px`
- الزوايا: `rounded-xl`
- خلفية: `bg-surface-2`
- `focus-visible:ring-2 focus-visible:ring-primary-400`
- إذا وُجد `error`، يُعرض النص المساعد باللون `text-danger`

---

### StoreSelect

قائمة منسدلة.

```tsx
import { StoreSelect } from '@/components/store/StoreSelect'

const options = [
  { value: 'option-1', label: 'الخيار الأول' },
  { value: 'option-2', label: 'الخيار الثاني' },
]

function Example() {
  return (
    <StoreSelect
      label="اختر خيارًا"
      options={options}
      placeholder="اختر من القائمة"
      iconStart={<Search size={16} />}
      error="يرجى اختيار خيار"
    />
  )
}
```

| Prop | النوع | الوصف |
|------|-------|-------|
| `label` | `string` | عنوان الحقل |
| `error` | `string` (اختياري) | رسالة الخطأ |
| `options` | `{value: string, label: string}[]` | قائمة الخيارات |
| `placeholder` | `string` (اختياري) | نص البداية |
| `iconStart` | `ReactNode` (اختياري) | أيقونة اختيارية |
| `...` | `SelectHTMLAttributes` | أي خاصية HTML إضافية |

**التصميم:**
- الارتفاع: `44px`
- الزوايا: `rounded-xl`
- خلفية: `bg-surface-2`
- `focus-visible:ring-2 focus-visible:ring-primary-400`

---

### StoreTextarea

حقل إدخال نص متعدد الأسطر.

```tsx
import { StoreTextarea } from '@/components/store/StoreTextarea'

function Example() {
  return (
    <StoreTextarea
      label="ملاحظات"
      placeholder="اكتب ملاحظاتك هنا…"
      rows={4}
      error="هذا الحقل مطلوب"
    />
  )
}
```

| Prop | النوع | الوصف |
|------|-------|-------|
| `label` | `string` | عنوان الحقل |
| `error` | `string` (اختياري) | رسالة الخطأ |
| `iconStart` | `ReactNode` (اختياري) | أيقونة اختيارية |
| `...` | `TextareaHTMLAttributes` | أي خاصية HTML إضافية |

---

### StoreAlert

شريط تنبيه.

```tsx
import { StoreAlert } from '@/components/store/StoreAlert'
import { useState } from 'react'

function Example() {
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  return (
    <div className="space-y-3">
      <StoreAlert variant="info" title="معلومات" dismissible onDismiss={() => setVisible(false)}>
        تم تحديث بياناتك بنجاح.
      </StoreAlert>

      <StoreAlert variant="success" title="تم بنجاح">
        تم إضافة المنتج إلى السلة.
      </StoreAlert>

      <StoreAlert variant="warning" title="تنبيه">
        سعر المنتضج قد يتغير خلال ٢٤ ساعة.
      </StoreAlert>

      <StoreAlert variant="danger" title="خطأ">
        حدث خطأ غير متوقع. حاول مرة أخرى.
      </StoreAlert>
    </div>
  )
}
```

| Prop | النوع | الوصف |
|------|-------|-------|
| `variant` | `'info' \| 'success' \| 'warning' \| 'danger'` | نوع التنبيه |
| `title` | `string` (اختياري) | العنوان |
| `children` | `ReactNode` | المحتوى |
| `icon` | `LucideIcon` (اختياري) | أيقونة مخصصة |
| `dismissible` | `boolean` (اختياري) | هل يمكن إغلاقه |
| `onDismiss` | `() => void` (اختياري) | دالة الإغلاق |

---

### StoreEmptyState

عرض الحالة الفارغة (بدون بيانات).

```tsx
import { StoreEmptyState } from '@/components/store/StoreEmptyState'
import { StoreButton } from '@/components/store/StoreButton'
import { Package } from 'lucide-react'

function EmptyCart() {
  return (
    <StoreEmptyState
      icon={Package}
      title="السلة فارغة"
      description="لم تقم بإضافة أي منتجات بعد. تصفح المتجر لإضافة المنتجات."
      action={
        <StoreButton variant="primary" href="/s/categories">
          تصفح المنتجات
        </StoreButton>
      }
    />
  )
}
```

| Prop | النوع | الوصف |
|------|-------|-------|
| `icon` | `LucideIcon` | الأيقونة |
| `title` | `string` | العنوان |
| `description` | `string` (اختياري) | الوصف |
| `action` | `ReactNode` (اختياري) | زر إجراء |

---

### StoreSkeleton

عنصر تحميل (Skeleton Loading).

```tsx
import { StoreSkeleton } from '@/components/store/StoreSkeleton'

function LoadingCard() {
  return (
    <div className="p-6 space-y-3">
      <StoreSkeleton className="h-4 w-3/4" />
      <StoreSkeleton className="h-4 w-1/2" />
      <StoreSkeleton className="h-20 w-full" />
    </div>
  )
}
```

| Prop | النوع | الوصف |
|------|-------|-------|
| `className` | `string` | كلاسات لتحديد الشكل والحجم |

**التصميم الداخلي:**
- `animate-pulse` — حركة نبض
- `bg-surface-2` — خلفية
- `rounded-xl` — زوايا

---

### StoreSection

قسم في الصفحة مع عنوان وإجراء اختياري.

```tsx
import { StoreSection } from '@/components/store/StoreSection'
import { StoreButton } from '@/components/store/StoreButton'

function FeaturedSection() {
  return (
    <StoreSection
      title="منتجات مميزة"
      subtitle="اكتشف أحدث المنتجات المضافة"
      action={<StoreButton variant="ghost">عرض الكل</StoreButton>}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* المنتجات */}
      </div>
    </StoreSection>
  )
}
```

| Prop | النوع | الوصف |
|------|-------|-------|
| `title` | `string` | عنوان القسم |
| `subtitle` | `string` (اختياري) | نص فرعي |
| `action` | `ReactNode` (اختياري) | زر إجراء في الرأس |
| `children` | `ReactNode` | محتوى القسم |

---

### StoreStepIndicator

مؤشر الخطوات (لعمليات الدفع أو الإجراءات المتعددة).

```tsx
import { StoreStepIndicator } from '@/components/store/StoreStepIndicator'

function CheckoutSteps() {
  const steps = ['سلة التسوق', 'معلومات الشحن', 'الدفع', 'تأكيد الطلب']

  return (
    <StoreStepIndicator steps={steps} currentStep={1} />
  )
}
```

| Prop | النوع | الوصف |
|------|-------|-------|
| `steps` | `string[]` | قائمة الخطوات |
| `currentStep` | `number` | الخطوة الحالية (تبدأ من 0) |

---

### StoreQuantitySelector

محدد الكمية — مناسب لصفحات المنتج والسلة.

```tsx
import { StoreQuantitySelector } from '@/components/store/StoreQuantitySelector'
import { useState } from 'react'

function QuantityPicker() {
  const [quantity, setQuantity] = useState(1)

  return (
    <StoreQuantitySelector
      value={quantity}
      onChange={setQuantity}
      min={1}
      max={99}
      disabled={false}
    />
  )
}
```

| Prop | النوع | الوصف |
|------|-------|-------|
| `value` | `number` | القيمة الحالية |
| `onChange` | `(value: number) => void` | دالة تغيير القيمة |
| `min` | `number` | الحد الأدنى |
| `max` | `number` | الحد الأقصى |
| `disabled` | `boolean` | تعطيل المحدد |

**ملاحظة:** جميع نقاط اللمس (touch targets) بحجم 44px+.

---

### StoreBreadcrumbs

مسار التنقل (Breadcrumbs).

```tsx
import { StoreBreadcrumbs } from '@/components/store/StoreBreadcrumbs'

function ProductBreadcrumbs() {
  return (
    <StoreBreadcrumbs
      items={[
        { label: 'الرئيسية', href: '/' },
        { label: 'الإلكترونيات', href: '/s/category/electronics' },
        { label: 'هواتف ذكية', href: '/s/category/phones' },
        { label: 'آيفون ١٦ برو' },
      ]}
    />
  )
}
```

| Prop | النوع | الوصف |
|------|-------|-------|
| `items` | `{label: string, href?: string}[]` | مسار التنقل |
| `className` | `string` (اختياري) | كلاسات إضافية |

---

### StoreSearchInput

حقل بحث مع أيقونة البحث.

```tsx
import { StoreSearchInput } from '@/components/store/StoreSearchInput'
import { useState } from 'react'

function SearchBar() {
  const [query, setQuery] = useState('')
  const handleSearch = (value: string) => {
    window.location.href = `/s/search?q=${encodeURIComponent(value)}`
  }

  return (
    <StoreSearchInput
      value={query}
      onChange={setQuery}
      onSubmit={handleSearch}
      placeholder="ابحث عن منتجات…"
    />
  )
}
```

| Prop | النوع | الوصف |
|------|-------|-------|
| `value` | `string` | قيمة البحث الحالية |
| `onChange` | `(value: string) => void` | دالة تغيير القيمة |
| `onSubmit` | `(value: string) => void` | دالة عند الإرسال |
| `placeholder` | `string` (اختياري) | نص المساعدة |

**التصميم:**
- الارتفاع: `44px`
- أيقونة بحث في البداية بشكل دائم
- `focus-visible:ring-2 focus-visible:ring-primary-400`

---

## نظام الوضع المُظلم Dark Mode

### آلية التبديل

يُفعل الوضع المُظلم بإضافة الخاصية `data-theme="dark"` على عنصر `<html>`:

```tsx
// تفعيل
document.documentElement.setAttribute('data-theme', 'dark')

// إلغاء
document.documentElement.setAttribute('data-theme', 'light')

// تبديل
const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark')
```

### التهيئة في tailwind.config

```js
// tailwind.config.js
module.exports = {
  darkMode: ['selector', '[data-theme="dark"]'],
  // ...
}
```

### قواعد مهمة

| ✅ افعل | ❌ لا تفعل |
|---------|-----------|
| استخدم كلاسات semantic tokens مثل `bg-surface-1 text-text-primary` | لا تستخدم كلاسات Tailwind الرقمية مثل `bg-gray-100 text-gray-900` |
| استخدم CSS variables في ملفات الـ CSS | لا تستخدم `dark:bg-gray-800 dark:text-gray-100` |
| ضع `[data-theme="dark"]` selectors في ملف الـ tokens | لا تخلط بين نظام `dark:` و `data-theme` |

```css
/* ✅ صحيح */
.card {
  background-color: var(--color-surface-1);
  color: var(--color-text-primary);
}

[data-theme="dark"] .card {
  background-color: var(--color-surface-1); /* يتم التعيين تلقائيًا */
}
```

---

## قواعد RTL من اليمين إلى اليسار

### الاتجاهات (Direction)

```tsx
// ✅ استخدم start/end بدلاً من left/right
<div className="text-start">نص</div>   // صحيح
<div className="text-left">نص</div>    // ❌ خطأ

<div className="border-s-4">نص</div>   // صحيح (start)
<div className="border-l-4">نص</div>   // ❌ خطأ

// ✅ استخدم me/ms بدلاً من ml/mr
<div className="me-4">نص</div>          // صحيح (margin-inline-end)
<div className="mr-4">نص</div>          // ❌ خطأ
```

### الأيقونات الاتجاهية

```tsx
// ✅ صحيح — استخدم الأيقونة المناسبة والـ CSS يتولى القلب
<ChevronLeft />   // في RTL تنقلب تلقائيًا via CSS

// ❌ خطأ — لا تستخدم rotate-180 مع الأيقونات في سياق RTL
<ChevronLeft className="rotate-180" />  // ❌ ازدواجية قلب
```

الأيقونات الاتجاهية التي تُقلب تلقائيًا في RTL:
- `ChevronLeft` / `ChevronRight`
- `ArrowLeft` / `ArrowRight`
- `MoveLeft` / `MoveRight`

### Splide (الكاروسيل)

```tsx
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

function Carousel() {
  const { i18n } = useTranslation()
  const [dir, setDir] = useState('rtl')

  useEffect(() => {
    setDir(i18n.language === 'ar' ? 'rtl' : 'ltr')
  }, [i18n.language])

  return (
    <Splide options={{ direction: dir }}>
      {/* الشرائح */}
    </Splide>
  )
}
```

### StorePrice (السعر)

```tsx
// ✅ صحيح — StorePrice يضبط dir="ltr" تلقائيًا
<StorePrice price={99.99} />

// لا حاجة لإضافة dir يدويًا
```

### ملخص قواعد RTL

| الحالة | ✅ افعل | ❌ لا تفعل |
|--------|---------|-----------|
| margins/padding | `ms-2`, `me-2`, `ps-4`, `pe-4` | `ml-2`, `mr-2`, `pl-4`, `pr-4` |
| محاذاة النص | `text-start`, `text-end` | `text-left`, `text-right` |
| الحدود | `border-s`, `border-e` | `border-l`, `border-r` |
| الأيقونات الاتجاهية | استخدمها كما هي | لا تضف `rotate-180` |
| الأرقام والأسعار | `dir="ltr"` | لا تتركها بدون dir |
| الكاروسيل | direction ديناميكي | اتجاه ثابت |

---

## قواعد الوصول Accessibility

### العناصر التفاعلية

```tsx
// ✅ focus-visible — كل العناصر التفاعلية
<button className="focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:outline-none">
  انقر هنا
</button>

// ❌ خطأ — focus: يظهر التوهج حتى عند النقر بالماوس
<button className="focus:ring-2 focus:ring-primary-400">
  انقر هنا
</button>
```

### الأزرار ذات الأيقونة فقط

```tsx
// ✅ صحيح — دائماً مع aria-label
<StoreIconButton variant="ghost" size="md" aria-label="إضافة إلى المفضلة">
  <Heart size={16} />
</StoreIconButton>

// ❌ خطأ — بدون aria-label لا يمكن لمستخدمي قارئات الشاشة معرفة الوظيفة
<button><Heart size={16} /></button>
```

### حقول الإدخال

```tsx
// ✅ صحيح — جميع الحقول لها label
<StoreInput label="البريد الإلكتروني" />

// ✅ صحيح — label مرئي أو sr-only
<label className="sr-only">البحث</label>
<input />
```

### أحجام اللمس (Touch Targets)

```tsx
// جميع نقاط اللمس لا تقل عن 44px
// ✅ min-h-[44px] أو min-w-[44px]
<StoreButton size="md" className="min-h-[44px]">
  زر
</StoreButton>
```

### حالات الخطأ

```tsx
// الأخطاء تُعرض باللون danger
<StoreInput
  label="الاسم"
  error="هذا الحقل مطلوب"   // يظهر تلقائيًا بـ text-danger
/>
```

### حالات التحميل

```tsx
// استخدم StoreSkeleton بدلاً من النصوص "جارٍ التحميل…"
function LoadingView() {
  return (
    <div className="space-y-4 p-6">
      <StoreSkeleton className="h-6 w-48" />
      <StoreSkeleton className="h-24 w-full" />
      <StoreSkeleton className="h-24 w-full" />
    </div>
  )
}
```

### حالات التعطيل (Disabled)

```tsx
// العناصر المعطّلة تكون عند 40% شفافية
<StoreButton disabled className="opacity-40">
  غير متاح
</StoreButton>
```

### قائمة التحقق من الوصول (Accessibility Checklist)

| العنصر | المتطلب |
|--------|---------|
| الأزرار | `focus-visible:ring-2` |
| الأزرار الأيقونية | `aria-label` إلزامي |
| حقول الإدخال | `label` مرئي أو `sr-only` |
| نقاط اللمس | 44px × 44px كحد أدنى |
| حالات الخطأ | نص `text-danger` |
| حالات التحميل | `StoreSkeleton` |
| حالات التعطيل | `opacity-40` |
| التباين (Contrast) | لا يقل عن 4.5:1 للنصوص العادية |

---

## الأيقونات Icons

نستخدم أيقونات **Lucide React** حصريًا.

```bash
npm install lucide-react
```

```tsx
import { ShoppingCart, Heart, Search, X, Menu } from 'lucide-react'

// ✅ استخدم الأيقونات مباشرة
<StoreButton icon={<ShoppingCart size={18} />}>
  أضف إلى السلة
</StoreButton>
```

### أحجام الأيقونات

| الحجم | قيمة size في Lucide |
|-------|---------------------|
| `2xs` | `10` |
| `xs` | `12–14` |
| `sm` | `16` |
| `md` | `18–20` |
| `lg` | `24` |
| `xl` | `32` |

### أيقونات شائعة

| الاستخدام | الأيقونة |
|-----------|----------|
| إغلاق | `X` |
| رجوع | `ArrowRight` أو `ChevronRight` (في RTL تنقلب) |
| قائمة | `Menu` |
| بحث | `Search` |
| سلة | `ShoppingCart` |
| مفضلة | `Heart` |
| مستخدم | `User` |
| بريد | `Mail` |
| هاتف | `Phone` |
| موقع | `MapPin` |
| نجاح | `CheckCircle` |
| تحذير | `AlertTriangle` |
| خطأ | `XCircle` |
| معلومات | `Info` |
| هدية | `Gift` |
| شحن | `Truck` |
| نجمه | `Star` |
| سهم | `ChevronLeft` / `ChevronRight` (تُقلب في RTL) |

> **ملاحظة:** لا تستخدم إطلاقًا رموز تعبيرية (emoji) كأيقونات في واجهة المستخدم. استخدم أيقونات Lucide بدلاً من ذلك.

---

## إرشادات عامة — افعل ولا تفعل

### ✅ افعل

| # | الإرشاد | مثال |
|---|---------|-------|
| 1 | استخدم `StoreButton` لجميع الأزرار | `<StoreButton variant="primary">نص</StoreButton>` |
| 2 | استخدم `StoreIconButton` للأزرار الأيقونية | `<StoreIconButton aria-label="وصف">…</StoreIconButton>` |
| 3 | استخدم `StoreBadge` للشارات | `<StoreBadge variant="new">جديد</StoreBadge>` |
| 4 | استخدم semantic tokens لجميع الألوان | `bg-surface-1 text-text-primary` |
| 5 | استخدم `focus-visible` للعناصر التفاعلية | `focus-visible:ring-2 focus-visible:ring-primary-400` |
| 6 | استخدم `dir="ltr"` مع الأرقام والهواتف والأسعار | `<StorePrice dir="ltr" />` |
| 7 | استخدم أيقونات Lucide | `import { ShoppingCart } from 'lucide-react'` |
| 8 | استخدم `StoreCard` لحاويات البطاقات | `<StoreCard variant="interactive">…</StoreCard>` |
| 9 | استخدم `StoreContainer` لعرض الصفحة | `<StoreContainer>…</StoreContainer>` |
| 10 | استخدم البادئات المتجاوبة | `sm:`, `lg:`, `xl:` |

### ❌ لا تفعل

| # | الإرشاد | لماذا؟ |
|---|---------|--------|
| 1 | لا تستخدم الرموز التعبيرية (emoji) في الواجهة | استخدم أيقونات Lucide بدلاً من ذلك |
| 2 | لا تكتب قيم ألوان صلبة | استخدم CSS variables (tokens) |
| 3 | لا تستخدم `focus:` بدلاً من `focus-visible:` | `focus-visible:` يظهر فقط عند التنقل بلوحة المفاتيح |
| 4 | لا تستخدم `rotate-180` مع الأسهم في RTL | CSS يقوم بقلب الأيقونات تلقائيًا في RTL |
| 5 | لا تضف tokens ألوان جديدة دون مراجعة فريق التصميم | قد يؤدي إلى عدم التناسق |
| 6 | لا تخلط كلاسات `dark:` مع نظام `data-theme="dark"` | استخدم semantic tokens فقط |
| 7 | لا تستخدم `ml-` / `mr-` / `pl-` / `pr-` | استخدم `ms-` / `me-` / `ps-` / `pe-` للدعم الكامل لـ RTL |

---

## أسئلة شائعة FAQ

### س: كيف أضيف لونًا جديدًا إلى النظام؟

**ج:** لا تضف لونًا جديدًا مباشرة. استخدم الألوان الموجودة في مقياس primary أو neutral. إذا كان اللون ضروريًا حقًا، ارفع طلب مراجعة مع فريق التصميم.

### س: لماذا لا أستطيع استخدام `dark:bg-gray-800`؟

**ج:** لأن نظامنا يستخدم semantic tokens وخاصية `data-theme="dark"`. استخدام `dark:` يخلق نظامين متوازيين ويتعارض مع آلية التبديل الموحدة. استخدم دائمًا `bg-surface-1`.

### س: كيف أتعامل مع اتجاه Splide في RTL؟

**ج:** استخدم `useTranslation` من `react-i18next` لقراءة اللغة الحالية، ومرر `direction` ديناميكيًا إلى خيارات Splide.

### س: هل يمكن استخدام `StoreButton` كرابط؟

**ج:** نعم. مرر خاصية `href` وسيتم تحويل الزر إلى `<Link>` من Next.js تلقائيًا.

### س: ما حجم الأيقونة المناسب داخل `StoreBadge`؟

**ج:** استخدم `size="2xs"` (أي `10px` في Lucide).

### س: هل `StorePrice` يدعم العملات الأخرى؟

**ج:** نعم. مرر `currency` كـ `"ر.س"` للريال السعودي أو أي رمز آخر. أيقونة الريال هي الافتراضية.

### س: كيف أختبر الوصول (Accessibility)؟

**ج:** استخدم أدوات المتصفح:
1. **Lighthouse** — تقرير تلقائي
2. **axe DevTools** — فحص تفصيلي
3. **VoiceOver** (macOS) أو NVDA (Windows) لاختبار قارئات الشاشة

### س: ما هي آلية عمل `focus-visible`؟

**ج:** `focus-visible:` يعرض الـ ring فقط عند التنقل عبر لوحة المفاتيح (Tab)، وليس عند النقر بالماوس. هذا يمنع التوهج المزعج بعد كل نقرة.

---

> **آخر تحديث:** يونيو 2026  
> **المسؤول:** فريق تطوير الواجهة الأمامية — HAA Stores Core  
> **رابط المستودع:** [HAA Stores Core](https://github.com/your-org/haa-stores-core)
