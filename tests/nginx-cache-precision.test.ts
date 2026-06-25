// Nginx cache precision contract — F-INFRA-CACHE-001 (#178).
//
// Bug: storefront/nginx.conf had a single `location ~* \.(js|css|...|svg|
// png|...)$` block that pinned EVERY matching file (including unhashed
// /public/* logos) with `Cache-Control: public, immutable; expires 1y`.
// Caddy's front layer (PR #255) then appended its own short-cache
// header on the same SVG/PNG requests, producing a duplicated,
// contradictory `Cache-Control: public, max-age=300, must-revalidate,
// max-age=31536000, public, immutable` response that kept browsers on
// the pre-fix SVG assets after a redeploy.
//
// Fix: split the location blocks. Vite-hashed bundles (`/assets/<name>-
// <HASH>.<ext>`) keep the 1y immutable cache. Public/* SVG/PNG fall
// into a short 5-minute cache that matches Caddy's value, so a
// redeploy propagates to the browser within minutes.
//
// This contract enforces the split across storefront, merchant, and
// admin nginx configs so a future "cleanup" can't silently reintroduce
// the broad pattern.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '..');

const NGINX_FILES = [
  resolve(ROOT, 'apps/storefront/nginx.conf'),
  resolve(ROOT, 'apps/merchant-dashboard/nginx.conf'),
  resolve(ROOT, 'apps/admin-dashboard/nginx.conf'),
];

describe.each(NGINX_FILES)('nginx cache precision — %s', (file) => {
  const src = readFileSync(file, 'utf-8');

  it('uses a Vite-hashed-only pattern for the 1-year immutable cache', () => {
    // The immutable block MUST match only /assets/<name>-<8+ hash>.<ext>
    // — never a broad extension list that would catch unhashed
    // public/* files.
    expect(src).toMatch(
      /location\s+~\*\s+\^\/assets\/\[\^\/\]\+-\[A-Za-z0-9_-\]\{8,\}\\\.\(js\|css\|woff2\?\|ttf\|eot\|otf\|map\)\$/,
    );
  });

  it('does NOT pin unhashed SVG/PNG with a 1-year immutable cache', () => {
    // Reject the old broad pattern that included image extensions
    // (svg, png, jpg, jpeg, gif, webp, avif) inside the immutable block.
    // The presence of `svg|png` next to `immutable` is the regression
    // signal we're guarding against.
    const immutableBlocks = src.match(
      /location[^{]+\{[^}]*Cache-Control[^}]*immutable[^}]*\}/g,
    ) ?? [];
    for (const block of immutableBlocks) {
      expect(
        block,
        `immutable block must not match raw image extensions:\n${block}`,
      ).not.toMatch(/svg|png|jpg|jpeg|gif|webp|avif/i);
    }
  });

  it('declares a short revalidate-cache for unhashed image assets', () => {
    // 5-minute cache + must-revalidate so re-deploys of an SVG/PNG in
    // /public propagate to the browser within minutes, not days.
    expect(src).toMatch(
      /location\s+~\*\s+\\?\.\(svg\|png\|jpg\|jpeg\|gif\|(ico\|)?webp\|avif\)\$[\s\S]+?Cache-Control\s+"public,\s*max-age=300,\s*must-revalidate"/,
    );
  });
});
