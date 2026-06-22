import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingBag, AlertTriangle, Users, DollarSign, Clock, Send } from 'lucide-react';
import { toast } from 'sonner';
import { abandonedCartsApi, ApiClientError } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

const HOURS_OPTIONS = [
  { value: 24, labelKey: 'abandonedCarts.filter.hours_24' },
  { value: 48, labelKey: 'abandonedCarts.filter.hours_48' },
  { value: 72, labelKey: 'abandonedCarts.filter.hours_72' },
  { value: 168, labelKey: 'abandonedCarts.filter.hours_168' },
];

export default function AbandonedCarts() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [carts, setCarts] = useState<any[]>([]);
  const [stats, setStats] = useState<{ count: number; recoverableTotal: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [hours, setHours] = useState(24);

  const loadData = useCallback(() => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setFetchError(false);
    Promise.all([
      abandonedCartsApi.list(storeId, hours),
      abandonedCartsApi.stats(storeId, hours),
    ])
      .then(([cartsData, statsData]) => {
        setCarts(cartsData);
        setStats(statsData);
      })
      .catch((err) => {
        if (err instanceof ApiClientError) {
          toast.error(err.message);
        } else {
          toast.error(t('common.error'));
        }
        setFetchError(true);
      })
      .finally(() => setLoading(false));
  }, [storeId, hours, t]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t('abandonedCarts.title')}</h1>
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
            <div className="text-2xl font-bold text-neutral-900 mt-2">{stats.count}</div>
            <p className="text-xs text-neutral-400 mt-1">{t('abandonedCarts.stats.hours', { hours })}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500">{t('abandonedCarts.stats.recoverableTotal')}</p>
              <DollarSign className="h-4 w-4 text-neutral-400" />
            </div>
            <div className="text-2xl font-bold text-neutral-900 mt-2">{formatCurrency(stats.recoverableTotal)} {t('common.sar')}</div>
            <p className="text-xs text-neutral-400 mt-1">{t('abandonedCarts.stats.hours', { hours })}</p>
          </div>
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
            <Button variant="outline" className="h-9 text-sm" onClick={loadData}>{t('common.retry')}</Button>
          </div>
        ) : carts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-neutral-100 mb-4">
              <ShoppingBag className="h-8 w-8 text-neutral-400" />
            </div>
            <p className="text-sm text-neutral-500">{t('abandonedCarts.noCarts')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-100 hover:bg-transparent">
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('abandonedCarts.table.customer')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('abandonedCarts.table.phone')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('abandonedCarts.table.items')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('abandonedCarts.table.total')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('abandonedCarts.table.lastActive')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('abandonedCarts.table.expiresAt')}</TableHead>
                <TableHead className="h-10 w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carts.map((cart: any) => (
                <TableRow key={cart.id} className="border-neutral-100 hover:bg-neutral-50">
                  <TableCell className="text-sm font-medium text-neutral-900 p-3">{cart.customerName || cart.customerEmail || '-'}</TableCell>
                  <TableCell className="text-sm text-neutral-400 p-3" dir="ltr">{cart.customerPhone || '-'}</TableCell>
                  <TableCell className="text-sm text-neutral-900 p-3">{cart.itemCount ?? cart.items?.length ?? 0}</TableCell>
                  <TableCell className="text-sm font-semibold text-neutral-900 p-3 font-mono">{formatCurrency(cart.total || cart.totalAmount || 0)} {t('common.sar')}</TableCell>
                  <TableCell className="text-sm text-neutral-400 p-3">
                    {cart.lastActive ? new Date(cart.lastActive).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-neutral-400 p-3">
                    {cart.expiresAt ? new Date(cart.expiresAt).toLocaleDateString('ar-SA') : '-'}
                  </TableCell>
                  <TableCell className="p-3">
                    {/* Touch target ≥ 44x44 (WCAG 2.5.5). */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 opacity-40 cursor-not-allowed"
                      title="إرسال تذكير — قيد التطوير"
                      aria-label="إرسال تذكير — قيد التطوير"
                      disabled
                    >
                      <Send className="h-4 w-4 text-neutral-400" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
