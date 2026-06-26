// Storefront-origin resolution for the merchant dashboard.
//
// Regression for the "سوق هاء العام → http://localhost:5174/marketplace" bug:
// deployed builds without VITE_STOREFRONT_URL fell back to a hardcoded
// localhost URL. getStorefrontOrigin() now derives the origin from the host
// (strip `merchant.` → apex) so staging/production stay correct even when the
// env var is absent.

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getStorefrontOrigin } from '../apps/merchant-dashboard/src/lib/storefront-url';

const g = globalThis as unknown as { window?: { location: { host: string; protocol: string; origin: string } } };

function setWindow(host: string, protocol = 'https:') {
  const origin = `${protocol}//${host}`;
  g.window = { location: { host, protocol, origin } };
}

beforeEach(() => {
  // Ensure no explicit override leaks in from the host env / .env.
  (import.meta.env as Record<string, unknown>).VITE_STOREFRONT_URL = '';
});

afterEach(() => {
  delete g.window;
  (import.meta.env as Record<string, unknown>).VITE_STOREFRONT_URL = '';
});

describe('getStorefrontOrigin', () => {
  it('derives the apex from a staging merchant host (no localhost leak)', () => {
    setWindow('merchant.staging.haastores.com');
    expect(getStorefrontOrigin()).toBe('https://staging.haastores.com');
  });

  it('derives the apex from a production merchant host', () => {
    setWindow('merchant.haastores.com');
    expect(getStorefrontOrigin()).toBe('https://haastores.com');
  });

  it('swaps the dev dashboard port (:5173 → :5174) in local development', () => {
    setWindow('localhost:5173', 'http:');
    expect(getStorefrontOrigin()).toBe('http://localhost:5174');
  });

  it('honours an explicit VITE_STOREFRONT_URL override and strips a trailing slash', () => {
    (import.meta.env as Record<string, unknown>).VITE_STOREFRONT_URL = 'https://shop.example.com/';
    setWindow('merchant.staging.haastores.com');
    expect(getStorefrontOrigin()).toBe('https://shop.example.com');
  });
});

// ── Source contract: the reported link no longer hardcodes localhost ──────
const SIDEBAR_SRC = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/components/layout/Sidebar.tsx'),
  'utf-8',
);

describe('Sidebar marketplace link uses the shared resolver', () => {
  it('imports and calls getStorefrontOrigin', () => {
    expect(SIDEBAR_SRC).toContain("from '@/lib/storefront-url'");
    expect(SIDEBAR_SRC).toContain('getStorefrontOrigin()');
  });

  it('no longer falls back to a hardcoded http://localhost:5174', () => {
    expect(SIDEBAR_SRC).not.toContain("'http://localhost:5174'");
  });
});
