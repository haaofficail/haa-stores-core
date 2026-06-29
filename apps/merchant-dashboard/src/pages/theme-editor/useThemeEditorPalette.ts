import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { categoriesApi, productsApi, settingsApi } from '@/lib/api';
import {
  getThemeDefaultConfig,
  getThemeManifest,
  resolveActiveThemeConfig,
} from '@haa/theme-system/server';
import type { CategoryItem, ProductItem, ThemeConfig } from './constants';

/**
 * useThemeEditorPalette — centralizes ThemeEditor state, undo/redo, and data loading.
 *
 * Behavior is a verbatim extraction from ThemeEditor.tsx; visual + behavioral parity
 * preserved. Anything that previously lived in component-scope refs/useState lives here.
 */
export function useThemeEditorPalette(storeId: number | null | undefined) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<ThemeConfig>(() => resolveActiveThemeConfig() as ThemeConfig);
  const [isDirty, setIsDirty] = useState(false);
  const [history, setHistory] = useState<Array<{ config: ThemeConfig } & Record<string, unknown>>>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);

  const undoStack = useRef<ThemeConfig[]>([]);
  const redoStack = useRef<ThemeConfig[]>([]);
  const isUndoing = useRef(false);
  const lastUndoPath = useRef('');
  const lastUndoTime = useRef(0);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    if (!storeId) return;
    categoriesApi.list(storeId).then((rows) => setCategories(rows as CategoryItem[])).catch(() => toast.error('فشل تحميل التصنيفات'));
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    productsApi.list(storeId, { limit: 100 }).then(raw => { const res = raw as { data: ProductItem[] }; setProducts(res.data); }).catch(() => toast.error('فشل تحميل المنتجات'));
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    Promise.all([
      settingsApi.getTheme(storeId),
      settingsApi.getThemeHistory(storeId),
    ])
      .then(([cfg, hist]) => { setConfig(resolveActiveThemeConfig(cfg as Parameters<typeof resolveActiveThemeConfig>[0])); setIsDirty(false); setHistory(hist as Array<{ config: ThemeConfig } & Record<string, unknown>>); })
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false));
  }, [storeId, t]);

  const updateConfig = useCallback((path: string, value: unknown) => {
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
      const newConfig = structuredClone(prev) as unknown as Record<string, unknown>;
      let obj: Record<string, unknown> = newConfig;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]] as Record<string, unknown>;
      }
      obj[keys[keys.length - 1]] = value;
      return newConfig as unknown as ThemeConfig;
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

  const resetUndoHistory = useCallback(() => {
    undoStack.current = [];
    redoStack.current = [];
  }, []);

  return {
    // state
    loading,
    config,
    setConfig,
    isDirty,
    setIsDirty,
    history,
    setHistory,
    categories,
    products,
    // refs
    undoStack,
    redoStack,
    configRef,
    // actions
    updateConfig,
    handleUndo,
    handleRedo,
    applyPreset,
    resetUndoHistory,
  };
}

export type UseThemeEditorPaletteReturn = ReturnType<typeof useThemeEditorPalette>;
