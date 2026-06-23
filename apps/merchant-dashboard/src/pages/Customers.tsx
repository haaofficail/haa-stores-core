import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { customersApi, loyaltyApi, ApiClientError, type LoyaltyCustomerSummary, type LoyaltyTxRow } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Edit, Search, Users, AlertTriangle, RotateCcw, ChevronLeft, ChevronRight, Coins, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { PermissionGate } from '@/lib/permissions';

export default function Customers() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const limit = 20;

  // L-PR-5 — Loyalty drilldown drawer state.
  // Opens for a specific customer; pulls balance + first 50 ledger rows
  // from loyaltyApi.getCustomer, then paginates further pages via
  // loyaltyApi.getTransactions (cursor = last seen id). Lifetime stats
  // are derived client-side from the cumulative `items` array since the
  // server returns immutable rows in descending id order.
  const [loyaltyOpen, setLoyaltyOpen] = useState(false);
  const [loyaltyCustomer, setLoyaltyCustomer] = useState<{ id: number; name: string } | null>(null);
  const [loyaltySummary, setLoyaltySummary] = useState<LoyaltyCustomerSummary | null>(null);
  const [loyaltyItems, setLoyaltyItems] = useState<LoyaltyTxRow[]>([]);
  const [loyaltyCursor, setLoyaltyCursor] = useState<number | null>(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [loyaltyError, setLoyaltyError] = useState<string | null>(null);

  const openLoyalty = async (c: { id: number; name: string }) => {
    if (!storeId) return;
    setLoyaltyOpen(true);
    setLoyaltyCustomer(c);
    setLoyaltySummary(null);
    setLoyaltyItems([]);
    setLoyaltyCursor(null);
    setLoyaltyError(null);
    setLoyaltyLoading(true);
    try {
      const summary = await loyaltyApi.getCustomer(storeId, c.id);
      setLoyaltySummary(summary);
      // Use the first transactions response from getCustomer (up to 50).
      const rows: LoyaltyTxRow[] = (summary.transactions || []) as LoyaltyTxRow[];
      setLoyaltyItems(rows);
      // Seed cursor from the last item so "load more" continues from there.
      setLoyaltyCursor(rows.length > 0 ? rows[rows.length - 1].id : null);
    } catch (err) {
      setLoyaltyError(err instanceof ApiClientError ? err.message : 'فشل تحميل نقاط الولاء');
    } finally {
      setLoyaltyLoading(false);
    }
  };

  const loadMoreLoyalty = async () => {
    if (!storeId || !loyaltyCustomer || loyaltyCursor === null) return;
    setLoyaltyLoading(true);
    try {
      const page = await loyaltyApi.getTransactions(storeId, loyaltyCustomer.id, { cursor: loyaltyCursor, limit: 50 });
      setLoyaltyItems((prev) => [...prev, ...page.items]);
      setLoyaltyCursor(page.nextCursor);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('common.error'));
    } finally {
      setLoyaltyLoading(false);
    }
  };

  // Client-side lifetime aggregation from the rows we've fetched so far.
  // The merchant only sees stats for what is loaded; full history requires
  // paging through "Load more". This avoids a new aggregation endpoint.
  const loyaltyLifetime = loyaltyItems.reduce(
    (acc, r) => {
      if (r.type === 'earn') acc.earned += r.points;
      else if (r.type === 'redeem') acc.redeemed += Math.abs(r.points);
      else if (r.type === 'expire') acc.expired += Math.abs(r.points);
      return acc;
    },
    { earned: 0, redeemed: 0, expired: 0 },
  );

  const load = useCallback(() => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setFetchError(false);
    customersApi.list(storeId, { page, limit, search: search || undefined })
      .then(r => { setCustomers(r.data); setTotal(r.total ?? 0); })
      .catch(() => { setFetchError(true); toast.error('فشل تحميل العملاء'); })
      .finally(() => setLoading(false));
  }, [storeId, page, search]);

  useEffect(() => { load(); }, [load]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const totalPages = Math.ceil(total / limit);

  const openCreate = () => {
    setEditId(null); setForm({ name: '', phone: '', email: '', notes: '' }); setDialogOpen(true);
  };

  const openEdit = (c: any) => {
    setEditId(c.id); setForm({ name: c.name ?? '', phone: c.phone ?? '', email: c.email ?? '', notes: c.notes ?? '' }); setDialogOpen(true);
  };

  const save = async () => {
    if (!storeId) return;
    if (!form.name.trim()) { toast.error(t('customers.nameRequired')); return; }
    if (!form.phone.trim()) { toast.error(t('customers.phoneRequired')); return; }
    setSaving(true);
    try {
      if (editId) { await customersApi.update(storeId, editId, form); toast.success(t('customers.updated')); }
      else { await customersApi.create(storeId, form); toast.success(t('customers.created')); }
      setDialogOpen(false); load();
    } catch (err) { toast.error(err instanceof ApiClientError ? err.message : t('common.error')); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{t('customers.title')}</h1>
        <PermissionGate permission="customers:create" fallback={null}><Button onClick={openCreate} className="h-9 text-sm px-4"><Plus className="h-4 w-4 me-2" />{t('customers.create')}</Button></PermissionGate>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
        <div className="relative max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input placeholder={t('customers.search')} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pe-10 h-9 text-sm" />
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-2xl" />)}</div>
        ) : fetchError ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-red-50 mb-4">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            <p className="text-sm font-medium text-neutral-700 mb-1">فشل تحميل العملاء</p>
            <p className="text-sm text-neutral-500 mb-4">حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى.</p>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5" onClick={load}>
              <RotateCcw className="h-4 w-4" /> {t('common.retry', 'إعادة المحاولة')}
            </Button>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-neutral-100 mb-4">
              {search ? <Search className="h-8 w-8 text-neutral-400" /> : <Users className="h-8 w-8 text-neutral-400" />}
            </div>
            {search ? (
              <>
                <p className="text-sm font-medium text-neutral-700 mb-1">لا توجد نتائج لـ "{search}"</p>
                <Button variant="outline" size="sm" className="h-8 text-sm mt-3" onClick={() => { setSearchInput(''); setSearch(''); }}>
                  مسح البحث
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-neutral-500">{t('customers.noCustomers')}</p>
                <PermissionGate permission="customers:create" fallback={null}>
                  <Button size="sm" className="h-9 text-sm mt-4" onClick={openCreate}>
                    <Plus className="h-4 w-4 me-1.5" />{t('customers.create')}
                  </Button>
                </PermissionGate>
              </>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-100 hover:bg-transparent">
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('customers.name')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('customers.phone')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('customers.email')}</TableHead>
                <TableHead className="w-16 h-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id} className="border-neutral-100 hover:bg-neutral-50 transition-colors">
                  <TableCell className="text-sm font-medium text-neutral-900 p-3">{c.name}</TableCell>
                  <TableCell className="text-sm text-neutral-900 p-3" dir="ltr"><PermissionGate permission="customers:view_sensitive" fallback={null}>{c.phone}</PermissionGate></TableCell>
                  <TableCell className="text-sm text-neutral-400 p-3">{c.email || '-'}</TableCell>
                  <TableCell className="p-3">
                    <div className="flex items-center gap-1 justify-end">
                      <PermissionGate permission="promotions:read" fallback={null}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11"
                          onClick={() => openLoyalty({ id: c.id, name: c.name })}
                          aria-label="عرض نقاط الولاء"
                          data-testid="customer-loyalty-btn"
                        >
                          <Coins className="h-4 w-4" />
                        </Button>
                      </PermissionGate>
                      <PermissionGate permission="customers:update" fallback={null}>
                        <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => openEdit(c)} aria-label="تعديل بيانات العميل">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </PermissionGate>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {total > 0 && totalPages > 1 && (
        <div className="flex justify-between items-center text-sm text-neutral-400">
          <span>
            {(page - 1) * limit + 1}–{Math.min(page * limit, total)} من {total}
          </span>
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="icon" className="h-11 w-11" disabled={page <= 1} onClick={() => setPage(p => p - 1)} aria-label="الصفحة السابقة">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm tabular-nums">صفحة {page} من {totalPages}</span>
            <Button variant="outline" size="icon" className="h-11 w-11" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} aria-label="الصفحة التالية">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl">
          <DialogHeader><DialogTitle className="text-lg font-bold text-neutral-900">{editId ? t('customers.edit') : t('customers.create')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {[['name', t('customers.name')], ['phone', t('customers.phone')], ['email', t('customers.email')]].map(([field, label]) => (
              <div key={field} className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{label}</Label>
                <Input value={(form as any)[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} dir={field === 'phone' || field === 'email' ? 'ltr' : 'rtl'} className="h-9 text-sm" />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label className="text-sm text-neutral-500">{t('customers.notes')}</Label>
              <textarea className="flex h-20 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <Button variant="outline" className="h-9 text-sm" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button className="h-9 text-sm" onClick={save} disabled={saving}>{saving ? t('common.loading') : t('common.save')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* L-PR-5 — Loyalty drilldown: balance, lifetime stats, paginated ledger */}
      <Dialog open={loyaltyOpen} onOpenChange={setLoyaltyOpen}>
        <DialogContent
          className="bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl max-w-2xl"
          data-testid="customer-loyalty-drawer"
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-primary-50 text-primary-600">
                <Coins className="h-4 w-4" />
              </span>
              نقاط الولاء — {loyaltyCustomer?.name ?? ''}
            </DialogTitle>
          </DialogHeader>

          {loyaltyError ? (
            <div className="p-6 text-center">
              <div className="inline-flex p-3 rounded-2xl bg-red-50 mb-3">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <p className="text-sm text-neutral-700">{loyaltyError}</p>
            </div>
          ) : loyaltyLoading && !loyaltySummary ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-2xl" />
            </div>
          ) : loyaltySummary ? (
            <div className="space-y-4">
              {/* Current balance + value */}
              <div className="rounded-2xl bg-primary-50/60 border border-primary-100 p-4" data-testid="loyalty-summary-balance">
                <p className="text-xs text-neutral-500 mb-1">الرصيد الحالي</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-primary-600 tabular-nums" dir="ltr">
                    {loyaltySummary.balance.toLocaleString('en-US')}
                  </span>
                  <span className="text-sm text-neutral-500">نقطة</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1" dir="ltr">
                  ≈ {loyaltySummary.value.toFixed(2)} ر.س
                </p>
              </div>

              {/* Lifetime stats (derived from loaded rows) */}
              <div className="grid grid-cols-3 gap-3" data-testid="loyalty-lifetime-stats">
                <div className="rounded-xl border border-neutral-100 p-3">
                  <p className="text-xs text-neutral-500 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-emerald-600" /> مكتسبة
                  </p>
                  <p className="text-sm font-semibold tabular-nums mt-1" dir="ltr" data-testid="loyalty-lifetime-earned">
                    {loyaltyLifetime.earned.toLocaleString('en-US')}
                  </p>
                </div>
                <div className="rounded-xl border border-neutral-100 p-3">
                  <p className="text-xs text-neutral-500 flex items-center gap-1">
                    <TrendingDown className="h-3 w-3 text-red-500" /> مستبدلة
                  </p>
                  <p className="text-sm font-semibold tabular-nums mt-1" dir="ltr" data-testid="loyalty-lifetime-redeemed">
                    {loyaltyLifetime.redeemed.toLocaleString('en-US')}
                  </p>
                </div>
                <div className="rounded-xl border border-neutral-100 p-3">
                  <p className="text-xs text-neutral-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-neutral-400" /> منتهية
                  </p>
                  <p className="text-sm font-semibold tabular-nums mt-1" dir="ltr" data-testid="loyalty-lifetime-expired">
                    {loyaltyLifetime.expired.toLocaleString('en-US')}
                  </p>
                </div>
              </div>

              {/* Ledger */}
              <div>
                <p className="text-xs text-neutral-500 mb-2">سجل الحركات</p>
                {loyaltyItems.length === 0 ? (
                  <p className="text-sm text-neutral-400 text-center py-6">لا توجد حركات</p>
                ) : (
                  <ul className="space-y-1.5 max-h-80 overflow-y-auto" data-testid="loyalty-ledger-list">
                    {loyaltyItems.map((row) => {
                      const isPositive = row.points > 0;
                      return (
                        <li
                          key={row.id}
                          className="flex items-center justify-between text-sm px-3 py-2 rounded-lg hover:bg-neutral-50"
                          data-testid="loyalty-ledger-row"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-neutral-700 truncate">
                              {row.description || row.type}
                            </p>
                            <p className="text-xs text-neutral-400" dir="ltr">
                              {new Date(row.createdAt).toLocaleDateString('en-GB')}
                            </p>
                          </div>
                          <span
                            className={`tabular-nums font-medium ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}
                            dir="ltr"
                          >
                            {isPositive ? '+' : ''}{row.points.toLocaleString('en-US')}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {loyaltyCursor !== null && (
                  <div className="flex justify-center pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 text-sm"
                      onClick={loadMoreLoyalty}
                      disabled={loyaltyLoading}
                      data-testid="loyalty-load-more-btn"
                    >
                      {loyaltyLoading ? t('common.loading') : 'تحميل المزيد'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <Button variant="outline" className="h-9 text-sm" onClick={() => setLoyaltyOpen(false)}>{t('common.close', 'إغلاق')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
