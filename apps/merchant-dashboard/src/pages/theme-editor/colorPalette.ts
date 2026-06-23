// Color palette + HSL helpers extracted verbatim from ThemeEditor.tsx.
// No behavior change — pure data + pure functions.

export const COLOR_GROUPS = [
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

export function hexToHsl(hex: string): [number, number, number] {
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

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function getColorGroups(hex: string) {
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
