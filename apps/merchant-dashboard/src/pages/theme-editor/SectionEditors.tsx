import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Upload, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface EditorProps {
  section: any;
  idx: number;
  homepageSections: any[];
  updateConfig: (path: string, value: any) => void;
  categories?: any[];
  products?: any[];
  uploadingBannerImg: string | null;
  setUploadingBannerImg: (v: string | null) => void;
  storeId: any;
  uploadFile: any;
  validateImageFile: (file: File) => Promise<string | null>;
}

export function updateSection(sections: any[], idx: number, patch: Record<string, any>, settingsPatch?: Record<string, any>): any[] {
  const updated = [...sections];
  if (settingsPatch) {
    updated[idx] = { ...updated[idx], ...patch, settings: { ...updated[idx].settings, ...settingsPatch } };
  } else {
    updated[idx] = { ...updated[idx], ...patch };
  }
  return updated;
}

export function BannerEditor({ section, idx, homepageSections, updateConfig, categories, products, uploadingBannerImg, setUploadingBannerImg, storeId, uploadFile, validateImageFile }: EditorProps) {
  const sid = section.id;
  const settings = section.settings || {};
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><Label className="text-xs text-neutral-600 mb-1.5 block">صورة سطح المكتب<span className="text-neutral-400 font-normal me-2">— 1920×600 بكسل</span></Label>
          <div className="flex items-center gap-2">
            {settings.imageUrl ? <div className="relative group w-16 h-10 rounded-lg overflow-hidden border border-neutral-200 shrink-0"><img src={settings.imageUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <button type="button" onClick={() => { const s = { ...settings }; delete s.imageUrl; updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, s)); }} className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">X</button>
            </div> : null}
            <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white cursor-pointer hover:bg-neutral-50 transition-colors text-xs text-neutral-600 font-medium whitespace-nowrap">
              {uploadingBannerImg === `desktop-${sid}` ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-500" /> : <Upload className="h-3.5 w-3.5" />}
              {uploadingBannerImg === `desktop-${sid}` ? 'جاري...' : 'اختيار'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploadingBannerImg !== null}
                onChange={async (e) => { const file = e.target.files?.[0]; if (!file || !storeId) return; const imgErr = await validateImageFile(file); if (imgErr) { toast.error(imgErr); return; } setUploadingBannerImg(`desktop-${sid}`); try { const result = await uploadFile(storeId, file); updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { imageUrl: result.url })); } catch { toast.error('فشل رفع الصورة'); } finally { setUploadingBannerImg(null); if (e.target) (e.target as HTMLInputElement).value = ''; } }} />
            </label>
          </div>
        </div>
        <div><Label className="text-xs text-neutral-600 mb-1.5 block">صورة الجوال<span className="text-neutral-400 font-normal me-2">— 750×800 بكسل</span></Label>
          <div className="flex items-center gap-2">
            {settings.imageMobileUrl ? <div className="relative group w-10 h-10 rounded-lg overflow-hidden border border-neutral-200 shrink-0"><img src={settings.imageMobileUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <button type="button" onClick={() => { const s = { ...settings }; delete s.imageMobileUrl; updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, s)); }} className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">X</button>
            </div> : null}
            <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white cursor-pointer hover:bg-neutral-50 transition-colors text-xs text-neutral-600 font-medium whitespace-nowrap">
              {uploadingBannerImg === `mobile-${sid}` ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-500" /> : <Upload className="h-3.5 w-3.5" />}
              {uploadingBannerImg === `mobile-${sid}` ? 'جاري...' : 'اختيار'}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploadingBannerImg !== null}
                onChange={async (e) => { const file = e.target.files?.[0]; if (!file || !storeId) return; const imgErr = await validateImageFile(file); if (imgErr) { toast.error(imgErr); return; } setUploadingBannerImg(`mobile-${sid}`); try { const result = await uploadFile(storeId, file); updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { imageMobileUrl: result.url })); } catch { toast.error('فشل رفع الصورة'); } finally { setUploadingBannerImg(null); if (e.target) (e.target as HTMLInputElement).value = ''; } }} />
            </label>
          </div>
        </div>
      </div>
      <div><Label className="text-xs text-neutral-600 mb-1.5 block">عنوان البنر</Label><Input value={settings.subtitle || ''} onChange={(e) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { subtitle: e.target.value })); }} className="w-full" /></div>
      <div><Label className="text-xs text-neutral-600 mb-1.5 block">الوصف</Label><Input value={settings.description || ''} onChange={(e) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { description: e.target.value })); }} className="w-full" /></div>
      <div><Label className="text-xs text-neutral-600 mb-1.5 block">نص الزر</Label><Input value={settings.buttonText || ''} onChange={(e) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { buttonText: e.target.value })); }} className="w-full" /></div>
      <div><Label className="text-xs text-neutral-600 mb-1.5 block">نوع الرابط</Label>
        <div className="flex gap-2">{(['all', 'category', 'product', 'custom'] as const).map((lt) => (
          <button key={lt} type="button" onClick={() => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { linkType: lt, linkValue: lt === 'all' ? '' : settings.linkValue })); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${(settings.linkType || 'all') === lt ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'}`}
          >{{ all: 'الكل', category: 'قسم', product: 'منتج', custom: 'مخصص' }[lt]}</button>
        ))}</div>
      </div>
      {(settings.linkType || 'all') === 'category' && <div><Label className="text-xs text-neutral-600 mb-1.5 block">اختر القسم</Label><Select value={settings.linkValue || 'all'} onValueChange={(v) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { linkValue: v === 'all' ? '' : v })); }}><SelectTrigger className="w-full"><SelectValue placeholder="اختر القسم" /></SelectTrigger><SelectContent><SelectItem value="all">جميع الأقسام</SelectItem>{(categories || []).map((cat: any) => (<SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>))}</SelectContent></Select></div>}
      {(settings.linkType || 'all') === 'product' && <div><Label className="text-xs text-neutral-600 mb-1.5 block">اختر المنتج</Label><Select value={(products || []).find((p: any) => p.slug === settings.linkValue) ? settings.linkValue : ''} onValueChange={(v) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { linkValue: v })); }}><SelectTrigger className="w-full"><SelectValue placeholder="اختر منتج" /></SelectTrigger><SelectContent>{(products || []).map((p: any) => (<SelectItem key={p.id} value={p.slug}>{p.name}</SelectItem>))}</SelectContent></Select></div>}
      {(settings.linkType || 'all') === 'custom' && <div><Label className="text-xs text-neutral-600 mb-1.5 block">الرابط المخصص</Label><Input value={settings.linkValue || ''} onChange={(e) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { linkValue: e.target.value })); }} className="w-full" dir="ltr" placeholder="https://..." /></div>}
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs text-neutral-600 mb-1.5 block">ارتفاع البنر (بكسل)</Label><Input type="number" value={settings.height || 400} onChange={(e) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { height: Number(e.target.value) })); }} className="w-full" /></div>
        <div><Label className="text-xs text-neutral-600 mb-1.5 block">طريقة العرض</Label><Select value={settings.display || 'contained'} onValueChange={(v) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { display: v })); }}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="contained">داخل حاوية</SelectItem><SelectItem value="full">كامل العرض</SelectItem><SelectItem value="wide">عريض</SelectItem></SelectContent></Select></div>
      </div>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-xs text-neutral-600"><input type="checkbox" checked={settings.openInNewTab || false} onChange={(e) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { openInNewTab: e.target.checked })); }} className="rounded" /> فتح الرابط في صفحة جديدة</label>
        <label className="flex items-center gap-2 text-xs text-neutral-600"><input type="checkbox" checked={settings.hideOnMobile || false} onChange={(e) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { hideOnMobile: e.target.checked })); }} className="rounded" /> إخفاء على الجوال</label>
        <label className="flex items-center gap-2 text-xs text-neutral-600"><input type="checkbox" checked={settings.hideOnDesktop || false} onChange={(e) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { hideOnDesktop: e.target.checked })); }} className="rounded" /> إخفاء على سطح المكتب</label>
      </div>
    </>
  );
}

