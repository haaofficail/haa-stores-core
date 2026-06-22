import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { categoriesApi, uploadFile, ApiClientError } from '@/lib/api';
import { handleImageError } from '@/lib/utils';
import { PermissionGate } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Tags, ChevronDown, ChevronLeft, GripVertical, Trash2, Pencil, AlertTriangle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ category, depth, onEdit, onDelete, children }: {
  category: any; depth: number; onEdit: (c: any) => void; onDelete: (c: any) => void; children: any[];
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    paddingRight: `${depth * 24}px`,
  };

  const hasChildren = children.length > 0;

  return (
    <div ref={setNodeRef} style={style} className="border-b border-neutral-100 last:border-b-0">
      <div className="flex items-center gap-2 px-4 py-3 hover:bg-neutral-50 group transition-colors">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-neutral-300 hover:text-neutral-500 shrink-0" aria-label="إعادة الترتيب">
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {[1, 2, 3, 4, 5].map((i) => i <= depth && <div key={i} className="w-5 shrink-0" />)}
          {hasChildren ? (
            <ChevronDown className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5 text-transparent shrink-0" />
          )}
          <span className="text-sm font-medium text-neutral-900 truncate">{category.name}</span>
          <Badge variant={category.isActive ? 'success' : 'secondary'} className="text-xs px-2 py-0.5 shrink-0">
            {category.isActive ? t('categories.active') : t('categories.inactive')}
          </Badge>
          {category.showInHome && (
            <Badge variant="outline" className="text-xs px-2 py-0.5 shrink-0 text-primary-600 border-primary-200 bg-primary-50">
              الرئيسية
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <PermissionGate permission="categories:manage">
            <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => onEdit(category)} aria-label="تعديل التصنيف">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </PermissionGate>
          <PermissionGate permission="categories:manage">
            <Button variant="ghost" size="icon" className="h-11 w-11 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => onDelete(category)} aria-label="حذف التصنيف">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </PermissionGate>
        </div>
      </div>
    </div>
  );
}

function TreeView({ nodes, depth = 0, onEdit, onDelete }: {
  nodes: any[]; depth?: number; onEdit: (c: any) => void; onDelete: (c: any) => void;
}) {
  const ids = useMemo(() => nodes.map(n => n.id), [nodes]);

  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      {nodes.map(node => (
        <div key={node.id}>
          <SortableItem category={node} depth={depth} onEdit={onEdit} onDelete={onDelete} children={node.children || []} />
          {node.children?.length > 0 && (
            <TreeView nodes={node.children} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} />
          )}
        </div>
      ))}
    </SortableContext>
  );
}

