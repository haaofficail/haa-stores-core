# Storage Decision — Release 0.1

## المشكلة

MinIO غير متوفر لأن Docker غير مثبت على جهاز التطوير.
رفع الصور (للمنتجات، الشعارات، إلخ) يحتاج مخزن ملفات.

## القرار

في Release 1، سنستخدم **LocalStorageAdapter** كطبقة تخزين مؤقتة.

### التفاصيل

- الملفات تُحفظ في `./storage/` داخل المشروع.
- روابط الملفات تُخدم عبر مسار `/uploads/*` في API.
- الـ Adapter يطبق واجهة `MediaAdapter` الموجودة في `@haa/shared`.
- عند توفر Docker/MinIO، سنبدل الـ Adapter فقط دون تغيير أي كود آخر.

### ملفات التخزين

```ts
interface MediaAdapter {
  upload(filename: string, buffer: Buffer, mimetype: string): Promise<string>;
  delete(url: string): Promise<void>;
  getUrl(filename: string): string;
}
```

### خطة التبديل المستقبلية

```txt
Release 1: LocalStorageAdapter ← مؤقت
Release 2+: MinIOAdapter ← دائم (يتطلب Docker)

تغيير adapter واحد فقط في createMediaAdapter():
  local → new LocalStorageAdapter()
  s3    → new MinIOAdapter()    // مستقبلًا
```

### حدود الـ LocalStorageAdapter

- لا يناسب Production.
- الملفات تفقد عند `git clean` إلا إذا أضيفت لـ `.gitignore`.
- لا يدعم CDN.
- يدعم load balancing واحد فقط.
