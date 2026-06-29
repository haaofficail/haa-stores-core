import { TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, ChevronDown, Copy, Eye, GripVertical, X } from 'lucide-react';
import { uploadFile } from '@/lib/api';
import {
  BannerEditor, BrandsEditor, CategoriesEditor, FAQEditor,
  ImageTextEditor, ProductEditor, TextEditor, updateSection,
} from '../SectionEditors';
import {
  HOMEPAGE_SECTIONS_EDITOR_ENABLED,
  SECTION_DEFAULT_SETTINGS,
  SECTION_LABELS,
  type CategoryItem,
  type HomepageSection,
  type ProductItem,
  type ThemeConfig,
} from '../constants';
import { validateImageFile } from '../themeEditorService';

interface Props {
  config: ThemeConfig;
  updateConfig: (path: string, value: unknown) => void;
  categories: CategoryItem[];
  products: ProductItem[];
  storeId: number | null | undefined;
  collapsedGroups: Record<string, boolean>;
  setCollapsedGroups: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  expandedSections: Record<string, boolean>;
  setExpandedSections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  uploadingBannerImg: string | null;
  setUploadingBannerImg: (v: string | null) => void;
  setDeleteSectionIndex: (i: number | null) => void;
}

export function HomepageTab({
  config, updateConfig, categories, products, storeId,
  collapsedGroups, setCollapsedGroups, expandedSections, setExpandedSections,
  uploadingBannerImg, setUploadingBannerImg, setDeleteSectionIndex,
}: Props) {
  const homepage = (config.homepage || {}) as { sections?: HomepageSection[] };
  const orderPanelId = 'theme-homepage-sections-panel';
  return (
    <TabsContent value="homepage" className="space-y-6">
      {!HOMEPAGE_SECTIONS_EDITOR_ENABLED && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold">محرر أقسام الرئيسية غير منشور حالياً</p>
              <p className="text-xs leading-relaxed mt-1">
                أوقفنا تعديل أقسام الصفحة الرئيسية مؤقتاً حتى لا تظهر تغييرات في المعاينة ولا تُنشر في المتجر العام. إعدادات الثيم الأخرى مثل الألوان، الخطوط، الهيدر، الفوتر، وكروت المنتجات ما زالت قابلة للحفظ.
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <button
          type="button"
          disabled={!HOMEPAGE_SECTIONS_EDITOR_ENABLED}
          onClick={() => setCollapsedGroups(prev => ({ ...prev, order: !prev.order }))}
          className={`w-full flex items-center gap-3 px-5 py-4 text-start transition-colors ${HOMEPAGE_SECTIONS_EDITOR_ENABLED ? 'hover:bg-neutral-50' : 'cursor-not-allowed opacity-60'}`}
          aria-expanded={HOMEPAGE_SECTIONS_EDITOR_ENABLED ? !collapsedGroups.order : false}
          aria-controls={orderPanelId}
        >
          <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform duration-200 ${!collapsedGroups.order ? '' : '-rotate-90'}`} aria-hidden="true" />
          <span className="text-sm font-bold text-neutral-700">الأقسام</span>
          <span className="text-xs text-neutral-400">{HOMEPAGE_SECTIONS_EDITOR_ENABLED ? 'اضغط لتعديل، اسحب لترتيب، + لإضافة قسم جديد' : 'سيتم تفعيله بعد ربط Public Home Renderer'}</span>
        </button>
        {HOMEPAGE_SECTIONS_EDITOR_ENABLED && !collapsedGroups.order && (
          <div id={orderPanelId} className="px-5 pb-5 space-y-1" onDragOver={(e) => e.preventDefault()}>
            {(homepage.sections || []).map((section, idx: number) => {
              const sid = section.id;
              const isExpanded = expandedSections[sid];
              const SECTION_TYPE_LABELS = SECTION_LABELS;
              const sectionLabel = section.title || SECTION_TYPE_LABELS[section.type] || section.type;
              const sectionPanelId = `theme-homepage-section-panel-${sid}`;
              const visibilityLabel = section.enabled !== false ? `إخفاء قسم ${sectionLabel}` : `إظهار قسم ${sectionLabel}`;
              const duplicateLabel = `تكرار قسم ${sectionLabel}`;
              const deleteLabel = `حذف قسم ${sectionLabel}`;
              return (
                <div key={sid} className={`rounded-xl border-2 transition-all ${isExpanded ? 'border-primary-200 bg-primary-50/30' : 'border-neutral-100 bg-white'}`}>
                  <div
                    draggable
                    tabIndex={0}
                    role="button"
                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(idx)); (e.currentTarget as HTMLElement).classList.add('opacity-50'); }}
                    onDragEnd={(e) => { (e.currentTarget as HTMLElement).classList.remove('opacity-50'); }}
                    onDragOver={(e) => { e.preventDefault(); const target = e.currentTarget as HTMLElement; target.classList.add('border-primary-500', 'bg-primary-50'); }}
                    onDragLeave={(e) => { const target = e.currentTarget as HTMLElement; target.classList.remove('border-primary-500', 'bg-primary-50'); }}
                    onDrop={(e) => {
                      e.preventDefault(); const from = Number(e.dataTransfer.getData('text/plain')); const to = idx;
                      if (from === to) return; const updated = [...(homepage.sections || [])]; const [moved] = updated.splice(from, 1); updated.splice(to, 0, moved);
                      updateConfig('homepage.sections', updated);
                      (e.currentTarget as HTMLElement).classList.remove('border-primary-500', 'bg-primary-50');
                    }}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandedSections(prev => ({ ...prev, [sid]: !prev[sid] }));
                      }
                      if (e.key === 'ArrowUp' && idx > 0) {
                        e.preventDefault(); const updated = [...(homepage.sections || [])]; [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
                        updateConfig('homepage.sections', updated);
                        const prev = (e.currentTarget as HTMLElement).parentElement?.previousElementSibling?.querySelector('[tabIndex]') as HTMLElement | null;
                        setTimeout(() => prev?.focus(), 0);
                      }
                      if (e.key === 'ArrowDown' && idx < (homepage.sections?.length || 0) - 1) {
                        e.preventDefault(); const updated = [...(homepage.sections || [])]; [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
                        updateConfig('homepage.sections', updated);
                        const next = (e.currentTarget as HTMLElement).parentElement?.nextElementSibling?.querySelector('[tabIndex]') as HTMLElement | null;
                        setTimeout(() => next?.focus(), 0);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-colors rounded-t-xl focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 outline-none"
                    onClick={() => setExpandedSections(prev => ({ ...prev, [sid]: !prev[sid] }))}
                    aria-expanded={isExpanded}
                    aria-controls={sectionPanelId}
                    aria-label={`${isExpanded ? 'طي' : 'فتح'} قسم ${sectionLabel}. استخدم سهم أعلى أو سهم أسفل لتغيير الترتيب`}
                  >
                    <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform duration-200 shrink-0 ${isExpanded ? '' : '-rotate-90'}`} aria-hidden="true" />
                    <button type="button" onClick={(e) => { e.stopPropagation();
                      updateConfig('homepage.sections', updateSection(homepage.sections || [], idx, { enabled: section.enabled === false }));
                    }}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors shrink-0 ${section.enabled !== false ? 'text-primary-600 bg-primary-50' : 'text-neutral-300 hover:text-neutral-400'}`}
                      aria-label={visibilityLabel}
                      title={visibilityLabel}>
                      <Eye className={`h-4 w-4 ${section.enabled !== false ? '' : 'opacity-40'}`} aria-hidden="true" />
                    </button>
                    <span className="text-xs font-bold text-neutral-400 w-5 shrink-0">{idx + 1}</span>
                    <span className="text-sm text-neutral-700 truncate flex-1 text-start">{sectionLabel}</span>
                    <button type="button" onClick={(e) => { e.stopPropagation();
                      const updated = [...(homepage.sections || [])];
                      const copy = structuredClone(section);
                      copy.id = `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                      copy.title = copy.title + ' (نسخة)';
                      updated.splice(idx + 1, 0, copy);
                      updateConfig('homepage.sections', updated);
                    }} className="w-9 h-9 flex items-center justify-center rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors shrink-0" aria-label={duplicateLabel} title={duplicateLabel}>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button type="button" onClick={(e) => { e.stopPropagation();
                      setDeleteSectionIndex(idx);
                    }} className="w-9 h-9 flex items-center justify-center rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0" aria-label={deleteLabel} title={deleteLabel}>
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <GripVertical className="h-4 w-4 text-neutral-300 shrink-0" aria-hidden="true" />
                  </div>
                  {isExpanded && (
                    <div id={sectionPanelId} className="border-t border-neutral-100 px-4 pb-4 pt-3 space-y-3">
                      <Input value={section.title || ''} onChange={(e) => {
                        updateConfig('homepage.sections', updateSection(homepage.sections || [], idx, { title: e.target.value }));
                      }} className="w-full text-sm font-medium" placeholder="عنوان القسم" />

                      {section.type === 'banner' && <BannerEditor section={section} idx={idx} homepageSections={homepage.sections || []} updateConfig={updateConfig} categories={categories} products={products} uploadingBannerImg={uploadingBannerImg} setUploadingBannerImg={setUploadingBannerImg} storeId={storeId} uploadFile={uploadFile} validateImageFile={validateImageFile} />}
                      {['products', 'bestSellers', 'newest', 'offers', 'discounted', 'featured'].includes(section.type) && <ProductEditor section={section} idx={idx} homepageSections={homepage.sections || []} updateConfig={updateConfig} categories={categories} products={products} uploadingBannerImg={uploadingBannerImg} setUploadingBannerImg={setUploadingBannerImg} storeId={storeId} uploadFile={uploadFile} validateImageFile={validateImageFile} />}
                      {section.type === 'categories' && <CategoriesEditor section={section} idx={idx} homepageSections={homepage.sections || []} updateConfig={updateConfig} categories={categories} products={products} uploadingBannerImg={uploadingBannerImg} setUploadingBannerImg={setUploadingBannerImg} storeId={storeId} uploadFile={uploadFile} validateImageFile={validateImageFile} />}
                      {section.type === 'text' && <TextEditor section={section} idx={idx} homepageSections={homepage.sections || []} updateConfig={updateConfig} categories={categories} products={products} uploadingBannerImg={uploadingBannerImg} setUploadingBannerImg={setUploadingBannerImg} storeId={storeId} uploadFile={uploadFile} validateImageFile={validateImageFile} />}
                      {section.type === 'imageText' && <ImageTextEditor section={section} idx={idx} homepageSections={homepage.sections || []} updateConfig={updateConfig} categories={categories} products={products} uploadingBannerImg={uploadingBannerImg} setUploadingBannerImg={setUploadingBannerImg} storeId={storeId} uploadFile={uploadFile} validateImageFile={validateImageFile} />}
                      {section.type === 'brands' && <BrandsEditor section={section} idx={idx} homepageSections={homepage.sections || []} updateConfig={updateConfig} categories={categories} products={products} uploadingBannerImg={uploadingBannerImg} setUploadingBannerImg={setUploadingBannerImg} storeId={storeId} uploadFile={uploadFile} validateImageFile={validateImageFile} />}
                      {section.type === 'faq' && <FAQEditor section={section} idx={idx} homepageSections={homepage.sections || []} updateConfig={updateConfig} categories={categories} products={products} uploadingBannerImg={uploadingBannerImg} setUploadingBannerImg={setUploadingBannerImg} storeId={storeId} uploadFile={uploadFile} validateImageFile={validateImageFile} />}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="flex gap-2 pt-2">
              <Select onValueChange={(v) => {
                const sections = homepage.sections || [];
                const newSection: HomepageSection = { id: `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type: v, enabled: true, title: SECTION_LABELS[v] || v, settings: {} };
                newSection.settings = SECTION_DEFAULT_SETTINGS[v] || {};
                const updated = [...sections, newSection];
                updateConfig('homepage.sections', updated);
                setTimeout(() => setExpandedSections(prev => ({ ...prev, [newSection.id]: true })), 100);
              }}>
                <SelectTrigger className="w-full border-dashed border-primary-300 text-xs text-primary-600 font-medium bg-primary-50/50 hover:bg-primary-50">
                  <SelectValue placeholder="+ إضافة قسم" />
                </SelectTrigger>
                <SelectContent>
                  {['products', 'banner', 'categories', 'offers', 'discounted', 'featured', 'newest', 'bestSellers', 'text', 'imageText', 'brands', 'faq'].map((s) => (
                    <SelectItem key={s} value={s}>
                      {SECTION_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </TabsContent>
  );
}
