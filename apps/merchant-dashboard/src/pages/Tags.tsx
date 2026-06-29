/* eslint-disable @typescript-eslint/no-explicit-any -- legacy `any` typing on drag-and-drop list rows/props and form state; pre-existing, not introduced by the TanStack Query migration. */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/queryClient';
import { tagsApi, ApiClientError } from '@/lib/api';
import { PermissionGate } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Tag, AlertTriangle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableRow({ tag, onEdit, onDelete }: { tag: any; onEdit: (t: any) => void; onDelete: (t: any) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tag.id });
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
          <div className="h-6 w-6 rounded-md" style={{ backgroundColor: tag.color }} />
          {tag.name}
        </div>
      </TableCell>
      <TableCell className="text-sm text-neutral-400 p-3">{tag.slug}</TableCell>
      <TableCell className="p-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-500">
          <span className="h-3 w-6 rounded" style={{ backgroundColor: tag.color }} />
          {tag.color}
        </span>
      </TableCell>
      <TableCell className="p-3">
        <div className="flex items-center gap-1">
          <PermissionGate permission="tags:manage">
            <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => onEdit(tag)} aria-label="تعديل التاج">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </PermissionGate>
          <PermissionGate permission="tags:manage">
            <Button variant="ghost" size="icon" className="h-11 w-11 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => onDelete(tag)} aria-label="حذف التاج">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </PermissionGate>
        </div>
      </TableCell>
    </TableRow>
  );
}

const TAG_COLORS = ['#6366f1', '#ef4444', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#a855f7', '#f97316', '#84cc16'];

export default function Tags() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const queryClient = useQueryClient();
  const [tags, setTags] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', color: '#6366f1', sortOrder: 0 });
  const [nameError, setNameError] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const tagsQuery = useQuery({
    queryKey: queryKeys.tags(storeId),
    queryFn: () => tagsApi.list(storeId as number),
    enabled: !!storeId,
  });
  const loading = tagsQuery.isLoading;
  const fetchError = tagsQuery.isError;
  const invalidateTags = () => queryClient.invalidateQueries({ queryKey: queryKeys.tags(storeId) });

  // Seed the local sortable array from query data; drag-end mutates it locally
  // for instant feedback before persisting the new order to the server.
  useEffect(() => { if (tagsQuery.data) setTags(tagsQuery.data as any[]); }, [tagsQuery.data]);

  useEffect(() => { if (tagsQuery.isError) toast.error(t('common.error')); }, [tagsQuery.isError, t]);

  const openCreate = () => {
    setEditId(null);
    setForm({ name: '', slug: '', color: TAG_COLORS[tags.length % TAG_COLORS.length], sortOrder: 0 });
    setDialogOpen(true);
  };

  const openEdit = (tag: any) => {
    setEditId(tag.id);
    setForm({ name: tag.name ?? '', slug: tag.slug ?? '', color: tag.color ?? '#6366f1', sortOrder: tag.sortOrder ?? 0 });
    setDialogOpen(true);
  };

  const openDelete = (tag: any) => {
    setDeleteTarget(tag);
    setDeleteDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (data: { name: string; slug: string; color: string; sortOrder: number }) =>
      editId ? tagsApi.update(storeId as number, editId, data) : tagsApi.create(storeId as number, data),
    onSuccess: () => {
      toast.success(editId ? 'تم تحديث التاج بنجاح' : 'تم إنشاء التاج بنجاح');
      setDialogOpen(false);
      invalidateTags();
    },
    onError: (err) => toast.error(err instanceof ApiClientError ? err.message : t('common.error')),
  });
  const saving = saveMutation.isPending;

  const save = () => {
    if (!storeId) return;
    if (!form.name.trim()) { setNameError('اسم التاج مطلوب'); return; }
    setNameError('');
    saveMutation.mutate(form);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => tagsApi.delete(storeId as number, id),
    onSuccess: () => {
      toast.success('تم حذف التاج بنجاح');
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      invalidateTags();
    },
    onError: (err) => toast.error(err instanceof ApiClientError ? err.message : t('common.error')),
  });
  const deleting = deleteMutation.isPending;

  const confirmDelete = () => {
    if (!storeId || !deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
  };

  const reorderMutation = useMutation({
    mutationFn: (items: { id: number; sortOrder: number }[]) => tagsApi.reorder(storeId as number, items),
    // Re-sync with the server's persisted order on success.
    onSuccess: () => { invalidateTags(); },
    // Revert the optimistic local order by re-fetching the server state.
    onError: () => { toast.error(t('common.error')); invalidateTags(); },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tags.findIndex(t => t.id === active.id);
    const newIndex = tags.findIndex(t => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...tags];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    setTags(reordered);
    const items = reordered.map((t, i) => ({ id: t.id, sortOrder: i }));
    reorderMutation.mutate(items);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">التاجات</h1>
        <PermissionGate permission="tags:manage">
          <Button onClick={openCreate} className="h-9 text-sm px-4"><Plus className="h-4 w-4 me-2" />إضافة تاج</Button>
        </PermissionGate>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-2xl" />)}</div>
        ) : fetchError ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-red-50 mb-4"><AlertTriangle className="h-8 w-8 text-red-400" /></div>
            <p className="text-sm font-medium text-neutral-700 mb-1">فشل تحميل التاجات</p>
            <p className="text-sm text-neutral-500 mb-4">حدث خطأ أثناء الاتصال بالخادم.</p>
            <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5" onClick={() => tagsQuery.refetch()}>
              <RotateCcw className="h-4 w-4" /> إعادة المحاولة
            </Button>
          </div>
        ) : tags.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-neutral-100 mb-4">
              <Tag className="h-8 w-8 text-neutral-400" />
            </div>
            <p className="text-sm font-medium text-neutral-700 mb-1">لا توجد تاجات بعد</p>
            <p className="text-sm text-neutral-500 mb-4">أضف أول تاج لتصنيف المنتجات.</p>
            <PermissionGate permission="tags:manage">
              <Button size="sm" className="h-9 text-sm" onClick={openCreate}><Plus className="h-4 w-4 me-1.5" />إضافة تاج</Button>
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
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium">اللون</TableHead>
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext items={tags.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  {tags.map(tag => (
                    <SortableRow key={tag.id} tag={tag} onEdit={openEdit} onDelete={openDelete} />
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </DndContext>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl max-w-md">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg font-bold text-neutral-900">{editId ? 'تعديل التاج' : 'إضافة تاج'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm text-neutral-500">الاسم <span className="text-red-500">*</span></Label>
                <Input value={form.name} onChange={(e) => { setNameError(''); setForm({ ...form, name: e.target.value, slug: editId ? form.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }); }} className={`h-9 text-sm ${nameError ? 'border-red-400' : ''}`} placeholder="مثال: جديد" />
                {nameError && <p className="text-xs text-red-500">{nameError}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-neutral-500">الرابط المختصر</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-neutral-500">اللون</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-9 w-12 rounded-lg border border-neutral-200 cursor-pointer" aria-label="لون التاج" />
                <div className="flex gap-1.5 flex-wrap">
                  {TAG_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setForm({ ...form, color: c })}
                      className={`h-7 w-7 rounded-full border-2 transition-all ${form.color === c ? 'border-neutral-900 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                      aria-label={`لون ${c}`}
                      title={c}
                    />
                  ))}
                </div>
              </div>
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
          <p className="text-sm text-neutral-600">هل أنت متأكد من حذف التاج <strong>{deleteTarget?.name}</strong>؟</p>
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
