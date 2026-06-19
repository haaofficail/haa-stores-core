import { ImageOff, Edit, Archive, Globe, ExternalLink, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { handleImageError, formatCurrency } from '@/lib/utils';
import { PermissionGate } from '@/lib/permissions';
import type { TFunction } from 'i18next';
import type { ProductRowData } from './ProductListTable';

interface Props {
  products: ProductRowData[];
  selectedIds: Set<number>;
  onSelect: (id: number, checked: boolean) => void;
  onEdit: (id: number) => void;
  onArchive: (id: number) => void;
  onPublish: (product: ProductRowData) => void;
  storeSlug: string;
  t: TFunction;
  STOREFRONT_BASE: string;
}

function StockIndicator({ quantity, trackInventory }: { quantity: number | null; trackInventory: boolean }) {
  if (!trackInventory) {
    return (
      <span className="text-xs font-medium text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded-full">
        غير متتبع
      </span>
    );
  }
  if (quantity === null || quantity <= 0) {
    return (
      <span className="text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
        نفذ
      </span>
    );
  }
  if (quantity <= 5) {
    return (
      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
        متبقي {quantity}
      </span>
    );
  }
  if (quantity <= 20) {
    return (
      <span className="text-xs font-medium text-amber-700 bg-amber-50/50 px-1.5 py-0.5 rounded-full">
        {quantity}
      </span>
    );
  }
  return null;
}

export function ProductGrid({ products, selectedIds, onSelect, onEdit, onArchive, onPublish, storeSlug, t, STOREFRONT_BASE }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
      {products.map((p) => {
        const thumb = p.images?.[0]?.url;
        const isSelected = selectedIds.has(p.id);
        const hasVariants = p.optionCount > 0;
        return (
          <div
            key={p.id}
            className={`group relative flex flex-col rounded-2xl border bg-white overflow-hidden transition-all hover:shadow-md ${
              isSelected ? 'border-primary-400 ring-2 ring-primary-200' : 'border-neutral-100'
            }`}
          >
            <div className="absolute top-2 end-2 z-10">
              <input type="checkbox" className="rounded border-neutral-300 h-4 w-4 cursor-pointer"
                checked={isSelected}
                aria-label={t('products.selectProduct', 'تحديد المنتج')}
                onChange={() => onSelect(p.id, !isSelected)} />
            </div>

            <div className="aspect-square bg-neutral-50 flex items-center justify-center overflow-hidden">
              {thumb ? (
                <img src={thumb} alt={p.name} className="w-full h-full object-contain p-2" loading="lazy" onError={handleImageError} />
              ) : (
                <ImageOff className="h-8 w-8 text-neutral-300" />
              )}
            </div>

            <div className="flex-1 p-3 space-y-2">
              <div className="min-w-0">
                <p className="min-h-[2.5rem] text-sm font-medium text-neutral-900 leading-tight line-clamp-2">{p.name}</p>
                {p.sku && <p className="text-xs text-neutral-400 font-mono truncate dir-ltr mt-0.5">{p.sku}</p>}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap min-h-5">
                {p.status === 'active' ? (
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">نشط</span>
                ) : p.status === 'draft' ? (
                  <span className="text-xs font-medium text-neutral-600 bg-neutral-100 px-1.5 py-0.5 rounded-full">مسودة</span>
                ) : (
                  <span className="text-xs font-medium text-neutral-400 bg-neutral-50 px-1.5 py-0.5 rounded-full">مؤرشف</span>
                )}
                <StockIndicator quantity={p.stockQuantity} trackInventory={p.trackInventory} />
                {hasVariants && (
                  <span className="text-xs font-medium text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                    <Layers className="h-2.5 w-2.5" />
                    متغيرات
                  </span>
                )}
              </div>

              {p.categories?.[0]?.name && (
                <p className="text-xs text-neutral-500 truncate">{p.categories[0].name}</p>
              )}

              <div className="min-h-[38px]">
                <p className="text-sm font-bold text-neutral-900">{formatCurrency(p.price ?? 0)} {t('common.sar')}</p>
                {p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price) && (
                  <p className="text-xs text-red-500 font-medium">
                    -{Math.round((1 - Number(p.price) / Number(p.compareAtPrice)) * 100)}%
                    <span className="line-through text-neutral-300 ms-1">{formatCurrency(p.compareAtPrice)} {t('common.sar')}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between px-3 py-2 border-t border-neutral-50">
              <div className="flex gap-0.5">
                <PermissionGate permission="products:update" fallback={null}><Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => onEdit(p.id)} title={t('products.edit')} aria-label={t('products.edit', 'تعديل')}>
                  <Edit className="h-3 w-3" />
                </Button></PermissionGate>
                {p.status === 'active' && storeSlug && (
                  <a href={`${STOREFRONT_BASE}/s/${storeSlug}/p/${p.slug}`} target="_blank" rel="noopener noreferrer"
                    className="h-11 w-11 inline-flex items-center justify-center rounded-md text-neutral-400 hover:text-primary-600 transition-colors"
                    title={t('products.viewInStore', 'عرض في المتجر')} aria-label={t('products.viewInStore', 'عرض في المتجر')}>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {p.status !== 'archived' && (
                  <PermissionGate permission="products:delete" fallback={null}><Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => onArchive(p.id)} title={t('products.archive')} aria-label={t('products.archive', 'أرشفة')}>
                    <Archive className="h-3 w-3" />
                  </Button></PermissionGate>
                )}
              </div>
              <Button variant="ghost" size="icon" className={`h-11 w-11 ${(() => {
                const channels = p.marketplaceChannels || {};
                return Object.values(channels).some((ch: any) => ch?.status === 'active') ? 'text-emerald-600' : '';
              })()}`} onClick={() => onPublish(p)} title={t('products.publish', 'نشر')} aria-label={t('products.publish', 'نشر')}>
                <Globe className="h-3 w-3" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
