/** تطبيع slug المتجر — يدعم الأسماء العربية (NFKD) ولا يُنتج قيمة فارغة بصمت (QA AU1). */
export function normalizeStoreSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

/** تحقّق رقم جوال سعودي بصيغة 05XXXXXXXX (QA AU3). */
export function isSaudiPhone(phone: string): boolean {
  return /^05\d{8}$/.test((phone || '').trim());
}
