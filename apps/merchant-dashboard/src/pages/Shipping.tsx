import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { shippingApi, settingsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus, Edit, Truck, Package, MapPin, DollarSign, Info,
  RotateCcw, Search, CheckCircle2, XCircle, FileText, Undo2, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { PermissionGate } from '@/lib/permissions';
import { ApiClientError } from '@/lib/api';

const shipmentStatusColors: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  draft: 'secondary', created: 'default', in_transit: 'warning',
  delivered: 'success', failed: 'destructive', cancelled: 'destructive',
};

const shipmentStatusIcons: Record<string, React.ReactNode> = {
  draft: <Package className="h-3.5 w-3.5" />,
  created: <Package className="h-3.5 w-3.5" />,
  in_transit: <Truck className="h-3.5 w-3.5" />,
  delivered: <CheckCircle2 className="h-3.5 w-3.5" />,
  failed: <XCircle className="h-3.5 w-3.5" />,
  cancelled: <XCircle className="h-3.5 w-3.5" />,
};

function MethodsTab({ storeId }: { storeId: number }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', type: 'manual', estimatedDeliveryDays: '', isActive: true, pickupLocationId: '' });
  const [saving, setSaving] = useState(false);
  const [pickupLocations, setPickupLocations] = useState<any[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    setFetchError(false);
    Promise.all([
      shippingApi.methods.list(storeId),
      settingsApi.listPickupLocations(storeId).catch(() => []),
    ]).then(([methods, pickups]) => {
      setItems(methods);
      setPickupLocations(pickups);
    }).catch(() => { setFetchError(true); toast.error(t('common.error')); }).finally(() => setLoading(false));
  }, [storeId, t]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditId(null); setForm({ name: '', type: 'manual', estimatedDeliveryDays: '', isActive: true, pickupLocationId: '' }); setDialog(true); };
  const openEdit = (m: any) => {
    const config = m.config ?? {};
    setEditId(m.id);
    setForm({
      name: m.name ?? '', type: m.type ?? 'manual',
      estimatedDeliveryDays: m.estimatedDeliveryDays ?? '',
      isActive: m.isActive ?? true,
      pickupLocationId: config.pickupLocationId ? String(config.pickupLocationId) : '',
    });
    setDialog(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error(t('shipping.err_name_required')); return; }
    if (form.type === 'local_pickup' && !form.pickupLocationId) { toast.error(t('shipping.errPickupLocationRequired', 'يرجى اختيار الفرع المرتبط')); return; }
    setSaving(true);
    try {
      const data: any = {
        name: form.name,
        type: form.type,
        estimatedDeliveryDays: form.estimatedDeliveryDays || undefined,
        isActive: form.isActive,
      };
      if (form.type === 'local_pickup' && form.pickupLocationId) {
        data.config = { pickupLocationId: Number(form.pickupLocationId) };
      }
      if (editId) { await shippingApi.methods.update(storeId, editId, data); toast.success(t('shipping.updated')); }
      else { await shippingApi.methods.create(storeId, data); toast.success(t('shipping.created')); }
      setDialog(false); load();
    } catch (err) { toast.error(err instanceof ApiClientError ? err.message : t('common.error')); } finally { setSaving(false); }
  };

  const toggleActive = async (m: any) => {
    try {
      await shippingApi.methods.update(storeId, m.id, { isActive: !m.isActive });
      toast.success(m.isActive ? t('shipping.methodDisabled') : t('shipping.methodEnabled'));
      load();
    } catch { toast.error(t('common.error')); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-neutral-400">{t('shipping.methodsDesc')}</p>
        <PermissionGate permission="shipping:manage"><Button onClick={openCreate} className="h-9 text-sm"><Plus className="h-4 w-4 mr-2" />{t('shipping.createMethod')}</Button></PermissionGate>
      </div>
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
        {loading ? <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-2xl" />)}</div>
        : fetchError ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-red-50 mb-4"><AlertTriangle className="h-8 w-8 text-red-400" /></div>
            <p className="text-sm font-medium text-neutral-700 mb-1">فشل تحميل طرق الشحن</p>
            <p className="text-sm text-neutral-500 mb-4">حدث خطأ أثناء الاتصال بالخادم.</p>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5" onClick={load}><RotateCcw className="h-4 w-4" />إعادة المحاولة</Button>
          </div>
        )
        : items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-neutral-100 mb-4"><Truck className="h-8 w-8 text-neutral-400" /></div>
            <p className="text-sm text-neutral-500">{t('shipping.noMethods')}</p>
            <p className="text-xs text-neutral-400 mt-1">{t('shipping.noMethodsHint')}</p>
            <PermissionGate permission="shipping:manage">
              <Button size="sm" className="h-9 text-sm mt-4" onClick={openCreate}><Plus className="h-4 w-4 me-1.5" />{t('shipping.createMethod')}</Button>
            </PermissionGate>
          </div>
        )
        : <Table>
            <TableHeader><TableRow className="border-neutral-100 hover:bg-transparent">
              <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('shipping.methodName')}</TableHead>
              <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('shipping.methodType')}</TableHead>
              <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('shipping.deliveryDays')}</TableHead>
              <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('shipping.isActive')}</TableHead>
            <TableHead className="w-64 h-10"></TableHead>
            </TableRow></TableHeader>
              <TableBody>{items.map(m => {
                const config = m.config ?? {};
                const linkedPickup = config.pickupLocationId ? pickupLocations.find(l => l.id === config.pickupLocationId) : null;
                return (
              <TableRow key={m.id} className="border-neutral-100 hover:bg-neutral-50">
                <TableCell className="text-sm font-medium text-neutral-900 p-3">{m.name}
                  {m.type === 'local_pickup' && linkedPickup && (
                    <span className="text-xs text-neutral-400 block">📍 {linkedPickup.nameAr}</span>
                  )}
                </TableCell>
                <TableCell className="p-3"><Badge variant="outline" className="text-xs">{t(`shipping.type_${m.type}` as any)}</Badge></TableCell>
                <TableCell className="text-sm text-neutral-400 p-3">{m.estimatedDeliveryDays ?? '-'}</TableCell>
                <TableCell className="p-3"><Badge variant={m.isActive ? 'success' : 'secondary'} className="text-xs">{m.isActive ? t('common.active') : t('common.inactive')}</Badge></TableCell>
                <TableCell className="p-3">
                  <div className="flex gap-1">
                    <PermissionGate permission="shipping:manage"><Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => openEdit(m)} aria-label="تعديل طريقة الشحن"><Edit className="h-4 w-4" /></Button></PermissionGate>
                    <PermissionGate permission="shipping:manage"><Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => toggleActive(m)} aria-label={m.isActive ? 'تعطيل طريقة الشحن' : 'تفعيل طريقة الشحن'}>
                      {m.isActive ? <XCircle className="h-4 w-4 text-neutral-400" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    </Button></PermissionGate>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}</TableBody>
          </Table>}
      </div>
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl">
          <DialogHeader><DialogTitle className="text-lg font-bold text-neutral-900">{editId ? t('shipping.editMethod') : t('shipping.createMethod')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label className="text-sm text-neutral-500">{t('shipping.methodName')} <span className="text-red-500">*</span></Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-9 text-sm" /></div>
            <div className="space-y-1.5">
              <Label className="text-sm text-neutral-500">{t('shipping.methodType')}</Label>
              <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">{t('shipping.type_fixed')}</SelectItem>
                  <SelectItem value="city_based">{t('shipping.type_city_based')}</SelectItem>
                  <SelectItem value="free_above">{t('shipping.type_free_above')}</SelectItem>
                  <SelectItem value="local_pickup">{t('shipping.type_local_pickup')}</SelectItem>
                  <SelectItem value="local_delivery">{t('shipping.type_local_delivery')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-sm text-neutral-500">{t('shipping.deliveryDays')}</Label><Input value={form.estimatedDeliveryDays} onChange={e => setForm({...form, estimatedDeliveryDays: e.target.value})} placeholder={t('shipping.deliveryDaysHint')} className="h-9 text-sm" /></div>
            {form.type === 'local_pickup' && (
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('shipping.pickupLocation', 'الفرع المرتبط')} <span className="text-red-500">*</span></Label>
                <Select value={form.pickupLocationId} onValueChange={v => setForm({...form, pickupLocationId: v})}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={t('shipping.selectPickupLocation', 'اختر فرعًا')} /></SelectTrigger>
                  <SelectContent>
                    {pickupLocations.filter(l => l.isActive).map(l => (
                      <SelectItem key={l.id} value={String(l.id)}>{l.nameAr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {pickupLocations.filter(l => l.isActive).length === 0 && (
                  <p className="text-xs text-amber-600">{t('shipping.noActivePickupLocations', 'لا توجد فروع نشطة. أضف فرعًا في الإعدادات أولاً.')}</p>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100"><Button variant="outline" className="h-9 text-sm" onClick={() => setDialog(false)}>{t('common.cancel')}</Button><Button className="h-9 text-sm" onClick={save} disabled={saving}>{saving ? t('common.loading') : t('common.save')}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ZonesTab({ storeId }: { storeId: number }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', cities: '', isActive: true });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFetchError(false);
    shippingApi.zones.list(storeId).then(setItems).catch(() => { setFetchError(true); toast.error(t('common.error')); }).finally(() => setLoading(false));
  }, [storeId, t]);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditId(null); setForm({ name: '', cities: '', isActive: true }); setDialog(true); };
  const openEdit = (z: any) => { setEditId(z.id); setForm({ name: z.name ?? '', cities: (z.cities ?? []).join(', '), isActive: z.isActive ?? true }); setDialog(true); };

  const save = async () => {
    if (!form.name.trim()) { toast.error(t('shipping.err_zone_name_required')); return; }
    if (!form.cities.trim()) { toast.error(t('shipping.err_zone_cities_required')); return; }
    setSaving(true);
    try {
      const data = { name: form.name, cities: form.cities.split(',').map((c: string) => c.trim()).filter(Boolean), isActive: form.isActive };
      if (editId) { await shippingApi.zones.update(storeId, editId, data); toast.success(t('shipping.updated')); }
      else { await shippingApi.zones.create(storeId, data); toast.success(t('shipping.created')); }
      setDialog(false); load();
    } catch (err) { toast.error(err instanceof ApiClientError ? err.message : t('common.error')); } finally { setSaving(false); }
  };

  const toggleActive = async (z: any) => {
    try {
      await shippingApi.zones.update(storeId, z.id, { isActive: !z.isActive });
      toast.success(z.isActive ? t('shipping.zoneDisabled') : t('shipping.zoneEnabled'));
      load();
    } catch { toast.error(t('common.error')); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-neutral-400">{t('shipping.zonesDesc')}</p>
        <PermissionGate permission="shipping:manage"><Button onClick={openCreate} className="h-9 text-sm"><Plus className="h-4 w-4 mr-2" />{t('shipping.createZone')}</Button></PermissionGate>
      </div>
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
        {loading ? <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-2xl" />)}</div>
        : fetchError ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-red-50 mb-4"><AlertTriangle className="h-8 w-8 text-red-400" /></div>
            <p className="text-sm font-medium text-neutral-700 mb-1">فشل تحميل مناطق الشحن</p>
            <p className="text-sm text-neutral-500 mb-4">حدث خطأ أثناء الاتصال بالخادم.</p>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5" onClick={load}><RotateCcw className="h-4 w-4" />إعادة المحاولة</Button>
          </div>
        )
        : items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-neutral-100 mb-4"><MapPin className="h-8 w-8 text-neutral-400" /></div>
            <p className="text-sm text-neutral-500">{t('shipping.noZones')}</p>
            <p className="text-xs text-neutral-400 mt-1">{t('shipping.noZonesHint')}</p>
            <PermissionGate permission="shipping:manage">
              <Button size="sm" className="h-9 text-sm mt-4" onClick={openCreate}><Plus className="h-4 w-4 me-1.5" />{t('shipping.createZone')}</Button>
            </PermissionGate>
          </div>
        )
        : <Table>
            <TableHeader><TableRow className="border-neutral-100 hover:bg-transparent">
              <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('shipping.zoneName')}</TableHead>
              <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('shipping.zoneCities')}</TableHead>
              <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('shipping.isActive')}</TableHead>
              <TableHead className="w-24 h-10"></TableHead>
            </TableRow></TableHeader>
            <TableBody>{items.map(z => (
              <TableRow key={z.id} className="border-neutral-100 hover:bg-neutral-50">
                <TableCell className="text-sm font-medium text-neutral-900 p-3">{z.name}</TableCell>
                <TableCell className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {(z.cities ?? []).map((city: string) => (
                      <Badge key={city} variant="outline" className="text-xs font-normal">{city}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="p-3"><Badge variant={z.isActive ? 'success' : 'secondary'} className="text-xs">{z.isActive ? t('common.active') : t('common.inactive')}</Badge></TableCell>
                <TableCell className="p-3">
                  <div className="flex gap-1">
                    <PermissionGate permission="shipping:manage"><Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => openEdit(z)} aria-label="تعديل المنطقة"><Edit className="h-4 w-4" /></Button></PermissionGate>
                    <PermissionGate permission="shipping:manage"><Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => toggleActive(z)} aria-label={z.isActive ? 'تعطيل المنطقة' : 'تفعيل المنطقة'}>
                      {z.isActive ? <XCircle className="h-4 w-4 text-neutral-400" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    </Button></PermissionGate>
                  </div>
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>}
      </div>
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl">
          <DialogHeader><DialogTitle className="text-lg font-bold text-neutral-900">{editId ? t('shipping.editZone') : t('shipping.createZone')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label className="text-sm text-neutral-500">{t('shipping.zoneName')} <span className="text-red-500">*</span></Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-9 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-sm text-neutral-500">{t('shipping.zoneCities')} <span className="text-red-500">*</span></Label><Input value={form.cities} onChange={e => setForm({...form, cities: e.target.value})} placeholder={t('shipping.zoneCitiesHint')} className="h-9 text-sm" /></div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100"><Button variant="outline" className="h-9 text-sm" onClick={() => setDialog(false)}>{t('common.cancel')}</Button><Button className="h-9 text-sm" onClick={save} disabled={saving}>{saving ? t('common.loading') : t('common.save')}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RatesTab({ storeId }: { storeId: number }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [methods, setMethods] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ shippingMethodId: '', shippingZoneId: '', baseRate: '', perKgRate: '', freeAboveAmount: '', estimatedDaysMin: '', estimatedDaysMax: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFetchError(false);
    Promise.all([shippingApi.rates.list(storeId), shippingApi.methods.list(storeId), shippingApi.zones.list(storeId)])
      .then(([r, m, z]) => { setItems(r); setMethods(m); setZones(z); })
      .catch(() => { setFetchError(true); toast.error(t('common.error')); })
      .finally(() => setLoading(false));
  }, [storeId, t]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.shippingMethodId || !form.shippingZoneId) { toast.error(t('shipping.err_rate_method_zone')); return; }
    const baseRate = Number(form.baseRate);
    if (isNaN(baseRate) || baseRate < 0) { toast.error(t('shipping.err_rate_negative')); return; }
    setSaving(true);
    try {
      await shippingApi.rates.create(storeId, {
        shippingMethodId: Number(form.shippingMethodId),
        shippingZoneId: Number(form.shippingZoneId),
        baseRate,
        perKgRate: form.perKgRate ? Number(form.perKgRate) : undefined,
        freeAboveAmount: form.freeAboveAmount ? Number(form.freeAboveAmount) : undefined,
        estimatedDaysMin: form.estimatedDaysMin ? Number(form.estimatedDaysMin) : undefined,
        estimatedDaysMax: form.estimatedDaysMax ? Number(form.estimatedDaysMax) : undefined,
      });
      toast.success(t('shipping.created')); setDialog(false); load();
    } catch (err) { toast.error(err instanceof ApiClientError ? err.message : t('common.error')); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-neutral-400">{t('shipping.ratesDesc')}</p>
        <PermissionGate permission="shipping:manage"><Button onClick={() => { setForm({ shippingMethodId: '', shippingZoneId: '', baseRate: '', perKgRate: '', freeAboveAmount: '', estimatedDaysMin: '', estimatedDaysMax: '' }); setDialog(true); }} disabled={!methods.length || !zones.length} className="h-9 text-sm">
          <Plus className="h-4 w-4 mr-2" />{t('shipping.createRate')}
        </Button></PermissionGate>
      </div>
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
        {loading ? <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-2xl" />)}</div>
        : fetchError ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-red-50 mb-4"><AlertTriangle className="h-8 w-8 text-red-400" /></div>
            <p className="text-sm font-medium text-neutral-700 mb-1">فشل تحميل أسعار الشحن</p>
            <p className="text-sm text-neutral-500 mb-4">حدث خطأ أثناء الاتصال بالخادم.</p>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5" onClick={load}><RotateCcw className="h-4 w-4" />إعادة المحاولة</Button>
          </div>
        )
        : items.length === 0 ? <div className="p-12 text-center"><div className="inline-flex p-4 rounded-2xl bg-neutral-100 mb-4"><DollarSign className="h-8 w-8 text-neutral-400" /></div><p className="text-sm text-neutral-500">{t('shipping.noRates')}</p><p className="text-xs text-neutral-400 mt-1">{t('shipping.noRatesHint')}</p></div>
        : <Table>
            <TableHeader><TableRow className="border-neutral-100 hover:bg-transparent">
              <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('shipping.methodName')}</TableHead>
              <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('shipping.zoneName')}</TableHead>
              <TableHead className="h-10 text-sm text-neutral-500 font-medium text-right">{t('shipping.baseRate')}</TableHead>
              <TableHead className="h-10 text-sm text-neutral-500 font-medium text-right">{t('shipping.perKgRate')}</TableHead>
              <TableHead className="h-10 text-sm text-neutral-500 font-medium text-right">{t('shipping.freeAbove')}</TableHead>
              <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('shipping.deliveryDays')}</TableHead>
            </TableRow></TableHeader>
            <TableBody>{items.map((r: any, i: number) => (
              <TableRow key={r.rate?.id ?? i} className="border-neutral-100 hover:bg-neutral-50">
                <TableCell className="text-sm font-medium text-neutral-900 p-3">{r.methodName ?? '-'}</TableCell>
                <TableCell className="text-sm text-neutral-900 p-3">{r.zoneName ?? '-'}</TableCell>
                <TableCell className="text-sm font-semibold text-neutral-900 text-right p-3">{formatCurrency(r.rate?.baseRate ?? 0)} {t('common.sar')}</TableCell>
                <TableCell className="text-sm text-neutral-400 text-right p-3">{r.rate?.perKgRate ? `${formatCurrency(r.rate.perKgRate)} ${t('common.sar')}` : '-'}</TableCell>
                <TableCell className="text-sm text-neutral-400 text-right p-3">{r.rate?.freeAboveAmount ? `${Number(r.rate.freeAboveAmount).toFixed(0)} ${t('common.sar')}` : '-'}</TableCell>
                <TableCell className="text-sm text-neutral-400 p-3">{r.rate?.estimatedDaysMin != null && r.rate?.estimatedDaysMax != null ? `${r.rate.estimatedDaysMin}-${r.rate.estimatedDaysMax} ${t('shipping.days')}` : '-'}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>}
      </div>
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl">
          <DialogHeader><DialogTitle className="text-lg font-bold text-neutral-900">{t('shipping.createRate')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-sm text-neutral-500">{t('shipping.methodName')} <span className="text-red-500">*</span></Label>
                <select className="flex h-9 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500" value={form.shippingMethodId} onChange={e => setForm({...form, shippingMethodId: e.target.value})}>
                  <option value="">{t('shipping.selectMethod')}</option>
                  {methods.filter(m => m.isActive).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5"><Label className="text-sm text-neutral-500">{t('shipping.zoneName')} <span className="text-red-500">*</span></Label>
                <select className="flex h-9 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500" value={form.shippingZoneId} onChange={e => setForm({...form, shippingZoneId: e.target.value})}>
                  <option value="">{t('shipping.selectZone')}</option>
                  {zones.filter(z => z.isActive).map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-sm text-neutral-500">{t('shipping.baseRate')} <span className="text-red-500">*</span></Label><Input type="number" min="0" step="0.01" value={form.baseRate} onChange={e => setForm({...form, baseRate: e.target.value})} className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-sm text-neutral-500">{t('shipping.perKgRate')}</Label><Input type="number" min="0" step="0.01" value={form.perKgRate} onChange={e => setForm({...form, perKgRate: e.target.value})} className="h-9 text-sm" /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5"><Label className="text-sm text-neutral-500">{t('shipping.freeAbove')}</Label><Input type="number" min="0" value={form.freeAboveAmount} onChange={e => setForm({...form, freeAboveAmount: e.target.value})} className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-sm text-neutral-500">{t('shipping.daysMin')}</Label><Input type="number" min="0" value={form.estimatedDaysMin} onChange={e => setForm({...form, estimatedDaysMin: e.target.value})} className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-sm text-neutral-500">{t('shipping.daysMax')}</Label><Input type="number" min="0" value={form.estimatedDaysMax} onChange={e => setForm({...form, estimatedDaysMax: e.target.value})} className="h-9 text-sm" /></div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100"><Button variant="outline" className="h-9 text-sm" onClick={() => setDialog(false)}>{t('common.cancel')}</Button><Button className="h-9 text-sm" onClick={save} disabled={saving}>{saving ? t('common.loading') : t('common.save')}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ShipmentsTab({ storeId }: { storeId: number }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [trackDialog, setTrackDialog] = useState(false);
  const [trackShipmentId, setTrackShipmentId] = useState<number | null>(null);
  const [trackForm, setTrackForm] = useState({ trackingNumber: '', trackingUrl: '', carrierName: '' });
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [noTrackingOnly, setNoTrackingOnly] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setFetchError(false);
    shippingApi.shipments.list(storeId, {
      status: statusFilter || undefined,
      noTracking: noTrackingOnly || undefined,
      city: citySearch || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }).then(setItems).catch(() => { setFetchError(true); toast.error(t('common.error')); }).finally(() => setLoading(false));
  }, [storeId, statusFilter, noTrackingOnly, citySearch, dateFrom, dateTo, t]);

  useEffect(() => { load(); }, [load]);

  const openTracking = (s: any) => {
    setTrackShipmentId(s.id);
    setTrackForm({ trackingNumber: s.trackingNumber ?? '', trackingUrl: s.trackingUrl ?? '', carrierName: s.carrierName ?? '' });
    setTrackDialog(true);
  };

  const saveTracking = async () => {
    if (!trackShipmentId) return;
    if (!trackForm.trackingNumber.trim()) { toast.error(t('shipping.err_tracking_required')); return; }
    if (trackForm.trackingUrl && !/^https?:\/\/.+/.test(trackForm.trackingUrl)) { toast.error(t('shipping.err_tracking_url')); return; }
    setSaving(true);
    try {
      await shippingApi.shipments.updateTracking(storeId, trackShipmentId, trackForm);
      toast.success(t('shipping.trackingUpdated'));
      setTrackDialog(false);
      load();
    } catch (err) { toast.error(err instanceof ApiClientError ? err.message : t('common.error')); } finally { setSaving(false); }
  };

  const handleCitySearch = () => { setCitySearch(cityInput); };
  const handleCityKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleCitySearch(); };

  const resetFilters = () => {
    setStatusFilter(''); setNoTrackingOnly(false); setCitySearch(''); setCityInput(''); setDateFrom(''); setDateTo('');
  };

  const handleCreateLabel = async (s: any) => {
    try {
      await shippingApi.createLabel(storeId, s.id);
      toast.success(t('shipping.labelCreated'));
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('shipping.labelCreateError'));
    }
  };

  const handleCancel = async (s: any) => {
    if (!window.confirm(t('shipping.cancelConfirm'))) return;
    try {
      await shippingApi.cancel(storeId, s.id);
      toast.success(t('shipping.cancelled'));
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('shipping.cancelError'));
    }
  };

  const handleCreateReturn = async (s: any) => {
    const reason = window.prompt(t('shipping.returnReason'));
    if (!reason) return;
    try {
      await shippingApi.createReturn(storeId, s.id, { reason });
      toast.success(t('shipping.returnCreated'));
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('shipping.returnError'));
    }
  };

  const handleViewLabel = async (s: any) => {
    try {
      const label = await shippingApi.getLabel(storeId, s.id);
      if (label?.url) {
        window.open(label.url, '_blank');
      } else if (label?.labelUrl) {
        window.open(label.labelUrl, '_blank');
      } else {
        toast.error(t('shipping.noLabel'));
      }
    } catch {
      toast.error(t('shipping.labelLoadError'));
    }
  };

  const hasActiveFilters = statusFilter || noTrackingOnly || citySearch || dateFrom || dateTo;

  return (
    <>
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6 mb-4">
        <div className="space-y-3">
          <div className="flex gap-3 items-center flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input placeholder={t('shipping.searchCity')} value={cityInput} onChange={e => setCityInput(e.target.value)} onKeyDown={handleCityKeyDown} className="pr-10 h-9 text-sm" />
            </div>
            <Button variant="outline" size="sm" className="h-9 text-sm" onClick={handleCitySearch}>{t('common.search')}</Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-9 text-sm gap-1" onClick={resetFilters}><RotateCcw className="h-4 w-4" />{t('orders.resetFilters')}</Button>
            )}
          </div>
          <div className="flex gap-3 flex-wrap items-center">
            <Select value={statusFilter || undefined} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder={t('shipping.filterStatus')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('orders.all')}</SelectItem>
                <SelectItem value="draft">{t('shipping.status_draft')}</SelectItem>
                <SelectItem value="created">{t('shipping.status_created')}</SelectItem>
                <SelectItem value="in_transit">{t('shipping.status_in_transit')}</SelectItem>
                <SelectItem value="delivered">{t('shipping.status_delivered')}</SelectItem>
                <SelectItem value="failed">{t('shipping.status_failed')}</SelectItem>
                <SelectItem value="cancelled">{t('shipping.status_cancelled')}</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm cursor-pointer text-neutral-900">
              <input type="checkbox" checked={noTrackingOnly} onChange={e => setNoTrackingOnly(e.target.checked)} className="rounded border-neutral-300 h-4 w-4" />
              {t('shipping.noTrackingOnly')}
            </label>
            <div className="flex items-center gap-2">
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 h-9 text-sm" />
              <span className="text-neutral-400 text-sm">—</span>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 h-9 text-sm" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
        {loading ? <div className="p-6 space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full rounded-2xl" />)}</div>
        : fetchError ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-red-50 mb-4"><AlertTriangle className="h-8 w-8 text-red-400" /></div>
            <p className="text-sm font-medium text-neutral-700 mb-1">فشل تحميل الشحنات</p>
            <p className="text-sm text-neutral-500 mb-4">حدث خطأ أثناء الاتصال بالخادم.</p>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5" onClick={load}><RotateCcw className="h-4 w-4" />إعادة المحاولة</Button>
          </div>
        )
        : items.length === 0 ? <div className="p-12 text-center"><div className="inline-flex p-4 rounded-2xl bg-neutral-100 mb-4"><Truck className="h-8 w-8 text-neutral-400" /></div><p className="text-sm text-neutral-500">{hasActiveFilters ? t('shipping.noMatch') : t('shipping.noShipments')}</p>{hasActiveFilters && <Button variant="outline" size="sm" className="h-8 text-sm mt-4" onClick={resetFilters}>{t('orders.resetFilters')}</Button>}</div>
        : <Table>
            <TableHeader><TableRow className="border-neutral-100 hover:bg-transparent">
              <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('orders.orderNumber')}</TableHead>
              <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('orders.city')}</TableHead>
              <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('shipping.shipmentStatus')}</TableHead>
              <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('shipping.carrier')}</TableHead>
              <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('shipping.trackingNumber')}</TableHead>
              <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('orders.date')}</TableHead>
              <TableHead className="w-72 h-10"></TableHead>
            </TableRow></TableHeader>
            <TableBody>{items.map((s: any) => {
              const addr = s.address as any;
              return (
                <TableRow key={s.id} className="border-neutral-100 hover:bg-neutral-50">
                  <TableCell className="font-mono text-sm font-semibold text-neutral-900 p-3">ORD-{s.orderId}</TableCell>
                  <TableCell className="text-sm text-neutral-400 p-3">{addr?.city ?? '-'}</TableCell>
                  <TableCell className="p-3">
                    <Badge variant={shipmentStatusColors[s.status] ?? 'default'} className="gap-1 text-xs px-2.5 py-0.5">
                      {shipmentStatusIcons[s.status]}
                      {t(`shipping.status_${s.status}` as any)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-neutral-400 p-3">{s.carrierName ?? '-'}</TableCell>
                  <TableCell className="p-3">
                    {s.trackingNumber ? (
                      <span dir="ltr" className="font-mono text-sm">{s.trackingNumber}</span>
                    ) : (
                      <Badge variant="outline" className="text-xs text-amber-600">{t('shipping.noTracking')}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-neutral-400 whitespace-nowrap p-3">{new Date(s.createdAt).toLocaleDateString('ar-SA')}</TableCell>
                  <TableCell className="p-3">
                    <div className="flex gap-1">
                      {(s.status === 'draft' || s.status === 'label_created') && (
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleCreateLabel(s)}>
                          <FileText className="h-3 w-3 mr-1" />{t('shipping.createLabel')}
                        </Button>
                      )}
                      {s.labelUrl && (
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleViewLabel(s)}>
                          <FileText className="h-3 w-3 mr-1" />{t('shipping.viewLabel')}
                        </Button>
                      )}
                      {s.status !== 'delivered' && s.status !== 'cancelled' && s.status !== 'returned' && s.status !== 'delivery_failed' && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={() => handleCancel(s)}>
                          <XCircle className="h-3 w-3 mr-1" />{t('shipping.cancelShipment')}
                        </Button>
                      )}
                      {s.status === 'delivered' && (
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleCreateReturn(s)}>
                          <Undo2 className="h-3 w-3 mr-1" />{t('shipping.return')}
                        </Button>
                      )}
                      <PermissionGate permission="shipping:manage"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openTracking(s)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button></PermissionGate>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}</TableBody>
          </Table>}
      </div>

      <Dialog open={trackDialog} onOpenChange={setTrackDialog}>
        <DialogContent className="bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl">
          <DialogHeader><DialogTitle className="text-lg font-bold text-neutral-900">{t('shipping.trackingUpdate')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label className="text-sm text-neutral-500">{t('shipping.trackingNumber')} <span className="text-red-500">*</span></Label><Input value={trackForm.trackingNumber} onChange={e => setTrackForm({...trackForm, trackingNumber: e.target.value})} dir="ltr" className="text-left h-9 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-sm text-neutral-500">{t('shipping.carrier')}</Label><Input value={trackForm.carrierName} onChange={e => setTrackForm({...trackForm, carrierName: e.target.value})} className="h-9 text-sm" /></div>
            <div className="space-y-1.5">
              <Label className="text-sm text-neutral-500">{t('shipping.trackingUrl')}</Label>
              <Input value={trackForm.trackingUrl} onChange={e => setTrackForm({...trackForm, trackingUrl: e.target.value})} dir="ltr" className="text-left h-9 text-sm" placeholder="https://" />
              {trackForm.trackingUrl && !/^https?:\/\/.+/.test(trackForm.trackingUrl) && <p className="text-xs text-red-500">{t('shipping.err_tracking_url')}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100"><Button variant="outline" className="h-9 text-sm" onClick={() => setTrackDialog(false)}>{t('common.cancel')}</Button><Button className="h-9 text-sm" onClick={saveTracking} disabled={saving}>{saving ? t('common.loading') : t('common.save')}</Button></div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ShippingStatusSection({ storeId, onTabChange }: { storeId: number; onTabChange: (tab: string) => void }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) { setLoading(false); return; }
    shippingApi.status(storeId)
      .then(setStatus)
      .catch(() => toast.error(t('common.error', 'فشل تحميل حالة الشحن')))
      .finally(() => setLoading(false));
  }, [storeId]);

  if (loading) return <div className="grid gap-4 md:grid-cols-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}</div>;
  if (!status) return null;

  const { activeProvider, activeMode } = status;
  const isMock = activeMode === 'mock' || activeProvider === 'haa_mock';
  const isManual = activeMode === 'manual' || activeProvider === 'manual';

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-sm text-neutral-900">{t('shipping.haaShipping')}</p>
          {isMock ? (
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">{t('shipping.mockStatus')}</Badge>
          ) : isManual ? (
            <Badge variant="outline" className="text-xs">{t('shipping.manualStatus')}</Badge>
          ) : (
            <Badge variant="outline" className="text-xs">{activeMode}</Badge>
          )}
        </div>
        <p className="text-sm text-neutral-400">
          {isMock ? t('shipping.mockDesc') : isManual ? t('shipping.manualDesc') : t('shipping.providerDesc', { provider: activeProvider })}
        </p>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-5 opacity-70">
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-sm text-neutral-900">{t('shipping.connectCarrier')}</p>
          <Badge variant="outline" className="text-xs">{t('shipping.comingSoon')}</Badge>
        </div>
        <p className="text-sm text-neutral-400">{t('shipping.connectCarrierDesc')}</p>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-5 cursor-pointer hover:border-neutral-300 transition-colors" onClick={() => onTabChange('methods')}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-sm text-neutral-900">{t('shipping.localDelivery')}</p>
          <Truck className="h-5 w-5 text-neutral-400" />
        </div>
        <p className="text-sm text-neutral-400">{t('shipping.localDeliveryDesc')}</p>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-5 cursor-pointer hover:border-neutral-300 transition-colors" onClick={() => onTabChange('rates')}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-sm text-neutral-900">{t('shipping.pickup')}</p>
          <MapPin className="h-5 w-5 text-neutral-400" />
        </div>
        <p className="text-sm text-neutral-400">{t('shipping.pickupDesc')}</p>
      </div>
    </div>
  );
}