export default function Categories() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [tree, setTree] = useState<any[]>([]);
  const [flatList, setFlatList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: '', slug: '', description: '', imageUrl: '', parentId: null as number | null,
    sortOrder: 0, isActive: true, showInHome: false, showInMenu: true,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const load = useCallback(() => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setFetchError(false);
    Promise.all([
      categoriesApi.getTree(storeId),
      categoriesApi.list(storeId),
    ]).then(([treeData, flatData]) => {
      setTree(treeData);
      setFlatList(flatData);
    }).catch(() => { setFetchError(true); toast.error(t('common.error')); }).finally(() => setLoading(false));
  }, [storeId, t]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditId(null);
    setForm({ name: '', slug: '', description: '', imageUrl: '', parentId: null, sortOrder: 0, isActive: true, showInHome: false, showInMenu: true });
    setDialogOpen(true);
  };

  const openEdit = (cat: any) => {
    setEditId(cat.id);
    setForm({
      name: cat.name ?? '',
      slug: cat.slug ?? '',
      description: cat.description ?? '',
      imageUrl: cat.imageUrl ?? '',
      parentId: cat.parentId ?? null,
      sortOrder: cat.sortOrder ?? 0,
      isActive: cat.isActive ?? true,
      showInHome: cat.showInHome ?? false,
      showInMenu: cat.showInMenu ?? true,
    });
    setDialogOpen(true);
  };

  const openDelete = (cat: any) => {
    setDeleteTarget(cat);
    setDeleteDialogOpen(true);
  };

  const save = async () => {
    if (!storeId) return;
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = t('categories.nameRequired', 'اسم التصنيف مطلوب');
    if (!form.slug.trim()) errs.slug = 'الرابط المختصر مطلوب';
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    try {
      if (editId) {
        await categoriesApi.update(storeId, editId, form);
        toast.success(t('categories.updated'));
      } else {
        await categoriesApi.create(storeId, form);
        toast.success(t('categories.created'));
      }
      setDialogOpen(false);
      load();
    } catch (err) { toast.error(err instanceof ApiClientError ? err.message : t('common.error')); } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!storeId || !deleteTarget) return;
    setDeleting(true);
    try {
      await categoriesApi.delete(storeId, deleteTarget.id);
      toast.success(t('categories.deleted'));
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      toast.error(err.message || t('common.error'));
    } finally { setDeleting(false); }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = flatList.findIndex(c => c.id === active.id);
    const newIndex = flatList.findIndex(c => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...flatList];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    const currentParentId = moved.parentId;
    const surroundingItems = reordered.filter(c => c.parentId === currentParentId);
    const updateItems: { id: number; parentId: number | null; sortOrder: number }[] = [];
    surroundingItems.forEach((item, i) => {
      updateItems.push({ id: item.id, parentId: currentParentId, sortOrder: i });
    });

    if (updateItems.length === 0) return;
    if (!storeId) return;
    try {
      await categoriesApi.reorder(storeId, updateItems);
      load();
    } catch (err) { toast.error(err instanceof ApiClientError ? err.message : t('common.error')); }
  };

  const parentOptions = useMemo(() => {
    if (!editId) return flatList;
    const excludeIds = new Set<number>();
    const collectChildren = (cat: any) => {
      excludeIds.add(cat.id);
      flatList.filter((c: any) => c.parentId === cat.id).forEach(collectChildren);
    };
    const self = flatList.find(c => c.id === editId);
    if (self) collectChildren(self);
    return flatList.filter(c => !excludeIds.has(c.id));
  }, [flatList, editId]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{t('categories.title')}</h1>
        <PermissionGate permission="categories:manage">
          <Button onClick={openCreate} className="h-9 text-sm px-4"><Plus className="h-4 w-4 me-2" />{t('categories.create')}</Button>
        </PermissionGate>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full rounded-2xl" />)}</div>
        ) : fetchError ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-red-50 mb-4"><AlertTriangle className="h-8 w-8 text-red-400" /></div>
            <p className="text-sm font-medium text-neutral-700 mb-1">فشل تحميل التصنيفات</p>
            <p className="text-sm text-neutral-500 mb-4">حدث خطأ أثناء الاتصال بالخادم.</p>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5" onClick={load}>
              <RotateCcw className="h-4 w-4" /> إعادة المحاولة
            </Button>
          </div>
        ) : tree.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-neutral-100 mb-4">
              <Tags className="h-8 w-8 text-neutral-400" />
            </div>
            <p className="text-sm font-medium text-neutral-700 mb-1">{t('categories.noCategories', 'لا توجد تصنيفات بعد')}</p>
            <p className="text-sm text-neutral-500 mb-4">أضف أول تصنيف لتنظيم منتجاتك.</p>
            <PermissionGate permission="categories:manage">
              <Button size="sm" className="h-9 text-sm" onClick={openCreate}><Plus className="h-4 w-4 me-1.5" />{t('categories.create', 'إضافة تصنيف')}</Button>
            </PermissionGate>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <TreeView nodes={tree} onEdit={openEdit} onDelete={openDelete} />
          </DndContext>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl max-w-lg">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg font-bold text-neutral-900">{editId ? t('categories.edit') : t('categories.create')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm text-neutral-500">{t('categories.name')} <span className="text-red-500">*</span></Label>
                <Input value={form.name} onChange={(e) => { setFormErrors(p => ({ ...p, name: '' })); setForm({ ...form, name: e.target.value, slug: editId ? form.slug : e.target.value.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, '-').replace(/^-|-$/g, '') }); }} className={`h-9 text-sm ${formErrors.name ? 'border-red-400' : ''}`} placeholder="\u0645\u062B\u0627\u0644: \u0645\u0644\u0627\u0628\u0633" />
                {formErrors.name && <p className="text-xs text-red-500">{formErrors.name}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-neutral-500">{t('categories.slug')} <span className="text-red-500">*</span></Label>
                <Input value={form.slug} onChange={(e) => { setFormErrors(p => ({ ...p, slug: '' })); setForm({ ...form, slug: e.target.value }); }} className={`h-9 text-sm ${formErrors.slug ? 'border-red-400' : ''}`} placeholder="malabis" />
                {formErrors.slug && <p className="text-xs text-red-500">{formErrors.slug}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-neutral-500">{t('categories.parent')}</Label>
              <select
                value={form.parentId ?? ''}
                onChange={(e) => setForm({ ...form, parentId: e.target.value ? Number(e.target.value) : null })}
                className="flex h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">{t('categories.none')}</option>
                {parentOptions.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-neutral-500">{t('categories.description')}</Label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="flex h-20 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-neutral-500">{t('categories.imageUrl')}</Label>
              <div className="flex items-center gap-3">
                {form.imageUrl && (
                  <img src={form.imageUrl} alt="Preview" className="h-12 w-12 rounded-lg object-cover bg-neutral-100 border border-neutral-200" onError={handleImageError} />
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
                          setForm({ ...form, imageUrl: result.url });
                          toast.success('تم رفع الصورة بنجاح');
                        } catch { toast.error('فشل رفع الصورة'); }
                      }
                    }}
                  />
                  اختر صورة
                </label>
                {form.imageUrl && (
                  <button onClick={() => setForm({ ...form, imageUrl: '' })} className="text-xs text-red-500 hover:text-red-600">
                    إزالة
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm text-neutral-500">{t('categories.status')}</Label>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm text-neutral-600">{form.isActive ? t('categories.active') : t('categories.inactive')}</span>
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" aria-label="الحالة" />
              </label>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm text-neutral-500">عرض في الرئيسية</Label>
              <input type="checkbox" checked={form.showInHome} onChange={(e) => setForm({ ...form, showInHome: e.target.checked })} className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" aria-label="عرض في الرئيسية" />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm text-neutral-500">عرض في القائمة</Label>
              <input type="checkbox" checked={form.showInMenu} onChange={(e) => setForm({ ...form, showInMenu: e.target.checked })} className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" aria-label="عرض في القائمة" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <Button variant="outline" className="h-9 text-sm" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button className="h-9 text-sm px-4" onClick={save} disabled={saving}>{saving ? t('common.loading') : t('common.save')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl max-w-sm">
          <DialogHeader><DialogTitle className="text-lg font-bold text-neutral-900">تأكيد الحذف</DialogTitle></DialogHeader>
          <p className="text-sm text-neutral-600">
            هل أنت متأكد من حذف التصنيف <strong>{deleteTarget?.name}</strong>؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
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
