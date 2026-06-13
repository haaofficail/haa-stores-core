import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getAllThemeManifests, getDefaultThemeKey } from '../packages/theme-system/src/themeRegistry';

describe('Theme Store default theme regression', () => {
  it('includes the platform default theme even when it is a config preset', () => {
    const defaultThemeKey = getDefaultThemeKey();
    const visibleThemeKeys = getAllThemeManifests()
      .filter(theme => theme.kind === 'runtime' || theme.themeKey === defaultThemeKey)
      .map(theme => theme.themeKey);

    expect(defaultThemeKey).toBe('minimal');
    expect(getAllThemeManifests().find(theme => theme.themeKey === defaultThemeKey)?.kind).toBe('config-preset');
    expect(visibleThemeKeys).toContain(defaultThemeKey);
    expect(visibleThemeKeys).toContain('luxury-showcase');
  });

  it('ThemeStore does not hide the default theme behind a runtime-only filter', () => {
    const source = readFileSync(join(process.cwd(), 'apps/merchant-dashboard/src/pages/ThemeStore.tsx'), 'utf-8');

    expect(source).toContain('getDefaultThemeKey');
    expect(source).toContain("theme.kind === 'runtime' || theme.themeKey === getDefaultThemeKey()");
    expect(source).not.toContain("const RUNTIME_THEMES = getAllThemeManifests().filter(t => t.kind === 'runtime')");
  });
});
