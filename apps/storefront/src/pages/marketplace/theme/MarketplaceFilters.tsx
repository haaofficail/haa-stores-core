import type { HaaMarketplaceCategory } from '@/lib/api';
import { SarIcon } from '@/components/ui/SarIcon';

export function MarketplaceCategoryTabs({
  categories,
  selectedCategory,
  onSelectCategory,
}: {
  categories: HaaMarketplaceCategory[];
  selectedCategory: string;
  onSelectCategory: (slug: string) => void;
}) {
  if (categories.length === 0) return null;

  return (
    <div className="mb-3 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => onSelectCategory('')}
          className={`inline-flex min-h-[32px] shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors duration-200 ${
            selectedCategory === '' ? 'bg-primary-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          الكل
        </button>
        {categories.map((category) => (
          <button
            key={category.slug}
            type="button"
            onClick={() => onSelectCategory(category.slug)}
            className={`inline-flex min-h-[32px] shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors duration-200 ${
              selectedCategory === category.slug ? 'bg-primary-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>{category.name}</span>
            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">{category.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function MarketplaceFilterBar({
  minPrice,
  maxPrice,
  selectedSort,
  availableOnly,
  onSetFilter,
}: {
  minPrice: string;
  maxPrice: string;
  selectedSort: string;
  availableOnly: boolean;
  onSetFilter: (key: string, value: string | boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5">
        <span className="text-[10px] font-bold text-gray-500">من</span>
        <input
          value={minPrice}
          onChange={(e) => onSetFilter('minPrice', e.target.value)}
          type="number" min="0"
          placeholder="0"
          aria-label="السعر الأدنى"
          className="w-14 bg-transparent text-center text-xs font-bold text-black outline-none placeholder:text-gray-400"
        />
        <SarIcon size="sm" className="text-gray-400" />
      </div>

      <div className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5">
        <span className="text-[10px] font-bold text-gray-500">إلى</span>
        <input
          value={maxPrice}
          onChange={(e) => onSetFilter('maxPrice', e.target.value)}
          type="number" min="0"
          placeholder="∞"
          aria-label="السعر الأعلى"
          className="w-14 bg-transparent text-center text-xs font-bold text-black outline-none placeholder:text-gray-400"
        />
        <SarIcon size="sm" className="text-gray-400" />
      </div>

      <select
        value={selectedSort}
        onChange={(e) => onSetFilter('sort', e.target.value)}
        aria-label="ترتيب حسب"
        className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 outline-none"
      >
        <option value="featured">المميز أولاً</option>
        <option value="newest">الأحدث</option>
        <option value="price_asc">الأقل سعراً</option>
        <option value="price_desc">الأعلى سعراً</option>
      </select>

      <label className="flex cursor-pointer items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-200 transition-colors duration-200">
        <input type="checkbox" checked={availableOnly} onChange={(e) => onSetFilter('availableOnly', e.target.checked)} className="accent-primary-500" />
        المتوفر فقط
      </label>
    </div>
  );
}
