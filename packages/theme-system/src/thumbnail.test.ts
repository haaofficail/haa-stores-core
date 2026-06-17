import { describe, it, expect } from 'vitest';
import { generateThemeThumbnail } from './thumbnail';

const COLORS = { primary: '#58a1e2', surface1: '#ffffff', surface2: '#f8f9fa', surface3: '#f1f3f5', textPrimary: '#1a1a1a', textSecondary: '#6b7280', textTertiary: '#9ca3af', border: '#e5e7eb', borderHover: '#d1d5db', success: '#10b981', warning: '#f59e0b', error: '#ef4444' };

describe('generateThemeThumbnail', () => {
  it('returns a data URI', () => {
    const uri = generateThemeThumbnail(COLORS);
    expect(uri).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it('returns a non-empty string', () => {
    const uri = generateThemeThumbnail(COLORS);
    expect(uri.length).toBeGreaterThan(100);
  });

  it('contains primary color', () => {
    const uri = generateThemeThumbnail(COLORS);
    const decoded = atob(uri.split(',')[1]);
    expect(decoded).toContain('#58a1e2');
  });

  it('contains surface1 color', () => {
    const uri = generateThemeThumbnail(COLORS);
    const decoded = atob(uri.split(',')[1]);
    expect(decoded).toContain('#ffffff');
  });

  it('generates valid SVG with correct dimensions', () => {
    const uri = generateThemeThumbnail(COLORS);
    const decoded = atob(uri.split(',')[1]);
    expect(decoded).toContain('width="600"');
    expect(decoded).toContain('height="450"');
    expect(decoded).toContain('<svg');
    expect(decoded).toContain('</svg>');
  });

  it('works with dark theme colors', () => {
    const darkColors = { ...COLORS, primary: '#60a5fa', surface1: '#111827', surface2: '#1f2937', textPrimary: '#f9fafb' };
    const uri = generateThemeThumbnail(darkColors);
    const decoded = atob(uri.split(',')[1]);
    expect(decoded).toContain('#60a5fa');
    expect(decoded).toContain('#111827');
  });

  it('generates different thumbnails for different themes', () => {
    const uri1 = generateThemeThumbnail(COLORS);
    const uri2 = generateThemeThumbnail({ ...COLORS, primary: '#b8860b' });
    expect(uri1).not.toBe(uri2);
  });
});
