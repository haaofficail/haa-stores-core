/**
 * ThemeEditor — composition shell.
 *
 * The original 1378-LOC monolith was split into:
 *   - theme-editor/useThemeEditorPalette  — config/history/undo/redo + data loading
 *   - theme-editor/themeEditorService     — save / export / import / rollback IO
 *   - theme-editor/colorPalette           — color groups + HSL helpers
 *   - theme-editor/ColorPicker            — palette popover
 *   - theme-editor/constants              — fonts, section labels, defaults
 *   - theme-editor/atoms                  — ToggleRow, SectionHeader
 *   - theme-editor/tabs/*                 — one Tab per concern
 *   - theme-editor/PreviewPane            — responsive iframe stage
 *
 * Visual + behavioral parity is non-negotiable; the split is structural only.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { settingsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertTriangle, BarChart3, ChevronDown, CheckCircle2, Code,
  Download, Footprints, Home, Layout, Link, Loader2,
  Palette, PanelTop, Redo2, Save, Type, Undo2, Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { PermissionGate } from '@/lib/permissions';
import { getThemeCapsule } from '@haa/storefront-themes/server';
import { resolveActiveThemeConfig } from '@haa/theme-system/server';
import { ThemeEditorHost } from '@/components/theme-editor/ThemeEditorHost';

import { THEME_MANIFESTS, type ThemeConfig } from './theme-editor/constants';
import { useThemeEditorPalette } from './theme-editor/useThemeEditorPalette';
import {
  exportThemeConfig, importThemeFile, rollbackThemeConfig, saveThemeConfig,
} from './theme-editor/themeEditorService';
import { ColorsTab } from './theme-editor/tabs/ColorsTab';
import { FontsTab } from './theme-editor/tabs/FontsTab';
import { LayoutTab } from './theme-editor/tabs/LayoutTab';
import { HomepageTab } from './theme-editor/tabs/HomepageTab';
import { HeaderTab } from './theme-editor/tabs/HeaderTab';
import { FooterTab } from './theme-editor/tabs/FooterTab';
import { SocialTab } from './theme-editor/tabs/SocialTab';
import { CssTab } from './theme-editor/tabs/CssTab';
import { AnalyticsTab } from './theme-editor/tabs/AnalyticsTab';
import { PreviewPane } from './theme-editor/PreviewPane';

export default function ThemeEditor() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const palette = useThemeEditorPalette(storeId);
  const {
    loading, config, setConfig, isDirty, setIsDirty,
    history, setHistory, categories, products,
    undoStack, redoStack, configRef,
    updateConfig, handleUndo, handleRedo, applyPreset, resetUndoHistory,
  } = palette;

  const [saving, setSaving] = useState(false);
  const [storeSlug, setStoreSlug] = useState('');
  const [deviceView, setDeviceView] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [uploadingBannerImg, setUploadingBannerImg] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [editorCollapsed, setEditorCollapsed] = useState(false);
  const [deleteSectionIndex, setDeleteSectionIndex] = useState<number | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeReady = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!storeId || storeSlug) return;
    settingsApi.get(storeId).then(s => setStoreSlug((s as any).slug || '')).catch(() => toast.error('فشل تحميل معلومات المتجر'));
  }, [storeId, storeSlug]);

  const storefrontUrl = import.meta.env.VITE_STOREFRONT_URL || 'http://localhost:5174';
  const previewOrigin = (() => {
    try { return new URL(storefrontUrl, window.location.origin).origin; }
    catch { return ''; }
  })();

  const sendPreview = useCallback((cfg: ThemeConfig) => {
    if (!iframeRef.current?.contentWindow || !storeSlug || !previewOrigin) return;
    if (window.location.protocol === 'https:' && !previewOrigin.startsWith('https://')) {
      console.warn('postMessage target origin is not HTTPS in production environment');
      return;
    }
    iframeRef.current.contentWindow.postMessage({ type: 'theme-preview', config: cfg }, previewOrigin);
  }, [storeSlug, previewOrigin]);

  const handleIframeLoad = useCallback(() => {
    iframeReady.current = true;
    sendPreview(config);
  }, [config, sendPreview]);

  useEffect(() => {
    if (!storeSlug) return;
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => sendPreview(configRef.current), 150);
    return () => clearTimeout(debounceTimer.current);
  }, [config, storeSlug, sendPreview, configRef]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleSave = useCallback(async () => {
    if (!storeId) return;
    setSaving(true);
    try {
      const result = await saveThemeConfig(storeId, config);
      if (!result.ok) {
        if (result.reason === 'validation') toast.error(result.errors.join('، '));
        else if (result.reason === 'analytics') toast.error(`صيغة ${result.field} غير صحيحة`);
        else toast.error(t('common.error'));
        return;
      }
      setIsDirty(false);
      toast.success(t('theme.saved', 'تم حفظ إعدادات الثيم'));
    } finally {
      setSaving(false);
    }
  }, [storeId, config, t, setIsDirty]);

  const onUndoRef = useRef(handleUndo);
  const onRedoRef = useRef(handleRedo);
  const onSaveRef = useRef(handleSave);
  onUndoRef.current = handleUndo;
  onRedoRef.current = handleRedo;
  onSaveRef.current = handleSave;

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); onUndoRef.current(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); onRedoRef.current(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); onSaveRef.current(); }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, []);

  const handleExport = () => {
    exportThemeConfig(config);
    toast.success(t('theme.exported', 'تم تصدير الثيم'));
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const result = await importThemeFile(file, config);
    if (!result.ok) {
      if (result.reason === 'validation') toast.error(result.errors.join('، '));
      else toast.error(t('theme.importError', 'خطأ في قراءة الملف'));
    } else {
      setIsDirty(true);
      setConfig(result.config);
      toast.success(t('theme.imported', 'تم استيراد الثيم'));
    }
    e.target.value = '';
  };

  const handleRollback = async (index: number) => {
    if (!storeId) return;
    const entry = history[index];
    if (!entry) return;
    const result = await rollbackThemeConfig(storeId, entry.config);
    if (!result.ok) {
      toast.error(t('common.error'));
      return;
    }
    setConfig(resolveActiveThemeConfig(entry.config));
    setIsDirty(false);
    resetUndoHistory();
    toast.success(t('theme.rollbackDone', `تمت العودة للإصدار #${history.length - index}`));
    // history list itself is unchanged, but caller may refresh in future
    void setHistory;
  };

  const homepage = config.homepage || {};
  const sectionPendingDelete = deleteSectionIndex !== null ? homepage.sections?.[deleteSectionIndex] : null;

  const confirmDeleteSection = () => {
    if (deleteSectionIndex === null) return;
    const updated = [...(homepage.sections || [])];
    updated.splice(deleteSectionIndex, 1);
    updateConfig('homepage.sections', updated);
    setDeleteSectionIndex(null);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const activeTheme: string = config.themeKey || config.preset || 'base-elegant';
  const capsule = getThemeCapsule(activeTheme);
  const useSchemaHost = !!capsule?.editorSchema?.groups?.length;

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-neutral-50">
      {editorCollapsed && (
        <button onClick={() => setEditorCollapsed(false)} className="w-8 shrink-0 flex items-center justify-center border-l border-neutral-200 hover:bg-neutral-50 transition-colors" title="إظهار المحرر">
          <ChevronDown className="h-4 w-4 text-neutral-400 rotate-90" />
        </button>
      )}
      <div className={`${editorCollapsed ? 'w-0 min-w-0 overflow-hidden' : 'w-[480px] min-w-[480px]'} overflow-y-auto border-l border-neutral-200 transition-all duration-300 relative`}>
        {!editorCollapsed && (
          <button onClick={() => setEditorCollapsed(true)} className="absolute top-3 left-3 z-10 w-7 h-7 flex items-center justify-center rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors" title="إخفاء المحرر">
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
        <div className={`${editorCollapsed ? 'hidden' : 'p-4 sm:p-6'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-neutral-900">{t('theme.title', 'محرر الثيم')}</h1>
                {isDirty && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-100">
                    غير محفوظ
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-500 mt-1">{t('theme.subtitle', 'خصص مظهر متجرك')}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 ms-1.5" />{t('theme.export', 'تصدير')}
              </Button>
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild>
                  <span><Upload className="h-4 w-4 ms-1.5" />{t('theme.import', 'استيراد')}</span>
                </Button>
                <input type="file" accept=".json" className="hidden" onChange={handleImport} />
              </label>
              <div className="w-px h-5 bg-neutral-200" />
              <Button variant="ghost" size="sm" onClick={handleUndo} disabled={undoStack.current.length === 0} title="تراجع (Ctrl+Z)">
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleRedo} disabled={redoStack.current.length === 0} title="إعادة (Ctrl+Shift+Z)">
                <Redo2 className="h-4 w-4" />
              </Button>
              <div className="w-px h-5 bg-neutral-200" />
              <PermissionGate permission="theme:update">
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin ms-1.5" /> : <Save className="h-4 w-4 ms-1.5" />}
                  {isDirty && !saving ? <span className="ms-1.5 text-xs">حفظ</span> : null}
                </Button>
              </PermissionGate>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {THEME_MANIFESTS.map((theme) => (
              <PermissionGate key={theme.themeKey} permission="theme:apply">
                <Button variant={(config.themeKey || config.preset) === theme.themeKey ? 'default' : 'outline'} size="sm" onClick={() => applyPreset(theme.themeKey)}>
                  <CheckCircle2 className={`h-3 w-3 ms-1 ${(config.themeKey || config.preset) === theme.themeKey ? '' : 'hidden'}`} />
                  {theme.nameAr}
                </Button>
              </PermissionGate>
            ))}
          </div>

          {/* Rollback */}
          {history.length > 0 && (
            <details className="mb-4 group">
              <summary className="text-xs text-neutral-500 cursor-pointer hover:text-neutral-700 select-none">
                {t('theme.rollback', 'الإصدارات السابقة')} ({history.length})
              </summary>
              <div className="mt-2 space-y-1">
                {history.map((h: any, i: number) => (
                  <button
                    key={h.appliedAt || i}
                    onClick={() => handleRollback(i)}
                    className="w-full text-end px-3 py-2 rounded-xl text-xs hover:bg-neutral-100 transition-colors flex items-center justify-between gap-2"
                  >
                    <span className="text-neutral-400 font-mono">#{history.length - i}</span>
                    <span className="text-neutral-600">{new Date(h.appliedAt).toLocaleString('ar-SA')}</span>
                    <span className="px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-500">{h.preset || '—'}</span>
                  </button>
                ))}
              </div>
            </details>
          )}

          {useSchemaHost ? (
            <ThemeEditorHost
              config={config}
              activeTheme={activeTheme}
              onUpdateConfig={updateConfig}
            />
          ) : (
            <Tabs defaultValue="colors" dir="rtl" className="space-y-0">
              <TabsList className="w-full justify-start overflow-x-auto flex-nowrap mb-6">
                <TabsTrigger value="colors"><Palette className="h-4 w-4 ms-1.5" />{t('theme.colors', 'الألوان')}</TabsTrigger>
                <TabsTrigger value="fonts"><Type className="h-4 w-4 ms-1.5" />{t('theme.fonts', 'الخطوط')}</TabsTrigger>
                <TabsTrigger value="layout"><Layout className="h-4 w-4 ms-1.5" />{t('theme.layout', 'التخطيط')}</TabsTrigger>
                <TabsTrigger value="homepage"><Home className="h-4 w-4 ms-1.5" />{t('theme.homepage', 'الرئيسية')}</TabsTrigger>
                <TabsTrigger value="header"><PanelTop className="h-4 w-4 ms-1.5" />{t('theme.header', 'الهيدر')}</TabsTrigger>
                <TabsTrigger value="footer"><Footprints className="h-4 w-4 ms-1.5" />{t('theme.footer', 'الفوتر')}</TabsTrigger>
                <TabsTrigger value="social"><Link className="h-4 w-4 ms-1.5" />{t('theme.social', 'روابط')}</TabsTrigger>
                <TabsTrigger value="css"><Code className="h-4 w-4 ms-1.5" />CSS</TabsTrigger>
                <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 ms-1.5" />{t('theme.analytics', 'تحليلات')}</TabsTrigger>
                <TabsTrigger value="trust"><AlertTriangle className="h-4 w-4 ms-1.5" />شعارات الثقة</TabsTrigger>
              </TabsList>

              <ColorsTab config={config} updateConfig={updateConfig} />
              <FontsTab config={config} updateConfig={updateConfig} />
              <LayoutTab config={config} updateConfig={updateConfig} />
              <HomepageTab
                config={config}
                updateConfig={updateConfig}
                categories={categories}
                products={products}
                storeId={storeId}
                collapsedGroups={collapsedGroups}
                setCollapsedGroups={setCollapsedGroups}
                expandedSections={expandedSections}
                setExpandedSections={setExpandedSections}
                uploadingBannerImg={uploadingBannerImg}
                setUploadingBannerImg={setUploadingBannerImg}
                setDeleteSectionIndex={setDeleteSectionIndex}
              />
              <HeaderTab config={config} updateConfig={updateConfig} />
              <FooterTab config={config} updateConfig={updateConfig} />
              <SocialTab config={config} updateConfig={updateConfig} />
              <CssTab config={config} updateConfig={updateConfig} />
              <AnalyticsTab config={config} updateConfig={updateConfig} />
            </Tabs>
          )}
        </div>
      </div>

      <PreviewPane
        storeSlug={storeSlug}
        storefrontUrl={storefrontUrl}
        loading={loading}
        editorCollapsed={editorCollapsed}
        iframeRef={iframeRef}
        onIframeLoad={handleIframeLoad}
        deviceView={deviceView}
        setDeviceView={setDeviceView}
      />

      <Dialog open={deleteSectionIndex !== null} onOpenChange={(open) => { if (!open) setDeleteSectionIndex(null); }}>
        <DialogContent className="bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-900">تأكيد حذف القسم</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-600 leading-relaxed">
            سيتم حذف قسم "{sectionPendingDelete?.title || 'بدون عنوان'}" من ترتيب الصفحة الرئيسية. لن يطبق الحذف على المتجر العام إلا بعد الحفظ.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" className="h-9 text-sm" onClick={() => setDeleteSectionIndex(null)}>إلغاء</Button>
            <Button variant="destructive" className="h-9 text-sm px-4" onClick={confirmDeleteSection}>حذف القسم</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
