import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const read = (p: string) => (existsSync(resolve(root, p)) ? readFileSync(resolve(root, p), 'utf-8') : '');

const app = read('apps/admin-dashboard/src/App.tsx');
const inbox = read('apps/admin-dashboard/src/pages/AccountantInbox.tsx');
const page = read('apps/admin-dashboard/src/pages/AccountantSettlementDetail.tsx');
const api = read('apps/admin-dashboard/src/lib/api.ts');

/**
 * Batch 4 UI — accountant settlement detail page (source-grep gates, the
 * repo's framework-agnostic UI test pattern — no JSDOM).
 */

describe('detail route + inbox link', () => {
  it('registers /finance/settlements/:payoutId guarded by the finance permission', () => {
    expect(app).toMatch(
      /path="\/finance\/settlements\/:payoutId"[\s\S]*?AdminPermissionRoute permission="wallet\.payout\.view_all"[\s\S]*?AccountantSettlementDetail/,
    );
  });

  it('inbox links each row to the detail page (no transfer buttons in the table)', () => {
    expect(inbox).toMatch(/\/finance\/settlements\//);
    expect(inbox).toMatch(/تفاصيل/);
    // no direct money actions in the table
    expect(inbox).not.toMatch(/بدء التحويل/);
  });
});

describe('detail page consumes the backend and masks the IBAN', () => {
  it('fetches accountant-detail', () => {
    expect(page).toMatch(/getAccountantDetail/);
  });

  it('shows the masked IBAN only by default (no full IBAN render)', () => {
    expect(page).toMatch(/maskedIban|ibanLast4/);
    expect(page).not.toMatch(/\.iban\b/);
  });

  it('reveals IBAN only via the reveal route (view + copy)', () => {
    expect(page).toMatch(/revealIban/);
    expect(page).toMatch(/['"]view['"]/);
    expect(page).toMatch(/['"]copy['"]/);
    expect(page).toMatch(/عرض IBAN/);
    expect(page).toMatch(/نسخ IBAN/);
  });
});

describe('start transfer + idempotency', () => {
  it('start-transfer uses the existing payout transition with an idempotency key', () => {
    expect(page).toMatch(/markTransferPending|markTransferred/);
    expect(page).toMatch(/newIdempotencyKey|idempotencyKey/);
  });

  it('the API client sends an Idempotency-Key header for sensitive actions', () => {
    expect(api).toMatch(/Idempotency-Key/);
    expect(api).toMatch(/newIdempotencyKey/);
    expect(api).toMatch(/getAccountantDetail/);
    expect(api).toMatch(/revealIban/);
  });
});

describe('receipt upload form', () => {
  it('accepts only PDF/PNG/JPEG and enforces a 5MB limit', () => {
    expect(page).toMatch(/application\/pdf/);
    expect(page).toMatch(/image\/png/);
    expect(page).toMatch(/image\/jpeg/);
    expect(page).toMatch(/5\s*\*\s*1024\s*\*\s*1024|5242880|5\s*MB|5MB/);
  });

  it('computes the sha256 in the browser before uploading', () => {
    expect(page).toMatch(/crypto\.subtle\.digest\(\s*['"]SHA-256['"]/);
  });

  it('sends sha256 / fileMimeType / transferredAmount / currency to upload-proof', () => {
    expect(page).toMatch(/sha256/);
    expect(page).toMatch(/fileMimeType/);
    expect(page).toMatch(/transferredAmount/);
    expect(page).toMatch(/currency/);
    expect(page).toMatch(/uploadProof/);
  });
});

describe('UI states + safety', () => {
  it('handles loading / error / unauthorized / saving / success', () => {
    for (const s of ['loading', 'error', 'unauthorized', 'saving', 'success']) {
      expect(page.toLowerCase()).toMatch(new RegExp(s));
    }
  });

  it('surfaces amount/currency mismatch clearly', () => {
    expect(page).toMatch(/MISMATCH|اختلاف|لا يطابق/);
  });

  it('never references finance_approver (deferred role)', () => {
    // The second-approval UI itself is added in Batch 5 (covered by
    // payout-second-approval-route-ui.test.ts); the deferred finance_approver
    // role must NOT be referenced.
    expect(page).not.toMatch(/finance_approver/);
  });

  it('proof metadata is shown without a public file URL', () => {
    // proofFileKey is legitimately SENT during upload; the constraint is that
    // the displayed proof never links to a public receipt URL.
    expect(page).toMatch(/receiptId|الإيصال/);
    expect(page).not.toMatch(/transferProof[?.]*\.url|proof\.url|receiptUrl/);
  });
});
