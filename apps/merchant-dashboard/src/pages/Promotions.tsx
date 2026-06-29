import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Edit, Trash2, Percent, AlertTriangle, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ApiClientError, promotionsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { PermissionGate } from '@/lib/permissions';

const typeColors: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  percentage: 'warning',
  fixed: 'success',
  buy_x_get_y: 'secondary',
  free_shipping: 'default',
};

const emptyForm = {
  name: '', description: '', type: 'percentage' as string, value: '',
  minOrderAmount: '', maxDiscountAmount: '', appliesTo: 'all' as string,
  appliesToId: '', startsAt: '', endsAt: '',
};

export default function Promotions() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Search + status are server-side params, so they live in the query key:
  // changing either refetches automatically and each combination is cached.
  const promotionsQuery = useQuery({
    queryKey: [...queryKeys.promotions(storeId), { search, status: statusFilter }],
    queryFn: () => promotionsApi.list(storeId as number, { search: search || undefined, status: statusFilter || undefined }),
    enabled: !!storeId,
  });
  const promotions = (promotionsQuery.data ?? []) as Array<{ id: number; name: string; type: string; value: string; appliesTo: string; isActive: boolean; endsAt: string }>;
  const loading = promotionsQuery.isLoading;
  const fetchError = promotionsQuery.isError;
  const invalidatePromotions = () => queryClient.invalidateQueries({ queryKey: queryKeys.promotions(storeId) });

  useEffect(() => { if (promotionsQuery.isError) toast.error(t('common.error')); }, [promotionsQuery.isError, t]);

  // Debounce search input by 350ms
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const updateField = (field: string, value: unknown) => {
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
      const p = await promotionsApi.getById(storeId!, id) as {
        name?: string;
        description?: string;
        type?: string;
        value?: string;
        minOrderAmount?: string;
        maxDiscountAmount?: string;
        appliesTo?: string;
        appliesToId?: string;
        startsAt?: string;
        endsAt?: string;
      };
      setForm({
        name: p.name ?? '',
        description: p.description ?? '',
        type: p.type ?? 'percentage',
        value: p.value ?? '',
        minOrderAmount: p.minOrderAmount ?? '',
        maxDiscountAmount: p.maxDiscountAmount ?? '',
        appliesTo: p.appliesTo ?? 'all',
        appliesToId: p.appliesToId ?? '',
        startsAt: p.startsAt ? p.startsAt.slice(0, 16) : '',
        endsAt: p.endsAt ? p.endsAt.slice(0, 16) : '',
      });
      setDialogOpen(true);
    } catch (err) { toast.error(err instanceof ApiClientError ? err.message : t('common.error')); }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = t('promotions.err_name_required');
    if (!form.value || Number(form.value) <= 0) errs.value = t('promotions.err_value_positive');
    if (form.type === 'percentage' && Number(form.value) > 100) errs.value = t('promotions.err_value_percentage');
    if (!form.startsAt) errs.startsAt = t('promotions.err_starts_required');
    if (!form.endsAt) errs.endsAt = t('promotions.err_ends_required');
    return errs;
  };

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      editId ? promotionsApi.update(storeId as number, editId, data) : promotionsApi.create(storeId as number, data),
    onSuccess: () => {
      toast.success(editId ? t('promotions.updated') : t('promotions.created'));
      setDialogOpen(false);
      invalidatePromotions();
    },
    onError: (err) => toast.error(err instanceof ApiClientError ? err.message : t('common.error')),
  });
  const saving = saveMutation.isPending;

  const save = () => {
    if (!storeId) return;
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const data = {
      ...form,
      value: Number(form.value),
      minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : undefined,
      maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : undefined,
      appliesToId: form.appliesToId ? Number(form.appliesToId) : undefined,
      startsAt: form.startsAt,
      endsAt: form.endsAt,
    };
    saveMutation.mutate(data);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => promotionsApi.delete(storeId as number, id),
    onSuccess: () => {
      toast.success(t('promotions.deleted'));
      setDeleteConfirm(null);
      invalidatePromotions();
    },
    onError: (err) => toast.error(err instanceof ApiClientError ? err.message : t('common.error')),
  });
  const handleDelete = (id: number) => {
    if (!storeId) return;
    deleteMutation.mutate(id);
  };

  const now = new Date();

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{t('promotions.title')}</h1>
        <PermissionGate permission="promotions:create">
          <Button onClick={openCreate} className="h-9 text-sm px-4">
            <Plus className="h-4 w-4 me-2" />
            {t('promotions.create')}
          </Button>
        </PermissionGate>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6 flex gap-4 items-center flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input placeholder={t('promotions.search')} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pe-9 h-9 text-sm" />
        </div>
        <Select value={statusFilter || undefined} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder={t('promotions.filterStatus')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('promotions.all')}</SelectItem>
            <SelectItem value="active">{t('promotions.active')}</SelectItem>
            <SelectItem value="inactive">{t('promotions.inactive')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
            <p className="text-sm text-neutral-500 mb-3">{t('promotions.loadError')}</p>
            <Button variant="outline" className="h-9 text-sm" onClick={() => promotionsQuery.refetch()}>{t('common.retry')}</Button>
          </div>
        ) : promotions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-neutral-100 mb-4">
              <Percent className="h-8 w-8 text-neutral-400" />
            </div>
            <p className="text-sm text-neutral-500">{searchInput || statusFilter ? t('promotions.noMatch') : t('promotions.noPromotions')}</p>
            {!searchInput && !statusFilter && (
              <PermissionGate permission="promotions:create">
                <Button variant="outline" className="h-9 text-sm mt-4" onClick={openCreate}>{t('promotions.create')}</Button>
              </PermissionGate>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-100 hover:bg-transparent">
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('promotions.name')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('promotions.type')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('promotions.value')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('promotions.appliesTo')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('promotions.status')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('promotions.endsAt')}</TableHead>
                <TableHead className="h-10 text-sm text-neutral-500 font-medium w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions.map((p) => {
                const expired = new Date(p.endsAt) < now;
                return (
                  <TableRow key={p.id} className={`border-neutral-100 hover:bg-neutral-50 ${!p.isActive || expired ? 'opacity-60' : ''}`}>
                    <TableCell className="text-sm font-medium text-neutral-900 p-3">{p.name}</TableCell>
                    <TableCell className="p-3">
                      <Badge variant={typeColors[p.type] ?? 'default'} className="text-xs px-2.5 py-0.5">
                        {t(`promotions.type_${p.type}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-neutral-900 p-3">
                      {p.type === 'percentage' ? `${Number(p.value)}%` : `${formatCurrency(p.value)} ${t('common.sar')}`}
                    </TableCell>
                    <TableCell className="text-sm text-neutral-400 p-3">
                      {p.appliesTo === 'all' ? t('promotions.appliesToAll') :
                       p.appliesTo === 'category' ? t('promotions.appliesToCategory') :
                       p.appliesTo === 'product' ? t('promotions.appliesToProduct') : '-'}
                    </TableCell>
                    <TableCell className="p-3">
                      {expired ? (
                        <Badge variant="destructive" className="text-xs px-2.5 py-0.5">{t('common.expired')}</Badge>
                      ) : p.isActive ? (
                        <Badge variant="success" className="text-xs px-2.5 py-0.5"><CheckCircle2 className="h-3 w-3 me-1" />{t('promotions.active')}</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs px-2.5 py-0.5"><XCircle className="h-3 w-3 me-1" />{t('promotions.inactive')}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-neutral-400 p-3">
                      {new Date(p.endsAt).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell className="p-3">
                      <div className="flex gap-1">
                        <PermissionGate permission="promotions:update">
                          <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => openEdit(p.id)} title={t('common.edit')} aria-label={t('common.edit', 'تعديل العرض')}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </PermissionGate>
                        <PermissionGate permission="promotions:delete">
                          <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => setDeleteConfirm(p.id)} title={t('common.delete')} aria-label={t('common.delete', 'حذف العرض')}>
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
        <DialogContent className="bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-900">{editId ? t('promotions.edit') : t('promotions.create')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm text-neutral-500">{t('promotions.name')} <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder={t('promotions.name')} className="h-9 text-sm" />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-neutral-500">{t('promotions.description')}</Label>
              <textarea
                className="flex h-20 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder={t('promotions.description')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm text-neutral-500">{t('promotions.type')}</Label>
                <Select value={form.type} onValueChange={(v) => updateField('type', v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">{t('promotions.type_percentage')}</SelectItem>
                    <SelectItem value="fixed">{t('promotions.type_fixed')}</SelectItem>
                    <SelectItem value="buy_x_get_y">{t('promotions.type_buy_x_get_y')}</SelectItem>
                    <SelectItem value="free_shipping">{t('promotions.type_free_shipping')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-neutral-500">{t('promotions.value')} <span className="text-red-500">*</span></Label>
                <Input type="number" step="0.01" min="0" value={form.value} onChange={(e) => updateField('value', e.target.value)} placeholder={form.type === 'percentage' ? '10' : '50'} className="h-9 text-sm" />
                {errors.value && <p className="text-xs text-red-500">{errors.value}</p>}
              </div>
              {form.type === 'percentage' && (
                <div className="space-y-1">
                  <Label className="text-sm text-neutral-500">{t('promotions.maxDiscountAmount')}</Label>
                  <Input type="number" step="0.01" min="0" value={form.maxDiscountAmount} onChange={(e) => updateField('maxDiscountAmount', e.target.value)} className="h-9 text-sm" />
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-sm text-neutral-500">{t('promotions.minOrderAmount')}</Label>
                <Input type="number" step="0.01" min="0" value={form.minOrderAmount} onChange={(e) => updateField('minOrderAmount', e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-neutral-500">{t('promotions.appliesTo')}</Label>
                <Select value={form.appliesTo} onValueChange={(v) => { updateField('appliesTo', v); if (v === 'all') updateField('appliesToId', ''); }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('promotions.appliesToAll')}</SelectItem>
                    <SelectItem value="category">{t('promotions.appliesToCategory')}</SelectItem>
                    <SelectItem value="product">{t('promotions.appliesToProduct')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.appliesTo !== 'all' && (
                <div className="space-y-1">
                  <Label className="text-sm text-neutral-500">{form.appliesTo === 'category' ? t('promotions.appliesToCategory') : t('promotions.appliesToProduct')}</Label>
                  <Input type="number" min="1" value={form.appliesToId} onChange={(e) => updateField('appliesToId', e.target.value)} className="h-9 text-sm" />
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-sm text-neutral-500">{t('promotions.startsAt')} <span className="text-red-500">*</span></Label>
                <Input type="datetime-local" value={form.startsAt} onChange={(e) => updateField('startsAt', e.target.value)} className="h-9 text-sm" />
                {errors.startsAt && <p className="text-xs text-red-500">{errors.startsAt}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-neutral-500">{t('promotions.endsAt')} <span className="text-red-500">*</span></Label>
                <Input type="datetime-local" value={form.endsAt} onChange={(e) => updateField('endsAt', e.target.value)} className="h-9 text-sm" />
                {errors.endsAt && <p className="text-xs text-red-500">{errors.endsAt}</p>}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <Button variant="outline" className="h-9 text-sm" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button className="h-9 text-sm px-4" onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirm !== null} onOpenChange={(o) => { if (!o) setDeleteConfirm(null); }}>
        <DialogContent className="bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-900">{t('common.confirm')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-500">{t('promotions.deleteConfirm')}</p>
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <Button variant="outline" className="h-9 text-sm" onClick={() => setDeleteConfirm(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" className="h-9 text-sm" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>{t('common.delete')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