export function ProductEditor({ section, idx, homepageSections, updateConfig, categories, products }: EditorProps) {
  const settings = section.settings || {};
  const selectedProductIds = Array.isArray(settings.productIds) ? settings.productIds.map(Number) : [];
  const toggleProduct = (productId: number) => {
    const next = selectedProductIds.includes(productId)
      ? selectedProductIds.filter((id: number) => id !== productId)
      : [...selectedProductIds, productId];
    updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { productIds: next }));
  };
  return (
    <>
      <div><Label className="text-xs text-neutral-600 mb-1.5 block">مصدر المنتجات</Label>
        <div className="flex gap-2 flex-wrap">{['manual', 'category', 'newest', 'bestSellers', 'discounted', 'featured'].map((src) => (
          <button key={src} type="button" onClick={() => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { source: src })); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${(settings.source || section.type) === src ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'}`}
          >{{ manual: 'يدوي', category: 'تصنيف', newest: 'الأحدث', bestSellers: 'الأكثر مبيعاً', discounted: 'مخفضة', featured: 'مميزة' }[src]}</button>
        ))}</div>
      </div>
      {(settings.source || section.type) === 'category' && <div><Label className="text-xs text-neutral-600 mb-1.5 block">اختر التصنيف</Label><Select value={String(settings.categoryId || '')} onValueChange={(v) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { categoryId: v ? Number(v) : null })); }}><SelectTrigger className="w-full"><SelectValue placeholder="اختر التصنيف" /></SelectTrigger><SelectContent>{(categories || []).map((cat: any) => (<SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>))}</SelectContent></Select></div>}
      {(settings.source || section.type) === 'manual' && (
        <div>
          <Label className="text-xs text-neutral-600 mb-1.5 block">المنتجات المختارة</Label>
          <div className="max-h-44 overflow-y-auto rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-100">
            {(products || []).length === 0 ? (
              <p className="px-3 py-3 text-xs text-neutral-400">لا توجد منتجات متاحة للاختيار</p>
            ) : (products || []).map((product: any) => (
              <label key={product.id} className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedProductIds.includes(Number(product.id))}
                  onChange={() => toggleProduct(Number(product.id))}
                  className="rounded"
                />
                <span className="truncate">{product.name}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-neutral-400 mt-1">إذا لم تختر منتجات، لن يظهر القسم اليدوي في المتجر.</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs text-neutral-600 mb-1.5 block">عدد المنتجات</Label><Input type="number" value={settings.limit || 8} onChange={(e) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { limit: Number(e.target.value) })); }} className="w-full" min={1} max={50} /></div>
        <div><Label className="text-xs text-neutral-600 mb-1.5 block">شكل العرض</Label><Select value={settings.layout || 'grid'} onValueChange={(v) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { layout: v })); }}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="grid">شبكة</SelectItem><SelectItem value="slider">سلايدر</SelectItem><SelectItem value="horizontal">تمرير أفقي</SelectItem></SelectContent></Select></div>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-neutral-600"><input type="checkbox" checked={settings.animated || false} onChange={(e) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { animated: e.target.checked })); }} className="rounded" /> متحرك</label>
        {(settings.layout || 'grid') === 'slider' && settings.animated && (
          <>
            <label className="flex items-center gap-2 text-xs text-neutral-600"><input type="checkbox" checked={settings.slider?.autoplay || false} onChange={(e) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { slider: { ...settings.slider, autoplay: e.target.checked } })); }} className="rounded" /> تشغيل تلقائي</label>
            <Input type="number" value={settings.slider?.speed || 3000} onChange={(e) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { slider: { ...settings.slider, speed: Number(e.target.value) } })); }} className="w-20 text-xs" placeholder="السرعة" />
            <label className="flex items-center gap-2 text-xs text-neutral-600"><input type="checkbox" checked={settings.slider?.showArrows !== false} onChange={(e) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { slider: { ...settings.slider, showArrows: e.target.checked } })); }} className="rounded" /> أسهم</label>
            <label className="flex items-center gap-2 text-xs text-neutral-600"><input type="checkbox" checked={settings.slider?.showDots !== false} onChange={(e) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { slider: { ...settings.slider, showDots: e.target.checked } })); }} className="rounded" /> نقاط</label>
          </>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs text-neutral-600 mb-1.5 block">حجم بطاقة المنتج</Label>
          <Select value={String(settings.productCardSize ?? 3)} onValueChange={(v) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { productCardSize: Number(v) })); }}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 – صغير جداً</SelectItem>
              <SelectItem value="2">2 – صغير</SelectItem>
              <SelectItem value="3">3 – وسط</SelectItem>
              <SelectItem value="4">4 – كبير</SelectItem>
              <SelectItem value="5">5 – كبير جداً</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs text-neutral-600 mb-1.5 block">رابط عرض المزيد</Label><Input value={settings.showMoreUrl || ''} onChange={(e) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { showMoreUrl: e.target.value })); }} className="w-full" dir="ltr" placeholder="/s/{slug}/c/all" /></div>
      </div>
      <label className="flex items-center gap-2 text-xs text-neutral-600"><input type="checkbox" checked={settings.showMoreButton !== false} onChange={(e) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { showMoreButton: e.target.checked })); }} className="rounded" /> إظهار زر "عرض المزيد"</label>
    </>
  );
}

