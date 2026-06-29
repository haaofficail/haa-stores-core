import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(__dirname, '..');

function read(path: string): string {
  return readFileSync(resolve(projectRoot, path), 'utf-8');
}

describe('Merchant theme editor ARIA controls', () => {
  it('names preview device and zoom toggle buttons with pressed state', () => {
    const source = read('apps/merchant-dashboard/src/pages/theme-editor/PreviewPane.tsx');
    const deviceIndex = source.indexOf('aria-label={`عرض المعاينة على ${label}`}');

    expect(deviceIndex).toBeGreaterThanOrEqual(0);
    const deviceBlock = source.slice(deviceIndex - 500, deviceIndex + 350);
    expect(deviceBlock).toContain('type="button"');
    expect(deviceBlock).toContain('min-h-11 min-w-11');
    expect(source).toContain("label: 'سطح المكتب'");
    expect(source).toContain("label: 'الجهاز اللوحي'");
    expect(source).toContain("label: 'الجوال'");
    expect(deviceBlock).toContain('aria-pressed={deviceView === id}');
    expect(deviceBlock).toContain('aria-hidden="true"');

    expect(source).toContain('aria-label="ملاءمة معاينة سطح المكتب"');
    expect(source).toContain("aria-pressed={desktopZoom === 'fit'}");
    expect(source).toContain('aria-label="عرض معاينة سطح المكتب بنسبة 100%"');
    expect(source).toContain("aria-pressed={desktopZoom === 'actual'}");
  });

  it('exposes homepage section disclosure state and named icon actions', () => {
    const source = read('apps/merchant-dashboard/src/pages/theme-editor/tabs/HomepageTab.tsx');
    const groupIndex = source.indexOf("const orderPanelId = 'theme-homepage-sections-panel';");

    expect(groupIndex).toBeGreaterThanOrEqual(0);
    const block = source.slice(groupIndex, groupIndex + 6500);
    expect(block).toContain('aria-expanded={HOMEPAGE_SECTIONS_EDITOR_ENABLED ? !collapsedGroups.order : false}');
    expect(block).toContain('aria-controls={orderPanelId}');
    expect(block).toContain('id={orderPanelId}');
    expect(block).toContain('const sectionPanelId = `theme-homepage-section-panel-${sid}`;');
    expect(block).toContain('if (e.target !== e.currentTarget) return;');
    expect(block).toContain("if (e.key === 'Enter' || e.key === ' ')");
    expect(block).toContain('aria-expanded={isExpanded}');
    expect(block).toContain('aria-controls={sectionPanelId}');
    expect(block).toContain("aria-label={`${isExpanded ? 'طي' : 'فتح'} قسم ${sectionLabel}. استخدم سهم أعلى أو سهم أسفل لتغيير الترتيب`}");
    expect(source).toContain('aria-label={visibilityLabel}');
    expect(source).toContain('aria-label={duplicateLabel}');
    expect(source).toContain('aria-label={deleteLabel}');
  });

  it('names theme section image and brand removal controls', () => {
    const source = read('apps/merchant-dashboard/src/pages/theme-editor/SectionEditors.tsx');

    expect(source).toContain('aria-label="إزالة صورة سطح المكتب للبنر"');
    expect(source).toContain('title="إزالة صورة سطح المكتب للبنر"');
    expect(source).toContain('aria-label="إزالة صورة الجوال للبنر"');
    expect(source).toContain('aria-label="إزالة صورة قسم النص والصورة"');
    expect(source).toContain('aria-label={`إزالة صورة البراند ${item.name || i + 1}`}');
    expect(source).toContain('aria-label={`حذف البراند ${item.name || i + 1}`}');
    expect(source).toContain('className="absolute top-0.5 end-0.5');
    expect(source).toContain('<span aria-hidden="true">X</span>');
  });

  it('marks theme editor choice chips as pressed selections', () => {
    const source = read('apps/merchant-dashboard/src/pages/theme-editor/SectionEditors.tsx');

    expect(source).toContain("aria-label={`نوع رابط البنر: ${{ all: 'الكل', category: 'قسم', product: 'منتج', custom: 'مخصص' }[lt]}`}");
    expect(source).toContain("aria-pressed={(settings.linkType || 'all') === lt}");
    expect(source).toContain("aria-label={`مصدر المنتجات: ${{ manual: 'يدوي', category: 'تصنيف', newest: 'الأحدث', bestSellers: 'الأكثر مبيعاً', discounted: 'مخفضة', featured: 'مميزة' }[src]}`}");
    expect(source).toContain('aria-pressed={(settings.source || section.type) === src}');
    expect(source).toContain("aria-label={`${isSelected ? 'إزالة تصنيف' : 'إضافة تصنيف'} ${cat.name} من قسم التصنيفات`}");
    expect(source).toContain('aria-pressed={isSelected}');
  });
});
