import { LUXURY_THEME_CLASS } from '../../luxuryTokens';

/**
 * LuxuryThinPromoBanner — شريط نحيف (promo)
 *
 * المقاسات الافتراضية:
 *   جميع الشاشات: 36px ارتفاع (py-3)
 *   عرض كامل مع borders أفقية
 *
 * لا يحتوي صورة، فقط نص بسيط
 * مناسب للعروض السريعة: "تغليف مجاني" "شحن سريع"
 */

export default function LuxuryThinPromoBanner({
  text = 'تغليف فاخر مجاني للطلبات المختارة',
}: {
  text?: string;
}) {
  return (
    <section className={`${LUXURY_THEME_CLASS} py-3 text-center`} style={{ backgroundColor: 'var(--lux-bg, #FAF7F1)', borderTop: '1px solid var(--lux-border, #E6D8C6)', borderBottom: '1px solid var(--lux-border, #E6D8C6)' }}>
      <div className="mx-auto max-w-[var(--container-max-width,1440px)] px-4 sm:px-6">
        <p className="text-xs font-light tracking-wide" style={{ color: 'var(--lux-muted, #756B61)' }}>
          {text}
        </p>
      </div>
    </section>
  );
}
