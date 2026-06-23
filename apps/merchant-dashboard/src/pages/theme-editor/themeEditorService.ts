import { settingsApi } from '@/lib/api';
import { validateThemeConfig } from '@haa/theme-system/server';
import { ANALYTICS_PATTERNS, type ThemeConfig } from './constants';

/**
 * themeEditorService — pure-ish IO helpers extracted from ThemeEditor.tsx.
 *
 * No UI side-effects (no toast / setState here); callers wrap with their own UX.
 * Behavior verbatim from the original component.
 */

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: 'validation'; errors: string[] }
  | { ok: false; reason: 'analytics'; field: string }
  | { ok: false; reason: 'request'; error: unknown };

export async function saveThemeConfig(storeId: number, config: ThemeConfig): Promise<SaveResult> {
  const validation = validateThemeConfig(config as any);
  if (!validation.valid) {
    return { ok: false, reason: 'validation', errors: validation.errors.slice(0, 3) };
  }
  const analytics = config.analytics || {};
  for (const [key, pattern] of Object.entries(ANALYTICS_PATTERNS)) {
    const val = (analytics as any)[key];
    if (val && !pattern.test(val)) {
      return { ok: false, reason: 'analytics', field: key };
    }
  }
  try {
    await settingsApi.updateTheme(storeId, config);
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: 'request', error };
  }
}

export function exportThemeConfig(config: ThemeConfig): void {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `theme-${config.preset || 'custom'}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export type ImportResult =
  | { ok: true; config: ThemeConfig }
  | { ok: false; reason: 'validation'; errors: string[] }
  | { ok: false; reason: 'parse' };

export async function importThemeFile(file: File, current: ThemeConfig): Promise<ImportResult> {
  try {
    const text = await file.text();
    const imported = JSON.parse(text);
    const nextConfig = { ...current, ...imported };
    const validation = validateThemeConfig(nextConfig as any);
    if (!validation.valid) {
      return { ok: false, reason: 'validation', errors: validation.errors.slice(0, 3) };
    }
    return { ok: true, config: nextConfig };
  } catch {
    return { ok: false, reason: 'parse' };
  }
}

export async function rollbackThemeConfig(storeId: number, config: ThemeConfig): Promise<{ ok: true } | { ok: false; error: unknown }> {
  try {
    await settingsApi.updateTheme(storeId, config);
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

/**
 * Validates the magic bytes of an uploaded image. Returns an Arabic error string
 * when invalid, or `null` when the file is accepted.
 */
export async function validateImageFile(file: File): Promise<string | null> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return 'الصيغة غير مدعومة. يرجى اختيار JPG, PNG أو WebP';
  }
  if (file.size > 5 * 1024 * 1024) return 'حجم الصورة يتجاوز 5MB';
  const header = await file.slice(0, 8).arrayBuffer();
  const bytes = new Uint8Array(header);
  const isJPEG = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
  const isPNG = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
  const isWebP = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  if (!isJPEG && !isPNG && !isWebP) return 'الملف لا يحمل توقيع صورة صحيح (magic bytes)';
  return null;
}
