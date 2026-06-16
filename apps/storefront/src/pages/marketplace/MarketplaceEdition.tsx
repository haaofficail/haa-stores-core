import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { haaMarketplaceApi, type HaaMarketplaceCategory, type HaaMarketplaceProduct } from '@/lib/api';
import { StoreEmptyState } from '@/components/ui';
import { useSEO } from '@/hooks/useSEO';
import { marketplaceCart } from '@/lib/marketplace-cart';
import { MarketplaceHero } from './theme/MarketplaceHero';
import { MarketplaceSellerRail } from './theme/MarketplaceSellerRail';
import { MarketplaceCategoryTabs, MarketplaceFilterBar } from './theme/MarketplaceFilters';
import { MarketplaceProductCard } from './theme/MarketplaceProductCard';
import { ProductCardSkeleton } from './theme/ProductCardSkeleton';
import { MarketplaceFooter } from './theme/MarketplaceFooter';

export default function MarketplaceEdition() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<HaaMarketplaceProduct[]>([]);
  const [categories, setCategories] = useState<HaaMarketplaceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');
  const [cartCount, setCartCount] = useState(() => marketplaceCart.count());
  const search = searchParams.get('search') ?? '';
  const selectedCategory = searchParams.get('category') ?? '';
  const selectedSort = searchParams.get('sort') ?? 'featured';
  const availableOnly = searchParams.get('availableOnly') === 'true';
  const minPrice = searchParams.get('minPrice') ?? '';
  const maxPrice = searchParams.get('maxPrice') ?? '';

  useSEO({
    title: 'سوق هاء',
    description: 'سوق عام تسويقي يجمع المنتجات المختارة من متاجر هاء ستورز.',
  });

  const load = useCallback(() => {
    setLoading(true);
    haaMarketplaceApi.listProducts({
      page: 1, limit: 40,
      search: search || undefined,
      category: selectedCategory || undefined,
      sort: selectedSort, availableOnly,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    })
      .then((res) => { setProducts(res.data); setTotal(res.total); })
      .catch(() => { setProducts([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [search, selectedCategory, selectedSort, availableOnly, minPrice, maxPrice]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    haaMarketplaceApi.listCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const refresh = () => setCartCount(marketplaceCart.count());
    window.addEventListener('haa-marketplace-cart-change', refresh);
    return () => window.removeEventListener('haa-marketplace-cart-change', refresh);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (searchInput.trim()) next.set('search', searchInput.trim());
      else next.delete('search');
      setSearchParams(next, { replace: true });
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput, searchParams, setSearchParams]);

  const featuredStores = useMemo(() => {
    const map = new Map<string, HaaMarketplaceProduct['store']>();
    products.forEach((p) => map.set(p.store.slug, p.store));
    return [...map.values()].slice(0, 6);
  }, [products]);

  const selectCategory = (slug: string) => {
    const next = new URLSearchParams(searchParams);
    if (slug) next.set('category', slug);
    else next.delete('category');
    setSearchParams(next, { replace: true });
  };

  const setFilter = (key: string, value: string | boolean) => {
    const next = new URLSearchParams(searchParams);
    if (typeof value === 'boolean') {
      if (value) next.set(key, 'true'); else next.delete(key);
    } else if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  return (
    <main className="min-h-screen bg-white text-black">
      <MarketplaceHero total={total} cartCount={cartCount} searchInput={searchInput} onSearchInputChange={setSearchInput} />

      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <div className="py-3 sm:py-4">
          <MarketplaceCategoryTabs categories={categories} selectedCategory={selectedCategory} onSelectCategory={selectCategory} />

          <div id="marketplace-products" className="mb-2">
            <div className="mb-1.5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-black">مختارات السوق</h2>
                <p className="text-xs text-gray-500">{total} منتج من متاجر متعددة</p>
              </div>
            </div>
            <MarketplaceFilterBar minPrice={minPrice} maxPrice={maxPrice} selectedSort={selectedSort} availableOnly={availableOnly} onSetFilter={setFilter} />
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 items-stretch">
              {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : products.length === 0 ? (
            <StoreEmptyState icon={ShoppingBag} title="لا توجد منتجات" description="لم يتم نشر منتجات في سوق هاء بعد." />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-3 lg:grid-cols-4 items-stretch">
              {products.map((product) => <MarketplaceProductCard key={`${product.store.slug}-${product.id}`} product={product} />)}
            </div>
          )}

          <MarketplaceSellerRail stores={featuredStores} />
        </div>
      </div>

      <MarketplaceFooter />
    </main>
  );
}