export function CategoriesEditor({ section, idx, homepageSections, updateConfig, categories }: EditorProps) {
  const settings = section.settings || {};
  const selectedIds: number[] = settings.categoryIds || [];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs text-neutral-600 mb-1.5 block">عدد التصنيفات</Label><Input type="number" value={settings.categoryLimit || 6} onChange={(e) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { categoryLimit: Number(e.target.value) })); }} className="w-full" /></div>
        <div><Label className="text-xs text-neutral-600 mb-1.5 block">شكل العرض</Label><Select value={settings.categoryLayout || 'grid'} onValueChange={(v) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { categoryLayout: v })); }}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="grid">شبكة</SelectItem><SelectItem value="slider">تمرير أفقي</SelectItem></SelectContent></Select></div>
      </div>
      <div><Label className="text-xs text-neutral-600 mb-1.5 block">اختيار تصنيفات محددة (اختياري — اترك فارغاً لعرض الكل)</Label>
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border border-neutral-200 rounded-xl">
          {(categories || []).map((cat: any) => {
            const isSelected = selectedIds.includes(cat.id);
            return (
              <button key={cat.id} type="button" onClick={() => {
                const next = isSelected ? selectedIds.filter((id: number) => id !== cat.id) : [...selectedIds, cat.id];
                updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { categoryIds: next }));
              }}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${isSelected ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'}`}
              >{cat.name}</button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function TextEditor({ section, idx, homepageSections, updateConfig }: EditorProps) {
  const settings = section.settings || {};
  return (
    <><div><Label className="text-xs text-neutral-600 mb-1.5 block">المحتوى</Label><textarea value={settings.content || ''} onChange={(e) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { content: e.target.value })); }} className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-primary-500" rows={4} /></div>
      <div><Label className="text-xs text-neutral-600 mb-1.5 block">المحاذاة</Label><Select value={settings.alignment || 'right'} onValueChange={(v) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { alignment: v })); }}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="right">يمين</SelectItem><SelectItem value="center">وسط</SelectItem><SelectItem value="left">يسار</SelectItem></SelectContent></Select></div>
    </>
  );
}

