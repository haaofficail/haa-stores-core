// Settings → Size guides tab.
//
// Extracted from Settings.tsx on 2026-06-25 (W4 slice 3 — split Settings
// into lazy-loaded tabs). State + handlers owned by SettingsPage and
// passed in as props; the parse/serialize/reset/save helpers were
// moved here because they only touch sizeGuide* state which is now
// hoisted into props.

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Icon } from '@/components/ui/icon';
import { settingsApi } from '@/lib/api';
import { PermissionGate } from '@/lib/permissions';
import { toast } from 'sonner';

type SizeGuide = {
  id: number;
  name: string;
  type: string;
  unit: string;
  rows?: Array<Record<string, string>>;
  categoryIds?: number[];
  productIds?: number[];
  isActive: boolean;
};

type SizeGuideForm = {
  name: string;
  type: string;
  unit: string;
  rowsText: string;
  categoryIds: number[];
  productIdsText: string;
  isActive: boolean;
};

interface SizesTabProps {
  sizeGuides: SizeGuide[];
  setSizeGuides: React.Dispatch<React.SetStateAction<SizeGuide[]>>;
  sizeGuidesLoading: boolean;
  sizeGuideSaving: boolean;
  setSizeGuideSaving: React.Dispatch<React.SetStateAction<boolean>>;
  sizeGuideEditId: number | null;
  setSizeGuideEditId: React.Dispatch<React.SetStateAction<number | null>>;
  sizeGuideForm: SizeGuideForm;
  setSizeGuideForm: React.Dispatch<React.SetStateAction<SizeGuideForm>>;
  categoriesList: Array<{ id: number; name: string }>;
  storeId: number | null;
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h3 className="font-bold text-base text-neutral-900">{title}</h3>
      {description && <p className="text-sm text-neutral-500 mt-1">{description}</p>}
    </div>
  );
}

const DEFAULT_ROWS_TEXT =
  'المقاس,الصدر,الخصر,الأرداف\nS,86-91,71-76,86-91\nM,96-101,81-86,96-101\nL,106-111,91-96,106-111';

function parseSizeGuideRows(text: string) {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim()).filter(Boolean);
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    return headers.reduce<Record<string, string>>((row, header, idx) => {
      row[header] = values[idx] ?? '';
      return row;
    }, {});
  });
}

function serializeSizeGuideRows(rows: Array<Record<string, string>>) {
  if (!rows.length) return '';
  const headers = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  return [headers.join(','), ...rows.map(row => headers.map(header => row[header] ?? '').join(','))].join('\n');
}

