import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { marketplaceApi } from '@/lib/api';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowRight, Package, Trash2, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

export default function MarketplaceListingsPage() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const { provider } = useParams<{ provider: string }>();
  const navigate = useNavigate();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadListings = useCallback(() => {
    if (!storeId || !provider) {
      setLoading(false);
      return;
    }
    setLoading(true);
    marketplaceApi.listListings(storeId, provider)
      .then(setListings)
      .catch(() => toast.error(t('common.error', 'حدث خطأ')))
      .finally(() => setLoading(false));
  }, [storeId, provider, t]);

  useEffect(() => { loadListings(); }, [loadListings]);

  async function handleRemove(listingId: number) {
    if (!storeId || !provider) return;
    const deleted = listings.find(l => l.id === listingId);
    setListings((prev) => prev.filter((l) => l.id !== listingId));
    try {
      await marketplaceApi.deleteListing(storeId, provider, listingId);
      toast.success(t('marketplaces.listingRemoved', 'تم إزالة المنتج'));
    } catch {
      if (deleted) setListings((prev) => [...prev, deleted]);
      toast.error(t('common.error', 'فشل الإزالة'));
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(`/channels/${provider}`)}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{t('marketplaces.listings', 'المنتجات المسوقة')}</h1>
            <p className="text-sm text-neutral-500">{provider}</p>
          </div>
        </div>
      </div>

      <Card className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card">
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
                {listings.map((listing: any) => (
                  <TableRow key={listing.id}>
                    <TableCell className="font-medium">{listing.marketplaceSku || '—'}</TableCell>
                    <TableCell>{listing.price} SAR</TableCell>
                    <TableCell>{listing.salePrice ? `${listing.salePrice} SAR` : '—'}</TableCell>
                    <TableCell>{listing.quantity ?? '—'}</TableCell>
                    <TableCell>
                      <Badge className={listing.status === 'active' ? 'bg-green-500/10 text-green-700 border-green-200' : 'bg-neutral-100 text-neutral-500'}>
                        {listing.status === 'active' ? t('marketplaces.active', 'نشط') : t('marketplaces.inactive', 'غير نشط')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {listing.marketplaceUrl && (
                          <a href={listing.marketplaceUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                        <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => handleRemove(listing.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
