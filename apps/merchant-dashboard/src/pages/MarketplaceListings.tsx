import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { marketplaceApi } from '@/lib/api';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowRight, Package, Trash2, ExternalLink, Loader2, ChevronDown,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { statusInfo, toneBadgeClass, LISTING_STATUS } from '@/lib/status-labels';
import { toast } from 'sonner';

/**
 * Pagination strategy — DECISION (perf P0):
 * The previous implementation rendered every listing returned by the API in a
 * single `<TableBody>` with no upper bound, which is unsafe for merchants that
 * sync thousands of products. We add **client-side pagination with a "load
 * more" button** sized to PAGE_SIZE rows.
 *
 * Why not server-side cursors? The existing `GET /merchant/:id/marketplaces/
 * :provider/listings` endpoint returns the whole array (no `?cursor` / `?limit`
 * support). Adding cursor parameters here would silently misbehave until the
 * API and storage layer are extended (a separate ticket). Client-side slicing
 * is correct against the current contract, drops DOM work to a bounded set,
 * and avoids touching the DB.
 *
 * Why not @tanstack/react-virtual? It is not yet a dashboard dependency;
 * adding it for one table would expand the dep surface for a smaller perf win
 * than capping the rendered row count. We can revisit when virtualization is
 * adopted dashboard-wide.
 */
const PAGE_SIZE = 50;

interface MarketplaceListing {
  id: number;
  marketplaceSku?: string | null;
  marketplaceUrl?: string | null;
  price?: number | string | null;
  salePrice?: number | string | null;
  quantity?: number | null;
  status?: string | null;
}

export default function MarketplaceListingsPage() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const { provider } = useParams<{ provider: string }>();
  const navigate = useNavigate();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const PROVIDER_NAMES: Record<string, string> = { salla: 'سلة', zid: 'زد', noon: 'نون', amazon: 'أمازون' };
  const providerDisplayName = PROVIDER_NAMES[provider || ''] || provider || '';

  const loadListings = useCallback(() => {
    if (!storeId || !provider) {
      setLoading(false);
      return;
    }
    setLoading(true);
    marketplaceApi.listListings(storeId, provider)
      .then((data) => {
        setListings(data as MarketplaceListing[]);
        setVisibleCount(PAGE_SIZE);
      })
      .catch(() => toast.error(t('common.error', 'حدث خطأ')))
      .finally(() => setLoading(false));
  }, [storeId, provider, t]);

  useEffect(() => { loadListings(); }, [loadListings]);

  async function handleRemove(listingId: number) {
    if (!storeId || !provider) return;
    setDeleteConfirm(null);
    const deleted = listings.find(l => l.id === listingId);
    setListings((prev) => prev.filter((l) => l.id !== listingId));
    setDeletingId(listingId);
    try {
      await marketplaceApi.deleteListing(storeId, provider, listingId);
      toast.success(t('marketplaces.listingRemoved', 'تم إزالة المنتج'));
    } catch {
      if (deleted) setListings((prev) => [deleted, ...prev]);
      toast.error(t('common.error', 'فشل الإزالة'));
    } finally {
      setDeletingId(null);
    }
  }

  // Bounded slice prevents an unbounded <TableBody> from blowing up the DOM
  // when a merchant has thousands of synced listings.
  const visibleListings = useMemo(
    () => listings.slice(0, visibleCount),
    [listings, visibleCount],
  );
  const hasMore = visibleCount < listings.length;
  const loadMore = useCallback(
    () => setVisibleCount((c) => Math.min(c + PAGE_SIZE, listings.length)),
    [listings.length],
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        {/* Touch target ≥ 44x44 (WCAG 2.5.5). */}
        <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => navigate(`/channels/${provider}`)} aria-label={t('common.back', 'رجوع')}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white shadow-lg">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{t('marketplaces.listings', 'المنتجات المسوقة')}</h1>
            <p className="text-sm text-neutral-500">{providerDisplayName}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="p-6 pb-3">
          <CardTitle className="text-lg">{t('marketplaces.allListings', 'جميع المنتجات')}</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-2">
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-neutral-100 rounded-xl" />)}
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
              <p className="text-sm text-neutral-500">{t('marketplaces.noListings', 'لا توجد منتجات مسوقة بعد')}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('marketplaces.sku', 'SKU')}</TableHead>
                    <TableHead>{t('marketplaces.price', 'السعر')}</TableHead>
                    <TableHead>{t('marketplaces.salePrice', 'سعر التخفيض')}</TableHead>
                    <TableHead>{t('marketplaces.quantity', 'الكمية')}</TableHead>
                    <TableHead>{t('marketplaces.status', 'الحالة')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleListings.map((listing: MarketplaceListing) => (
                    <TableRow key={listing.id}>
                      <TableCell className="font-medium">{listing.marketplaceSku || '—'}</TableCell>
                      <TableCell>{listing.price} {t('marketplaces.currency', 'ر.س')}</TableCell>
                      <TableCell>{listing.salePrice ? `${listing.salePrice} ${t('marketplaces.currency', 'ر.س')}` : '—'}</TableCell>
                      <TableCell>{listing.quantity ?? '—'}</TableCell>
                      <TableCell>
                        {(() => {
                          const info = statusInfo(LISTING_STATUS, listing.status);
                          return <Badge className={toneBadgeClass[info.tone]}>{info.label}</Badge>;
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {/* Row action icons — hit area ≥ 44x44 (WCAG 2.5.5). */}
                          {listing.marketplaceUrl && (
                            <a href={listing.marketplaceUrl} target="_blank" rel="noopener noreferrer" aria-label={t('marketplaces.openListing', 'فتح المنتج في المنصة')}>
                              <Button variant="ghost" size="icon" className="h-11 w-11" aria-hidden="true" tabIndex={-1}>
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                          <Button variant="ghost" size="icon" className="h-11 w-11 text-red-500 hover:bg-red-50" onClick={() => setDeleteConfirm(String(listing.id))} disabled={deletingId === listing.id} aria-label={t('common.delete', 'حذف')}>
                            {deletingId === listing.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-100 text-xs text-neutral-500">
                <span>
                  {t('marketplaces.paginationShowing', `يعرض ${visibleListings.length} من ${listings.length}`)}
                </span>
                {hasMore && (
                  <Button variant="outline" size="sm" onClick={loadMore} className="h-9">
                    <ChevronDown className="h-4 w-4 ms-1.5" />
                    {t('marketplaces.loadMore', 'تحميل المزيد')}
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteConfirm !== null} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent className="max-w-sm bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-neutral-900">تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-600">هل أنت متأكد من حذف هذا المنتج من القناة؟</p>
          <DialogFooter className="gap-2 flex-row-reverse">
            <Button variant="ghost" className="h-9 text-sm" onClick={() => setDeleteConfirm(null)}>إلغاء</Button>
            <Button variant="destructive" className="h-9 text-sm" onClick={() => { if (deleteConfirm !== null) handleRemove(Number(deleteConfirm)); }}>حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
