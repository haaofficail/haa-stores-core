// Caddy cache-control contract.
//
// 2026-06-25: visitors on staging.haastores.com saw stale logos / SVG dimension
// bugs persist after deploy because Caddy didn't send Cache-Control headers
// on `/assets/payment-logos/*.svg`. Default browser heuristic caching held
// the old bytes for days. The fix added explicit cache rules to the
// `spa_site` snippet in both Caddyfiles:
//
//   - Vite-hashed bundles → long immutable cache (the hash itself is the
//     cache buster, so a content change always swaps the URL).
//   - Unhashed `/assets/*` static (PNG, SVG, ICO, JSON manifest) → short
//     cache + must-revalidate so a re-deploy propagates within minutes.
//   - HTML / SPA shell → no-cache so the page always sees the latest
//     bundle URLs on first byte.
//
// This contract locks all three rules so a future refactor of the Caddyfile
// can't silently re-introduce the original UX bug.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '..');

const CADDYFILES = [
  resolve(ROOT, 'deploy/staging/Caddyfile'),
  resolve(ROOT, 'deploy/production/Caddyfile'),
];

describe.each(CADDYFILES)('Caddyfile cache-control rules — %s', (file) => {
  const src = readFileSync(file, 'utf-8');

  it('declares an immutable long-cache rule for Vite-hashed bundles', () => {
    // Matches: header @vite_hashed Cache-Control "public, max-age=31536000, immutable"
    expect(src).toMatch(/header\s+@vite_hashed\s+Cache-Control\s+"public,\s*max-age=31536000,\s*immutable"/);
    // And the matcher itself targets `/assets/<name>-<hash>.<ext>`.
    expect(src).toMatch(/@vite_hashed\s+path_regexp\s+\^\/assets\/.+\\\.\(js\|css\|woff2\?\|ttf\|otf\|map\)\$/);
  });

  it('declares a short revalidate cache for unhashed static assets', () => {
    // SVG/PNG/etc. → max-age=300 + must-revalidate so deploys propagate
    // quickly.
    expect(src).toMatch(/header\s+@unhashed_static\s+Cache-Control\s+"public,\s*max-age=300,\s*must-revalidate"/);
    expect(src).toMatch(/@unhashed_static\s+path_regexp\s+\\\.\(svg\|png\|jpg\|jpeg\|webp\|gif\|ico\|webmanifest\|json\)\$/);
  });

  it('declares no-cache for HTML / SPA shell', () => {
    expect(src).toMatch(/header\s+@html_doc\s+Cache-Control\s+"no-cache,\s*no-store,\s*must-revalidate"/);
    expect(src).toMatch(/@html_doc\s+path\s+\/\s+\*\.html/);
  });

  it('keeps all three rules inside the shared spa_site snippet', () => {
    // Critical: the rules MUST live in the snippet so every site (storefront,
    // admin, merchant, staging, production) inherits them. Floating the rules
    // out into per-site blocks would skip the `:443` on-demand TLS catch-all
    // for custom merchant domains, leaking the same stale-cache bug there.
    const snippetMatch = src.match(/\(spa_site\) \{[\s\S]+?\n\}/);
    expect(snippetMatch, 'spa_site snippet not found').not.toBeNull();
    const snippet = snippetMatch![0];
    expect(snippet).toContain('@vite_hashed');
    expect(snippet).toContain('@unhashed_static');
    expect(snippet).toContain('@html_doc');
  });
});
