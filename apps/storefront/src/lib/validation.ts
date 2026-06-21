/** تطبيع slug المتجر إلى أحرف URL آمنة (a-z0-9-). الاسم العربي الخالص يُنتج
 *  fallback مستقرّاً `store-<hash>` بدل قيمة فارغة بصمت (QA AU1). */
export function normalizeStoreSlug(value: string): string {
  const cleaned = (value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);

  if (cleaned) return cleaned;

  // اسم عربي خالص → لا أحرف لاتينية بعد التنظيف. أرجِع fallback مستقرّاً
  // `store-<hash>` بدل قيمة فارغة بصمت؛ المستخدم يستطيع تعديله يدوياً (QA AU1).
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  return `store-${stableHash(trimmed)}`;
}

/** تجزئة djb2 مستقرّة (نقية، بلا عشوائية) → base36 قصيرة */
function stableHash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

/** تحقّق رقم جوال سعودي بصيغة 05XXXXXXXX (QA AU3). */
export function isSaudiPhone(phone: string): boolean {
  return /^05\d{8}$/.test((phone || '').trim());
}
