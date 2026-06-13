# @haa/theme-system

> ⚠️ **DEPRECATED** — Use `@haa/storefront-themes` instead.
> This package remains available as a compatibility layer.
> Update your imports: `import { ... } from '@haa/storefront-themes'`

بوابة نظام الثيمات — مسؤولة عن تحميل، تطبيق، عزل، وإدارة ثيمات المتجر.

## للمطور الثالث: تركيب ثيم خارجي

### 1. أضف الثيم كاعتماد (dependency)

```json
{
  "dependencies": {
    "@haa/theme-system": "workspace:*"
  }
}
```

### 2. عرّف الثيم

```ts
import { type ThemeConfig } from '@haa/theme-system';

const myTheme: ThemeConfig = {
  preset: 'my-custom-theme',
  colors: {
    primary: '#ff0000',
    surface1: '#ffffff',
    surface2: '#f8f9fa',
    surface3: '#f1f3f5',
    textPrimary: '#1a1a1a',
    textSecondary: '#6b7280',
    textTertiary: '#9ca3af',
    border: '#e5e7eb',
    borderHover: '#d1d5db',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  font: {
    family: 'Cairo',
    url: 'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&display=swap',
    headingsSize: '1.5rem',
    bodySize: '1rem',
  },
  layout: {
    productCardColumns: 4,
    productCardStyle: 'rounded',
    imageAspectRatio: 'square',
    showRating: true,
    showSalesCount: true,
    showStockBadge: true,
    showCategory: true,
    showDiscountBadge: true,
  },
  // ... homepage, header, footer, socialLinks, customCss, analytics
};
```

### 3. إضافة الثيم إلى المتجر (اختياري)

إذا تبغى الثيم يظهر في **متجر الثيمات**:

```ts
import { THEMES, type ThemeDefinition } from '@haa/theme-system';

THEMES.push({
  id: 'my-theme',
  name: 'My Theme',
  nameAr: 'ثيمي',
  description: '...',
  descriptionAr: '...',
  author: 'اسمك',
  price: 0,
  featured: false,
  screenshotUrl: 'data:image/svg+xml;base64,...',
  config: myTheme,
});
```

### 4. تطبيق الثيم مباشرة

```ts
import { loadTheme, validateThemeConfig } from '@haa/theme-system';

const validation = validateThemeConfig(myTheme);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  return;
}

loadTheme(myTheme);
```

### 5. استخدام الـ Hook في React

```tsx
import { useThemeConfig, setThemeApiBase } from '@haa/theme-system';

setThemeApiBase('https://api.example.com');

function App() {
  useThemeConfig('store-slug');
  return <div id="theme-scope">{/* المحتوى */}</div>;
}
```

## وظائف البوابة

| الدالة | الوظيفة |
|---|---|
| `setThemeApiBase(url)` | تعيين رابط API الأساسي |
| `useThemeConfig(slug)` | تحميل وتطبيق الثيم عبر API |
| `loadTheme(config)` | تطبيق ثيم مباشرة (بدون API) |
| `clearTheme()` | مسح كل أثر الثيم الحالي |
| `applyTheme(config)` | تطبيق الثيم مع عزل CSS |
| `fetchThemeConfig(slug)` | جلب الثيم من API |
| `validateThemeConfig(config)` | التحقق من صحة config الثيم |
| `generateThemeThumbnail(colors)` | توليد صورة مصغرة SVG من الألوان |

## العزل (Isolation)

- CSS variables تُطبق على `:root` + `#theme-scope`
- Custom CSS يُغلف بـ `@layer theme-custom` + `#theme-scope` prefix
- `clearTheme()` يمسح: 14 متغير CSS + رابط الخط + `<style>` + أكواد التحليلات
- Analaytics (GTM, GA, FB Pixel) تُمسح وتُعاد مع كل ثيم
- Live Preview عبر `postMessage` مع iframe
- Rollback: آخر 5 نسخ تُحفظ تلقائياً
