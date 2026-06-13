import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, SlidersHorizontal, ChevronDown, ChevronUp, Search, Tag, Building2, PackageOpen } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { type PublicBrand, type PublicTag } from '@/lib/api';
import { StoreButton } from '@/components/ui';


export interface FilterState {
  search: string;
  brandId: number | null;
  tagIds: number[];
  minPrice: string;
  maxPrice: string;
  inStockOnly: boolean;
}

interface FilterSidebarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  brands: PublicBrand[];
  tags: PublicTag[];
  onClose?: () => void;
  productCounts?: { brandCounts?: Record<number, number>; tagCounts?: Record<number, number> };
}

export function getActiveFilterCount(filters: FilterState): number {
  let count = 0;
  if (filters.search.trim()) count++;
  if (filters.brandId) count++;
  if (filters.tagIds.length) count++;
  if (filters.minPrice || filters.maxPrice) count++;
  if (filters.inStockOnly) count++;
  return count;
}

export function defaultFilters(): FilterState {
  return { search: '', brandId: null, tagIds: [], minPrice: '', maxPrice: '', inStockOnly: false };
}

export function filtersToParams(filters: FilterState): Record<string, any> {
  const params: Record<string, any> = {};
  if (filters.search.trim()) params.search = filters.search.trim();
  if (filters.brandId) params.brandId = filters.brandId;
  if (filters.tagIds.length) params.tagId = filters.tagIds[0];
  if (filters.minPrice) params.minPrice = Number(filters.minPrice);
  if (filters.maxPrice) params.maxPrice = Number(filters.maxPrice);
  return params;
}