export default function Shipping() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [activeTab, setActiveTab] = useState('methods');

  if (!storeId) return null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-neutral-900">{t('shipping.title')}</h1>

      <ShippingStatusSection storeId={storeId} onTabChange={setActiveTab} />

      <div className="bg-primary-50/50 border border-primary-200/50 rounded-3xl p-5">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary-500 mt-0.5 shrink-0" />
          <div className="text-sm text-primary-800 space-y-1">
            <p className="font-bold">{t('shipping.explanationTitle')}</p>
            <ul className="list-disc list-inside space-y-0.5 text-sm">
              <li>{t('shipping.expManual')}</li>
              <li>{t('shipping.expZones')}</li>
              <li>{t('shipping.expTracking')}</li>
              <li>{t('shipping.expRealCarrier')}</li>
            </ul>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="methods">{t('shipping.methods')}</TabsTrigger>
          <TabsTrigger value="zones">{t('shipping.zones')}</TabsTrigger>
          <TabsTrigger value="rates">{t('shipping.rates')}</TabsTrigger>
          <TabsTrigger value="shipments">{t('shipping.shipments')}</TabsTrigger>
        </TabsList>
        <TabsContent value="methods"><MethodsTab storeId={storeId} /></TabsContent>
        <TabsContent value="zones"><ZonesTab storeId={storeId} /></TabsContent>
        <TabsContent value="rates"><RatesTab storeId={storeId} /></TabsContent>
        <TabsContent value="shipments"><ShipmentsTab storeId={storeId} /></TabsContent>
      </Tabs>
    </div>
  );
}
