// Audit Part 5 P0 #2 — Notifications provider gating.
//
// Before this fix, the SMS and WhatsApp toggles on
// `apps/merchant-dashboard/src/pages/Notifications.tsx` were always
// interactive, even when the underlying provider was not configured.
// Merchants would flip the switch ON, see a "saved" toast, and then
// nothing would actually send — a silent trust failure.
//
// These tests lock the gating at the source level:
//   1. The SMS switch is hard-disabled (no SMS provider exists in
//      `ProviderStatus` yet).
//   2. The WhatsApp switch is disabled unless
//      `providerStatus.whatsapp.status === 'configured'`.
//   3. Each ungated row exposes a tooltip and an inline link to the
//      provider configuration page (`/settings/integrations`).
//   4. Error toasts go through `messageFromError`.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

const NOTIFICATIONS = read('apps/merchant-dashboard/src/pages/Notifications.tsx');

describe('Notifications provider gating (audit Part 5 P0 #2)', () => {
  it('imports Tooltip primitives and the messageFromError mapper', () => {
    expect(NOTIFICATIONS).toMatch(/from '@\/components\/ui\/tooltip'/);
    expect(NOTIFICATIONS).toMatch(/\bTooltip\b/);
    expect(NOTIFICATIONS).toMatch(/\bTooltipTrigger\b/);
    expect(NOTIFICATIONS).toMatch(/\bTooltipContent\b/);
    expect(NOTIFICATIONS).toMatch(/from '@\/lib\/error-mapper'/);
    expect(NOTIFICATIONS).toMatch(/messageFromError\(\s*e\s*,\s*t\s*\)/);
  });

  it('derives gating flags from providerStatus', () => {
    expect(NOTIFICATIONS).toMatch(
      /const whatsappConfigured\s*=\s*providerStatus\?\.whatsapp\.status\s*===\s*'configured'/,
    );
    // SMS has no field on ProviderStatus yet — must be hard-disabled.
    expect(NOTIFICATIONS).toMatch(/const smsConfigured\s*=\s*false/);
  });

  it('disables the SMS switch and links to the configuration page', () => {
    expect(NOTIFICATIONS).toMatch(/data-testid="sms-channel-row"/);
    expect(NOTIFICATIONS).toMatch(/data-testid="sms-channel-switch"/);
    // Disabled is bound to !smsConfigured (which is hard-coded false today).
    expect(NOTIFICATIONS).toMatch(
      /<Switch[^>]*data-testid="sms-channel-switch"[\s\S]*?disabled=\{!smsConfigured\}/,
    );
    // Checked is forced to `false` until configured.
    expect(NOTIFICATIONS).toMatch(
      /<Switch[^>]*data-testid="sms-channel-switch"[\s\S]*?checked=\{smsConfigured\s*\?\s*prefs\.smsEnabled\s*:\s*false\}/,
    );
    // Configure link points at /settings/integrations.
    expect(NOTIFICATIONS).toMatch(/data-testid="sms-configure-link"/);
    expect(NOTIFICATIONS).toMatch(
      /<Link[^>]*data-testid="sms-configure-link"[^>]*to="\/settings\/integrations"/,
    );
  });

  it('gates the WhatsApp switch on providerStatus.whatsapp.status', () => {
    expect(NOTIFICATIONS).toMatch(/data-testid="whatsapp-channel-row"/);
    expect(NOTIFICATIONS).toMatch(/data-testid="whatsapp-channel-switch"/);
    expect(NOTIFICATIONS).toMatch(
      /<Switch[^>]*data-testid="whatsapp-channel-switch"[\s\S]*?disabled=\{!whatsappConfigured\}/,
    );
    expect(NOTIFICATIONS).toMatch(
      /<Switch[^>]*data-testid="whatsapp-channel-switch"[\s\S]*?checked=\{whatsappConfigured\s*\?\s*prefs\.whatsappEnabled\s*:\s*false\}/,
    );
    expect(NOTIFICATIONS).toMatch(/data-testid="whatsapp-configure-link"/);
    expect(NOTIFICATIONS).toMatch(
      /<Link[^>]*data-testid="whatsapp-configure-link"[^>]*to="\/settings\/integrations"/,
    );
  });

  it('renders an explanatory tooltip when a channel is not configured', () => {
    // Both channels render a TooltipContent that is conditionally
    // mounted on the not-configured branch — so the merchant gets the
    // explanation only when it's relevant.
    expect(NOTIFICATIONS).toMatch(/!smsConfigured\s*&&\s*\(\s*<TooltipContent>/);
    expect(NOTIFICATIONS).toMatch(/!whatsappConfigured\s*&&\s*\(\s*<TooltipContent>/);
    // The tooltip copy explains the gate ("فعّل مزود الخدمة أولاً").
    expect(NOTIFICATIONS).toMatch(/فعّل مزود الخدمة أولاً/);
  });

  it('exposes data-configured on each channel row for downstream QA', () => {
    expect(NOTIFICATIONS).toMatch(
      /data-testid="sms-channel-row"[\s\S]*?data-configured=\{smsConfigured\s*\?\s*'true'\s*:\s*'false'\}/,
    );
    expect(NOTIFICATIONS).toMatch(
      /data-testid="whatsapp-channel-row"[\s\S]*?data-configured=\{whatsappConfigured\s*\?\s*'true'\s*:\s*'false'\}/,
    );
  });
});
