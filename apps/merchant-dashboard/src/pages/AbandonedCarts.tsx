import { useState, useEffect, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingBag, AlertTriangle, Users, DollarSign, Clock, Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { abandonedCartsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { PermissionGate } from '@/lib/permissions';
import { useTableControls, type SortState } from '@/lib/useTableControls';

// Each enriched cart item is { item: cartItems, product: products } as
// returned by AbandonedCartsService.list() (innerJoin on products).
interface CartLineItem {
  item?: { quantity?: number; unitPrice?: number | string; totalPrice?: number | string } | null;
  product?: { name?: string | null; sku?: string | null; barcode?: string | null } | null;
  imageUrl?: string | null;
}

interface AbandonedCartRow {
  id: number | string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  itemCount?: number;
  items?: CartLineItem[];
  total?: number | string;
  totalAmount?: number | string;
  lastActive?: string | null;
  updatedAt?: string | null;
  abandonedAt?: string | null;
  expiresAt?: string | null;
}

const HOURS_OPTIONS = [
  { value: 24, labelKey: 'abandonedCarts.filter.hours_24' },
  { value: 48, labelKey: 'abandonedCarts.filter.hours_48' },
  { value: 72, labelKey: 'abandonedCarts.filter.hours_72' },
  { value: 168, labelKey: 'abandonedCarts.filter.hours_168' },
];

/** Sortable table header cell — matches the merchant table header styling and
 * adds a click target with an aria-sort state and a directional chevron. */
function SortHead({ sortKey, label, sort, onToggle }: { sortKey: string; label: string; sort: SortState; onToggle: (key: string) => void }) {
  const active = sort.key === sortKey;
  const ariaSort: 'ascending' | 'descending' | 'none' = active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
  const ChevronIcon = active ? (sort.dir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <TableHead aria-sort={ariaSort} className="h-10 text-sm text-neutral-500 font-medium">
      <button
        type="button"
        onClick={() => onToggle(sortKey)}
        className="inline-flex items-center gap-1 select-none hover:text-neutral-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded"
      >
        <span>{label}</span>
        <ChevronIcon className={`h-3 w-3 ${active ? 'text-primary-500' : 'text-neutral-300'}`} />
      </button>
    </TableHead>
  );
}

export default function AbandonedCarts() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [hours, setHours] = useState(24);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // `hours` is a server-side param, so it lives in the query key: changing it
  // refetches automatically and each window is cached independently.
  const cartsQuery = useQuery({
    queryKey: [...queryKeys.abandonedCarts(storeId), hours],
    queryFn: async () => {
      const [cartsData, statsData] = await Promise.all([
        abandonedCartsApi.list(storeId as number, hours),
        abandonedCartsApi.stats(storeId as number, hours),
      ]);
      return { carts: cartsData as AbandonedCartRow[], stats: statsData };
    },
    enabled: !!storeId,
  });
  const carts = cartsQuery.data?.carts ?? [];
  const stats = cartsQuery.data?.stats ?? null;
  const loading = cartsQuery.isLoading;
  const fetchError = cartsQuery.isError;

  useEffect(() => { if (cartsQuery.isError) toast.error(t('common.error')); }, [cartsQuery.isError, t]);

  // Client-side search + column sort + pagination over the loaded carts.
  // Composite columns (customer, items, total) resolve via getValue so sorting
  // matches what each cell displays.
  // Note: customerPhone is intentionally excluded from search — it is
  // permission-masked in the UI, so allowing search on it would leak the raw
  // value to staff without `orders:view_sensitive`.
  const controls = useTableControls<AbandonedCartRow>({
    rows: carts,
    searchFields: ['customerName', 'customerEmail'],
    initialSort: { key: 'updatedAt', dir: 'desc' },
    storageKey: 'abandonedCarts',
    getValue: (cart, key) => {
      if (key === 'customer') return cart.customerName || cart.customerEmail || '';
      if (key === 'items') return cart.itemCount ?? cart.items?.length ?? 0;
      if (key === 'total') return Number(cart.total ?? cart.totalAmount ?? 0);
      // The list endpoint returns checkout-session rows whose activity
      // timestamp is `updatedAt`; `lastActive` is a defensive alias.
      if (key === 'updatedAt') return cart.lastActive ?? cart.updatedAt ?? null;
      return (cart as unknown as Record<string, unknown>)[key];
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{t('abandonedCarts.title')}</h1>
          <p className="text-neutral-400 text-sm mt-1">{t('abandonedCarts.description')}</p>
        </div>
        <Select value={String(hours)} onValueChange={(v) => setHours(Number(v))}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <Clock className="h-4 w-4 me-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HOURS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={String(opt.value)}>{t(opt.labelKey)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500">{t('abandonedCarts.stats.count')}</p>
              <Users className="h-4 w-4 text-neutral-400" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-neutral-900 mt-2">{stats.count}</div>
            <p className="text-xs text-neutral-400 mt-1">{t('abandonedCarts.stats.hours', { hours })}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500">{t('abandonedCarts.stats.recoverableTotal')}</p>
              <DollarSign className="h-4 w-4 text-neutral-400" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-neutral-900 mt-2">{formatCurrency(stats.recoverableTotal)} {t('common.sar')}</div>
            <p className="text-xs text-neutral-400 mt-1">{t('abandonedCarts.stats.hours', { hours })}</p>
          </div>
        </div>
      )}

      {!loading && !fetchError && carts.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-neutral-400" />
          <Input
            type="search"
            value={controls.query}
            onChange={(e) => controls.setQuery(e.target.value)}
            placeholder={t('abandonedCarts.search', 'بحث باسم العميل أو البريد...')}
            className="ps-9 h-9 text-sm"
          />
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)}
          </div>
        ) : fetchError ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-red-50 mb-4">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-sm text-neutral-500 mb-3">{t('abandonedCarts.loadError')}</p>
            <Button variant="outline" className="h-9 text-sm" onClick={() => cartsQuery.refetch()}>{t('common.retry')}</Button>
          </div>
        ) : carts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-neutral-100 mb-4">
              <ShoppingBag className="h-8 w-8 text-neutral-400" />
            </div>
            <p className="text-sm text-neutral-500">{t('abandonedCarts.noCarts')}</p>
          </div>
        ) : controls.filteredCount === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-neutral-100 mb-4">
              <Search className="h-8 w-8 text-neutral-400" />
            </div>
            <p className="text-sm text-neutral-500">{t('abandonedCarts.noResults', 'لا توجد نتائج مطابقة')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-100 hover:bg-transparent">
                <SortHead sortKey="customer" label={t('abandonedCarts.table.customer')} sort={controls.sort} onToggle={controls.toggleSort} />
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('abandonedCarts.table.phone')}</TableHead>
                <SortHead sortKey="items" label={t('abandonedCarts.table.items')} sort={controls.sort} onToggle={controls.toggleSort} />
                <SortHead sortKey="total" label={t('abandonedCarts.table.total')} sort={controls.sort} onToggle={controls.toggleSort} />
                <SortHead sortKey="updatedAt" label={t('abandonedCarts.table.lastActive')} sort={controls.sort} onToggle={controls.toggleSort} />
                <SortHead sortKey="expiresAt" label={t('abandonedCarts.table.expiresAt')} sort={controls.sort} onToggle={controls.toggleSort} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {controls.rows.map((cart) => {
                const id = String(cart.id);
                const items = cart.items ?? [];
                const isOpen = expanded.has(id);
                const count = cart.itemCount ?? items.length ?? 0;
                return (
                <Fragment key={id}>
                <TableRow className="border-neutral-100 hover:bg-neutral-50">
                  <TableCell className="text-sm font-medium text-neutral-900 p-3">{cart.customerName || cart.customerEmail || '-'}</TableCell>
                  <TableCell className="text-sm text-neutral-400 p-3" dir="ltr">
                    <PermissionGate
                      permission="orders:view_sensitive"
                      fallback={<span className="text-xs text-neutral-300 font-mono">••••••••</span>}
                    >
                      {cart.customerPhone || '-'}
                    </PermissionGate>
                  </TableCell>
                  <TableCell className="text-sm text-neutral-900 p-3">
                    {items.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-neutral-900 hover:bg-neutral-100 transition-colors"
                        aria-expanded={isOpen}
                        aria-label={t('abandonedCarts.table.toggleItems', 'عرض المنتجات')}
                      >
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                        <span>{count}</span>
                      </button>
                    ) : (
                      count
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-semibold text-neutral-900 p-3 font-mono">{formatCurrency(cart.total || cart.totalAmount || 0)} {t('common.sar')}</TableCell>
                  <TableCell className="text-sm text-neutral-400 p-3">
                    {(() => {
                      const ts = cart.lastActive ?? cart.updatedAt;
                      return ts ? new Date(ts).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : '-';
                    })()}
                  </TableCell>
                  <TableCell className="text-sm text-neutral-400 p-3">
                    {cart.expiresAt ? new Date(cart.expiresAt).toLocaleDateString('ar-SA') : '-'}
                  </TableCell>
                </TableRow>
                {isOpen && items.length > 0 && (
                  <TableRow className="border-neutral-100 bg-neutral-50/60 hover:bg-neutral-50/60">
                    <TableCell colSpan={6} className="p-0">
                      <div className="px-4 py-3">
                        <p className="mb-2 text-xs font-medium text-neutral-500">{t('abandonedCarts.table.products', 'منتجات السلة')}</p>
                        <div className="space-y-1.5">
                          {items.map((line, idx) => {
                            const code = line.product?.sku || line.product?.barcode;
                            return (
                            <div key={idx} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm">
                              {line.imageUrl ? (
                                <img
                                  src={line.imageUrl}
                                  alt={line.product?.name ?? ''}
                                  className="h-11 w-11 shrink-0 rounded-lg border border-neutral-100 object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-neutral-100 bg-neutral-50 text-neutral-300">
                                  <ShoppingBag className="h-4 w-4" />
                                </span>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-neutral-900">{line.product?.name || t('abandonedCarts.table.unknownProduct', 'منتج محذوف')}</p>
                                {code && <p className="text-xs text-neutral-400 font-mono" dir="ltr">{code}</p>}
                              </div>
                              <div className="flex shrink-0 items-center gap-3 text-neutral-500">
                                <span className="text-xs">{line.item?.quantity ?? 1} × {formatCurrency(line.item?.unitPrice ?? 0)}</span>
                                <span className="font-mono font-semibold text-neutral-900">{formatCurrency(line.item?.totalPrice ?? 0)} {t('common.sar')}</span>
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
        {!loading && !fetchError && controls.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-4">
            <p className="text-sm text-neutral-500">
              {t('abandonedCarts.pager.showing', 'عرض')} {controls.startIndex}–{controls.endIndex} {t('abandonedCarts.pager.of', 'من')} {controls.filteredCount}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => controls.setPage((p) => Math.max(1, p - 1))}
                disabled={controls.page <= 1}
                aria-label={t('abandonedCarts.pager.prev', 'الصفحة السابقة')}
                className="h-11 w-11 inline-flex items-center justify-center rounded-xl hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-400"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium text-neutral-700">{controls.page} / {controls.totalPages}</span>
              <button
                type="button"
                onClick={() => controls.setPage((p) => Math.min(controls.totalPages, p + 1))}
                disabled={controls.page >= controls.totalPages}
                aria-label={t('abandonedCarts.pager.next', 'الصفحة التالية')}
                className="h-11 w-11 inline-flex items-center justify-center rounded-xl hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-400"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
