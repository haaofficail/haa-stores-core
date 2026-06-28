import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { escapeHtmlText } from '../apps/merchant-dashboard/src/lib/html';

const ordersSource = readFileSync(new URL('../apps/merchant-dashboard/src/pages/Orders.tsx', import.meta.url), 'utf-8');
const orderDetailSource = readFileSync(
  new URL('../apps/merchant-dashboard/src/pages/orders/OrderDetailDialog.tsx', import.meta.url),
  'utf-8',
);

describe('merchant dashboard print HTML escaping', () => {
  it('escapes text before inserting merchant-controlled values into print windows', () => {
    expect(escapeHtmlText(`</body><img src=x onerror=alert('x')>&"`)).toBe(
      '&lt;/body&gt;&lt;img src=x onerror=alert(&#39;x&#39;)&gt;&amp;&quot;',
    );
  });

  it('uses HTML escaping, not CSV escaping, for order bulk print markup', () => {
    expect(ordersSource).toContain("from '@/lib/html'");
    expect(ordersSource).toContain('const safeHtml = (v: unknown) => escapeHtmlText(v)');
    expect(ordersSource).not.toContain('const safe = (v: string) => escapeCsvCell(v)');
  });

  it('escapes legacy gift messages before print document.write', () => {
    expect(orderDetailSource).toContain("from '@/lib/html'");
    expect(orderDetailSource).toContain('const safeMessage = escapeHtmlText(msg)');
    expect(orderDetailSource).not.toContain('<body>"${msg}"</body>');
  });
});
