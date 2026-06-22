import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { settingsApi, categoriesApi, uploadFile, productsApi } from '@/lib/api';
import { getAllThemeManifests, getThemeDefaultConfig, getThemeManifest, validateThemeConfig, resolveActiveThemeConfig } from '@haa/theme-system/server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import {
  Link, Code, BarChart3, Save, Undo2, Redo2, CheckCircle2, Loader2,
  Download, Upload, Monitor, Tablet, Smartphone, GripVertical,
  Eye, ChevronDown, X, Copy,
  Palette, Type, Layout, Home, PanelTop, Footprints, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { PermissionGate } from '@/lib/permissions';
import { updateSection, BannerEditor, ProductEditor, CategoriesEditor, TextEditor, ImageTextEditor, BrandsEditor, FAQEditor } from './theme-editor/SectionEditors';
import { getThemeCapsule } from '@haa/storefront-themes/server';
import { ThemeEditorHost } from '@/components/theme-editor/ThemeEditorHost';

const COLOR_GROUPS = [
  {
    label: 'رمادي',
    colors: ['#1a1a1a', '#2b2b2b', '#404040', '#595959', '#737373', '#8c8c8c',
      '#a6a6a6', '#bfbfbf', '#d9d9d9', '#e6e6e6', '#f2f2f2', '#fafafa', '#ffffff'],
  },
  {
    label: 'أزرق',
    colors: ['#0a1628', '#1e3a5f', '#1e4d8c', '#5c9cd5', '#8dc4f1', '#b8daf7',
      '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff'],
  },
  {
    label: 'نيلي/بنفسجي',
    colors: ['#1e1b4b', '#312e81', '#3730a3', '#4338ca', '#4f46e5', '#6366f1',
      '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'],
  },
  {
    label: 'أرجواني',
    colors: ['#2e1065', '#4c1d95', '#6b21a8', '#7c3aed', '#8b5cf6', '#a78bfa',
      '#c4b5fd', '#ddd6fe', '#ede9fe', '#f5f3ff'],
  },
  {
    label: 'وردي/فوشيا',
    colors: ['#4a0e4e', '#701a75', '#86198f', '#a21caf', '#c026d3', '#d946ef',
      '#e879f9', '#f0abfc', '#f5d0fe', '#fae8ff'],
  },
  {
    label: 'أحمر/قرمزي',
    colors: ['#2d0a0a', '#7f1d1d', '#991b1b', '#b91c1c', '#dc2626', '#ef4444',
      '#f87171', '#fca5a5', '#fecaca', '#fef2f2'],
  },
  {
    label: 'برتقالي/صدئ',
    colors: ['#2d1407', '#7c2d12', '#9a3412', '#c2410c', '#ea580c', '#f97316',
      '#fb923c', '#fdba74', '#fed7aa', '#fff7ed'],
  },
  {
    label: 'أصفر/ذهبي',
    colors: ['#2d1f00', '#713f12', '#854d0e', '#a16207', '#ca8a04', '#eab308',
      '#facc15', '#fde047', '#fef08a', '#fefce8'],
  },
  {
    label: 'أخضر',
    colors: ['#052e16', '#14532d', '#166534', '#15803d', '#16a34a', '#22c55e',
      '#4ade80', '#86efac', '#bbf7d0', '#f0fdf4'],
  },
  {
    label: 'زمردي/نعناعي',
    colors: ['#022c22', '#134e4a', '#115e59', '#0f766e', '#0d9488', '#14b8a6',
      '#2dd4bf', '#5eead4', '#99f6e4', '#ccfbf1'],
  },
  {
    label: 'سماوي/أزرق فاتح',
    colors: ['#082f49', '#164e63', '#155e75', '#0e7490', '#0891b2', '#06b6d4',
      '#22d3ee', '#67e8f9', '#a5f3fc', '#ecfeff'],
  },
  {
    label: 'ترابي/بيج',
    colors: ['#1c0f08', '#3e2415', '#5c3a21', '#7c4d2b', '#a05d30', '#c0764a',
      '#d4956b', '#e8c9a8', '#f5e8d8', '#fdf6f0'],
  },
];

function getColorGroups(hex: string) {
  const [hue, sat] = hexToHsl(hex);
  const normHue = ((hue % 360) + 360) % 360;
  if (sat < 8) return [COLOR_GROUPS[0]];

  const idxMap: [number, number, number][] = [
    [340, 20, 5],   // أحمر/قرمزي
    [20, 50, 11],   // ترابي/بيج
    [15, 45, 6],    // برتقالي/صدئ
    [40, 70, 7],    // أصفر/ذهبي
    [100, 160, 8],  // أخضر
    [155, 195, 9],  // زمردي/نعناعي
    [175, 215, 10], // سماوي/أزرق فاتح
    [200, 250, 1],  // أزرق
    [230, 270, 2],  // نيلي/بنفسجي
    [260, 320, 3],  // أرجواني
    [280, 340, 4],  // وردي/فوشيا
  ];
  for (const [lo, hi, groupIdx] of idxMap) {
    if (lo <= hi ? (normHue >= lo && normHue <= hi) : (normHue >= lo || normHue <= hi)) {
      return [COLOR_GROUPS[groupIdx], COLOR_GROUPS[0]];
    }
  }
  return [COLOR_GROUPS[0]];
}

