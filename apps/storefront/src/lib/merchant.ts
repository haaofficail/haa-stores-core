/**
 * يبني رابط لوحة التاجر (merchant dashboard) لصفحات الدخول/التسجيل.
 *
 * الأولوية:
 *  1) VITE_MERCHANT_DASHBOARD_URL إذا ضُبط لقيمة حقيقية (غير localhost) — للنشر.
 *  2) اشتقاق من المضيف الحالي: merchant.<host> — يعمل تلقائياً على
 *     staging.haastores.com → merchant.staging.haastores.com و
 *     haastores.com → merchant.haastores.com دون أي إعداد.
 *  3) قيمة التطوير المحلية (localhost:5173).
 */
export function merchantDashboardUrl(path = ''): string {
  const clean = path && !path.startsWith('/') ? `/${path}` : path;
  const env = import.meta.env.VITE_MERCHANT_DASHBOARD_URL as string | undefined;

  if (env && !/localhost|127\.0\.0\.1/.test(env)) {
    return env.replace(/\/$/, '') + clean;
  }

  if (typeof window !== 'undefined') {
    const host = window.location.host;
    if (host.endsWith('haastores.com')) {
      return `https://merchant.${host}${clean}`;
    }
  }

  return (env || 'http://localhost:5173') + clean;
}
