// PublishSection drill-down UI — source-grep guard.
//
// Pins the contract of the new per-item compliance checklist drill-down
// rendered below the publish/unpublish controls in PublishSection.tsx.
// Replaces the old bare orange-banner counter ("X أخطاء يجب إصلاحها") with
// a real per-item view grouped by source (kyc / store / policies / payment
// / shipping / settings) plus "اذهب لإصلاحه" deep links.
//
// Also locks the Part-A dedupe: the merchant dashboard must continue to
// call the canonical /compliance/checklist endpoint and MUST NOT regress
// to a /publish-checklist endpoint.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const PUBLISH_SECTION_FILE = resolve(
  ROOT,
  'apps/merchant-dashboard/src/pages/settings/sections/PublishSection.tsx',
);

describe('PublishSection — checklist drill-down UI', () => {
  const source = readFileSync(PUBLISH_SECTION_FILE, 'utf8');

  it('still wires through complianceApi.getChecklist (canonical endpoint, post-dedupe)', () => {
    expect(source).toContain('complianceApi');
    expect(source).toContain('getChecklist');
  });

  it('does NOT call the removed /settings/publish-checklist endpoint (Part-A dedupe lock)', () => {
    // The new merchant-dashboard must not reintroduce the duplicate route
    // that was deleted from apps/api/src/routes/settings.ts. Search both
    // the literal endpoint path and the API helper that would have wrapped it.
    expect(source).not.toContain('/publish-checklist');
    expect(source).not.toContain('publishChecklist');
  });

  it('renders per-item rows using item.label / item.message / item.passed', () => {
    expect(source).toContain('item.label');
    expect(source).toContain('item.message');
    expect(source).toContain('item.passed');
  });

  it('uses CheckCircle2 / AlertTriangle / XCircle from lucide-react for item state', () => {
    expect(source).toContain('CheckCircle2');
    expect(source).toContain('AlertTriangle');
    expect(source).toContain('XCircle');
  });

  it('groups items by source with all six Arabic group headers', () => {
    // kyc / store / policies / payment / shipping / settings — every
    // checklist source the API can return must have a localized header.
    expect(source).toContain('البيانات القانونية');   // kyc
    expect(source).toContain('بيانات المتجر');        // store
    expect(source).toContain('السياسات');             // policies
    expect(source).toContain('طرق الدفع');            // payment
    expect(source).toContain('الشحن');                // shipping
    expect(source).toContain('إعدادات الاسترجاع');    // settings
  });

  it('uses native <details> + <summary> for keyboard-accessible group collapse', () => {
    // No collapse primitive lives in apps/merchant-dashboard/src/components/ui/,
    // so the drill-down must fall back to the native disclosure widget for a11y.
    expect(source).toContain('<details');
    expect(source).toContain('<summary');
  });

  it('renders "اذهب لإصلاحه" deep links for failing items', () => {
    expect(source).toContain('اذهب لإصلاحه');
    // The link must be a react-router Link, not a raw <a>, so deep links
    // don't trigger a full page reload.
    expect(source).toContain("from \"react-router-dom\"");
  });

  it('shows summary "X من Y جاهز" above the group list', () => {
    // Use a regex so the test doesn't lock the exact whitespace.
    expect(source).toMatch(/من \{?totalCount\}? جاهز|من \{totalCount\} جاهز|من\s+\{?\s*totalCount\s*\}?\s+جاهز/);
    expect(source).toContain('passedCount');
    expect(source).toContain('totalCount');
  });

  it('shows the "كل المتطلبات مكتملة" green banner when checklist.passed is true', () => {
    expect(source).toContain('كل المتطلبات مكتملة');
  });

  it('exposes a refresh control wired to loadData()', () => {
    expect(source).toContain('RefreshCw');
    // The refresh button must invoke the same loadData callback used by the
    // useEffect — not a new ad-hoc fetcher — so all three (publishStatus,
    // checklist, acknowledgement) refresh together.
    expect(source).toContain('onRefresh');
    expect(source).toContain('loadData');
  });

  it('keeps the publish button disabled on !canPublish (no regression on the existing gate)', () => {
    expect(source).toContain('!canPublish');
    expect(source).toContain('canPublish');
  });

  it('preserves the acknowledgement dialog flow untouched', () => {
    expect(source).toContain('showAckDialog');
    expect(source).toContain('handleAcknowledge');
    expect(source).toContain('إقرار المتجر');
  });
});
