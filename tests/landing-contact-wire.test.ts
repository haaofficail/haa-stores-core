// Landing-page Contact form → backend wiring (HAA-LAND-001 follow-on).
//
// Source-grep guard verifying the Contact section on the storefront
// LandingPage submits to POST /api/landing/contact instead of using a
// mailto: link. The mailto: fallback is preserved for the
// network-failure catch path so the user always has a way to reach us
// when the backend is offline.
//
// What this guards:
//   - LandingPage.tsx still renders a Contact section (id="contact").
//   - The submit handler calls fetch('/api/landing/contact', ...).
//   - A honeypot field (name="website" + aria-hidden) is rendered.
//   - The submit button surfaces a loading state ("جاري الإرسال").
//   - The form renders an inline error block backed by `contactError`.
//   - The mailto: fallback survives inside the catch branch (so a
//     network/CORS failure still gives the user a path).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const SRC = readFileSync(
  resolve(ROOT, 'apps/storefront/src/pages/LandingPage.tsx'),
  'utf-8',
);

describe('landing-page Contact form → /api/landing/contact wiring', () => {
  it('renders a Contact section anchored at id="contact"', () => {
    expect(SRC).toMatch(/id="contact"/);
    expect(SRC).toMatch(/lp-sec--contact/);
  });

  it('submit handler POSTs to /api/landing/contact (Caddy strips /api)', () => {
    expect(SRC).toMatch(/fetch\(\s*['"]\/api\/landing\/contact['"]/);
    expect(SRC).toMatch(/method:\s*['"]POST['"]/);
  });

  it('sends the documented body shape (name/email/phone/message/website)', () => {
    // Body uses destructured shorthand (`{ name, email, ... }`) from
    // `const { name, email, phone, message } = contactForm`, so the
    // bare identifiers must appear inside the JSON.stringify object.
    expect(SRC).toMatch(/JSON\.stringify\(\{[\s\S]*?\bname\b[\s\S]*?\}\)/);
    expect(SRC).toMatch(/JSON\.stringify\(\{[\s\S]*?\bemail\b[\s\S]*?\}\)/);
    expect(SRC).toMatch(/JSON\.stringify\(\{[\s\S]*?\bmessage\b[\s\S]*?\}\)/);
    // Honeypot is always sent as '' so bots that *do* fill the visible
    // field are caught at the server.
    expect(SRC).toMatch(/website:\s*['"]{2}/);
  });

  it('renders the honeypot input (name="website" + aria-hidden + offscreen)', () => {
    expect(SRC).toMatch(/name="website"/);
    expect(SRC).toMatch(/aria-hidden="true"/);
    // Off-screen positioning so real (sighted) users never see it.
    expect(SRC).toMatch(/left:\s*['"]-9999px['"]/);
  });

  it('surfaces a loading state on the submit button (Arabic "جاري الإرسال")', () => {
    expect(SRC).toMatch(/contactSubmitting/);
    expect(SRC).toMatch(/جاري الإرسال/);
    // The button must be disabled while in-flight to prevent double-submit.
    expect(SRC).toMatch(/disabled=\{contactSubmitting\}/);
  });

  it('renders an inline error block driven by contactError state', () => {
    expect(SRC).toMatch(/setContactError/);
    expect(SRC).toMatch(/\{contactError\s*&&/);
    expect(SRC).toMatch(/role="alert"/);
  });

  it('handles RATE_LIMITED with a user-friendly Arabic message', () => {
    expect(SRC).toMatch(/RATE_LIMITED/);
    expect(SRC).toMatch(/تجاوزت الحد المسموح/);
  });

  it('keeps mailto:hello@haastores.com as the network-failure catch fallback', () => {
    // Inside `catch { ... }` we still hand the user a mailto: so the
    // page is useful even if /api/landing/contact is unreachable.
    expect(SRC).toMatch(/catch\s*\{[\s\S]*mailto:hello@haastores\.com/);
  });
});
