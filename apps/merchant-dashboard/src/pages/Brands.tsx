import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { brandsApi, uploadFile, ApiClientError } from '@/lib/api';
import { handleImageError } from '@/lib/utils';
import { PermissionGate } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Building2, AlertTriangle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableRow({ brand, onEdit, onDelete }: { brand: any; onEdit: (b: any) => void; onDelete: (b: any) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: brand.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <TableRow ref={setNodeRef} style={style} className="border-neutral-100 hover:bg-neutral-50 transition-colors">
      <TableCell className="p-3">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-neutral-300 hover:text-neutral-500" aria-label="إعادة الترتيب">
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor"><path d="M5 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm6 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM5 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm6 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM5 11a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm6 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/></svg>
        </button>
      </TableCell>
      <TableCell className="text-sm font-medium text-neutral-900 p-3">
        <div className="flex items-center gap-2">
          {brand.logo ? (
            <img src={brand.logo} alt={brand.name} className="h-8 w-8 rounded-lg object-cover bg-neutral-100" loading="lazy" onError={handleImageError} />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-400 text-xs font-bold">{brand.name.charAt(0)}</div>
          )}
          {brand.name}
        </div>
      </TableCell>
      <TableCell className="text-sm text-neutral-400 p-3">{brand.slug}</TableCell>
      <TableCell className="p-3"><Badge variant={brand.isActive ? 'success' : 'secondary'} className="text-xs px-2.5 py-0.5">{brand.isActive ? 'نشط' : 'غير نشط'}</Badge></TableCell>
      <TableCell className="p-3">
        <div className="flex items-center gap-1">
          <PermissionGate permission="brands:manage">
            <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => onEdit(brand)} aria-label="تعديل الماركة">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </PermissionGate>
          <PermissionGate permission="brands:manage">
            <Button variant="ghost" size="icon" className="h-11 w-11 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => onDelete(brand)} aria-label="حذف الماركة">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </PermissionGate>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function Brands() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', logo: '', description: '', website: '', sortOrder: 0, isActive: true });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const load = useCallback(() => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setFetchError(false);
    brandsApi.list(storeId).then(data => { setBrands(data); }).catch(() => { setFetchError(true); toast.error(t('common.error')); }).finally(() => setLoading(false));
  }, [storeId, t]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditId(null);
    setForm({ name: '', slug: '', logo: '', description: '', website: '', sortOrder: 0, isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (brand: any) => {
    setEditId(brand.id);
    setForm({
      name: brand.name ?? '', slug: brand.slug ?? '', logo: brand.logo ?? '',
      description: brand.description ?? '', website: brand.website ?? '',
      sortOrder: brand.sortOrder ?? 0, isActive: brand.isActive ?? true,
    });
    setDialogOpen(true);
  };

  const openDelete = (brand: any) => {
    setDeleteTarget(brand);
    setDeleteDialogOpen(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'اسم الماركة مطلوب';
    if (!form.slug.trim()) errs.slug = 'الرابط المختصر مطلوب';
    return errs;
  };

  const save = async () => {
    if (!storeId) return;
    const errs = validate();
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    try {
      if (editId) {
        await brandsApi.update(storeId, editId, form);
        toast.success('تم تحديث الماركة بنجاح');
      } else {
        await brandsApi.create(storeId, form);
        toast.success('تم إنشاء الماركة بنجاح');
      }
      setDialogOpen(false);
      load();
    } catch (err) { toast.error(err instanceof ApiClientError ? err.message : t('common.error')); } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!storeId || !deleteTarget) return;
    setDeleting(true);
    try {
      await brandsApi.delete(storeId, deleteTarget.id);
      toast.success('تم حذف الماركة بنجاح');
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      load();
    } catch (err) { toast.error(err instanceof ApiClientError ? err.message : t('common.error')); } finally { setDeleting(false); }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = brands.findIndex(b => b.id === active.id);
    const newIndex = brands.findIndex(b => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...brands];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    setBrands(reordered);
    const items = reordered.map((b, i) => ({ id: b.id, sortOrder: i }));
    try { await brandsApi.reorder(storeId!, items); } catch { load(); }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">الماركات</h1>
        <PermissionGate permission="brands:manage">
          <Button onClick={openCreate} className="h-9 text-sm px-4"><Plus className="h-4 w-4 me-2" />إضافة ماركة</Button>
        </PermissionGate>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-2xl" />)}</div>
        ) : fetchError ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-red-50 mb-4"><AlertTriangle className="h-8 w-8 text-red-400" /></div>
            <p className="text-sm font-medium text-neutral-700 mb-1">فشل تحميل الماركات</p>
            <p className="text-sm text-neutral-500 mb-4">حدث خطأ أثناء الاتصال بالخادم.</p>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5" onClick={load}>
              <RotateCcw className="h-4 w-4" /> إعادة المحاولة
            </Button>
          </div>
        ) : brands.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-neutral-100 mb-4">
              <Building2 className="h-8 w-8 text-neutral-400" />
            </div>
            <p className="text-sm font-medium text-neutral-700 mb-1">لا توجد ماركات بعد</p>
            <p className="text-sm text-neutral-500 mb-4">أضف أول ماركة لتظهر هنا.</p>
            <PermissionGate permission="brands:manage">
              <Button size="sm" className="h-9 text-sm" onClick={openCreate}><Plus className="h-4 w-4 me-1.5" />إضافة ماركة</Button>
            </PermissionGate>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <Table>
              <TableHeader>
                <TableRow className="border-neutral-100 hover:bg-transparent">
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium w-10"></TableHead>
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium">الاسم</TableHead>
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium">الرابط المختصر</TableHead>
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium">الحالة</TableHead>
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext items={brands.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  {brands.map(brand => (
                    <SortableRow key={brand.id} brand={brand} onEdit={openEdit} onDelete={openDelete} />
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </DndContext>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl max-w-lg">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg font-bold text-neutral-900">{editId ? 'تعديل الماركة' : 'إضافة ماركة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm text-neutral-500">الاسم <span className="text-red-500">*</span></Label>
                <Input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value, slug: editId ? form.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }); setFormErrors(p => ({ ...p, name: '' })); }} className={`h-9 text-sm ${formErrors.name ? 'border-red-400' : ''}`} placeholder="مثال: Apple" />
                {formErrors.name && <p className="text-xs text-red-500">{formErrors.name}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-neutral-500">الرابط المختصر <span className="text-red-500">*</span></Label>
                <Input value={form.slug} onChange={(e) => { setForm({ ...form, slug: e.target.value }); setFormErrors(p => ({ ...p, slug: '' })); }} className={`h-9 text-sm ${formErrors.slug ? 'border-red-400' : ''}`} placeholder="apple" />
                {formErrors.slug && <p className="text-xs text-red-500">{formErrors.slug}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-neutral-500">الشعار</Label>
              <div className="flex items-center gap-3">
                {form.logo && (
                  <img src={form.logo} alt="Preview" className="h-12 w-12 rounded-lg object-cover bg-neutral-100 border border-neutral-200" onError={handleImageError} />
                )}
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-600 cursor-pointer hover:bg-neutral-50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file && storeId) {
                        try {
                          const result = await uploadFile(storeId, file);
                          setForm({ ...form, logo: result.url });
                          toast.success('تم رفع الشعار بنجاح');
                        } catch { toast.error('فشل رفع الشعار'); }
                      }
                    }}
                  />
                  اختر صورة
                </label>
                {form.logo && (
                  <button onClick={() => setForm({ ...form, logo: '' })} className="text-xs text-red-500 hover:text-red-600">
                    إزالة
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-neutral-500">الوصف</Label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="flex h-20 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-neutral-500">الموقع الإلكتروني</Label>
              <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="h-9 text-sm" placeholder="https://example.com" />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm text-neutral-500">الحالة</Label>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm text-neutral-600">{form.isActive ? 'نشط' : 'غير نشط'}</span>
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" aria-label="الحالة" />
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <Button variant="outline" className="h-9 text-sm" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button className="h-9 text-sm px-4" onClick={save} disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl max-w-sm">
          <DialogHeader><DialogTitle className="text-lg font-bold text-neutral-900">تأكيد الحذف</DialogTitle></DialogHeader>
          <p className="text-sm text-neutral-600">هل أنت متأكد من حذف الماركة <strong>{deleteTarget?.name}</strong>؟</p>
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <Button variant="outline" className="h-9 text-sm" onClick={() => { setDeleteDialogOpen(false); setDeleteTarget(null); }}>إلغاء</Button>
            <Button variant="destructive" className="h-9 text-sm px-4" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'جاري الحذف...' : 'حذف'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
