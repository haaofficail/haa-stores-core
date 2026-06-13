import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Edit, Trash2, Tag, AlertTriangle, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { couponsApi, ApiClientError } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { PermissionGate } from '@/lib/permissions';

const typeColors: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  fixed: 'success',
  percentage: 'warning',
  free_shipping: 'secondary',
};

const emptyForm = {
  code: '', name: '', description: '', type: 'fixed', value: '', maxDiscountAmount: '',
  minOrderAmount: '', maxUses: '', startsAt: '', expiresAt: '', isActive: true,
};

export default function Coupons() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const loadCoupons = useCallback(() => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setFetchError(false);
    couponsApi.list(storeId, { search: search || undefined, status: statusFilter || undefined })
      .then(setCoupons)
      .catch(() => { setFetchError(true); toast.error(t('common.error')); })
      .finally(() => setLoading(false));
  }, [storeId, search, statusFilter, t]);

  useEffect(() => { loadCoupons(); }, [loadCoupons]);

  const updateField = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = async (id: number) => {
    setEditId(id);
    setErrors({});
    try {
      const c = await couponsApi.getById(storeId!, id);
      setForm({
        code: c.code ?? '',
        name: c.name ?? '',
        description: c.description ?? '',
        type: c.type ?? 'fixed',
        value: c.value ?? '',
        maxDiscountAmount: c.maxDiscountAmount ?? '',
        minOrderAmount: c.minOrderAmount ?? '',
        maxUses: c.maxUses ?? '',
        startsAt: c.startsAt ? c.startsAt.slice(0, 16) : '',
        expiresAt: c.expiresAt ? c.expiresAt.slice(0, 16) : '',
        isActive: c.isActive ?? true,
      });
      setDialogOpen(true);
    } catch (err) { toast.error(err instanceof ApiClientError ? err.message : t('common.error')); }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.code.trim()) errs.code = t('coupons.err_code_required');
    if (!form.name.trim()) errs.name = t('coupons.err_name_required');
    if (!form.value || Number(form.value) < 0) errs.value = t('coupons.err_value_positive');
    if (form.type === 'percentage' && Number(form.value) > 100) errs.value = t('coupons.err_value_percentage');
    return errs;
  };

  const save = async () => {
    if (!storeId) return;
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const data = {
        ...form,
        value: form.value ? Number(form.value) : undefined,
        maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : undefined,
        minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
        maxUses: form.maxUses ? Number(form.maxUses) : undefined,
        startsAt: form.startsAt || undefined,
        expiresAt: form.expiresAt || undefined,
      };
      if (editId) {
        await couponsApi.update(storeId, editId, data);
        toast.success(t('coupons.updated'));
      } else {
        await couponsApi.create(storeId, data);
        toast.success(t('coupons.created'));
      }
      setDialogOpen(false);
      loadCoupons();
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error(t('common.error'));
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!storeId) return;
    try {
      await couponsApi.delete(storeId, id);
      toast.success(t('coupons.deleted'));
      setDeleteConfirm(null);
      loadCoupons();
    } catch (err) { toast.error(err instanceof ApiClientError ? err.message : t('common.error')); }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'fixed': return t('coupons.type_fixed');
      case 'percentage': return t('coupons.type_percentage');
      case 'free_shipping': return t('coupons.type_free_shipping');
      default: return type;
    }
  };

  const now = new Date();

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">{t('coupons.title')}</h1>
        <PermissionGate permission="coupons:create">
          <Button onClick={openCreate} className="h-9 text-sm px-4">
            <Plus className="h-4 w-4 mr-2" />
            {t('coupons.create')}
          </Button>
        </PermissionGate>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input placeholder={t('coupons.search')} value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10 h-9 text-sm" />
          </div>
          <Select value={statusFilter || undefined} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder={t('coupons.filterStatus')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('coupons.all')}</SelectItem>
              <SelectItem value="active">{t('coupons.active')}</SelectItem>
              <SelectItem value="inactive">{t('coupons.inactive')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)}
          </div>
        ) : fetchError ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-red-50 mb-4">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            <p className="text-sm text-neutral-500 mb-3">{t('coupons.loadError')}</p>
            <Button variant="outline" size="sm" className="h-8 text-sm" onClick={loadCoupons}>{t('common.retry')}</Button>
          </div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-neutral-100 mb-4">
              <Tag className="h-8 w-8 text-neutral-400" />
            </div>
            <p className="text-sm text-neutral-500">{search || statusFilter ? t('coupons.noMatch') : t('coupons.noCoupons')}</p>
            {!search && !statusFilter && (
              <PermissionGate permission="coupons:create">
                <Button variant="outline" size="sm" className="h-8 text-sm mt-4" onClick={openCreate}>{t('coupons.create')}</Button>
              </PermissionGate>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-100 hover:bg-transparent">
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('coupons.code')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('coupons.name')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('coupons.type')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('coupons.value')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('coupons.usage')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('coupons.status')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('coupons.expiresAt')}</TableHead>
                <TableHead className="w-24 h-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((c) => {
                const expired = c.expiresAt && new Date(c.expiresAt) < now;
                const usage = c.maxUses ? `${c.usedCount ?? 0}/${c.maxUses}` : `${c.usedCount ?? 0}`;
                return (
                  <TableRow key={c.id} className={`border-neutral-100 hover:bg-neutral-50 ${!c.isActive || expired ? 'opacity-60' : ''}`}>
                    <TableCell className="font-mono font-bold text-sm text-neutral-900 p-3">{c.code}</TableCell>
                    <TableCell className="text-sm font-medium text-neutral-900 p-3">{c.name}</TableCell>
                    <TableCell className="p-3">
                      <Badge variant={typeColors[c.type] ?? 'default'} className="text-xs px-2.5 py-0.5">{getTypeLabel(c.type)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-neutral-900 p-3">
                      {c.type === 'percentage' ? `${Number(c.value)}%` : `${formatCurrency(c.value)} ${t('common.sar')}`}
                    </TableCell>
                    <TableCell className="text-sm text-neutral-400 p-3">{usage}</TableCell>
                    <TableCell className="p-3">
                      {expired ? (
                        <Badge variant="destructive" className="text-xs">{t('coupons.expired')}</Badge>
                      ) : c.isActive ? (
                        <Badge variant="success" className="gap-1 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />{t('coupons.active')}</Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-xs"><XCircle className="h-3 w-3 mr-1" />{t('coupons.inactive')}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-neutral-400 p-3">
                      {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('ar-SA') : '-'}
                    </TableCell>
                    <TableCell className="p-3">
                      <div className="flex gap-1">
                        <PermissionGate permission="coupons:update">
                          <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => openEdit(c.id)} title={t('coupons.edit')} aria-label={t('coupons.edit', 'تعديل الكوبون')}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </PermissionGate>
                        <PermissionGate permission="coupons:delete">
                          <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => setDeleteConfirm(c.id)} title={t('common.delete')} aria-label={t('common.delete', 'حذف الكوبون')}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </PermissionGate>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-900">{editId ? t('coupons.edit') : t('coupons.create')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-neutral-500">{t('coupons.labelCode')} <span className="text-red-500">*</span></Label>
              <Input value={form.code} onChange={(e) => updateField('code', e.target.value.toUpperCase())} placeholder={t('coupons.codePlaceholder')} dir="ltr" className="text-left font-mono h-9 text-sm" />
              {errors.code && <p className="text-xs text-red-500">{errors.code}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-neutral-500">{t('coupons.labelName')} <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder={t('coupons.namePlaceholder')} className="h-9 text-sm" />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-neutral-500">{t('coupons.labelDescription')}</Label>
              <textarea
                className="flex h-20 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder={t('coupons.descPlaceholder')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('coupons.labelType')}</Label>
                <Select value={form.type} onValueChange={(v) => updateField('type', v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">{t('coupons.type_fixed')}</SelectItem>
                    <SelectItem value="percentage">{t('coupons.type_percentage')}</SelectItem>
                    <SelectItem value="free_shipping">{t('coupons.type_free_shipping')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('coupons.labelValue')} <span className="text-red-500">*</span></Label>
                <Input type="number" step="0.01" min="0" value={form.value} onChange={(e) => updateField('value', e.target.value)} placeholder={form.type === 'percentage' ? t('coupons.percentPlaceholder') : t('coupons.valuePlaceholder')} className="h-9 text-sm" />
                {errors.value && <p className="text-xs text-red-500">{errors.value}</p>}
              </div>
              {form.type === 'percentage' && (
                <div className="space-y-1.5">
                  <Label className="text-sm text-neutral-500">{t('coupons.labelMaxDiscount')}</Label>
                  <Input type="number" step="0.01" min="0" value={form.maxDiscountAmount} onChange={(e) => updateField('maxDiscountAmount', e.target.value)} placeholder={t('coupons.noMaxPlaceholder')} className="h-9 text-sm" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('coupons.labelMinOrder')}</Label>
                <Input type="number" step="0.01" min="0" value={form.minOrderAmount} onChange={(e) => updateField('minOrderAmount', e.target.value)} placeholder={t('coupons.noMinPlaceholder')} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('coupons.labelMaxUses')}</Label>
                <Input type="number" min="0" value={form.maxUses} onChange={(e) => updateField('maxUses', e.target.value)} placeholder={t('coupons.unlimitedPlaceholder')} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('coupons.labelStartDate')}</Label>
                <Input type="datetime-local" value={form.startsAt} onChange={(e) => updateField('startsAt', e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('coupons.labelEndDate')}</Label>
                <Input type="datetime-local" value={form.expiresAt} onChange={(e) => updateField('expiresAt', e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => updateField('isActive', e.target.checked)} className="rounded border-neutral-300 h-4 w-4" />
              <Label htmlFor="isActive" className="cursor-pointer text-sm text-neutral-500">{t('coupons.labelActive')}</Label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-neutral-100">
            <Button variant="outline" className="h-9 text-sm" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button className="h-9 text-sm" onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirm !== null} onOpenChange={(o) => { if (!o) setDeleteConfirm(null); }}>
        <DialogContent className="max-w-sm bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-900">{t('coupons.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-500">{t('coupons.deleteConfirm')}</p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" className="h-9 text-sm" onClick={() => setDeleteConfirm(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" className="h-9 text-sm" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>{t('common.delete')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
