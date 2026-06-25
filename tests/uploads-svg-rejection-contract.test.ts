// SVG upload rejection contract.
//
// SVG files can carry inline <script> tags that execute when rendered
// as <img> in the storefront. The merchant logo path was a classic
// stored-XSS surface: anyone with `settings:update` could upload an
// SVG, and the storefront would render it as the brand logo,
// executing the script in every customer's browser.
//
// Fix:
//   - Client: Settings.tsx restricts accept= to JPEG/PNG/WebP.
//   - Server: routes/uploads.ts hard-rejects SVG with a clear
//     SVG_NOT_ALLOWED error before adapter validation runs.
//
// Audit reference: P0 #6 (SVG XSS) in the dashboard-quality audit
// (2026-06-25).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const UPLOADS_SRC = readFileSync(
  resolve(__dirname, '../apps/api/src/routes/uploads.ts'),
  'utf-8',
);
// W4 slice 4a: the logo uploader moved from Settings.tsx into the
// dedicated InfoTab. Update the contract to scan the new file so the
// SVG-rejection guarantee follows the code.
const SETTINGS_SRC = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/pages/settings/tabs/InfoTab.tsx'),
  'utf-8',
);

describe('Uploads — SVG rejection (server)', () => {
  it('rejects image/svg+xml with SVG_NOT_ALLOWED before adapter validation', () => {
    // The check MUST run before `adapter.validateFile` — otherwise
    // future adapter changes (e.g., adding SVG support for storefront
    // theming) would silently re-open this vector for the merchant
    // logo path.
    const svgCheckIdx = UPLOADS_SRC.indexOf('SVG_NOT_ALLOWED');
    const adapterValidateIdx = UPLOADS_SRC.indexOf('adapter.validateFile');
    expect(svgCheckIdx).toBeGreaterThan(0);
    expect(adapterValidateIdx).toBeGreaterThan(0);
    expect(svgCheckIdx).toBeLessThan(adapterValidateIdx);
  });

  it('rejects both `image/svg+xml` exact match and any svg-substring mime', () => {
    // Browsers sometimes report SVG as `image/svg`, `image/svg+xml`,
    // or even `application/svg+xml` for crafted files. The substring
    // check defangs all variants.
    expect(UPLOADS_SRC).toMatch(/mimetype\s*===\s*['"]image\/svg\+xml['"]/);
    expect(UPLOADS_SRC).toMatch(/mimetype\.includes\(['"]svg['"]\)/);
  });

  it('returns 400 with code SVG_NOT_ALLOWED', () => {
    // The literal 'SVG_NOT_ALLOWED' appears once as the code value.
    // Walk back to find the surrounding error object and verify it's
    // wired into a 400 response.
    const idx = UPLOADS_SRC.indexOf("'SVG_NOT_ALLOWED'");
    expect(idx).toBeGreaterThan(0);
    const block = UPLOADS_SRC.slice(Math.max(0, idx - 100), idx + 300);
    expect(block).toMatch(/code:\s*'SVG_NOT_ALLOWED'/);
    expect(block).toMatch(/,\s*400\s*,?\s*\)/);
  });

  it('the error message explains the safer alternatives', () => {
    // A blank reject is bad UX. The message should tell the merchant
    // which formats DO work, so they immediately re-export and retry.
    expect(UPLOADS_SRC).toMatch(/JPEG, PNG, or WebP/i);
  });
});

describe('Uploads — SVG rejection (client)', () => {
  it('Settings logo input does not accept SVG', () => {
    // Look at the logo upload block specifically. The `accept` MUST
    // be the explicit JPEG/PNG/WebP list, not `image/*` (which would
    // allow SVG in the OS file picker).
    const logoBlock = SETTINGS_SRC.slice(
      SETTINGS_SRC.indexOf('settings.invalidFileType') - 1500,
      SETTINGS_SRC.indexOf('settings.invalidFileType') + 500,
    );
    expect(logoBlock).toMatch(/accept=['"]image\/jpeg,image\/png,image\/webp['"]/);
    expect(logoBlock).not.toMatch(/accept=['"]image\/\*['"]/);
  });

  it('Settings allowedTypes array does NOT include svg', () => {
    // The runtime guard mirrors the accept attribute. A user who
    // bypasses the file picker (drag-drop, paste) is still caught.
    const logoIdx = SETTINGS_SRC.indexOf('settings.invalidFileType');
    const block = SETTINGS_SRC.slice(Math.max(0, logoIdx - 800), logoIdx);
    expect(block).toMatch(/const\s+allowedTypes\s*=\s*\[\s*['"]image\/jpeg['"]\s*,\s*['"]image\/png['"]\s*,\s*['"]image\/webp['"]\s*\]/);
    expect(block).not.toMatch(/image\/svg/);
  });
});
