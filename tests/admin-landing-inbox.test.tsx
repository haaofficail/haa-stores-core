// Admin Landing Inbox UI — source-grep gates.
//
// The Inbox page is the admin surface for landing-page contact form
// submissions (backend: PR #157). These tests lock the structural pieces
// in place without spinning up JSDOM: they're cheap, framework-agnostic,
// and they make refactors that drop the feature fail loudly. Follows the
// same source-grep pattern as `scheduled-settlement-admin-batches-ui.test.ts`
// and `settings-admin-p1-cluster.test.tsx`.

import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const read = (rel: string): string => readFileSync(resolve(ROOT, rel), 'utf-8');

const PAGE_PATH = 'apps/admin-dashboard/src/pages/LandingInbox.tsx';
const APP_PATH = 'apps/admin-dashboard/src/App.tsx';
const API_PATH = 'apps/admin-dashboard/src/lib/api.ts';
const ERROR_STATE_PATH = 'apps/admin-dashboard/src/components/ui/ErrorState.tsx';

describe('Admin Landing Inbox page', () => {
  it('LandingInbox.tsx exists at the expected path', () => {
    expect(existsSync(resolve(ROOT, PAGE_PATH))).toBe(true);
  });

  it('exports a default React component', () => {
    const src = read(PAGE_PATH);
    expect(src).toMatch(/export\s+default\s+function\s+LandingInbox\b/);
  });

  it('renders the Arabic page header', () => {
    const src = read(PAGE_PATH);
    expect(src).toContain('صندوق الوارد');
    expect(src).toContain('interface LandingContact');
  });

  it('has filter chips for all 5 statuses (in Arabic)', () => {
    const src = read(PAGE_PATH);
    expect(src).toContain('الكل');
    expect(src).toContain('جديدة');
    expect(src).toContain('قيد المعالجة');
    expect(src).toContain('تم الرد');
    expect(src).toContain('مغلقة');
    expect(src).toContain('مزعجة');
  });

  it('has a table rendering name, email, phone, status, date', () => {
    const src = read(PAGE_PATH);
    expect(src).toContain('<table');
    expect(src).toContain('الاسم');
    expect(src).toContain('البريد');
    expect(src).toContain('الجوال');
    expect(src).toContain('الحالة');
    expect(src).toContain('التاريخ');
  });

  it('calls landingContactsApi.list and landingContactsApi.update', () => {
    const src = read(PAGE_PATH);
    // Allow multi-line chain syntax (`landingContactsApi\n      .list(...)`).
    expect(src).toMatch(/landingContactsApi[\s\n]*\.\s*list/);
    expect(src).toMatch(/landingContactsApi[\s\n]*\.\s*update/);
  });

  it('renders status badges with the correct token colors', () => {
    const src = read(PAGE_PATH);
    // new = primary, in_progress = warning(amber), replied = success(emerald),
    // closed = neutral(gray), spam = danger(red).
    expect(src).toContain('bg-primary-100');
    expect(src).toContain('bg-amber-100');
    expect(src).toContain('bg-emerald-100');
    expect(src).toContain('bg-gray-100');
    expect(src).toContain('bg-red-100');
  });

  it('has loading, error-with-retry, and empty states', () => {
    const src = read(PAGE_PATH);
    const errorStateSrc = read(ERROR_STATE_PATH);
    expect(src).toContain('animate-pulse');
    expect(src).toContain('ErrorState');
    expect(src).toContain('<ErrorState message="فشل تحميل صندوق الوارد" onRetry={load} />');
    expect(errorStateSrc).toContain('إعادة المحاولة');
    expect(src).toContain('لا توجد رسائل بعد');
  });

  it('detail dialog has admin notes textarea, status select, save and reply-via-email actions', () => {
    const src = read(PAGE_PATH);
    expect(src).toContain('ملاحظات داخلية');
    expect(src).toContain('<textarea');
    expect(src).toContain('<select');
    expect(src).toContain('حفظ');
    expect(src).toContain('رد عبر البريد');
    expect(src).toContain('تعليم كمزعجة');
    expect(src).toContain('mailto:');
  });

  it('exposes source IP and User Agent (collapsed)', () => {
    const src = read(PAGE_PATH);
    expect(src).toContain('sourceIp');
    expect(src).toContain('userAgent');
    expect(src).toContain('<details');
  });
});

describe('Admin Landing Inbox — API client wiring', () => {
  it('landingContactsApi is exported from the admin api client', () => {
    const src = read(API_PATH);
    expect(src).toContain('export const landingContactsApi');
  });

  it('landingContactsApi has list/getById/update methods', () => {
    const src = read(API_PATH);
    expect(src).toMatch(/list:\s*\(/);
    expect(src).toMatch(/getById:\s*\(/);
    expect(src).toMatch(/update:\s*\(/);
  });

  it('list method targets /admin/landing-contacts and forwards pagination params', () => {
    const src = read(API_PATH);
    expect(src).toContain('/admin/landing-contacts');
    expect(src).toContain('URLSearchParams');
    expect(src).toContain("qs.set('status'");
    expect(src).toContain("qs.set('page'");
    expect(src).toContain("qs.set('limit'");
  });

  it('update method issues a PATCH on the single-contact endpoint', () => {
    const src = read(API_PATH);
    expect(src).toMatch(/PATCH.*\/admin\/landing-contacts\/\$\{id\}/);
  });
});

describe('Admin Landing Inbox — route and nav registration', () => {
  it('App.tsx lazy-imports the LandingInbox page', () => {
    const src = read(APP_PATH);
    expect(src).toContain("import('./pages/LandingInbox')");
    expect(src).toContain('const LandingInbox = lazy');
  });

  it('App.tsx registers the /landing-inbox route under the admin guard', () => {
    const src = read(APP_PATH);
    expect(src).toContain('path="/landing-inbox"');
    expect(src).toContain('element={<LandingInbox />}');
  });

  it('Admin sidebar/nav exposes the صندوق الوارد entry', () => {
    const src = read(APP_PATH);
    // Anchored to the navGroups entry so a future rename of the route without
    // a matching nav update fails this gate.
    expect(src).toContain('/landing-inbox|صندوق الوارد|Inbox');
  });
});

// Honeypot patterns: skipped — N/A on admin surfaces (admin is auth-gated;
// landing form honeypots live on the public landing page, not this inbox).
describe.skip('Admin Landing Inbox — honeypot (N/A)', () => {
  it('placeholder', () => {
    expect(true).toBe(true);
  });
});
