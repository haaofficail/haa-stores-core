import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(__dirname, '..');

function read(path: string): string {
  return readFileSync(resolve(projectRoot, path), 'utf-8');
}

describe('Storefront buyer phone inputs — RTL-safe tel entry', () => {
  const cases = [
    {
      name: 'checkout customer phone',
      source: read('apps/storefront/src/pages/Checkout.tsx'),
      marker: "label={`${t('checkout.phone')} *`",
    },
    {
      name: 'marketplace checkout customer phone',
      source: read('apps/storefront/src/pages/MarketplaceCheckout.tsx'),
      marker: 'label="الجوال *"',
    },
    {
      name: 'manual order tracking phone',
      source: read('apps/storefront/src/pages/TrackOrder.tsx'),
      marker: "label={t('track.phone','رقم الجوال')}",
    },
    {
      name: 'order success recovery phone',
      source: read('apps/storefront/src/pages/OrderSuccess.tsx'),
      marker: "placeholder={t('track.phone')}",
    },
    {
      name: 'track result recovery phone',
      source: read('apps/storefront/src/pages/TrackOrderResult.tsx'),
      marker: "placeholder={t('track.phone', 'رقم الجوال')}",
    },
  ];

  it.each(cases)('$name declares tel semantics and LTR direction', ({ source, marker }) => {
    const index = source.indexOf(marker);
    expect(index).toBeGreaterThanOrEqual(0);
    const block = source.slice(Math.max(0, index - 250), index + 500);
    expect(block).toContain('type="tel"');
    expect(block).toContain('inputMode="tel"');
    expect(block).toContain('autoComplete="tel"');
    expect(block).toContain('dir="ltr"');
    expect(block).toContain('className="text-start');
  });

  it('support phone input uses native tel attributes with LTR visual entry', () => {
    const support = read('apps/storefront/src/pages/Support.tsx');
    const index = support.indexOf("{t('support.phone')}");
    expect(index).toBeGreaterThanOrEqual(0);
    const block = support.slice(index, index + 900);
    expect(block).toContain('type="tel"');
    expect(block).toContain('inputMode="tel"');
    expect(block).toContain('autoComplete="tel"');
    expect(block).toContain('dir="ltr"');
    expect(block).toContain('text-start');
  });
});
