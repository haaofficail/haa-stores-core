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
    <section className={`${LUXURY_THEME_CLASS} py-4 sm:py-5`} style={{ backgroundColor: 'var(--lux-bg, #FAF7F1)' }}>
      <div className="mx-auto max-w-[var(--container-max-width,1440px)] px-4 sm:px-6 lg:px-8">
        <div className="mb-5 text-center">
          <h2 className="text-lg font-light sm:text-xl" style={{ color: 'var(--lux-text, #2B2520)' }}>
            {title || t('home.bestSellers', 'الأكثر مبيعاً')}
          </h2>
          <div className="mx-auto mt-2 h-px w-8" style={{ backgroundColor: 'var(--lux-primary, #B88A3D)' }} />
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
