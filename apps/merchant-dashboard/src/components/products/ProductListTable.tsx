import { useEffect, useRef } from 'react';
import { ImageOff, Edit, Archive, ExternalLink, Globe, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { handleImageError, formatCurrency } from '@/lib/utils';
import { PermissionGate } from '@/lib/permissions';
import type { TFunction } from 'i18next';

export interface ProductRowData {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  price: number | null;
  compareAtPrice: number | null;
  cost: number | null;
  status: string;
  stockQuantity: number | null;
  trackInventory: boolean;
  type: string;
  optionCount: number;
  categories?: { name: string }[];
  brand?: { name: string };
  createdAt: string;
  updatedAt: string;
  images?: { url: string }[];
  marketplaceChannels?: Record<string, { status: string; productId?: string }>;
}

interface Props {
  products: ProductRowData[];
  selectedIds: Set<number>;
  onSelect: (id: number, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onEdit: (id: number) => void;
  onArchive: (id: number) => void;
  onPublish: (product: ProductRowData) => void;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  storeSlug: string;
  t: TFunction;
  STOREFRONT_BASE: string;
}

function StockBadge({ quantity, trackInventory, t }: { quantity: number | null; trackInventory: boolean; t: TFunction }) {
  if (!trackInventory) return <span className="text-xs text-neutral-400">—</span>;
  if (quantity === null || quantity <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        {t('products.outOfStock', 'نفذ')}
      </span>
    );
  }
  if (quantity <= 5) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        {t('products.lowStock', 'متبقي {n}', { n: quantity })}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {t('products.inStock', 'متوفر')}
    </span>
  );
}

export function ProductListTable({
  products, selectedIds, onSelect, onSelectAll, onEdit, onArchive, onPublish,
  page, totalPages, total, onPageChange, storeSlug, t, STOREFRONT_BASE,
}: Props) {
  const selectAllRef = useRef<HTMLInputElement>(null);
  const visibleIds = products.map(p => p.id);
  const visibleSelectedCount = visibleIds.filter(id => selectedIds.has(id)).length;
  const allSelected = products.length > 0 && visibleSelectedCount === products.length;
  const partiallySelected = visibleSelectedCount > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = partiallySelected;
    }
  }, [partiallySelected]);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="border-neutral-100 hover:bg-transparent">
            <TableHead className="w-10 h-10">
              <input ref={selectAllRef} type="checkbox" className="rounded border-neutral-300 h-4 w-4 cursor-pointer"
                checked={allSelected}
                aria-label={t('products.selectVisible', 'تحديد المنتجات الظاهرة')}
                onChange={() => onSelectAll(!allSelected)} />
            </TableHead>
            <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('products.product', 'المنتج')}</TableHead>
            <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('products.category')}</TableHead>
            <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('products.price')}</TableHead>
            <TableHead className="h-10 text-sm text-neutral-500 font-medium">المخزون</TableHead>
            <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('products.status')}</TableHead>
            <TableHead className="h-10 text-sm text-neutral-500 font-medium">النوع</TableHead>
            <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('products.createdAt')}</TableHead>
            <TableHead className="w-20 h-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p) => {
            const thumb = p.images?.[0]?.url;
            const catName = p.categories?.[0]?.name;
            const isSelected = selectedIds.has(p.id);
            const hasVariants = p.optionCount > 0;
            return (
              <TableRow key={p.id} className={`border-neutral-100 hover:bg-neutral-50 transition-colors ${isSelected ? 'bg-primary-50' : ''}`}>
                <TableCell className="p-3">
                  <input type="checkbox" className="rounded border-neutral-300 h-4 w-4 cursor-pointer"
                    checked={isSelected}
                    onChange={() => onSelect(p.id, !isSelected)} />
                </TableCell>
                <TableCell className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 shrink-0 rounded-xl border border-neutral-100 bg-neutral-50 flex items-center justify-center overflow-hidden">
                      {thumb ? (
                        <img src={thumb} alt={`منتج ${p.name}`} className="w-full h-full object-cover" loading="lazy" onError={handleImageError} />
                      ) : (
                        <ImageOff className="h-4 w-4 text-neutral-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">{p.name}</p>
                      {p.sku && <p className="text-xs text-neutral-400 font-mono truncate dir-ltr">{p.sku}</p>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-neutral-500 p-3">
                  <span className="truncate">{catName || '-'}</span>
                </TableCell>
                <TableCell className="p-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-neutral-900 tabular-nums">{formatCurrency(p.price ?? 0)} {t('common.sar')}</span>
                    {p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price) && (
                      <span className="text-xs text-red-500 font-medium">
                        -{Math.round((1 - Number(p.price) / Number(p.compareAtPrice)) * 100)}%
                        <span className="line-through text-neutral-300 mr-1">{formatCurrency(p.compareAtPrice)} ر.س</span>
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="p-3">
                  <StockBadge quantity={p.stockQuantity} trackInventory={p.trackInventory} t={t} />
                </TableCell>
                <TableCell className="p-3">
                  {p.status === 'active' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      نشط
                    </span>
                  ) : p.status === 'draft' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-full">
                      <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
                      مسودة
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-400 bg-neutral-50 px-2.5 py-1 rounded-full">
                      <Archive className="h-3 w-3" />
                      مؤرشف
                    </span>
                  )}
                </TableCell>
                <TableCell className="p-3">
                  {hasVariants ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">
                      <Layers className="h-3 w-3" />
                      {t('products.hasVariants', 'متغيرات')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                      {t('products.simple', 'بسيط')}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-neutral-400 p-3 whitespace-nowrap">
                  {new Date(p.createdAt).toLocaleDateString('ar-SA')}
                </TableCell>
                <TableCell className="p-3">
                  <div className="flex gap-1">
                    <PermissionGate permission="products:update" fallback={null}><Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => onEdit(p.id)} title={t('products.edit')} aria-label={t('products.edit', 'تعديل')}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button></PermissionGate>
                    {p.status === 'active' && storeSlug && (
                      <a href={`${STOREFRONT_BASE}/s/${storeSlug}/p/${p.slug}`} target="_blank" rel="noopener noreferrer"
                        className="h-11 w-11 inline-flex items-center justify-center rounded-lg text-neutral-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        title={t('products.viewInStore', 'عرض في المتجر')} aria-label={t('products.viewInStore', 'عرض في المتجر')}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {p.status !== 'archived' && (
                      <PermissionGate permission="products:delete" fallback={null}><Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => onArchive(p.id)} title={t('products.archive')} aria-label={t('products.archive', 'أرشفة')}>
                        <Archive className="h-3.5 w-3.5" />
                      </Button></PermissionGate>
                    )}
                    <Button variant="ghost" size="icon" className={`h-11 w-11 ${(() => {
                      const channels = p.marketplaceChannels || {};
                      const hasPublished = Object.values(channels).some((ch: any) => ch?.status === 'active');
                      return hasPublished ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50' : '';
                    })()}`} onClick={() => onPublish(p)} title={(() => {
                      const channels = p.marketplaceChannels || {};
                      const published = Object.keys(channels).filter(ch => channels[ch]?.status === 'active');
                      return published.length > 0 ? `منشور في ${published.length} قناة` : 'نشر في السوق';
                    })()} aria-label={t('products.publish', 'نشر')}>
                      <Globe className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 pb-4 px-6 border-t border-neutral-100">
          <p className="text-sm text-neutral-500">{t('products.showing', 'عرض')} {products.length} {t('products.of', 'من')} {total} {t('products.products', 'منتج')}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} className="p-2 rounded-xl hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-neutral-700">{page} / {totalPages}</span>
            <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="p-2 rounded-xl hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
