/**
 * LuxuryImageFallback — a graceful placeholder used when a real image
 * (product photo, hero image, etc.) is missing or fails to load.
 *
 * The component supports four visual variants:
 *   - `perfume`  — bottle silhouette (default, used in product cards)
 *   - `star`     — star badge (used in "featured" highlights)
 *   - `gift`     — gift box (used in "free gift" / "with purchase" cards)
 *   - `hero`     — large decorative variant for the hero section
 *                  (gradient background + larger perfume silhouette +
 *                  brand mark). Falls back to a luxurious ambient look
 *                  that does not look like a broken image.
 */

export type FallbackIcon = 'perfume' | 'star' | 'gift' | 'hero';

export default function LuxuryImageFallback({
  aspectRatio = '1/1',
  icon = 'perfume',
  className = '',
}: {
  aspectRatio?: string;
  icon?: FallbackIcon;
  className?: string;
}) {
  if (icon === 'hero') {
    return (
      <div
        className={`flex h-full w-full items-center justify-center overflow-hidden ${className}`}
        style={{
          background:
            'linear-gradient(135deg, var(--lux-bg, #FAF7F1) 0%, var(--lux-image-frame, #F7EFE6) 50%, var(--lux-bg, #FAF7F1) 100%)',
        }}
        aria-hidden="true"
      >
        <svg
          width="180"
          height="180"
          viewBox="0 0 180 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="opacity-30"
        >
          {/* Decorative ring */}
          <circle
            cx="90"
            cy="90"
            r="78"
            stroke="var(--lux-primary, #B88A3D)"
            strokeWidth="1"
            strokeDasharray="2 4"
            fill="none"
          />
          {/* Large perfume silhouette */}
          <ellipse cx="90" cy="130" rx="60" ry="38" fill="var(--lux-primary, #B88A3D)" opacity="0.15" />
          <path
            d="M90 36C70 36 56 50 56 70C56 90 90 142 90 142C90 142 124 90 124 70C124 50 110 36 90 36Z"
            fill="var(--lux-primary, #B88A3D)"
            opacity="0.35"
          />
          <ellipse cx="90" cy="70" rx="14" ry="18" fill="var(--lux-primary, #B88A3D)" opacity="0.5" />
          {/* Brand mark (subtle "H" stylized) */}
          <text
            x="90"
            y="98"
            textAnchor="middle"
            fontSize="20"
            fontWeight="300"
            fontFamily="serif"
            fill="var(--lux-primary, #B88A3D)"
            opacity="0.6"
          >
            HAA
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{
        aspectRatio,
        background:
          'linear-gradient(135deg, var(--lux-image-frame, #F7EFE6) 0%, var(--lux-subtle-surface, #FBF8F2) 50%, var(--lux-image-frame, #F7EFE6) 100%)',
      }}
      aria-hidden="true"
    >
      {/* Decorative subtle radial highlight — gives the fallback a
          warm, premium feel without looking like a broken image. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 65%, var(--lux-primary, #B88A3D) 0%, transparent 60%)',
          opacity: 0.08,
        }}
      />
      {icon === 'star' ? (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M32 4L39.45 24.24 60 25.81 43.94 41.04 47.7 60.94 32 50.04 16.3 60.94 20.06 41.04 4 25.81 24.55 24.24 32 4Z" fill="var(--lux-primary, #B88A3D)" opacity="0.18"/>
          <path d="M32 10 36.55 25.7 50 26.46 39.5 36.27 42.4 51.96 32 43.36 21.6 51.96 24.5 36.27 14 26.46 27.45 25.7 32 10Z" fill="var(--lux-primary, #B88A3D)" opacity="0.32"/>
          <circle cx="32" cy="32" r="3" fill="var(--lux-primary, #B88A3D)" opacity="0.5"/>
        </svg>
      ) : icon === 'gift' ? (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="22" width="52" height="36" rx="3" fill="var(--lux-primary, #B88A3D)" opacity="0.2"/>
          <rect x="6" y="22" width="52" height="14" fill="var(--lux-primary, #B88A3D)" opacity="0.12"/>
          <path d="M32 22V58M6 22H58M14 22C14 16 19 8 32 8C45 8 50 16 50 22M20 22C20 14 24 6 32 6C40 6 44 14 44 22" stroke="var(--lux-primary, #B88A3D)" strokeWidth="2" opacity="0.4"/>
        </svg>
      ) : (
        // 'perfume' icon (default) — premium product placeholder
        <>
          {/* Decorative outer ring */}
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="var(--lux-primary, #B88A3D)"
              strokeWidth="0.4"
              strokeDasharray="1.2 3"
              opacity="0.4"
            />
          </svg>
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="36" cy="50" rx="24" ry="6" fill="var(--lux-primary, #B88A3D)" opacity="0.12"/>
            <path d="M36 14C28 14 22 20 22 28C22 36 36 58 36 58C36 58 50 36 50 28C50 20 44 14 36 14Z" fill="var(--lux-primary, #B88A3D)" opacity="0.28"/>
            <ellipse cx="36" cy="28" rx="6" ry="8" fill="var(--lux-primary, #B88A3D)" opacity="0.5"/>
            <rect x="32" y="6" width="8" height="6" rx="1" fill="var(--lux-primary, #B88A3D)" opacity="0.4"/>
            <circle cx="36" cy="36" r="1.5" fill="#FFFFFF" opacity="0.6"/>
          </svg>
        </>
      )}
    </div>
  );
}
