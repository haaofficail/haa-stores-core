// Notifications page — truthful provider status contract.
//
// Three lies were exposed in the audit (2026-06-25):
//
// 1. The "SMTP not configured" warning was a hardcoded paragraph
//    that fired even when SMTP_HOST/USER/PASSWORD were set. The
//    status badge below it said "configured / SMTP delivery" while
//    the warning above said "حتى إعداد SMTP".
//
// 2. The OTO row rendered `${integrationModel} / ${mode}` raw —
//    when not configured this read "not_configured / sandbox" as
//    a single field, looking broken.
//
// 3. WhatsApp toggle in the merchant prefs flipped `status` to
//    "configured" the moment the merchant saved a phone number,
//    regardless of whether the Unifonic API was actually wired.
//    Merchants thought they had enabled WhatsApp delivery; the
//    actual transport never fired.
//
// Fixes:
//   - The warning now mounts ONLY when `providerStatus.email.status
//     === 'contact_only'`.
//   - Payment + shipping rows (Geidea, OTO, OTO Label) are removed
//     from the Notifications page — they belong on Integrations.
//     Only Email + WhatsApp remain.
//   - `provider-status-service.ts` requires Unifonic env vars before
//     marking WhatsApp `configured`, and requires SMTP_PORT (matching
//     `SmtpEmailProvider.isAvailable`).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PAGE = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/pages/Notifications.tsx'),
  'utf-8',
);
const SVC = readFileSync(
  resolve(__dirname, '../packages/commerce-core/src/provider-status-service.ts'),
  'utf-8',
);

describe('Notifications page — warning is gated, not hardcoded', () => {
  it('SMTP fallback warning only renders when email.status === "contact_only"', () => {
    // The conditional wrapper is the gate. The old hardcoded
    // `<div className="rounded-2xl border border-amber-200">` with
    // no surrounding `{providerStatus?.email.status === ...}` must
    // be gone.
    const warnIdx = PAGE.indexOf("notifications.smtpFallbackTitle");
    expect(warnIdx).toBeGreaterThan(0);
    const before = PAGE.slice(Math.max(0, warnIdx - 400), warnIdx);
    expect(before).toMatch(/providerStatus\?\.email\.status\s*===\s*['"]contact_only['"]/);
  });

  it('the warning copy is i18n-keyed, not hardcoded Arabic', () => {
    expect(PAGE).toMatch(/notifications\.smtpFallbackTitle/);
    expect(PAGE).toMatch(/notifications\.smtpFallbackBody/);
    // The literal pre-fix paragraph must be gone.
    expect(PAGE).not.toMatch(/البريد يعمل كقناة تواصل رسمية عبر hello@haastores\.com حتى إعداد SMTP\. واتساب هنا رابط\/QR/);
  });
});

describe('Notifications page — payment/shipping providers removed', () => {
  it('Geidea, OTO, OTO Label no longer appear in the status array', () => {
    // The status array was an inline literal `[{ label: 'Geidea',
    // ... }, { label: 'OTO', ... }, ...]`. Confirm the three
    // non-communication rows are gone.
    expect(PAGE).not.toMatch(/label:\s*['"]Geidea['"]/);
    expect(PAGE).not.toMatch(/label:\s*['"]OTO['"]/);
    expect(PAGE).not.toMatch(/label:\s*['"]OTO Label['"]/);
  });

  it('the "not_configured / sandbox" concatenation bug is gone', () => {
    // The old code did `${integrationModel} / ${mode}` which read
    // "not_configured / sandbox" when not configured.
    expect(PAGE).not.toMatch(/shipping\.integrationModel\}\s*\/\s*\$\{providerStatus\.shipping\.mode/);
  });

  it('Email + WhatsApp remain', () => {
    expect(PAGE).toMatch(/label:\s*['"]Email['"]/);
    expect(PAGE).toMatch(/label:\s*['"]WhatsApp['"]/);
  });

  it('WhatsApp detail respects the realDelivery flag', () => {
    // The previous render said "QR contact only" unconditionally,
    // hiding the case where Unifonic is wired and a real API call
    // happens. The new render branches on realDelivery.
    expect(PAGE).toMatch(/whatsapp\.realDelivery/);
    expect(PAGE).toMatch(/notifications\.whatsappApiDelivery/);
    expect(PAGE).toMatch(/notifications\.whatsappQrOnly/);
  });
});

describe('Provider status service — truthful flags', () => {
  it('WhatsApp configured requires UNIFONIC_APP_SID + UNIFONIC_WHATSAPP_SENDER', () => {
    expect(SVC).toMatch(/UNIFONIC_APP_SID/);
    expect(SVC).toMatch(/UNIFONIC_WHATSAPP_SENDER/);
    // The new conjunction must be present.
    expect(SVC).toMatch(/unifoncReady\s*\n?\s*&&\s*!!prefs\?\.whatsappEnabled/);
  });

  it('WhatsApp mode reflects the actual transport (api vs qr_contact)', () => {
    expect(SVC).toMatch(/mode:\s*unifoncReady\s*\?\s*['"]api['"]\s*:\s*['"]qr_contact['"]/);
  });

  it('WhatsApp realDelivery is gated on Unifonic + configured', () => {
    expect(SVC).toMatch(/realDelivery:\s*unifoncReady\s*&&\s*whatsappConfigured/);
  });

  it('SMTP configured includes SMTP_PORT (matches provider isAvailable)', () => {
    // Pre-fix only checked HOST/USER/PASSWORD — could pass while
    // SmtpEmailProvider.isAvailable refused to construct the
    // transport. The check now requires all four.
    expect(SVC).toMatch(/SMTP_HOST[\s\S]{0,80}SMTP_PORT[\s\S]{0,80}SMTP_USER[\s\S]{0,80}SMTP_PASSWORD/);
  });
});