export function ImageTextEditor({ section, idx, homepageSections, updateConfig, setUploadingBannerImg, storeId, uploadFile, validateImageFile }: EditorProps) {
  const settings = section.settings || {};
  const sid = section.id;
  return (
    <><div><Label className="text-xs text-neutral-600 mb-1.5 block">الصورة</Label>
      <div className="flex items-center gap-2">{settings.imageUrl ? <div className="relative group w-16 h-10 rounded-lg overflow-hidden border border-neutral-200 shrink-0"><img src={settings.imageUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /><button type="button" onClick={() => { const s = { ...settings }; delete s.imageUrl; updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, s)); }} className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">X</button></div> : null}
        <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white cursor-pointer hover:bg-neutral-50 transition-colors text-xs text-neutral-600 font-medium whitespace-nowrap"><Upload className="h-3.5 w-3.5" />اختيار<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file || !storeId) return; const imgErr = await validateImageFile(file); if (imgErr) { toast.error(imgErr); return; } setUploadingBannerImg(`img-${sid}`); try { const result = await uploadFile(storeId, file); updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { imageUrl: result.url })); } catch { toast.error('فشل رفع الصورة'); } finally { setUploadingBannerImg(null); if (e.target) (e.target as HTMLInputElement).value = ''; } }} /></label>
      </div>
    </div>
      <div><Label className="text-xs text-neutral-600 mb-1.5 block">المحتوى النصي</Label><textarea value={settings.content || ''} onChange={(e) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { content: e.target.value })); }} className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-primary-500" rows={4} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs text-neutral-600 mb-1.5 block">موضع الصورة</Label><Select value={settings.imagePosition || 'right'} onValueChange={(v) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { imagePosition: v })); }}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="right">يمين</SelectItem><SelectItem value="left">يسار</SelectItem></SelectContent></Select></div>
        <div><Label className="text-xs text-neutral-600 mb-1.5 block">محاذاة النص</Label><Select value={settings.alignment || 'right'} onValueChange={(v) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { alignment: v })); }}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="right">يمين</SelectItem><SelectItem value="center">وسط</SelectItem><SelectItem value="left">يسار</SelectItem></SelectContent></Select></div>
      </div>
    </>
  );
}

