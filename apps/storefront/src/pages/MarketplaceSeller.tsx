import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Building2, MapPin, Search, ShoppingBag, Star, Store } from 'lucide-react';
import { haaMarketplaceApi, type HaaMarketplaceProduct, type HaaMarketplaceSeller } from '@/lib/api';
import { StoreButton, StoreContainer, StoreEmptyState, StoreInput, StoreSkeleton } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import { useSEO } from '@/hooks/useSEO';
import { marketplaceTheme } from './marketplace/theme/tokens';
import { MarketplaceProductCard } from './marketplace/theme/MarketplaceProductCard';

export default function MarketplaceSeller() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [seller, setSeller] = useState<HaaMarketplaceSeller | null>(null);
  const [products, setProducts] = useState<HaaMarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');
  const [total, setTotal] = useState(0);
  const search = searchParams.get('search') ?? '';

  useSEO({
    title: seller ? `${seller.name} في سوق هاء` : 'بائع سوق هاء',
    description: seller?.seoDescription || seller?.description || 'صفحة بائع في سوق هاء.',
  });

  const load = useCallback(() => {
    if (!storeSlug) return;
    setLoading(true);
    Promise.all([
      haaMarketplaceApi.getSeller(storeSlug),
      haaMarketplaceApi.listProducts({ page: 1, limit: 40, store: storeSlug, search: search || undefined }),
    ])
      .then(([sellerResult, productsResult]) => {
        setSeller(sellerResult);
        setProducts(productsResult.data);
        setTotal(productsResult.total);
      })
      .catch(() => {
        setSeller(null);
        setProducts([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [storeSlug, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (searchInput.trim()) next.set('search', searchInput.trim());
      else next.delete('search');
      setSearchParams(next, { replace: true });
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput, searchParams, setSearchParams]);

  if (loading) {
    return (
      <main className={`min-h-screen ${marketplaceTheme.shell}`}>
        <StoreContainer className="py-3">
          <StoreSkeleton className="h-24" />
          <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <StoreSkeleton key={i} className="aspect-square" />)}
          </div>
        </StoreContainer>
      </main>
    );
  }

  if (!seller) {
    return (
      <main className={`min-h-screen ${marketplaceTheme.shell}`}>
        <StoreContainer className="py-6">
          <StoreEmptyState icon={Store} title="البائع غير موجود" description="لم يتم العثور على بائع نشط في سوق هاء بهذا الرابط." action={<StoreButton href="/marketplace">العودة للسوق</StoreButton>} />
        </StoreContainer>
      </main>
    );
  }

  return (
    <main className={`min-h-screen ${marketplaceTheme.shell}`}>
      <section className="bg-white">
        {seller.coverUrl && (
          <div className="h-24 w-full overflow-hidden bg-[#dbeafe] sm:h-32">
            <img src={seller.coverUrl} alt={seller.name} className="h-full w-full object-cover" loading="lazy" />
          </div>
        )}
        <StoreContainer className="py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-white ring-1 ring-gray-100">
                {seller.logoUrl ? <img src={seller.logoUrl} alt={seller.name} className="h-full w-full object-cover" /> : <Icon icon={Store} size="md" className="text-primary-500" />}
              </div>
              <div className="min-w-0">
                <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-[#16a34a]/10 px-2 py-0.5 text-[10px] font-bold text-[#16a34a]">
                  <Icon icon={Building2} size="2xs" />
                  بائع في سوق هاء
                </div>
                <h1 className="text-lg font-bold text-black sm:text-xl">{seller.name}</h1>
                {seller.description && <p className="mt-0.5 max-w-xl text-xs leading-5 text-gray-500">{seller.description}</p>}
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
                  {(seller.city || seller.district) && (
                    <span className="inline-flex items-center gap-0.5"><Icon icon={MapPin} size="2xs" />{[seller.city, seller.district].filter(Boolean).join(' - ')}</span>
                  )}
                  <span>{seller.productCount} منتج</span>
                  {seller.rating != null && seller.rating > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <Icon icon={Star} size="2xs" className="text-[#f59e0b] fill-[#f59e0b]" />
                      <span className="font-bold text-black">{seller.rating.toFixed(1)}</span>
                      {seller.reviewCount != null && seller.reviewCount > 0 && <span>({seller.reviewCount})</span>}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <StoreButton href="/marketplace/cart" variant="outline" className={`min-h-[32px] px-2 text-[10px] ${marketplaceTheme.outlineButton}`} iconStart={<Icon icon={ShoppingBag} size="2xs" />}>سلة السوق</StoreButton>
              <StoreButton href={seller.storefrontUrl} variant="outline" className={`min-h-[32px] px-2 text-[10px] ${marketplaceTheme.outlineButton}`}>زيارة متجره</StoreButton>
            </div>
          </div>
        </StoreContainer>
      </section>

      <StoreContainer className="py-3">
        <div className="mb-2 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <StoreInput
            label="ابحث في منتجات البائع"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="اسم المنتج..."
            iconEnd={<Icon icon={Search} size="xs" />}
          />
          <p className="text-xs font-bold text-gray-500">{total} منتج</p>
        </div>

        {products.length === 0 ? (
          <StoreEmptyState icon={ShoppingBag} title="لا توجد منتجات" description="لا توجد منتجات مطابقة داخل صفحة هذا البائع." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => <MarketplaceProductCard key={`${product.store.slug}-${product.id}`} product={product} showCategory />)}
          </div>
        )}
      </StoreContainer>
    </main>
  );
}
