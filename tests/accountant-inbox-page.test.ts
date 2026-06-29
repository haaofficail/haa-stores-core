import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const read = (p: string) => (existsSync(resolve(root, p)) ? readFileSync(resolve(root, p), 'utf-8') : '');

const app = read('apps/admin-dashboard/src/App.tsx');
const page = read('apps/admin-dashboard/src/pages/AccountantInbox.tsx');

/**
 * Batch 3 — Accountant inbox UI contract.
 *
 * Covers: the page is route-guarded (not UI-hidden only), shows in the finance
 * nav group with the finance permission, has loading/empty/error states, never
 * renders a full IBAN, and the accountant lands on it (no dashboard:view).
 */
describe('accountant inbox page is route-guarded', () => {
  it('registers the inbox route wrapped in AdminPermissionRoute(wallet.payout.view_all)', () => {
    expect(app).toMatch(
      /path="\/finance\/settlement-inbox"[\s\S]*?AdminPermissionRoute permission="wallet\.payout\.view_all"[\s\S]*?AccountantInbox/,
    );
  });

  it('lists the inbox in the finance nav group with the finance permission', () => {
    expect(app).toContain('/finance/settlement-inbox|صندوق التسويات|Inbox|wallet.payout.view_all');
  });
});

describe('accountant lands on the inbox (finance-only, no dashboard:view)', () => {
  it('AdminHome redirects finance-only roles to the settlement inbox', () => {
    expect(app).toMatch(/function AdminHome/);
    expect(app).toMatch(/wallet\.payout\.view_all[\s\S]*?Navigate to="\/finance\/settlement-inbox"/);
  });

  it('non-finance nav items keep non-finance permissions (hidden from accountant)', () => {
    expect(app).toContain('/tenants|التجار|Users|tenants.read');
    expect(app).toContain('/admin-users|المستخدمون|UserCog|users.read');
  });
});

describe('accountant inbox page has required UI states and is read-only-safe', () => {
  it('has loading, empty and error states', () => {
    expect(page).toMatch(/AdminTableSkeleton/); // loading
    expect(page).toMatch(/ErrorState/); // error
    expect(page).toMatch(/لا توجد تسويات جاهزة|لا توجد استثناءات/); // empty
  });

  it('has a ready tab and an exceptions tab with a reason column', () => {
    expect(page).toMatch(/جاهزة للتحويل/);
    expect(page).toMatch(/استثناءات/);
    expect(page).toMatch(/سبب المنع/);
  });

  it('never renders a full IBAN — only the masked last 4', () => {
    expect(page).toMatch(/ibanLast4/);
    // no full-IBAN field access and no raw `iban` property usage
    expect(page).not.toMatch(/\.iban\b/);
  });
});