function CollapsibleSection({ title, icon: IconComponent, defaultOpen = true, children }: { title: string; icon?: any; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/30 pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full group"
        type="button"
      >
        <div className="flex items-center gap-2">
          {IconComponent && <Icon icon={IconComponent} size="xs" className="text-text-tertiary group-hover:text-text-primary transition-colors" />}
          <span className="text-sm font-bold text-text-primary">{title}</span>
        </div>
        <div className={`p-0.5 rounded-md transition-all duration-200 ${open ? 'bg-primary-50 text-primary-600' : 'text-text-tertiary group-hover:bg-surface-2'}`}>
          {open ? <Icon icon={ChevronUp} size="2xs" /> : <Icon icon={ChevronDown} size="2xs" />}
        </div>
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${open ? 'mt-3' : 'mt-0 max-h-0'}`}>
        {open && <div className="space-y-0.5">{children}</div>}
      </div>
    </div>
  );
}

export default function FilterSidebar({ filters, onChange, brands, tags, onClose, productCounts }: FilterSidebarProps) {
  const { t } = useTranslation();

  const activeCount = useMemo(() => getActiveFilterCount(filters), [filters]);

  const clearAll = () => {
    onChange(defaultFilters());
  };

  const toggleTag = (tagId: number) => {
    const next = filters.tagIds.includes(tagId)
      ? filters.tagIds.filter(id => id !== tagId)
      : [...filters.tagIds, tagId];
    onChange({ ...filters, tagIds: next });
  };

  const brandsToShow = 10;
  const [showAllBrands, setShowAllBrands] = useState(false);
  const visibleBrands = showAllBrands ? brands : brands.slice(0, brandsToShow);

  const tagsToShow = 10;
  const [showAllTags, setShowAllTags] = useState(false);
  const visibleTags = showAllTags ? tags : tags.slice(0, tagsToShow);

  return (
    <div className="h-full flex flex-col" role="region" aria-label={t('category.filters', 'الفلاتر')}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center">
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary-600" />
          </div>
          <div>
            <span className="font-bold text-sm text-text-primary">{t('category.filters', 'الفلاتر')}</span>
            {activeCount > 0 && (
            <span className="block leading-none mt-0.5" style={{ fontSize: 'var(--badge-font-size, 11px)' }}>
              {activeCount} {t('category.active', 'محدد')}
            </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {activeCount > 0 && (
            <StoreButton variant="ghost" size="sm" onClick={clearAll} className="text-xs !min-h-[32px] !px-2">
              {t('category.clearAll', 'إعادة ضبط')}
            </StoreButton>
          )}
          {onClose && (
            <button onClick={onClose} className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-surface-2 rounded-lg transition-colors" type="button" aria-label={t('common.close', 'إغلاق')}>
              <Icon icon={X} size="xs" className="text-text-tertiary" />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-5 pt-4 pb-2 border-b border-border/30">
        <div className="relative">
          <Icon icon={Search} size="xs" className="absolute end-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder={t('category.searchProducts', 'بحث في المنتجات...')}
            className="pe-10 ps-3.5 text-sm outline-none transition-all duration-200 focus:bg-surface-primary focus:ring-2 focus:ring-primary-100 w-full min-h-[44px] rounded-xl bg-surface-2"
            aria-label={t('category.searchProducts', 'بحث في المنتجات...')}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {brands.length > 0 && (
          <CollapsibleSection title={t('category.brand', 'العلامة التجارية')} icon={Building2}>
            <fieldset className="space-y-0.5 border-0 p-0 m-0">
              <legend className="sr-only">{t('category.brand', 'العلامة التجارية')}</legend>
              {visibleBrands.map((brand) => {
                const count = productCounts?.brandCounts?.[brand.id];
                return (
                  <label
                    key={brand.id}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl cursor-pointer transition-all duration-150 text-sm group ${
                      filters.brandId === brand.id ? 'bg-primary-50 text-primary-700 font-medium' : 'hover:bg-surface-2 text-text-primary'
                    }`}
                  >
                    <input
                      type="radio"
                      name="brand-filter"
                      checked={filters.brandId === brand.id}
                      onChange={() => onChange({ ...filters, brandId: filters.brandId === brand.id ? null : brand.id })}
                      className="peer sr-only"
                    />
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150 ${
                      filters.brandId === brand.id ? 'border-primary-500' : 'border-border group-hover:border-border-hover'
                    }`}>
                      <span className={`w-2 h-2 rounded-full transition-all duration-150 ${
                        filters.brandId === brand.id ? 'bg-primary-500 scale-100' : 'scale-0'
                      }`} />
                    </span>
                    <span className="line-clamp-1 flex-1">{brand.name}</span>
                    {count !== undefined && (
                      <span className="text-text-tertiary tabular-nums" style={{ fontSize: 'var(--badge-font-size, 11px)' }}>({count})</span>
                    )}
                  </label>
                );
              })}
            </fieldset>
            {brands.length > brandsToShow && (
              <button
                onClick={() => setShowAllBrands(!showAllBrands)}
                className="text-xs font-medium text-primary-600 hover:text-primary-700 mt-1.5 px-2.5 py-1"
                type="button"
              >
                {showAllBrands
                  ? t('category.showLess', 'عرض أقل')
                  : t('category.showMore', '+{count} المزيد', { count: brands.length - brandsToShow })
                }
              </button>
            )}
          </CollapsibleSection>
        )}

        {tags.length > 0 && (
          <CollapsibleSection title={t('category.tags', 'الوسوم')} icon={Tag}>
            <fieldset className="space-y-0.5 border-0 p-0 m-0">
              <legend className="sr-only">{t('category.tags', 'الوسوم')}</legend>
              {visibleTags.map((tag) => {
                const count = productCounts?.tagCounts?.[tag.id];
                const checked = filters.tagIds.includes(tag.id);
                return (
                  <label
                    key={tag.id}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl cursor-pointer transition-all duration-150 text-sm group ${
                      checked ? 'bg-primary-50 text-primary-700 font-medium' : 'hover:bg-surface-2 text-text-primary'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTag(tag.id)}
                      className="peer sr-only"
                    />
                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all duration-150 ${
                      checked ? 'border-primary-500 bg-primary-500' : 'border-border group-hover:border-border-hover'
                    }`}>
                      <svg
                        className={`w-3 h-3 text-white transition-all duration-150 ${checked ? 'scale-100' : 'scale-0'}`}
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                    <span className="line-clamp-1 flex-1">{tag.name}</span>
                    {count !== undefined && (
                      <span className="text-text-tertiary tabular-nums" style={{ fontSize: 'var(--badge-font-size, 11px)' }}>({count})</span>
                    )}
                  </label>
                );
              })}
            </fieldset>
            {tags.length > tagsToShow && (
              <button
                onClick={() => setShowAllTags(!showAllTags)}
                className="text-xs font-medium text-primary-600 hover:text-primary-700 mt-1.5 px-2.5 py-1"
                type="button"
              >
                {showAllTags
                  ? t('category.showLess', 'عرض أقل')
                  : t('category.showMore', '+{count} المزيد', { count: tags.length - tagsToShow })
                }
              </button>
            )}
          </CollapsibleSection>
        )}


        <CollapsibleSection title={t('category.availability', 'التوفر')} icon={PackageOpen}>
          <label
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl cursor-pointer transition-all duration-150 text-sm group ${
              filters.inStockOnly ? 'bg-primary-50 text-primary-700 font-medium' : 'hover:bg-surface-2 text-text-primary'
            }`}
          >
            <input
              type="checkbox"
              checked={filters.inStockOnly}
              onChange={() => onChange({ ...filters, inStockOnly: !filters.inStockOnly })}
              className="peer sr-only"
            />
            <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all duration-150 ${
              filters.inStockOnly ? 'border-primary-500 bg-primary-500' : 'border-border group-hover:border-border-hover'
            }`}>
              <svg
                className={`w-3 h-3 text-white transition-all duration-150 ${filters.inStockOnly ? 'scale-100' : 'scale-0'}`}
                viewBox="0 0 12 12"
                fill="none"
              >
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            {t('category.inStockOnly', 'متوفر فقط')}
          </label>
        </CollapsibleSection>
      </div>
    </div>
  );
}
