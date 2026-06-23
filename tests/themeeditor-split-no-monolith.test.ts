// ThemeEditor monolith guard (perf P0).
//
// Locks in the structural split of `apps/merchant-dashboard/src/pages/
// ThemeEditor.tsx` from a 1378-LOC monolith into a thin composition shell
// (< 400 LOC) plus dedicated sub-modules under `theme-editor/`.
//
// If this test fails, ThemeEditor.tsx has grown back into a monolith or
// section editors / hooks have been re-inlined. Either:
//   (a) extract the new growth into a sibling file under `theme-editor/`,
//   (b) refactor sub-modules further before re-attempting the change.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const THEME_EDITOR = resolve(ROOT, 'apps/merchant-dashboard/src/pages/ThemeEditor.tsx');
const THEME_EDITOR_DIR = resolve(ROOT, 'apps/merchant-dashboard/src/pages/theme-editor');
const TABS_DIR = join(THEME_EDITOR_DIR, 'tabs');

function lineCount(file: string): number {
  return readFileSync(file, 'utf8').split('\n').length;
}

function listTsx(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((entry) => {
    const full = join(dir, entry);
    return statSync(full).isFile() && (entry.endsWith('.tsx') || entry.endsWith('.ts'));
  });
}

describe('ThemeEditor split (perf P0)', () => {
  it('ThemeEditor.tsx stays a composition shell under 400 LOC', () => {
    expect(existsSync(THEME_EDITOR)).toBe(true);
    const lines = lineCount(THEME_EDITOR);
    expect(lines, `ThemeEditor.tsx grew back to a monolith (${lines} LOC)`).toBeLessThan(400);
  });

  it('theme-editor/ directory exists with hook + service modules', () => {
    expect(existsSync(THEME_EDITOR_DIR)).toBe(true);
    expect(existsSync(join(THEME_EDITOR_DIR, 'useThemeEditorPalette.ts'))).toBe(true);
    expect(existsSync(join(THEME_EDITOR_DIR, 'themeEditorService.ts'))).toBe(true);
  });

  it('exposes 3+ section/tab editor files as separate modules', () => {
    // Section editors live in SectionEditors.tsx (banner/product/categories/...)
    // and per-concern Tab files live under theme-editor/tabs/.
    const tabFiles = listTsx(TABS_DIR).filter((f) => f.endsWith('Tab.tsx'));
    expect(tabFiles.length, `expected 3+ Tab files under theme-editor/tabs/, found ${tabFiles.length}`).toBeGreaterThanOrEqual(3);

    // Section editor module must remain a separate file from ThemeEditor.tsx.
    const sectionEditorsFile = join(THEME_EDITOR_DIR, 'SectionEditors.tsx');
    expect(existsSync(sectionEditorsFile)).toBe(true);
    const sectionSrc = readFileSync(sectionEditorsFile, 'utf8');
    // At minimum: Banner, Product, Categories section editors are externalized.
    expect(sectionSrc).toMatch(/export\s+function\s+BannerEditor\b/);
    expect(sectionSrc).toMatch(/export\s+function\s+ProductEditor\b/);
    expect(sectionSrc).toMatch(/export\s+function\s+CategoriesEditor\b/);
  });

  it('palette hook centralizes config/history/undo state', () => {
    const hookSrc = readFileSync(join(THEME_EDITOR_DIR, 'useThemeEditorPalette.ts'), 'utf8');
    expect(hookSrc).toMatch(/export\s+function\s+useThemeEditorPalette\b/);
    expect(hookSrc).toMatch(/undoStack/);
    expect(hookSrc).toMatch(/redoStack/);
    expect(hookSrc).toMatch(/updateConfig/);
  });

  it('service module owns save/import/export IO', () => {
    const svcSrc = readFileSync(join(THEME_EDITOR_DIR, 'themeEditorService.ts'), 'utf8');
    expect(svcSrc).toMatch(/saveThemeConfig/);
    expect(svcSrc).toMatch(/exportThemeConfig/);
    expect(svcSrc).toMatch(/importThemeFile/);
  });
});
