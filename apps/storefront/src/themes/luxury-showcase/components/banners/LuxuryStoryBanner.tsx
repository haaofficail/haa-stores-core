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
    <div
      className={`${LUXURY_THEME_CLASS}`}
      style={{ backgroundColor: 'var(--lux-bg, #FAF7F1)' }}
    >
      <div className="mx-auto max-w-2xl px-4 py-8 text-center sm:px-6 sm:py-10">
        <div className="mx-auto mb-5 h-px w-12" style={{ backgroundColor: 'var(--lux-primary, #B88A3D)' }} />
        <h3
          className="text-[clamp(20px,3vw,32px)] font-light leading-tight"
          style={{ color: 'var(--lux-text, #2B2520)' }}
        >
          {title}
        </h3>
        {description && (
          <p
            className="mt-4 text-sm font-light leading-relaxed"
            style={{ color: 'var(--lux-muted, #756B61)' }}
          >
            {description}
          </p>
        )}
        {/* Decorative brand mark — subtle, mirrors the hero fallback motif. */}
        <svg
          viewBox="0 0 200 40"
          className="mx-auto mt-6 h-6 w-32 opacity-40"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <line x1="0" y1="20" x2="60" y2="20" stroke="var(--lux-primary, #B88A3D)" strokeWidth="0.5" />
          <line x1="140" y1="20" x2="200" y2="20" stroke="var(--lux-primary, #B88A3D)" strokeWidth="0.5" />
          <text
            x="100"
            y="24"
            textAnchor="middle"
            fontSize="10"
            fontWeight="300"
            fontFamily="serif"
            fill="var(--lux-primary, #B88A3D)"
            letterSpacing="2"
          >
            HAA
          </text>
        </svg>
      </div>
    </div>
  );
}