function hexToHsl(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const validHex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000';
  const [h, s, l] = hexToHsl(validHex);
  const matchedGroups = getColorGroups(validHex);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-neutral-700">{label}</Label>
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="w-10 h-10 rounded-xl border-2 border-neutral-200 shadow-sm shrink-0 hover:border-neutral-300 transition-colors"
              style={{ backgroundColor: validHex }}
              aria-label={label}
            />
          </PopoverTrigger>
          <PopoverContent side="left" align="start" className="w-[280px] p-3">
            <HexColorPicker color={validHex} onChange={onChange} className="!w-full !h-40" />
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="range" min="0" max="360" value={h}
                  onChange={(e) => onChange(hslToHex(Number(e.target.value), s, l))}
                  className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)` }}
                />
                <span className="text-xs text-neutral-500 w-8 text-end font-mono">{h}°</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range" min="0" max="100" value={s}
                  onChange={(e) => onChange(hslToHex(h, Number(e.target.value), l))}
                  className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, #808080, ${hslToHex(h, 100, l)})` }}
                />
                <span className="text-xs text-neutral-500 w-8 text-end font-mono">{s}%</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range" min="0" max="100" value={l}
                  onChange={(e) => onChange(hslToHex(h, s, Number(e.target.value)))}
                  className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, #000, ${hslToHex(h, s, 50)}, #fff)` }}
                />
                <span className="text-xs text-neutral-500 w-8 text-end font-mono">{l}%</span>
              </div>
              <div className="flex items-center gap-2">
                <HexColorInput color={validHex} onChange={onChange} prefixed className="flex-1 h-8 px-2 rounded-lg border border-neutral-200 text-xs font-mono text-end" />
                <div className="w-8 h-8 rounded-lg border border-neutral-200" style={{ backgroundColor: validHex }} />
              </div>
            </div>
            <div className="mt-3 border-t border-neutral-100 pt-3 max-h-44 overflow-y-auto space-y-2">
              {COLOR_GROUPS.map((g) => (
                <div key={g.label}>
                  <p className="text-xs font-medium text-neutral-400 mb-1">{g.label}</p>
                  <div className="flex gap-1 flex-wrap">
                    {g.colors.map((c) => (
                      <button
                        key={c}
                        onClick={() => onChange(c)}
                        aria-label={`لون ${c}`}
                        className={`w-5 h-5 rounded-full border ${c === validHex ? 'border-2 border-neutral-900 scale-125' : 'border-neutral-200'} hover:scale-110 transition-transform`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <div className="flex gap-1 flex-wrap items-center">
          {(matchedGroups[0]?.colors ?? []).filter((c) => c !== validHex).slice(0, 8).map((c) => (
            <button
              key={c}
              onClick={() => onChange(c)}
              aria-label={`لون ${c}`}
              className="w-5 h-5 rounded-full border border-neutral-200 hover:scale-110 transition-transform shrink-0"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const FONT_OPTIONS = [
  { label: 'IBM Plex Sans Arabic', value: 'IBM Plex Sans Arabic', url: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap' },
  { label: 'Cairo', value: 'Cairo', url: 'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&display=swap' },
  { label: 'Tajawal', value: 'Tajawal', url: 'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap' },
  { label: 'Noto Kufi Arabic', value: 'Noto Kufi Arabic', url: 'https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@300;400;500;600;700&display=swap' },
  { label: 'Readex Pro', value: 'Readex Pro', url: 'https://fonts.googleapis.com/css2?family=Readex+Pro:wght@300;400;500;600;700&display=swap' },
];

const SECTION_LABELS: Record<string, string> = {
  products: 'منتجات', banner: 'بنر', categories: 'تصنيفات', offers: 'عروض',
  discounted: 'منتجات مخفضة', featured: 'منتجات مميزة', newest: 'أحدث المنتجات',
  bestSellers: 'الأكثر مبيعاً', text: 'نص', imageText: 'صورة ونص',
  brands: 'البراندات', faq: 'الأسئلة الشائعة',
};
const THEME_MANIFESTS = getAllThemeManifests();
const HOMEPAGE_SECTIONS_EDITOR_ENABLED = true;

type ThemeConfig = Record<string, any>;
type CategoryItem = { id: number; name: string; slug: string };
type ProductItem = { id: number; name: string; slug: string; [key: string]: any };

const ANALYTICS_PATTERNS: Record<string, RegExp> = {
  googleTagManagerId: /^GTM-[A-Z0-9]+$/,
  googleAnalyticsId: /^(G-[A-Z0-9]+|UA-\d+-\d+)$/,
  facebookPixelId: /^\d+$/,
};

function ToggleRow({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <Label className="text-sm font-medium text-neutral-700">{label}</Label>
        {description && <p className="text-xs text-neutral-500">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h3 className="font-bold text-base text-neutral-900">{title}</h3>
      {description && <p className="text-sm text-neutral-500 mt-1">{description}</p>}
    </div>
  );
}

export default function ThemeEditor() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ThemeConfig>({});
  const [isDirty, setIsDirty] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const undoStack = useRef<ThemeConfig[]>([]);
  const redoStack = useRef<ThemeConfig[]>([]);
  const isUndoing = useRef(false);
  const lastUndoPath = useRef('');
  const lastUndoTime = useRef(0);
  const [deviceView, setDeviceView] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [storeSlug, setStoreSlug] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();
  const iframeReady = useRef(false);
  const configRef = useRef(config);
  configRef.current = config;
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [uploadingBannerImg, setUploadingBannerImg] = useState<string | null>(null);

  async function validateImageFile(file: File): Promise<string | null> {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'الصيغة غير مدعومة. يرجى اختيار JPG, PNG أو WebP';
    if (file.size > 5 * 1024 * 1024) return 'حجم الصورة يتجاوز 5MB';
    const header = await file.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(header);
    const isJPEG = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
    const isPNG = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
    const isWebP = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
    if (!isJPEG && !isPNG && !isWebP) return 'الملف لا يحمل توقيع صورة صحيح (magic bytes)';
    return null;
  }

  useEffect(() => {
    if (!storeId) return;
    categoriesApi.list(storeId).then(setCategories).catch(() => toast.error('فشل تحميل التصنيفات'));
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    productsApi.list(storeId, { limit: 100 }).then(res => setProducts(res.data)).catch(() => toast.error('فشل تحميل المنتجات'));
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    Promise.all([
      settingsApi.getTheme(storeId),
      settingsApi.getThemeHistory(storeId),
    ])
      .then(([cfg, hist]) => { setConfig(resolveActiveThemeConfig(cfg)); setIsDirty(false); setHistory(hist); })
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false));
  }, [storeId, t]);

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
  }, [config, storeSlug, sendPreview]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const updateConfig = useCallback((path: string, value: any) => {
    setIsDirty(true);
    setConfig((prev) => {
      if (!isUndoing.current) {
        const now = Date.now();
        if (path !== lastUndoPath.current || now - lastUndoTime.current > 300) {
          undoStack.current.push(structuredClone(prev));
          if (undoStack.current.length > 50) undoStack.current.shift();
          redoStack.current = [];
        }
        lastUndoPath.current = path;
        lastUndoTime.current = now;
      }
      const keys = path.split('.');
      const newConfig = structuredClone(prev);
      let obj = newConfig;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return newConfig;
    });
  }, []);

  const handleUndo = useCallback(() => {
    setConfig((prev) => {
      const previous = undoStack.current.pop();
      if (!previous) return prev;
      redoStack.current.push(structuredClone(prev));
      setIsDirty(true);
      isUndoing.current = true;
      queueMicrotask(() => { isUndoing.current = false; });
      return previous;
    });
  }, []);

  const handleRedo = useCallback(() => {
    setConfig((prev) => {
      const next = redoStack.current.pop();
      if (!next) return prev;
      undoStack.current.push(structuredClone(prev));
      setIsDirty(true);
      isUndoing.current = true;
      queueMicrotask(() => { isUndoing.current = false; });
      return next;
    });
  }, []);

  const applyPreset = useCallback((id: string) => {
    const theme = getThemeManifest(id);
    if (!theme) return;
    setIsDirty(true);
    setConfig((prev) => ({ ...prev, ...getThemeDefaultConfig(id), preset: theme.themeKey, themeKey: theme.themeKey }));
    toast.success(t('theme.presetApplied', `تم تطبيق ثيم: ${theme.nameAr}`));
  }, [t]);

  const handleSave = async () => {
    if (!storeId) return;
    const validation = validateThemeConfig(config as any);
    if (!validation.valid) {
      toast.error(validation.errors.slice(0, 3).join('، '));
      return;
    }
    const analytics = config.analytics || {};
    for (const [key, pattern] of Object.entries(ANALYTICS_PATTERNS)) {
      const val = (analytics as any)[key];
      if (val && !pattern.test(val)) {
        toast.error(`صيغة ${key} غير صحيحة`);
        return;
      }
    }
    setSaving(true);
    try {
      await settingsApi.updateTheme(storeId, config);
      setIsDirty(false);
      toast.success(t('theme.saved', 'تم حفظ إعدادات الثيم'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

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
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `theme-${config.preset || 'custom'}-${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(t('theme.exported', 'تم تصدير الثيم'));
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      const nextConfig = { ...config, ...imported };
      const validation = validateThemeConfig(nextConfig as any);
      if (!validation.valid) {
        toast.error(validation.errors.slice(0, 3).join('، '));
        return;
      }
      setIsDirty(true);
      setConfig(nextConfig);
      toast.success(t('theme.imported', 'تم استيراد الثيم'));
    } catch { toast.error(t('theme.importError', 'خطأ في قراءة الملف')); }
    e.target.value = '';
  };

  const handleRollback = async (index: number) => {
    if (!storeId) return;
    const entry = history[index];
    if (!entry) return;
    try {
      await settingsApi.updateTheme(storeId, entry.config);
      setConfig(resolveActiveThemeConfig(entry.config));
      setIsDirty(false);
      undoStack.current = [];
      redoStack.current = [];
      toast.success(t('theme.rollbackDone', `تمت العودة للإصدار #${history.length - index}`));
    } catch {
      toast.error(t('common.error'));
    }
  };

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [editorCollapsed, setEditorCollapsed] = useState(false);
  const [deleteSectionIndex, setDeleteSectionIndex] = useState<number | null>(null);
  const previewPaneRef = useRef<HTMLDivElement>(null);
  const [previewPaneSize, setPreviewPaneSize] = useState({ width: 0, height: 0 });
  const [desktopZoom, setDesktopZoom] = useState<'fit' | 'actual'>('fit');

  useEffect(() => {
    if (loading) return;
    const pane = previewPaneRef.current;
    if (!pane) return;
    const updateSize = () => setPreviewPaneSize({ width: pane.clientWidth, height: pane.clientHeight });
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(pane);
    return () => observer.disconnect();
  }, [loading, editorCollapsed]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const colors = config.colors || {};
  const font = config.font || {};
  const layout = config.layout || {};
  const homepage = config.homepage || {};
  const header = config.header || {};
  const footer = config.footer || {};
  const socialLinks = config.socialLinks || {};
  const deviceViewport = {
    desktop: { width: 1280, minHeight: 720 },
    tablet: { width: 768, minHeight: 900 },
    mobile: { width: 375, minHeight: 812 },
  }[deviceView];
  const stageWidth = Math.max(0, previewPaneSize.width - 32);
  const stageHeight = Math.max(0, previewPaneSize.height - 32);
  const isPreviewMeasured = stageWidth > 0 && stageHeight > 0;
  const fitScale = stageWidth > 0 && stageHeight > 0
    ? Math.min(1, stageWidth / deviceViewport.width, stageHeight / deviceViewport.minHeight)
    : 0;
  const previewScale = deviceView === 'desktop' && desktopZoom === 'actual' ? 1 : fitScale;
  const frameWidth = deviceViewport.width * previewScale;
  const frameHeight = Math.max(deviceViewport.minHeight * previewScale, stageHeight);
  const iframeHeight = previewScale > 0 ? Math.max(deviceViewport.minHeight, frameHeight / previewScale) : deviceViewport.minHeight;
  const sectionPendingDelete = deleteSectionIndex !== null ? homepage.sections?.[deleteSectionIndex] : null;

  const confirmDeleteSection = () => {
    if (deleteSectionIndex === null) return;
    const updated = [...(homepage.sections || [])];
    updated.splice(deleteSectionIndex, 1);
    updateConfig('homepage.sections', updated);
    setDeleteSectionIndex(null);
  };

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

      {(() => {
        const activeTheme: string = config.themeKey || config.preset || 'base-elegant';
        const capsule = getThemeCapsule(activeTheme);
        if (capsule?.editorSchema?.groups?.length) {
          return (
            <ThemeEditorHost
              config={config}
              activeTheme={activeTheme}
              onUpdateConfig={updateConfig}
            />
          );
        }
        return null;
      })()}
      {(() => {
        const activeTheme: string = config.themeKey || config.preset || 'base-elegant';
        const capsule = getThemeCapsule(activeTheme);
        if (capsule?.editorSchema?.groups?.length) return null;
        return (
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

        {/* ─── COLORS ─── */}
        <TabsContent value="colors" className="space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <SectionHeader title={t('theme.brandColors', 'ألوان العلامة التجارية')} />
            <div className="grid sm:grid-cols-2 gap-3">
              <ColorPicker label={t('theme.primary', 'اللون الأساسي')} value={colors.primary || '#5c9cd5'} onChange={(v) => updateConfig('colors.primary', v)} />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <SectionHeader title={t('theme.surfaceColors', 'ألوان الخلفيات')} />
            <div className="grid sm:grid-cols-2 gap-3">
              <ColorPicker label="Surface 1" value={colors.surface1 || '#ffffff'} onChange={(v) => updateConfig('colors.surface1', v)} />
              <ColorPicker label="Surface 2" value={colors.surface2 || '#f8f9fa'} onChange={(v) => updateConfig('colors.surface2', v)} />
              <ColorPicker label="Surface 3" value={colors.surface3 || '#f1f3f5'} onChange={(v) => updateConfig('colors.surface3', v)} />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <SectionHeader title={t('theme.textColors', 'ألوان النصوص')} />
            <div className="grid sm:grid-cols-2 gap-3">
              <ColorPicker label={t('theme.textPrimary', 'النص الأساسي')} value={colors.textPrimary || '#1a1a1a'} onChange={(v) => updateConfig('colors.textPrimary', v)} />
              <ColorPicker label={t('theme.textSecondary', 'النص الثانوي')} value={colors.textSecondary || '#6b7280'} onChange={(v) => updateConfig('colors.textSecondary', v)} />
              <ColorPicker label={t('theme.textTertiary', 'نص مساعد')} value={colors.textTertiary || '#9ca3af'} onChange={(v) => updateConfig('colors.textTertiary', v)} />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <SectionHeader title={t('theme.statusColors', 'ألوان الحالات')} />
            <div className="grid sm:grid-cols-2 gap-3">
              <ColorPicker label={t('theme.success', 'نجاح')} value={colors.success || '#10b981'} onChange={(v) => updateConfig('colors.success', v)} />
              <ColorPicker label={t('theme.warning', 'تحذير')} value={colors.warning || '#f59e0b'} onChange={(v) => updateConfig('colors.warning', v)} />
              <ColorPicker label={t('theme.error', 'خطأ')} value={colors.error || '#ef4444'} onChange={(v) => updateConfig('colors.error', v)} />
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <SectionHeader title={t('theme.headerColors', 'ألوان الهيدر')} />
            <div className="grid sm:grid-cols-2 gap-3">
              <ColorPicker label={t('theme.headerBackground', 'خلفية الهيدر')} value={colors.headerBackground || '#ffffff'} onChange={(v) => updateConfig('colors.headerBackground', v)} />
              <ColorPicker label={t('theme.headerText', 'نص الهيدر')} value={colors.headerText || '#4b5563'} onChange={(v) => updateConfig('colors.headerText', v)} />
              <ColorPicker label={t('theme.announcementBg', 'خلفية شريط الإعلانات')} value={colors.announcementBackground || '#1e293b'} onChange={(v) => updateConfig('colors.announcementBackground', v)} />
              <ColorPicker label={t('theme.announcementText', 'نص شريط الإعلانات')} value={colors.announcementText || '#ffffff'} onChange={(v) => updateConfig('colors.announcementText', v)} />
            </div>
          </div>
        </TabsContent>

        {/* ─── FONTS ─── */}
        <TabsContent value="fonts" className="space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <SectionHeader title={t('theme.fontSettings', 'إعدادات الخط')} />
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-neutral-700 mb-2 block">{t('theme.fontFamily', 'نوع الخط')}</Label>
                <Select value={font.family || 'IBM Plex Sans Arabic'} onValueChange={(v) => {
                  const opt = FONT_OPTIONS.find(f => f.value === v);
                  updateConfig('font.family', v);
                  if (opt) updateConfig('font.url', opt.url);
                }}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((f) => (
                      <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-neutral-700 mb-2 block">{t('theme.headingSize', 'حجم العناوين')}</Label>
                  <Select value={font.headingsSize || '1.5rem'} onValueChange={(v) => updateConfig('font.headingsSize', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['1.25rem','1.5rem','1.75rem','2rem','2.25rem'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium text-neutral-700 mb-2 block">{t('theme.bodySize', 'حجم النص')}</Label>
                  <Select value={font.bodySize || '1rem'} onValueChange={(v) => updateConfig('font.bodySize', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['0.875rem','1rem','1.125rem'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ─── LAYOUT ─── */}
        <TabsContent value="layout" className="space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <SectionHeader title={t('theme.productDisplay', 'عرض المنتجات')} />
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-neutral-700 mb-2 block">{t('theme.productColumns', 'عدد الأعمدة')}</Label>
                <Select value={String(layout.productCardColumns || 4)} onValueChange={(v) => updateConfig('layout.productCardColumns', Number(v))}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-neutral-700 mb-2 block">{t('theme.cardStyle', 'شكل البطاقة')}</Label>
                <Select value={layout.productCardStyle || 'rounded'} onValueChange={(v) => updateConfig('layout.productCardStyle', v)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rounded">{t('theme.cardRounded', 'دائري')}</SelectItem>
                    <SelectItem value="square">{t('theme.cardSquare', 'مربع')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-neutral-700 mb-2 block">{t('theme.imageRatio', 'نسبة الصورة')}</Label>
                <Select value={layout.imageAspectRatio || 'square'} onValueChange={(v) => updateConfig('layout.imageAspectRatio', v)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="square">1:1</SelectItem>
                    <SelectItem value="4:3">4:3</SelectItem>
                    <SelectItem value="16:9">16:9</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-neutral-700 mb-2 block">{t('theme.categoryCardSize', 'حجم بطاقة التصنيف')}</Label>
                <Select value={String(layout.categoryCardSize ?? 3)} onValueChange={(v) => updateConfig('layout.categoryCardSize', Number(v))}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 – {t('theme.categorySizeCompact', 'صغير جداً')}</SelectItem>
                    <SelectItem value="2">2 – {t('theme.categorySizeSmall', 'صغير')}</SelectItem>
                    <SelectItem value="3">3 – {t('theme.categorySizeMedium', 'وسط')}</SelectItem>
                    <SelectItem value="4">4 – {t('theme.categorySizeLarge', 'كبير')}</SelectItem>
                    <SelectItem value="5">5 – {t('theme.categorySizeXl', 'كبير جداً')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border-t border-neutral-100 pt-4 space-y-1">
                <ToggleRow label={t('theme.showRating', 'عرض التقييم')} checked={layout.showRating !== false} onChange={(v) => updateConfig('layout.showRating', v)} />
                <ToggleRow label={t('theme.showSales', 'عرض المبيعات')} checked={layout.showSalesCount !== false} onChange={(v) => updateConfig('layout.showSalesCount', v)} />
                <ToggleRow label={t('theme.showStock', 'عرض المخزون')} checked={layout.showStockBadge !== false} onChange={(v) => updateConfig('layout.showStockBadge', v)} />
                <ToggleRow label={t('theme.showCategory', 'عرض القسم')} checked={layout.showCategory !== false} onChange={(v) => updateConfig('layout.showCategory', v)} />
                <ToggleRow label={t('theme.showDiscount', 'عرض الخصم')} checked={layout.showDiscountBadge !== false} onChange={(v) => updateConfig('layout.showDiscountBadge', v)} />
                <ToggleRow label={t('theme.showCountdown', 'عداد الخصم')} checked={layout.showCountdown !== false} onChange={(v) => updateConfig('layout.showCountdown', v)} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ─── HOMEPAGE ─── */}
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
            >
              <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform duration-200 ${!collapsedGroups.order ? '' : '-rotate-90'}`} />
              <span className="text-sm font-bold text-neutral-700">الأقسام</span>
              <span className="text-xs text-neutral-400">{HOMEPAGE_SECTIONS_EDITOR_ENABLED ? 'اضغط لتعديل، اسحب لترتيب، + لإضافة قسم جديد' : 'سيتم تفعيله بعد ربط Public Home Renderer'}</span>
            </button>
            {HOMEPAGE_SECTIONS_EDITOR_ENABLED && !collapsedGroups.order && (
              <div className="px-5 pb-5 space-y-1" onDragOver={(e) => e.preventDefault()}>
              {(homepage.sections || []).map((section: any, idx: number) => {
                const sid = section.id;
                const isExpanded = expandedSections[sid];
                const SECTION_TYPE_LABELS = SECTION_LABELS;
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
                    >
                      <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform duration-200 shrink-0 ${isExpanded ? '' : '-rotate-90'}`} />
                      <button type="button" onClick={(e) => { e.stopPropagation();
                        updateConfig('homepage.sections', updateSection(homepage.sections || [], idx, { enabled: section.enabled === false }));
                      }}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors shrink-0 ${section.enabled !== false ? 'text-primary-600 bg-primary-50' : 'text-neutral-300 hover:text-neutral-400'}`}
                        title={section.enabled !== false ? 'إخفاء القسم' : 'إظهار القسم'}>
                        <Eye className={`h-4 w-4 ${section.enabled !== false ? '' : 'opacity-40'}`} />
                      </button>
                      <span className="text-xs font-bold text-neutral-400 w-5 shrink-0">{idx + 1}</span>
                      <span className="text-sm text-neutral-700 truncate flex-1 text-start">{section.title || SECTION_TYPE_LABELS[section.type] || section.type}</span>
                      <button type="button" onClick={(e) => { e.stopPropagation();
                        const updated = [...(homepage.sections || [])];
                        const copy = structuredClone(section);
                        copy.id = `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                        copy.title = copy.title + ' (نسخة)';
                        updated.splice(idx + 1, 0, copy);
                        updateConfig('homepage.sections', updated);
                      }} className="w-9 h-9 flex items-center justify-center rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors shrink-0" title="تكرار القسم">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation();
                        setDeleteSectionIndex(idx);
                      }} className="w-9 h-9 flex items-center justify-center rounded-md text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0" title="حذف">
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <GripVertical className="h-4 w-4 text-neutral-300 shrink-0" />
                    </div>
                    {isExpanded && (
                      <div className="border-t border-neutral-100 px-4 pb-4 pt-3 space-y-3">
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
                  const newSection: any = { id: `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type: v, enabled: true, title: SECTION_LABELS[v] || v, settings: {} };
                  const defaultSettings: Record<string, any> = {
                    banner: { imageUrl: '', imageMobileUrl: '', linkType: 'all', linkValue: '', height: 400, display: 'contained', openInNewTab: false, hideOnMobile: false, hideOnDesktop: false },
                    products: { source: 'newest', limit: 8, layout: 'grid', animated: false, slider: { autoplay: false, speed: 3000, showArrows: true, showDots: true }, showMoreButton: true, showMoreUrl: '' },
                    bestSellers: { source: 'bestSellers', limit: 8, layout: 'grid', animated: false, slider: { autoplay: false, speed: 3000, showArrows: true, showDots: true }, showMoreButton: true, showMoreUrl: '' },
                    newest: { source: 'newest', limit: 8, layout: 'grid', animated: false, slider: { autoplay: false, speed: 3000, showArrows: true, showDots: true }, showMoreButton: true, showMoreUrl: '' },
                    offers: { source: 'discounted', limit: 8, layout: 'grid', animated: false, slider: { autoplay: false, speed: 3000, showArrows: true, showDots: true }, showMoreButton: true, showMoreUrl: '' },
                    discounted: { source: 'discounted', limit: 8, layout: 'grid', animated: false, slider: { autoplay: false, speed: 3000, showArrows: true, showDots: true }, showMoreButton: true, showMoreUrl: '' },
                    featured: { source: 'featured', limit: 8, layout: 'grid', animated: false, slider: { autoplay: false, speed: 3000, showArrows: true, showDots: true }, showMoreButton: true, showMoreUrl: '' },
                    categories: { categoryLimit: 6, categoryLayout: 'grid' },
                    text: { content: '', alignment: 'center' },
                    imageText: { imageUrl: '', content: '', imagePosition: 'right', alignment: 'center' },
                    brands: { items: [], speed: 1 },
                    faq: { items: [] },
                  };
                  newSection.settings = defaultSettings[v] || {};
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
            </div></div>)}
          </div>
        </TabsContent>

        {/* ─── HEADER ─── */}
        <TabsContent value="header" className="space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <SectionHeader title={t('theme.headerSettings', 'إعدادات الهيدر')} />
            <div className="space-y-4">
              <ToggleRow label={t('theme.announcementBar', 'شريط الإعلانات')} description={t('theme.announcementDesc', 'شريط صغير أعلى المتجر')} checked={header.showAnnouncementBar !== false} onChange={(v) => updateConfig('header.showAnnouncementBar', v)} />
              {header.showAnnouncementBar !== false && (
                <div className="space-y-3">
                  <Input value={header.announcementText || ''} onChange={(e) => updateConfig('header.announcementText', e.target.value)} placeholder={t('theme.announcementPlaceholder', 'نص الإعلان...')} className="w-full" />
                  <div className="grid sm:grid-cols-2 gap-3">
                    <ColorPicker label={t('theme.announcementBg', 'خلفية الشريط')} value={colors.announcementBackground || '#1e293b'} onChange={(v) => updateConfig('colors.announcementBackground', v)} />
                    <ColorPicker label={t('theme.announcementText', 'نص الشريط')} value={colors.announcementText || '#ffffff'} onChange={(v) => updateConfig('colors.announcementText', v)} />
                  </div>
                </div>
              )}
              <ToggleRow label={t('theme.stickyHeader', 'هيدر ثابت')} checked={header.stickyHeader !== false} onChange={(v) => updateConfig('header.stickyHeader', v)} />
              <ToggleRow label={t('theme.showSearch', 'إظهار البحث')} checked={header.showSearch !== false} onChange={(v) => updateConfig('header.showSearch', v)} />
              <ToggleRow label={t('theme.showCart', 'إظهار السلة')} checked={header.showCart !== false} onChange={(v) => updateConfig('header.showCart', v)} />
              <ToggleRow label={t('theme.showAccount', 'إظهار حسابي')} checked={header.showAccount !== false} onChange={(v) => updateConfig('header.showAccount', v)} />
            </div>
          </div>
        </TabsContent>

        {/* ─── FOOTER ─── */}
        <TabsContent value="footer" className="space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <SectionHeader title={t('theme.footerSettings', 'إعدادات الفوتر')} />
            <div className="space-y-4">
              <ToggleRow label={t('theme.showPayment', 'شعارات الدفع')} checked={footer.showPaymentLogos !== false} onChange={(v) => updateConfig('footer.showPaymentLogos', v)} />
              <ToggleRow label={t('theme.showSocial', 'روابط التواصل')} checked={footer.showSocialLinks !== false} onChange={(v) => updateConfig('footer.showSocialLinks', v)} />
              <ToggleRow label={t('theme.showNewsletter', 'الاشتراك البريدى')} checked={footer.showNewsletter !== false} onChange={(v) => updateConfig('footer.showNewsletter', v)} />
              <div>
                <Label className="text-sm font-medium text-neutral-700 mb-2 block">{t('theme.companyDesc', 'وصف الشركة')}</Label>
                <textarea value={footer.companyDescription || ''} onChange={(e) => updateConfig('footer.companyDescription', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-primary-500" rows={3} />
              </div>
            </div>
          </div>

          {/* ─── TRUST BADGES ─── */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <SectionHeader
              title="شعارات الثقة السعودية"
              description="فعّل الشارات الرسمية لإظهارها في متجرك. لن تظهر الشارة إلا بعد إدخال البيانات المطلوبة وتفعيل الإقرار."
            />
            <div className="space-y-4 mt-4">
              {([
                { key: 'businessPlatform', label: 'منصة الأعمال', desc: 'توثيق المتجر في منصة الأعمال السعودية', fields: ['verificationNumber', 'verificationUrl'] as const, numberLabel: 'رقم التوثيق', urlLabel: 'رابط التحقق' },
                { key: 'commercialRegistration', label: 'السجل التجاري', desc: 'توثيق السجل التجاري', fields: ['crNumber', 'verificationUrl'] as const, numberLabel: 'رقم السجل التجاري', urlLabel: 'رابط التحقق' },
                { key: 'unifiedQr', label: 'الرمز الإلكتروني الموحد QR', desc: 'رمز QR للتحقق من المتجر', fields: ['qrImageUrl', 'qrTargetUrl'] as const, numberLabel: '', urlLabel: 'رابط صورة QR' },
                { key: 'maroof', label: 'معروف', desc: 'خيار قديم (legacy) — يظهر فقط كشارة ثانوية', fields: ['maroofNumber', 'verificationUrl'] as const, numberLabel: 'رقم معروف', urlLabel: 'رابط التحقق' },
                { key: 'saudiMade', label: 'صنع في السعودية', desc: 'يتطلب عضوية وإقرار أهلية', fields: ['membershipNumber', 'verificationUrl', 'officialAssetUrl'] as const, numberLabel: 'رقم العضوية', urlLabel: 'رابط التحقق' },
                { key: 'vat', label: 'توثيق ضريبي (VAT)', desc: 'الرقم الضريبي الموثق', fields: ['vatNumber', 'verificationUrl'] as const, numberLabel: 'الرقم الضريبي', urlLabel: 'رابط التحقق' },
              ] as const).map(({ key, label, desc, fields, numberLabel, urlLabel }) => {
                const badge = (config.trustBadges || {})[key] as any || {};
                const isEnabled = badge?.enabled || false;
                const hasTerms = badge?.acceptedTerms || false;
                const statusOk = isEnabled && hasTerms && fields.some(f => badge?.[f]);
                const missing = [];
                if (isEnabled) {
                  if (!fields.some(f => badge?.[f])) missing.push('رقم/رابط');
                  if (!hasTerms) missing.push('الإقرار');
                }

                return (
                  <div key={key} className={`rounded-xl border p-4 space-y-3 transition-colors ${isEnabled ? 'border-neutral-300 bg-neutral-50' : 'border-neutral-200 bg-white'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm text-neutral-900">{label}</p>
                        <p className="text-xs text-neutral-500">{desc}</p>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(v) => updateConfig(`trustBadges.${key}.enabled`, v)}
                      />
                    </div>

                    {isEnabled && (
                      <>
                        {key === 'businessPlatform' && (
                          <>
                            <div>
                              <Label className="text-xs font-medium text-neutral-700 mb-1 block">{numberLabel}</Label>
                              <Input value={badge?.verificationNumber || ''} onChange={(e) => updateConfig(`trustBadges.${key}.verificationNumber`, e.target.value)} placeholder="رقم التوثيق في منصة الأعمال" />
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-neutral-700 mb-1 block">{urlLabel}</Label>
                              <Input value={badge?.verificationUrl || ''} onChange={(e) => updateConfig(`trustBadges.${key}.verificationUrl`, e.target.value)} placeholder="https://" dir="ltr" />
                            </div>
                          </>
                        )}
                        {key === 'commercialRegistration' && (
                          <>
                            <div>
                              <Label className="text-xs font-medium text-neutral-700 mb-1 block">{numberLabel}</Label>
                              <Input value={badge?.crNumber || ''} onChange={(e) => updateConfig(`trustBadges.${key}.crNumber`, e.target.value)} placeholder="رقم السجل التجاري" />
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-neutral-700 mb-1 block">{urlLabel}</Label>
                              <Input value={badge?.verificationUrl || ''} onChange={(e) => updateConfig(`trustBadges.${key}.verificationUrl`, e.target.value)} placeholder="https://" dir="ltr" />
                            </div>
                          </>
                        )}
                        {key === 'unifiedQr' && (
                          <>
                            <div>
                              <Label className="text-xs font-medium text-neutral-700 mb-1 block">رابط صورة QR</Label>
                              <Input value={badge?.qrImageUrl || ''} onChange={(e) => updateConfig(`trustBadges.${key}.qrImageUrl`, e.target.value)} placeholder="https://example.com/qr.png" dir="ltr" />
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-neutral-700 mb-1 block">رابط الهدف (اختياري)</Label>
                              <Input value={badge?.qrTargetUrl || ''} onChange={(e) => updateConfig(`trustBadges.${key}.qrTargetUrl`, e.target.value)} placeholder="https://" dir="ltr" />
                            </div>
                            {badge?.qrImageUrl && (
                              <div className="mt-2">
                                <p className="text-xs text-neutral-500 mb-1">معاينة QR:</p>
                                <img src={badge.qrImageUrl} alt="QR preview" className="h-12 w-12 object-contain border rounded" />
                              </div>
                            )}
                          </>
                        )}
                        {key === 'maroof' && (
                          <>
                            <div>
                              <Label className="text-xs font-medium text-neutral-700 mb-1 block">{numberLabel}</Label>
                              <Input value={badge?.maroofNumber || ''} onChange={(e) => updateConfig(`trustBadges.${key}.maroofNumber`, e.target.value)} placeholder="رقم معروف" />
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-neutral-700 mb-1 block">{urlLabel}</Label>
                              <Input value={badge?.verificationUrl || ''} onChange={(e) => updateConfig(`trustBadges.${key}.verificationUrl`, e.target.value)} placeholder="https://" dir="ltr" />
                            </div>
                            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">هذا الخيار قديم (legacy). إذا كانت منصة الأعمال مفعلة، ستكون هي شارة التوثيق الأساسية.</p>
                          </>
                        )}
                        {key === 'saudiMade' && (
                          <>
                            <div>
                              <Label className="text-xs font-medium text-neutral-700 mb-1 block">{numberLabel}</Label>
                              <Input value={badge?.membershipNumber || ''} onChange={(e) => updateConfig(`trustBadges.${key}.membershipNumber`, e.target.value)} placeholder="رقم العضوية" />
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-neutral-700 mb-1 block">{urlLabel}</Label>
                              <Input value={badge?.verificationUrl || ''} onChange={(e) => updateConfig(`trustBadges.${key}.verificationUrl`, e.target.value)} placeholder="https://" dir="ltr" />
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-neutral-700 mb-1 block">رابط أصل الشعار الرسمي (اختياري)</Label>
                              <Input value={badge?.officialAssetUrl || ''} onChange={(e) => updateConfig(`trustBadges.${key}.officialAssetUrl`, e.target.value)} placeholder="https://" dir="ltr" />
                            </div>
                            <ToggleRow
                              label="تأكيد العضوية"
                              description="أقر بأن المنتجات تحمل شعار صنع في السعودية بشكل قانوني"
                              checked={badge?.memberConfirmed || false}
                              onChange={(v) => updateConfig(`trustBadges.${key}.memberConfirmed`, v)}
                            />
                          </>
                        )}
                        {key === 'vat' && (
                          <>
                            <div>
                              <Label className="text-xs font-medium text-neutral-700 mb-1 block">{numberLabel}</Label>
                              <Input value={badge?.vatNumber || ''} onChange={(e) => updateConfig(`trustBadges.${key}.vatNumber`, e.target.value)} placeholder="الرقم الضريبي" />
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-neutral-700 mb-1 block">{urlLabel}</Label>
                              <Input value={badge?.verificationUrl || ''} onChange={(e) => updateConfig(`trustBadges.${key}.verificationUrl`, e.target.value)} placeholder="https://" dir="ltr" />
                            </div>
                          </>
                        )}

                        <div className="flex items-start gap-2 pt-1">
                          <input
                            type="checkbox"
                            id={`trust-terms-${key}`}
                            checked={hasTerms}
                            onChange={(e) => updateConfig(`trustBadges.${key}.acceptedTerms`, e.target.checked)}
                            className="mt-0.5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                          />
                          <label htmlFor={`trust-terms-${key}`} className="text-xs text-neutral-600 cursor-pointer">
                            أقر بأنني مخول باستخدام هذه الشارة/الشعار وأن البيانات المدخلة صحيحة، وأتحمل مسؤولية استخدامها.
                          </label>
                        </div>

                        <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg ${statusOk ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                          {statusOk ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              مستوفي — الشارة ستظهر في المتجر
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-3.5 w-3.5" />
                              ينقصه: {missing.join('، ')}
                            </>
                          )}
                        </div>
                      </>
                    )}

                    {!isEnabled && (
                      <p className="text-xs text-neutral-400">الشارة معطلة. فعّلها لإظهار خيارات الإعداد.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ─── SOCIAL LINKS ─── */}
        <TabsContent value="social" className="space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <SectionHeader title={t('theme.socialLinks', 'روابط التواصل الاجتماعي')} />
            <div className="space-y-4">
              {[
                { key: 'instagram', label: 'Instagram' },
                { key: 'twitter', label: 'X (Twitter)' },
                { key: 'tiktok', label: 'TikTok' },
                { key: 'snapchat', label: 'Snapchat' },
                { key: 'whatsapp', label: 'WhatsApp' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <Label className="text-sm font-medium text-neutral-700 mb-1 block">{label}</Label>
                  <Input value={socialLinks[key] || ''} onChange={(e) => updateConfig(`socialLinks.${key}`, e.target.value)} placeholder={`${label} URL...`} dir="ltr" />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ─── CUSTOM CSS ─── */}
        <TabsContent value="css" className="space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <SectionHeader title={t('theme.customCss', 'CSS مخصص')} description={t('theme.customCssDesc', 'أضف CSS مخصص. سيتم إضافته في head المتجر. تحذير: الأخطاء قد تؤثر على المظهر.')} />
            <textarea
              value={config.customCss || ''}
              onChange={(e) => updateConfig('customCss', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 font-mono text-sm focus:outline-none focus:border-primary-500"
              rows={12}
              dir="ltr"
              placeholder={'/* أضف CSS هنا */\n.button-custom {\n  background: red;\n}'}
            />
          </div>
        </TabsContent>

        {/* ─── ANALYTICS ─── */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <SectionHeader title={t('theme.analyticsSettings', 'إعدادات التحليلات')} description={t('theme.analyticsDesc', 'أضف أكواد التتبع من جوجل وفيسبوك')} />
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-neutral-700 mb-1 block">Google Tag Manager ID</Label>
                <Input value={config.analytics?.googleTagManagerId || ''} onChange={(e) => updateConfig('analytics.googleTagManagerId', e.target.value)} placeholder="GTM-XXXXXXX" dir="ltr" />
              </div>
              <div>
                <Label className="text-sm font-medium text-neutral-700 mb-1 block">Google Analytics ID</Label>
                <Input value={config.analytics?.googleAnalyticsId || ''} onChange={(e) => updateConfig('analytics.googleAnalyticsId', e.target.value)} placeholder="G-XXXXXXXXXX" dir="ltr" />
              </div>
              <div>
                <Label className="text-sm font-medium text-neutral-700 mb-1 block">Facebook Pixel ID</Label>
                <Input value={config.analytics?.facebookPixelId || ''} onChange={(e) => updateConfig('analytics.facebookPixelId', e.target.value)} placeholder="123456789" dir="ltr" />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
        );
      })()}
      </div>
      </div>

      {/* Live Preview */}
      <div className="flex-1 min-w-0 min-h-0 bg-neutral-100 flex flex-col">
        <div className="h-10 flex items-center justify-center gap-1 bg-white border-b border-neutral-200 shrink-0 px-2">
          <div className="flex items-center gap-0.5 bg-neutral-100 rounded-lg p-0.5">
            {[
              { id: 'desktop', icon: Monitor, label: 'Desktop' },
              { id: 'tablet', icon: Tablet, label: 'Tablet' },
              { id: 'mobile', icon: Smartphone, label: 'Mobile' },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setDeviceView(id as any)}
                className={`p-1.5 rounded-md transition-all ${deviceView === id ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}
                aria-label={label}
                title={label}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          {deviceView === 'desktop' && (
            <div className="flex items-center gap-0.5 bg-neutral-100 rounded-lg p-0.5 ms-2">
              <button
                type="button"
                onClick={() => setDesktopZoom('fit')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${desktopZoom === 'fit' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                ملاءمة
              </button>
              <button
                type="button"
                onClick={() => setDesktopZoom('actual')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${desktopZoom === 'actual' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                100%
              </button>
            </div>
          )}
        </div>
        <div
          ref={previewPaneRef}
          className={`flex-1 min-h-0 p-4 ${deviceView === 'desktop' && desktopZoom === 'actual' ? 'overflow-auto' : 'overflow-hidden'}`}
          dir={deviceView === 'desktop' ? 'ltr' : 'rtl'}
        >
          {storeSlug && isPreviewMeasured ? (
            deviceView === 'desktop' ? (
              <div
                className="mx-auto overflow-hidden shrink-0"
                style={{ width: frameWidth, height: frameHeight }}
                dir="ltr"
              >
                <div
                  className="origin-top-left shadow-xl border border-neutral-200 bg-white"
                  style={{ width: deviceViewport.width, height: iframeHeight, transform: `scale(${previewScale})` }}
                >
                  <iframe
                    ref={iframeRef}
                    src={`${storefrontUrl}/s/${storeSlug}?preview=1`}
                    className="w-full border-0 bg-white"
                    style={{ height: iframeHeight }}
                    title="معاينة حية"
                    onLoad={handleIframeLoad}
                  />
                </div>
              </div>
            ) : (
              <div
                className="mx-auto shadow-2xl rounded-3xl overflow-hidden border-8 border-neutral-800 shrink-0"
                style={{ width: frameWidth, height: frameHeight }}
                dir="ltr"
              >
                <div className="origin-top-left bg-white" style={{ width: deviceViewport.width, height: iframeHeight, transform: `scale(${previewScale})` }}>
                  <iframe
                    ref={iframeRef}
                    src={`${storefrontUrl}/s/${storeSlug}?preview=1`}
                    className="w-full border-0 bg-white"
                    style={{ height: iframeHeight }}
                    title="معاينة حية"
                    onLoad={handleIframeLoad}
                  />
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-400 text-sm">
              جاري تحميل المعاينة...
            </div>
          )}
        </div>
      </div>

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
