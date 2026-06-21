import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { productsApi, categoriesApi, brandsApi, tagsApi, type PublicProduct, type PublicCategory, type PublicBrand, type PublicTag } from '@/lib/api';
import { useSharedCart } from '@/hooks/CartContext';
import ThemedProductCard from '@/components/ThemedProductCard';
import CountdownTimer from '@/components/CountdownTimer';
import { ProductPriceBlock, BNPLBadges } from '@/components/product-card';
import {
  StoreContainer, StoreBreadcrumbs,
  StoreSelect, StoreEmptyState, StoreSkeleton, StoreButton,
} from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import { useSEO } from '@/hooks/useSEO';
import { breadcrumbJSONLD } from '@/lib/jsonld';
import { useStore } from '@/hooks/useStore';
import FilterSidebar, { defaultFilters, filtersToParams, getActiveFilterCount, type FilterState } from '@/components/FilterSidebar';
import { Package, X, LayoutGrid, List, Check, ShoppingCart, Star, BadgeCheck, Percent, SlidersHorizontal, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'name';
type ViewMode = 'grid' | 'list';

const PREFS_KEY = 'haa-category-prefs';

function loadPrefs(): { viewMode: ViewMode; columns: number } {
  try {
    const saved = localStorage.getItem(PREFS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { viewMode: 'grid', columns: 4 };
}



function ListProductCard({ product, slug }: { product: PublicProduct; slug: string }) {
  const { t } = useTranslation();
  const { addItem } = useSharedCart();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const hasDiscount = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);
  const discountPercent = hasDiscount ? Math.round((1 - Number(product.price) / Number(product.compareAtPrice!)) * 100) : null;
  const countdownEnd = useMemo(() => hasDiscount && product.offerEndDate ? new Date(product.offerEndDate).getTime() : 0, [hasDiscount, product.offerEndDate]);
  const isOutOfStock = product.trackInventory && product.stockQuantity === 0;
  const isLowStock = product.trackInventory && product.stockQuantity > 0 && product.stockQuantity <= 5;
  const hasStock = !isOutOfStock && !isLowStock && (!product.trackInventory || product.stockQuantity > 5);
  const hasRating = product.rating != null;


  const handleAdd = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isOutOfStock || adding) return;
    setAdding(true);
    try {
      await addItem(product.id, 1);
      setAdded(true);
      toast.success(t('product.addedSuccessfully'));
      setTimeout(() => setAdded(false), 2500);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setAdding(false);
    }
  }, [product.id, isOutOfStock, adding, addItem, t]);

  return (
    <div className="group flex items-center gap-2 p-2 sm:gap-3 sm:p-3 bg-surface-1 rounded-xl shadow-card hover:shadow-card-hover transition-shadow duration-200">
      <Link
        to={`/s/${slug}/p/${product.slug}`}
        className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-surface-2 shrink-0 block relative"
      >
        <div className="w-full h-full rounded-lg overflow-hidden">
          {product.images?.[0] && !imgError ? (
            <img
              src={product.images[0]}
              alt={product.name}
              width={400} height={400}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon icon={Package} size="md" className="text-text-disabled" />
            </div>
          )}
        </div>
        {hasDiscount && (
          <span className="absolute -top-1 -end-1 inline-flex items-center gap-0.5 rounded-full bg-danger font-bold leading-none text-danger-text shadow-xs"
            style={{ paddingInline: 'var(--badge-compact-padding-x, 4px)', paddingBlock: 'var(--badge-compact-padding-y, 1.5px)', fontSize: 'var(--badge-compact-font-size, 10px)' }}>
            <Icon icon={Percent} size="2xs" />
            {discountPercent}
          </span>
        )}
      </Link>

      <Link to={`/s/${slug}/p/${product.slug}`} className="flex-1 min-w-0">
        {product.categoryName && (
          <p className="text-[var(--badge-font-size)] text-primary-600 font-medium leading-none truncate">{product.categoryName}</p>
        )}
        <h3 className="font-semibold text-sm text-text-primary line-clamp-1 group-hover:text-primary-600 transition-colors duration-300">
          {product.name}
        </h3>
        <div className="flex items-center gap-2 mt-0.5">
          {hasRating && (
            <span className="inline-flex items-center gap-0.5 font-medium text-text-secondary leading-none"
              style={{ fontSize: 'var(--badge-compact-font-size, 10px)' }}>
              <Icon icon={Star} size="2xs" className="text-amber-400 fill-amber-400" />
              {product.rating!.toFixed(1)}
            </span>
          )}
          {hasDiscount && (
            <span className="font-medium text-danger leading-none"
              style={{ fontSize: 'var(--badge-compact-font-size, 10px)' }}>
              {discountPercent}%
            </span>
          )}
          {hasDiscount && countdownEnd > 0 && (
            <span className="leading-none"
              style={{ fontSize: 'var(--badge-compact-font-size, 10px)' }}>
              <CountdownTimer endTime={countdownEnd} size="sm" />
            </span>
          )}
          {(
            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-gray-500 leading-none">
              <TrendingUp className="h-3 w-3" />
              {product.salesCount != null && product.salesCount > 0 ? product.salesCount : 0}+
            </span>
          )}
        </div>
      </Link>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="text-right flex flex-col items-end gap-1">
          <ProductPriceBlock
            price={Number(product.price)}
            oldPrice={hasDiscount ? Number(product.compareAtPrice!) : null}
            showSavings={false}
          />
          <BNPLBadges />
        </div>

        {hasStock ? (
          <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-success leading-none whitespace-nowrap">
            <Icon icon={BadgeCheck} size="2xs" />
            {t('product.inStock')}
          </span>
        ) : isLowStock ? (
          <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-warning leading-none whitespace-nowrap">
            {t('product.lowStock')}
          </span>
        ) : null}

        {isOutOfStock ? (
          <span className="text-[var(--badge-compact-font-size)] sm:text-[var(--badge-font-size)] text-danger font-medium whitespace-nowrap leading-none">{t('product.outOfStock')}</span>
        ) : added ? (
          <span className="inline-flex items-center gap-1 text-[var(--badge-compact-font-size)] sm:text-[var(--badge-font-size)] text-success font-medium whitespace-nowrap leading-none">
            <Icon icon={Check} size="2xs" />{t('cart.addedToCart')}
          </span>
        ) : (
          <button
            onClick={handleAdd}
            disabled={adding}
            aria-label={t('product.addToCart')}
            className="min-h-[40px] px-2.5 sm:px-3 rounded-xl bg-primary-500 text-white text-xs font-semibold flex items-center gap-1 hover:bg-primary-600 active:scale-[0.97] transition-[box-shadow,transform] duration-200 disabled:opacity-50 whitespace-nowrap"
          >
            {adding ? (
              <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Icon icon={ShoppingCart} size="2xs" className="shrink-0" />
            )}
            <span className="hidden sm:inline">{t('category.quickAdd')}</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function Category() {
  const { t } = useTranslation();
  const { slug, categorySlug } = useParams<{ slug: string; categorySlug: string }>();
  const { store } = useStore();
  const { addItem } = useSharedCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [brands, setBrands] = useState<PublicBrand[]>([]);
  const [tags, setTags] = useState<PublicTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [columns, setColumns] = useState(4);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const isAllCategories = categorySlug === 'all';

  const [filters, setFilters] = useState<FilterState>(() => ({
    search: searchParams.get('search') ?? '',
    brandId: searchParams.get('brandId') ? Number(searchParams.get('brandId')) : null,
    tagIds: searchParams.get('tagId') ? [Number(searchParams.get('tagId'))] : [],
    minPrice: searchParams.get('minPrice') ?? '',
    maxPrice: searchParams.get('maxPrice') ?? '',
    inStockOnly: searchParams.get('inStockOnly') === '1',
  }));

  const [sort, setSort] = useState<SortOption>((searchParams.get('sort') as SortOption) || 'newest');
  const [page, setPage] = useState(() => {
    const p = searchParams.get('page');
    return p ? Math.max(1, Number(p)) : 1;
  });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [products, setProducts] = useState<PublicProduct[]>([]);

  useEffect(() => {
    const prefs = loadPrefs();
    setViewMode(prefs.viewMode);
    setColumns(prefs.columns);
  }, []);

  useEffect(() => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({ viewMode, columns })); } catch {}
  }, [viewMode, columns]);

  useEffect(() => {
    if (!slug) return;
    Promise.all([
      categoriesApi.list(slug),
      brandsApi.list(slug),
      tagsApi.list(slug),
    ])
      .then(([cats, brds, tgs]) => {
        setCategories(cats);
        setBrands(brds);
        setTags(tgs);
      })
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!slug || !categorySlug) return;
    setLoading(true);
    setProducts([]);

    const params: Record<string, any> = {
      page,
      limit: 20,
      sort,
      ...filtersToParams(filters),
    };
    if (!isAllCategories) {
      params.category = categorySlug;
    }

    productsApi.listPaginated(slug, params)
      .then((res) => {
        setProducts(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch(() => toast.error(t('common.error', 'حدث خطأ في تحميل البيانات')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable from useTranslation; effect intentionally runs on [slug, categorySlug, isAllCategories, page, sort, filters] only
  }, [slug, categorySlug, isAllCategories, page, sort, filters]);

  const prevFiltersRef = useRef('');
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.brandId) params.set('brandId', String(filters.brandId));
    if (filters.tagIds.length) params.set('tagId', String(filters.tagIds[0]));
    if (filters.minPrice) params.set('minPrice', filters.minPrice);
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
    if (filters.inStockOnly) params.set('inStockOnly', '1');
    if (sort !== 'newest') params.set('sort', sort);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    if (qs !== prevFiltersRef.current) {
      prevFiltersRef.current = qs;
      setSearchParams(params, { replace: true });
    }
  }, [filters, sort, page, setSearchParams]);

  const category = useMemo(
    () => categories.find((c) => c.slug === categorySlug) ?? null,
    [categories, categorySlug]
  );

  const pageTitle = isAllCategories
    ? t('category.allCategories', 'جميع المنتجات')
    : category?.name || t('category.loading', 'جاري التحميل');

  useSEO({
    title: `${pageTitle} - ${store?.name || ''}`,
    description: category?.description || store?.description || undefined,
  });

  const activeFilterCount = useMemo(() => getActiveFilterCount(filters), [filters]);
  const hasActiveFilters = activeFilterCount > 0 || sort !== 'newest';

  const clearAllFilters = () => {
    setFilters(defaultFilters());
    setSort('newest');
    setPage(1);
    setSearchParams({}, { replace: true });
  };

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setPage(1);
  };

  const title = isAllCategories ? t('category.allProducts', 'جميع المنتجات') : (category?.name ?? categorySlug ?? '');

  const breadcrumbItems = [
    { label: t('store.home'), href: `/s/${slug}` },
    ...(isAllCategories
      ? [{ label: title }]
      : [{ label: t('store.categories'), href: `/s/${slug}/c/all` }, { label: title }]),
  ];

  const breadcrumbJSON = breadcrumbJSONLD(breadcrumbItems.map((item) => ({
    name: item.label,
    url: `${window.location.origin}${item.href ?? window.location.pathname}`,
  })));

  const gridCols = columns === 2
    ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2'
    : columns === 3
      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-3'
      : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';

  const colOptions = [
    { value: 2, label: t('category.columns2', '2') },
    { value: 3, label: t('category.columns3', '3') },
    { value: 4, label: t('category.columns4', '4') },
  ] as const;

  return (
    <div className="animate-fade-in overflow-x-hidden" id="main-content">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJSON }} />
      <section className="bg-surface-1 border-b border-border/30">
        <StoreContainer className="py-4 sm:py-5">
          <StoreBreadcrumbs items={breadcrumbItems} />
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary">{title}</h1>
              {category?.description && (
                <p className="text-text-secondary text-sm mt-1.5 leading-relaxed max-w-xl">{category.description}</p>
              )}
              {!loading && (
                <p className="text-sm text-text-tertiary mt-1.5">{total} {t('category.product', 'منتج')}</p>
              )}
            </div>
          </div>
        </StoreContainer>
      </section>

      <StoreContainer className="py-4 sm:py-5">
        {/* Filter bar */}
        <div className="flex items-center gap-2.5 mb-4 flex-wrap">
          <StoreButton
            variant={activeFilterCount > 0 ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilterDrawerOpen(true)}
            icon={<Icon icon={SlidersHorizontal} size="xs" />}
            className="lg:hidden"
          >
            {t('category.filters', 'الفلاتر')}
            {activeFilterCount > 0 && (
              <span className="bg-white/20 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                {activeFilterCount}
              </span>
            )}
          </StoreButton>

          <StoreSelect
            value={sort}
            onChange={(e) => { setSort(e.target.value as SortOption); setPage(1); }}
            options={[
              { value: 'newest', label: t('category.sortNewest', 'الأحدث') },
              { value: 'price_asc', label: t('category.sortPriceAsc', 'السعر: الأقل') },
              { value: 'price_desc', label: t('category.sortPriceDesc', 'السعر: الأعلى') },
              { value: 'name', label: t('category.sortName', 'الاسم') },
            ]}
            className="w-36"
          />

          {hasActiveFilters && (
            <StoreButton variant="ghost" size="sm" onClick={clearAllFilters} icon={<Icon icon={X} size="xs" />}>
              {t('category.clearAll', 'إعادة ضبط')}
            </StoreButton>
          )}
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-1.5 mb-4 flex-wrap">
            {filters.search && (
              <FilterChip label={filters.search} onRemove={() => handleFiltersChange({ ...filters, search: '' })} />
            )}
            {filters.brandId && brands.find(b => b.id === filters.brandId) && (
              <FilterChip
                label={brands.find(b => b.id === filters.brandId)!.name}
                onRemove={() => handleFiltersChange({ ...filters, brandId: null })}
              />
            )}
            {filters.tagIds.map(tid => {
              const tag = tags.find(t => t.id === tid);
              if (!tag) return null;
              return (
                <FilterChip
                  key={tid}
                  label={tag.name}
                  color={tag.color}
                  onRemove={() => handleFiltersChange({ ...filters, tagIds: filters.tagIds.filter(id => id !== tid) })}
                />
              );
            })}
            {(filters.minPrice || filters.maxPrice) && (
              <FilterChip
                label={`${filters.minPrice || '0'} - ${filters.maxPrice || '∞'} ${t('currency', 'ريال')}`}
                onRemove={() => handleFiltersChange({ ...filters, minPrice: '', maxPrice: '' })}
              />
            )}
            {filters.inStockOnly && (
              <FilterChip
                label={t('category.inStockOnly', 'متوفر فقط')}
                onRemove={() => handleFiltersChange({ ...filters, inStockOnly: false })}
              />
            )}
          </div>
        )}

        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-4 bg-surface-1 rounded-card shadow-card border border-border/20 overflow-hidden max-h-[calc(100vh-2rem)] overflow-y-auto">
              <FilterSidebar
                filters={filters}
                onChange={handleFiltersChange}
                brands={brands}
                tags={tags}
              />
            </div>
          </aside>

          {/* Mobile drawer */}
          {filterDrawerOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
                onClick={() => setFilterDrawerOpen(false)}
              />
              <div className="absolute inset-y-0 start-0 w-80 max-w-[85vw] bg-surface-1 shadow-modal animate-slide-in-right">
                <FilterSidebar
                  filters={filters}
                  onChange={(f) => { handleFiltersChange(f); setFilterDrawerOpen(false); }}
                  brands={brands}
                  tags={tags}
                  onClose={() => setFilterDrawerOpen(false)}
                />
              </div>
            </div>
          )}

          {/* Products area */}
          <div className="flex-1 min-w-0">
            {loading && products.length === 0 ? (
              viewMode === 'grid' ? (
                <div className={`grid ${gridCols} gap-3 sm:gap-4 items-stretch`}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="space-y-3">
                      <StoreSkeleton className="aspect-square rounded-card" />
                      <StoreSkeleton className="h-4 w-3/4" />
                      <StoreSkeleton className="h-4 w-1/3" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-surface-1 rounded-xl shadow-card border border-border/20">
                      <StoreSkeleton className="w-16 h-16 rounded-xl shrink-0" />
                      <div className="flex-1 space-y-2">
                        <StoreSkeleton className="h-3 w-1/4" />
                        <StoreSkeleton className="h-4 w-3/4" />
                        <StoreSkeleton className="h-3 w-1/4" />
                      </div>
                      <StoreSkeleton className="h-10 w-20 rounded-xl shrink-0" />
                    </div>
                  ))}
                </div>
              )
            ) : products.length === 0 ? (
              <StoreEmptyState
                icon={Package}
                title={hasActiveFilters ? t('category.noResults', 'لا توجد نتائج') : t('home.noProducts')}
                description={hasActiveFilters ? t('category.changeFilters', 'جرّب تغيير الفلاتر أو البحث') : t('home.noProductsDesc')}
                action={hasActiveFilters ? (
                  <StoreButton variant="outline" onClick={clearAllFilters}>{t('category.clearFilters', 'مسح الفلاتر')}</StoreButton>
                ) : undefined}
              />
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 bg-surface-2 rounded-lg p-0.5" role="radiogroup" aria-label={t('category.viewMode', 'طريقة العرض')}>
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded-md transition-all duration-150 ${viewMode === 'grid' ? 'bg-surface-1 shadow-sm text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}
                        aria-label={t('category.viewGrid', 'عرض شبكي')}
                        title={t('category.viewGrid', 'عرض شبكي')}
                      >
                        <Icon icon={LayoutGrid} size="xs" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded-md transition-all duration-150 ${viewMode === 'list' ? 'bg-surface-1 shadow-sm text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}
                        aria-label={t('category.viewList', 'عرض قائمة')}
                        title={t('category.viewList', 'عرض قائمة')}
                      >
                        <Icon icon={List} size="xs" />
                      </button>
                    </div>
                    {viewMode === 'grid' && (
                      <div className="hidden sm:flex items-center gap-0.5 bg-surface-2 rounded-lg p-0.5" role="radiogroup" aria-label={t('category.columns', 'عدد الأعمدة')}>
                        {colOptions.map(({ value, label }) => (
                          <button
                            key={value}
                            onClick={() => setColumns(value)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 ${columns === value ? 'bg-surface-1 shadow-sm text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}
                            aria-label={label}
                            title={label}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-text-tertiary">{total} {t('category.product', 'منتج')}</p>
                </div>

                {viewMode === 'grid' ? (
                  <div className={`grid ${gridCols} gap-3 sm:gap-4 items-stretch`}>
                    {products.map((product) => (
                      <ThemedProductCard key={product.id} product={product as unknown as Parameters<typeof ThemedProductCard>[0]['product']} slug={slug!} compact={columns >= 4} onAddToCart={async (p) => { await addItem(p.id, 1); }} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {products.map((product) => (
                      <ListProductCard key={product.id} product={product} slug={slug!} />
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <StoreButton
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                      <Icon icon={ChevronLeft} size="xs" />
                    </StoreButton>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <StoreButton
                        key={p}
                        variant={p === page ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setPage(p)}
                        className="min-w-[40px]"
                      >
                        {p}
                      </StoreButton>
                    ))}
                    <StoreButton
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    >
                      <Icon icon={ChevronRight} size="xs" />
                    </StoreButton>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </StoreContainer>
    </div>
  );
}

function FilterChip({ label, color, onRemove }: { label: string; color?: string; onRemove: () => void }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm transition-all duration-200 hover:shadow-md ${
        color ? '' : 'bg-primary-50 text-primary-700 border border-primary-100'
      }`}
      style={color ? { backgroundColor: `${color}15`, color, borderColor: `${color}30` } : undefined}
    >
      {label}
      <button
        onClick={onRemove}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-black/10 rounded-full transition-colors"
      >
        <Icon icon={X} size="2xs" />
      </button>
    </span>
  );
}