export function BrandsEditor({ section, idx, homepageSections, updateConfig, uploadingBannerImg, setUploadingBannerImg, storeId, uploadFile, validateImageFile }: EditorProps) {
  const settings = section.settings || {};
  const items: { imageUrl: string; linkUrl?: string; name?: string }[] = settings.items || [];
  const updateItems = (next: typeof items) => {
    updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { items: next }));
  };
  return (
    <div className="space-y-3">
      <div><Label className="text-xs text-neutral-600 mb-1.5 block">سرعة الحركة</Label><Input type="number" value={settings.speed ?? 1} onChange={(e) => { updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { speed: Number(e.target.value) })); }} className="w-full" min={0.1} max={5} step={0.1} /></div>
      <div><Label className="text-xs text-neutral-600 mb-1.5 block">البراندات</Label>
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 mb-2 p-2 border border-neutral-100 rounded-xl">
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                {item.imageUrl ? <div className="relative group w-10 h-10 rounded-lg overflow-hidden border border-neutral-200 shrink-0"><img src={item.imageUrl} alt="" className="w-full h-full object-cover" /><button type="button" onClick={() => { const next = [...items]; next[i] = { ...next[i], imageUrl: '' }; updateItems(next); }} className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-black/50 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">X</button></div> : null}
                <label className="flex items-center gap-1 px-2 py-1 rounded-lg border border-neutral-200 bg-white cursor-pointer hover:bg-neutral-50 transition-colors text-xs text-neutral-600 font-medium whitespace-nowrap shrink-0">
                  {uploadingBannerImg === `brand-${section.id}-${i}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploadingBannerImg !== null}
                    onChange={async (e) => { const file = e.target.files?.[0]; if (!file || !storeId) return; const imgErr = await validateImageFile(file); if (imgErr) { toast.error(imgErr); return; } setUploadingBannerImg(`brand-${section.id}-${i}`); try { const result = await uploadFile(storeId, file); const next = [...items]; next[i] = { ...next[i], imageUrl: result.url }; updateItems(next); } catch { toast.error('فشل رفع الصورة'); } finally { setUploadingBannerImg(null); if (e.target) (e.target as HTMLInputElement).value = ''; } }} />
                </label>
                <Input value={item.name || ''} onChange={(e) => { const next = [...items]; next[i] = { ...next[i], name: e.target.value }; updateItems(next); }} className="w-full text-xs" placeholder="اسم البراند" />
              </div>
              <Input value={item.linkUrl || ''} onChange={(e) => { const next = [...items]; next[i] = { ...next[i], linkUrl: e.target.value }; updateItems(next); }} className="w-full text-xs" placeholder="الرابط (اختياري)" dir="ltr" />
            </div>
            <button type="button" onClick={() => updateItems(items.filter((_, j) => j !== i))} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors mt-1"><X className="h-3 w-3" /></button>
          </div>
        ))}
        <button type="button" onClick={() => updateItems([...items, { imageUrl: '', name: '', linkUrl: '' }])} className="w-full py-2 text-xs text-neutral-600 font-medium border border-dashed border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors">+ إضافة براند</button>
      </div>
    </div>
  );
}

export function FAQEditor({ section, idx, homepageSections, updateConfig }: EditorProps) {
  const settings = section.settings || {};
  const items: { question: string; answer: string }[] = settings.items || [];
  const updateItems = (next: typeof items) => {
    updateConfig('homepage.sections', updateSection(homepageSections, idx, {}, { items: next }));
  };
  return (
    <div><Label className="text-xs text-neutral-600 mb-1.5 block">الأسئلة</Label>
      {items.map((item, i) => (
        <div key={i} className="mb-2 p-3 border border-neutral-100 rounded-xl space-y-2">
          <Input value={item.question} onChange={(e) => { const next = [...items]; next[i] = { ...next[i], question: e.target.value }; updateItems(next); }} className="w-full" placeholder="السؤال" />
          <textarea value={item.answer} onChange={(e) => { const next = [...items]; next[i] = { ...next[i], answer: e.target.value }; updateItems(next); }} className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-primary-500" rows={3} placeholder="الإجابة" />
          <button type="button" onClick={() => updateItems(items.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:text-red-600 font-medium">حذف السؤال</button>
        </div>
      ))}
      <button type="button" onClick={() => updateItems([...items, { question: '', answer: '' }])} className="w-full py-2 text-xs text-neutral-600 font-medium border border-dashed border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors">+ إضافة سؤال</button>
    </div>
  );
}
