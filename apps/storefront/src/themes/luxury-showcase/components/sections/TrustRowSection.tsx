import { LUXURY_THEME_CLASS } from '../../luxuryTokens';

const defaultItems = [
  { icon: 'shield', label: 'دفع آمن' },
  { icon: 'gift', label: 'تغليف فاخر' },
  { icon: 'truck', label: 'شحن سريع' },
  { icon: 'star', label: 'منتجات مختارة بعناية' },
  { icon: 'refresh', label: 'استرجاع حسب السياسة' },
];

export default function TrustRowSection({
  items = defaultItems,
}: {
  items?: { icon: string; label: string }[];
}) {
  return (
    <section className={`${LUXURY_THEME_CLASS} py-4`} style={{ backgroundColor: 'var(--lux-bg, #FAF7F1)' }}>
      <div className="mx-auto max-w-[var(--container-max-width,1440px)] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center">
                <TrustIcon icon={item.icon} size={20} />
              </div>
              <span className="text-sm font-light whitespace-nowrap" style={{ color: 'var(--lux-muted, #756B61)' }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustIcon({ icon, size = 18 }: { icon: string; size?: number }) {
  const commonProps: React.SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    fill: 'none',
    stroke: 'var(--lux-primary, #B88A3D)',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (icon) {
    case 'shield':
      return (
        <svg {...commonProps} viewBox="0 0 24 24">
          <path d="M12 2L3 7v5c0 5.25 3.83 10.15 9 11 5.17-.85 9-5.75 9-11V7l-9-5z"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
      );
    case 'gift':
      return (
        <svg {...commonProps} viewBox="0 0 24 24">
          <rect x="3" y="8" width="18" height="4" rx="1"/>
          <path d="M12 8v13"/>
          <path d="M12 8H8a3 3 0 010-6c2.76 0 4 2.5 4 6zm0 0h4a3 3 0 000-6c-2.76 0-4 2.5-4 6z"/>
        </svg>
      );
    case 'truck':
      return (
        <svg {...commonProps} viewBox="0 0 24 24">
          <rect x="1" y="3" width="15" height="13" rx="2"/>
          <path d="M16 8h3l4 4v4h-2"/>
          <circle cx="5.5" cy="18.5" r="2.5"/>
          <circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
      );
    case 'star':
      return (
        <svg {...commonProps} viewBox="0 0 24 24">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      );
    case 'refresh':
      return (
        <svg {...commonProps} viewBox="0 0 24 24">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
        </svg>
      );
    default:
      return (
        <svg {...commonProps} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v8M8 12h8"/>
        </svg>
      );
  }
}
