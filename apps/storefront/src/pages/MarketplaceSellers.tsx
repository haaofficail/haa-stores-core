import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
// eslint-disable-next-line no-restricted-imports -- TODO: P1-#5 migration; lucide icons as plain JSX
import { MapPin, Store } from 'lucide-react';
import { haaMarketplaceApi, type HaaMarketplaceSeller } from '@/lib/api';
import { StoreButton, StoreContainer, StoreEmptyState, StoreSkeleton } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import { useSEO } from '@/hooks/useSEO';

export default function MarketplaceSellers() {
  const [sellers, setSellers] = useState<HaaMarketplaceSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useSEO({ title: 'بائعو سوق هاء', description: 'كل البائعين المشاركين في سوق هاء.' });

  useEffect(() => {
    let cancelled = false;
    setError(false);
    haaMarketplaceApi.listSellers()
      .then((data) => { if (cancelled) return; setSellers(data); })
      .catch(() => { if (cancelled) return; setError(true); setSellers([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <main id="storefront-scope" data-theme-scope="storefront" className="min-h-screen bg-surface-2 overflow-x-hidden">
      <section className="border-b border-border bg-surface-1">
        <StoreContainer className="py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-text-primary">بائعو سوق هاء</h1>
              <p className="mt-2 text-sm text-text-secondary">اكتشف المتاجر المشاركة ومنتجاتها المختارة في السوق العام.</p>
            </div>
            <StoreButton href="/marketplace" variant="outline">العودة للسوق</StoreButton>
          </div>
        </StoreContainer>
      </section>

      <StoreContainer className="py-6">
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <StoreSkeleton key={i} className="h-32" />)}
          </div>
        ) : error ? (
          <StoreEmptyState
            icon={Store}
            title="تعذر تحميل البائعين"
            description="حدث خطأ أثناء جلب قائمة البائعين. حاول مرة أخرى."
            action={<StoreButton onClick={() => window.location.reload()}>إعادة المحاولة</StoreButton>}
          />
        ) : sellers.length === 0 ? (
          <StoreEmptyState icon={Store} title="لا يوجد بائعون" description="لم يتم اعتماد منتجات بائعين في السوق بعد." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sellers.map((seller) => (
              <Link key={seller.slug} to={`/marketplace/sellers/${seller.slug}`} className="rounded-[8px] border border-border bg-surface-1 p-4 shadow-card transition-shadow hover:shadow-card-hover">
                <div className="flex gap-3">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-surface-2">
                    {seller.logoUrl ? <img src={seller.logoUrl} alt={seller.name} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <Icon icon={Store} size="md" className="text-text-disabled" />}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-bold text-text-primary">{seller.name}</h2>
                    {(seller.city || seller.district) && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-text-tertiary">
                        <Icon icon={MapPin} size="2xs" />
                        {[seller.city, seller.district].filter(Boolean).join(' - ')}
                      </p>
                    )}
                    <p className="mt-2 text-xs font-semibold text-primary-600">{seller.productCount ?? 0} منتج في السوق</p>
                  </div>
                </div>
                {seller.description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-text-secondary">{seller.description}</p>}
              </Link>
            ))}
          </div>
        )}
      </StoreContainer>
    </main>
  );
}
