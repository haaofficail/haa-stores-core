import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ComplianceChecklistService, type ComplianceCheckInput } from '../packages/commerce-core/src/compliance-checklist';
import { storeSettings } from '../packages/db/src/schema/stores';

const ROOT = path.resolve(__dirname, '..');
const SCHEMA_FILE = path.join(ROOT, 'packages/db/src/schema/stores.ts');
const CHECKLIST_FILE = path.join(ROOT, 'packages/commerce-core/src/compliance-checklist.ts');
const SETTINGS_ROUTE_FILE = path.join(ROOT, 'apps/api/src/routes/settings.ts');
const MIGRATION_FILE = path.join(ROOT, 'packages/db/src/migrations/0082_store_settings_compliance.sql');
const JOURNAL_FILE = path.join(ROOT, 'packages/db/src/migrations/meta/_journal.json');

function makeFullInput(overrides: Partial<ComplianceCheckInput> = {}): ComplianceCheckInput {
  return {
    storeId: 1,
    tenantId: 1,
    kycProfile: {
      businessType: 'company',
      legalName: 'شركة أختبار',
      commercialRegistrationNumber: '1010123456',
      vatNumber: '310123456700003',
      address: 'الرياض، حي العليا',
    },
    store: {
      email: 'support@test.com',
      phone: '966501234567',
    },
    policies: [
      { type: 'privacy', isPublished: true, content: 'سياسة الخصوصية — نقوم بجمع البيانات لأغراض تحسين الخدمة. مشاركة البيانات مع مزودي الخدمة. حقوق صاحب البيانات: الوصول والتصحيح. للتواصل: support@test.com' },
      { type: 'terms', isPublished: true, content: 'الشروط والأحكام' },
      { type: 'shipping', isPublished: true, content: 'سياسة الشحن' },
      { type: 'returns', isPublished: true, content: 'سياسة الاسترجاع' },
    ],
    paymentMethods: [{ enabled: true }],
    shippingMethods: [{ estimatedDeliveryDays: '3-5' }],
    settings: {
      returnWindowDays: 14,
      delayCancellationNotice: null,
      excludedReturnCategories: ['digital'],
    },
    ...overrides,
  };
}

describe('Publish Checklist — schema wiring (Bug 1 fix)', () => {
  it('storeSettings drizzle table defines returnWindowDays', () => {
    expect((storeSettings as any).returnWindowDays).toBeDefined();
  });

  it('storeSettings drizzle table defines excludedReturnCategories', () => {
    expect((storeSettings as any).excludedReturnCategories).toBeDefined();
  });

  it('storeSettings drizzle table defines delayCancellationNotice', () => {
    expect((storeSettings as any).delayCancellationNotice).toBeDefined();
  });

  it('schema file declares the three compliance columns (source grep)', () => {
    const source = readFileSync(SCHEMA_FILE, 'utf8');
    expect(source).toMatch(/returnWindowDays:\s*integer\('return_window_days'\)/);
    expect(source).toMatch(/excludedReturnCategories:\s*jsonb\('excluded_return_categories'\)/);
    expect(source).toMatch(/delayCancellationNotice:\s*text\('delay_cancellation_notice'\)/);
  });

  it('gatherData reads from the new storeSettings columns (source grep)', () => {
    const source = readFileSync(CHECKLIST_FILE, 'utf8');
    expect(source).toContain('storeSettings?.returnWindowDays');
    expect(source).toContain('storeSettings?.excludedReturnCategories');
    expect(source).toContain('storeSettings?.delayCancellationNotice');
  });

  it('gatherData no longer hardcodes returnWindowDays: null', () => {
    const source = readFileSync(CHECKLIST_FILE, 'utf8');
    expect(source).not.toMatch(/returnWindowDays:\s*null/);
  });

  it('gatherData no longer wrongly maps pickupInstructions to delayCancellationNotice', () => {
    const source = readFileSync(CHECKLIST_FILE, 'utf8');
    // The bad mapping `delayCancellationNotice: storeSettings?.pickupInstructions` must be gone.
    expect(source).not.toMatch(/delayCancellationNotice:\s*storeSettings\?\.pickupInstructions/);
  });
});

describe('Publish Checklist — migration 0082', () => {
  it('migration SQL exists and is additive (ADD COLUMN IF NOT EXISTS)', () => {
    const sql = readFileSync(MIGRATION_FILE, 'utf8');
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS "return_window_days"/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS "excluded_return_categories"/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS "delay_cancellation_notice"/);
  });

  it('migration SQL contains no destructive operations (statements only)', () => {
    const sql = readFileSync(MIGRATION_FILE, 'utf8');
    // Strip SQL line comments so the human-readable header copy ("no DROP / RENAME")
    // doesn't trip the safety grep — we care only about executable statements.
    const statements = sql
      .split(/\r?\n/)
      .filter(line => !/^\s*--/.test(line))
      .join('\n');
    expect(statements).not.toMatch(/\bDROP\b/i);
    expect(statements).not.toMatch(/\bRENAME\b/i);
  });

  it('journal references the 0082 migration tag', () => {
    const journal = JSON.parse(readFileSync(JOURNAL_FILE, 'utf8'));
    const tags = journal.entries.map((e: { tag: string }) => e.tag);
    expect(tags).toContain('0082_store_settings_compliance');
  });
});

describe('Publish Checklist — check() unit behaviour', () => {
  const service = new ComplianceChecklistService(null as any);

  it('passing input shape → passed: true', () => {
    const result = service.check(makeFullInput());
    expect(result.passed).toBe(true);
    expect(result.blockingErrorsCount).toBe(0);
  });

  it('returnWindowDays: 0 → passed: false (still requires >= 7)', () => {
    const input = makeFullInput();
    input.settings = { ...input.settings, returnWindowDays: 0 };
    const result = service.check(input);
    expect(result.passed).toBe(false);
    const item = result.items.find(i => i.key === 'returnWindowDays');
    expect(item).toBeDefined();
    expect(item!.passed).toBe(false);
    expect(item!.severity).toBe('error');
  });

  it('returnWindowDays: 14 → returnWindowDays check passes', () => {
    const result = service.check(makeFullInput());
    const item = result.items.find(i => i.key === 'returnWindowDays');
    expect(item).toBeDefined();
    expect(item!.passed).toBe(true);
  });
});

describe('Publish Checklist — API endpoint deduped against /compliance/checklist', () => {
  // PR follow-up: the duplicate `/settings/publish-checklist` route was removed
  // in favour of the canonical `/api/compliance/checklist` route. Both called the
  // same ComplianceChecklistService.run with identical output. Merchant dashboard
  // consumes `/compliance/checklist` via complianceApi.getChecklist. This test
  // locks the dedupe — settings.ts must not re-introduce the duplicate.
  const source = readFileSync(SETTINGS_ROUTE_FILE, 'utf8');

  it('settings.ts does not re-introduce /publish-checklist route (deduped)', () => {
    expect(source).not.toContain("'/publish-checklist'");
  });

  it('settings.ts does not import ComplianceChecklistService (deduped)', () => {
    expect(source).not.toContain('ComplianceChecklistService');
  });
});
