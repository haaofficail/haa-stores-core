import { useTranslation } from 'react-i18next';
import { LUXURY_THEME_CLASS } from '../../luxuryTokens';
import LuxuryProductCard from '../LuxuryProductCard';

export default function BestSellersSection({
  products,
  slug,
  title,
  limit = 8,
  onAddToCart,
}: {
  products: any[];
  slug: string;
  title?: string;
  limit?: number;
  onAddToCart?: (product: any) => Promise<void>;
}) {
  const { t } = useTranslation();
  const active = products
    .filter((p: any) => p.status === 'active')
    .sort((a: any, b: any) => (b.salesCount ?? 0) - (a.salesCount ?? 0))
    .slice(0, limit);
  if (active.length === 0) return null;

  return (
    <section className={`${LUXURY_THEME_CLASS} py-12 sm:py-14 lg:py-16`} style={{ backgroundColor: 'var(--lux-bg, #FAF7F1)' }}>
      <div className="mx-auto max-w-[var(--container-max-width,1440px)] px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center sm:mb-12">
          <p
            className="mb-3 text-xs font-light uppercase tracking-[0.32em]"
            style={{ color: 'var(--lux-primary, #B88A3D)' }}
          >
            Most loved
          </p>
          <h2
            className="text-[clamp(22px,3vw,36px)] font-light leading-tight tracking-[-0.01em]"
            style={{
              color: 'var(--lux-text, #2B2520)',
              fontFamily: 'theme-serif, "IBM Plex Sans Arabic", serif',
            }}
          >
            {title || t('home.bestSellers', 'الأكثر مبيعاً')}
          </h2>
          <div className="mx-auto mt-3 h-px w-10" style={{ backgroundColor: 'var(--lux-primary, #B88A3D)' }} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {active.map((product: any) => (
            <LuxuryProductCard
              key={product.id}
              product={product}
              slug={slug}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
