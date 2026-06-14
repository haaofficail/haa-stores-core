import { LUXURY_THEME_CLASS } from '../../luxuryTokens';

/**
 * LuxuryStoryBanner — قسم قصة العلامة
 *
 * المقاسات الافتراضية:
 *   mobile  (390px): py-8 (= 32px padding عمودي)
 *   tablet  (768px): py-8
 *   desktop (1440px): py-10 (= 40px padding عمودي)
 *
 * لا يحتوي صورة — فقط نص منسق مع خط ذهبي في الأعلى
 * مناسب لقصة المتجر أو الـ Brand Story
 */

export default function LuxuryStoryBanner({
  title = 'حرفية عطرية راقية',
  description = 'منذ عام 2020، نقدم أرقى العطور الشرقية والغربية المختارة بعناية. كل عطر يحكي قصة، وكل قصة تستحق أن تُروى.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section className={`${LUXURY_THEME_CLASS}`} style={{ backgroundColor: 'var(--lux-bg, #FAF7F1)' }}>
      <div className="mx-auto max-w-2xl px-4 py-8 text-center sm:px-6 sm:py-10">
        <div className="mx-auto mb-5 h-px w-12" style={{ backgroundColor: 'var(--lux-primary, #B88A3D)' }} />
        <h3 className="text-[clamp(20px,3vw,32px)] font-light leading-tight" style={{ color: 'var(--lux-text, #2B2520)' }}>
          {title}
        </h3>
        {description && (
          <p className="mt-4 text-sm font-light leading-relaxed" style={{ color: 'var(--lux-muted, #756B61)' }}>
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
