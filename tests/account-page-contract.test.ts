// Account ("حسابي") page contract — IA Wave 5 part 4.
//
// Splits the merchant's personal identity (name, email, password,
// 2FA) from store-level configuration. Pre-fix these were conflated
// inside the Settings tabs.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const PAGE_PATH = resolve(__dirname, '../apps/merchant-dashboard/src/pages/Account.tsx');
const APP = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/App.tsx'),
  'utf-8',
);
const SIDEBAR = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/components/layout/Sidebar.tsx'),
  'utf-8',
);

describe('Account — page', () => {
  it('the file exists', () => {
    expect(existsSync(PAGE_PATH)).toBe(true);
  });

  it('reads the current user via authApi.me (no new endpoint)', () => {
    const src = readFileSync(PAGE_PATH, 'utf-8');
    expect(src).toMatch(/authApi\.me\(\)/);
  });

  it('renders identity fields (name, email, phone, role)', () => {
    const src = readFileSync(PAGE_PATH, 'utf-8');
    expect(src).toMatch(/account\.identity\.name/);
    expect(src).toMatch(/account\.identity\.email/);
    expect(src).toMatch(/account\.identity\.phone/);
    expect(src).toMatch(/account\.identity\.role/);
  });

  it('wires account-security actions instead of "coming soon" stubs', () => {
    const src = readFileSync(PAGE_PATH, 'utf-8');
    expect(src).toMatch(/authApi\.changePassword/);
    expect(src).toMatch(/authApi\.logoutAll/);
    expect(src).toMatch(/account\.security\.password\.current/);
    expect(src).toMatch(/account\.security\.password\.next/);
    expect(src).toMatch(/account\.security\.password\.confirm/);
    expect(src).not.toMatch(/account\.comingSoon/);
  });

  it('does not present merchant 2FA as available until an endpoint exists', () => {
    const src = readFileSync(PAGE_PATH, 'utf-8');
    expect(src).toMatch(/account\.security\.twofa\.unavailable/);
    expect(src).toMatch(/غير متاح لحسابات التاجر بعد/);
  });

  it('cross-links to /settings so users know where store config lives', () => {
    const src = readFileSync(PAGE_PATH, 'utf-8');
    expect(src).toMatch(/to=['"]\/settings['"]/);
  });

  it('has a logout button that calls useAuth().logout', () => {
    const src = readFileSync(PAGE_PATH, 'utf-8');
    expect(src).toMatch(/onClick=\{logout\}/);
  });
});

describe('App.tsx — route wiring', () => {
  it('mounts /account behind dashboard:view (no special permission needed)', () => {
    expect(APP).toMatch(/import\(['"]@\/pages\/Account['"]\)/);
    expect(APP).toMatch(/path=['"]\/account['"]\s+element=\{<GuardedRoute\s+permission=['"]dashboard:view['"]><Account/);
  });
});

describe('Sidebar — Account above Settings', () => {
  it('Account appears BEFORE Settings in the Settings group', () => {
    const accountIdx = SIDEBAR.indexOf("to: '/account'");
    const settingsIdx = SIDEBAR.indexOf("to: '/settings'");
    expect(accountIdx).toBeGreaterThan(0);
    expect(settingsIdx).toBeGreaterThan(accountIdx);
    expect(SIDEBAR).toMatch(/label:\s*['"]nav\.account['"]/);
  });
});
