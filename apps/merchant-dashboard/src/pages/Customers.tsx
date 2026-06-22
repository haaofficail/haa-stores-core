import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { customersApi, ApiClientError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Edit, Search, Users, AlertTriangle, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
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
                    <PermissionGate permission="customers:update" fallback={null}>
                      <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => openEdit(c)} aria-label="تعديل بيانات العميل">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </PermissionGate>
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
    </div>
  );
}
