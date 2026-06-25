// Platform About page (haastores.com/about) — source-grep contract.
//
// `/about` at the platform level (NOT the per-merchant `/s/:slug/about`)
// must position متاجر هاء as a product of Haa Soft (the parent company),
// surface the official legal entity, and link out to haasoft.com.
//
// This is the institutional page at the apex domain and the public face
// of the platform's parent-company relationship — regressions here
// (removing the outbound link, dropping the legal entity, deleting the
// "ما الذي نقدّمه" section) silently break the owner's positioning
// requirement, so we lock the surface with source-grep.
//
// Owner request: 2026-06-25.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PLATFORM_ABOUT_SRC = readFileSync(
  resolve(__dirname, '../apps/storefront/src/pages/PlatformAbout.tsx'),
  'utf-8',
);

const APP_SRC = readFileSync(
  resolve(__dirname, '../apps/storefront/src/App.tsx'),
  'utf-8',
);

describe('PlatformAbout — institutional /about page', () => {
  it('links out to haasoft.com with safe rel attributes', () => {
    // Must reference the parent-company URL at least once.
    expect(PLATFORM_ABOUT_SRC).toMatch(/https:\/\/haasoft\.com/);

    // Every outbound link to haasoft.com must use noopener noreferrer +
    // target="_blank". We pull each anchor that mentions haasoft.com
    // and assert both attributes are present.
    const anchorRegex = /<a[^>]*href=["']https:\/\/haasoft\.com[^"']*["'][^>]*>/g;
    const anchors = PLATFORM_ABOUT_SRC.match(anchorRegex) ?? [];
    expect(anchors.length).toBeGreaterThan(0);
    for (const anchor of anchors) {
      expect(anchor).toMatch(/target=["']_blank["']/);
      expect(anchor).toMatch(/rel=["']noopener noreferrer["']/);
    }
  });

  it('renders the official legal entity (CR + Arabic name) via shared constant', () => {
    // Import the shared single-source-of-truth — never hardcode the
    // CR or legal name as string literals.
    expect(PLATFORM_ABOUT_SRC).toMatch(/PLATFORM_LEGAL_ENTITY/);
    expect(PLATFORM_ABOUT_SRC).toMatch(/PLATFORM_LEGAL_ENTITY\.legalNameAr/);
    expect(PLATFORM_ABOUT_SRC).toMatch(/PLATFORM_LEGAL_ENTITY\.commercialRegistration/);
  });

  it('contains the "ما الذي نقدّمه" offerings section', () => {
    // The owner explicitly listed this section as required content —
    // 3–4 cards covering store / payment / shipping / analytics.
    expect(PLATFORM_ABOUT_SRC).toMatch(/ما الذي نقدّمه/);
    expect(PLATFORM_ABOUT_SRC).toMatch(/OFFERINGS/);
    // Sanity-check the four pillars are represented.
    expect(PLATFORM_ABOUT_SRC).toMatch(/متجر إلكتروني/);
    expect(PLATFORM_ABOUT_SRC).toMatch(/دفع/);
    expect(PLATFORM_ABOUT_SRC).toMatch(/شحن/);
    expect(PLATFORM_ABOUT_SRC).toMatch(/تحليلات/);
  });

  it('declares Arabic + RTL semantics on the page root', () => {
    expect(PLATFORM_ABOUT_SRC).toMatch(/lang=["']ar["']/);
    expect(PLATFORM_ABOUT_SRC).toMatch(/dir=["']rtl["']/);
  });

  it('wires /about to PlatformAbout (NOT a redirect, NOT the per-store About)', () => {
    // The previous behaviour was `<Route path="/about" element={<Navigate to="/" replace />}/>`.
    // That regression — silently sending users to `/` — is what the owner reported.
    expect(APP_SRC).not.toMatch(/path=["']\/about["'][^/]*Navigate to=["']\/["']/);
    expect(APP_SRC).toMatch(/path=["']\/about["'][^>]*PlatformAbout/);
    // Per-store About on /s/:slug/about must still exist (unchanged).
    expect(APP_SRC).toMatch(/path=["']about["'][^>]*element=\{<About \/>\}/);
  });

  it('exposes a hero CTA pair (start store + contact sales)', () => {
    expect(PLATFORM_ABOUT_SRC).toMatch(/ابدأ متجرك/);
    expect(PLATFORM_ABOUT_SRC).toMatch(/تواصل مع المبيعات/);
  });

  it('sets SEO title + description that mention Haa Soft', () => {
    // The page must self-identify in metadata so search engines and
    // social previews carry the parent-product positioning.
    const useSEOBlock = PLATFORM_ABOUT_SRC.slice(
      PLATFORM_ABOUT_SRC.indexOf('useSEO('),
      PLATFORM_ABOUT_SRC.indexOf('useSEO(') + 400,
    );
    expect(useSEOBlock).toMatch(/Haa Soft|هاء سوفت/);
    expect(useSEOBlock).toMatch(/title:/);
    expect(useSEOBlock).toMatch(/description:/);
  });

  it('uses semantic <main> for the page body', () => {
    // Allow attributes on <main> — what matters is the element is
    // present and closed, not that it has zero classes.
    expect(PLATFORM_ABOUT_SRC).toMatch(/<main[\s>]/);
    expect(PLATFORM_ABOUT_SRC).toMatch(/<\/main>/);
  });
});