export default function SizesTab({
  sizeGuides,
  setSizeGuides,
  sizeGuidesLoading,
  sizeGuideSaving,
  setSizeGuideSaving,
  sizeGuideEditId,
  setSizeGuideEditId,
  sizeGuideForm,
  setSizeGuideForm,
  categoriesList,
  storeId,
}: SizesTabProps) {
  const { t } = useTranslation();

  function resetSizeGuideForm() {
    setSizeGuideEditId(null);
    setSizeGuideForm({
      name: '',
      type: 'clothing',
      unit: 'cm',
      rowsText: DEFAULT_ROWS_TEXT,
      categoryIds: [],
      productIdsText: '',
      isActive: true,
    });
  }

  async function saveSizeGuide() {
    if (!storeId) return;
    const rows = parseSizeGuideRows(sizeGuideForm.rowsText);
    if (!sizeGuideForm.name.trim() || rows.length === 0) {
      toast.error('أدخل اسم الدليل وجدول مقاسات صحيح');
      return;
    }
    setSizeGuideSaving(true);
    try {
      const payload = {
        name: sizeGuideForm.name,
        type: sizeGuideForm.type,
        unit: sizeGuideForm.unit,
        rows,
        categoryIds: sizeGuideForm.categoryIds,
        productIds: sizeGuideForm.productIdsText.split(/[,\s]+/).map(Number).filter(Boolean),
        isActive: sizeGuideForm.isActive,
      };
      const saved = (sizeGuideEditId
        ? await settingsApi.updateSizeGuide(storeId, sizeGuideEditId, payload)
        : await settingsApi.createSizeGuide(storeId, payload)) as SizeGuide;
      setSizeGuides(prev => sizeGuideEditId ? prev.map(g => g.id === saved.id ? saved : g) : [saved, ...prev]);
      resetSizeGuideForm();
      toast.success(t('settings.saved'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSizeGuideSaving(false);
    }
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
      <SectionHeader
        title="دليل المقاسات"
        description="أنشئ جداول مقاسات واربطها بتصنيفات الملابس أو منتجات محددة. لن يظهر زر دليل المقاسات إلا عند وجود دليل مرتبط."
      />
      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-4">
        <div className="space-y-4 rounded-2xl border border-neutral-100 bg-white p-4">
          <div className="space-y-1.5">
            <Label className="text-sm text-neutral-500">اسم الدليل</Label>
            <Input value={sizeGuideForm.name} onChange={e => setSizeGuideForm(p => ({ ...p, name: e.target.value }))} className="h-9 text-sm" placeholder="مثال: مقاسات الملابس النسائية" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm text-neutral-500">النوع</Label>
              <Select value={sizeGuideForm.type} onValueChange={v => setSizeGuideForm(p => ({ ...p, type: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="clothing">ملابس</SelectItem>
                  <SelectItem value="shoes">أحذية</SelectItem>
                  <SelectItem value="custom">مخصص</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-neutral-500">الوحدة</Label>
              <Select value={sizeGuideForm.unit} onValueChange={v => setSizeGuideForm(p => ({ ...p, unit: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cm">cm</SelectItem>
                  <SelectItem value="in">in</SelectItem>
                  <SelectItem value="eu">EU</SelectItem>
                  <SelectItem value="uk">UK</SelectItem>
                  <SelectItem value="us">US</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-neutral-500">الجدول CSV</Label>
            <textarea
              className="flex min-h-36 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-mono text-end direction-ltr focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              dir="ltr"
              value={sizeGuideForm.rowsText}
              onChange={e => setSizeGuideForm(p => ({ ...p, rowsText: e.target.value }))}
            />
            <p className="text-xs text-neutral-400">السطر الأول عناوين الأعمدة، وكل سطر بعده مقاس.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-neutral-500">التصنيفات المرتبطة</Label>
            <div className="flex flex-wrap gap-2">
              {categoriesList.map(cat => {
                const selected = sizeGuideForm.categoryIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSizeGuideForm(p => ({
                      ...p,
                      categoryIds: selected ? p.categoryIds.filter(id => id !== cat.id) : [...p.categoryIds, cat.id],
                    }))}
                    className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${selected ? 'bg-primary-500 text-white border-primary-500' : 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-700'}`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-neutral-500">منتجات محددة (اختياري)</Label>
            <Input value={sizeGuideForm.productIdsText} onChange={e => setSizeGuideForm(p => ({ ...p, productIdsText: e.target.value }))} className="h-9 text-sm" dir="ltr" placeholder="مثال: 12, 18, 24" />
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <input type="checkbox" checked={sizeGuideForm.isActive} onChange={e => setSizeGuideForm(p => ({ ...p, isActive: e.target.checked }))} className="h-4 w-4 rounded border-neutral-300" />
            نشط
          </label>
          <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4">
            {sizeGuideEditId && <Button variant="outline" className="h-9 text-sm" onClick={resetSizeGuideForm}>إلغاء التعديل</Button>}
            <PermissionGate permission="settings:update">
              <Button className="h-9 text-sm" onClick={saveSizeGuide} disabled={sizeGuideSaving}>
                {sizeGuideSaving && <Icon name="Loader2" size="xs" className="me-2 animate-spin" />}
                {sizeGuideEditId ? 'تحديث الدليل' : 'إضافة الدليل'}
              </Button>
            </PermissionGate>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-100 bg-white overflow-hidden">
          {sizeGuidesLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-2xl" />)}</div>
          ) : sizeGuides.length === 0 ? (
            <div className="p-12 text-center text-sm text-neutral-500">لا توجد أدلة مقاسات بعد</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-neutral-100 hover:bg-transparent">
                  <TableHead className="h-10 text-sm text-neutral-500">الدليل</TableHead>
                  <TableHead className="h-10 text-sm text-neutral-500">الربط</TableHead>
                  <TableHead className="h-10 text-sm text-neutral-500">الحالة</TableHead>
                  <TableHead className="w-24 h-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sizeGuides.map(guide => (
                  <TableRow key={guide.id} className="border-neutral-100 hover:bg-neutral-50">
                    <TableCell className="p-3">
                      <p className="text-sm font-medium text-neutral-900">{guide.name}</p>
                      <p className="text-xs text-neutral-400">{guide.type} · {guide.unit} · {guide.rows?.length ?? 0} صف</p>
                    </TableCell>
                    <TableCell className="p-3 text-xs text-neutral-500">
                      {guide.categoryIds?.length ?? 0} تصنيف · {guide.productIds?.length ?? 0} منتج
                    </TableCell>
                    <TableCell className="p-3">
                      <Badge variant={guide.isActive ? 'success' : 'secondary'} className="text-xs">{guide.isActive ? 'نشط' : 'غير نشط'}</Badge>
                    </TableCell>
                    <TableCell className="p-3">
                      <div className="flex gap-1">
                        <PermissionGate permission="settings:update">
                          <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => {
                            setSizeGuideEditId(guide.id);
                            setSizeGuideForm({
                              name: guide.name ?? '',
                              type: guide.type ?? 'clothing',
                              unit: guide.unit ?? 'cm',
                              rowsText: serializeSizeGuideRows(guide.rows ?? []),
                              categoryIds: guide.categoryIds ?? [],
                              productIdsText: (guide.productIds ?? []).join(', '),
                              isActive: guide.isActive,
                            });
                          }}>
                            <Icon name="Edit" size="xs" />
                          </Button>
                        </PermissionGate>
                        <PermissionGate permission="settings:update">
                          <Button variant="ghost" size="icon" className="h-11 w-11 text-red-500" onClick={async () => {
                            if (!storeId || !confirm('حذف دليل المقاسات؟')) return;
                            try {
                              await settingsApi.deleteSizeGuide(storeId, guide.id);
                              setSizeGuides(p => p.filter(g => g.id !== guide.id));
                              toast.success(t('common.deleted'));
                            } catch {
                              toast.error(t('common.error'));
                            }
                          }}>
                            <Icon name="Trash2" size="xs" />
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
      </div>
    </div>
  );
}
