// Notifications Inbox — IA Wave 5 part 3.
//
// Adds a real Inbox surface (notification logs as a feed) to fill the
// gap the audit (2026-06-25) flagged: the existing /notifications page
// is preferences only. The Topbar bell now lands on the Inbox.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const PAGE_PATH = resolve(__dirname, '../apps/merchant-dashboard/src/pages/NotificationsInbox.tsx');
const APP = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/App.tsx'),
  'utf-8',
);
const SIDEBAR = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/components/layout/Sidebar.tsx'),
  'utf-8',
);
const TOPBAR = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/components/layout/Topbar.tsx'),
  'utf-8',
);

describe('NotificationsInbox — page', () => {
  it('the file exists', () => {
    expect(existsSync(PAGE_PATH)).toBe(true);
  });

  it('reads logs via notificationApi.getLogs (no duplicate data path)', () => {
    const src = readFileSync(PAGE_PATH, 'utf-8');
    expect(src).toMatch(/notificationApi\.getLogs\(storeId/);
  });

  it('exposes per-channel filter (all / email / whatsapp / sms)', () => {
    const src = readFileSync(PAGE_PATH, 'utf-8');
    // The testid is rendered via a template literal; the channel
    // array drives it. Confirm BOTH the testid template and the
    // channel literals are present.
    expect(src).toMatch(/data-testid=\{`inbox-filter-\$\{ch\}`\}/);
    expect(src).toMatch(/channels:\s*ChannelFilter\[\]\s*=\s*\[['"]all['"],\s*['"]email['"],\s*['"]whatsapp['"],\s*['"]sms['"]\]/);
  });

  it('renders a clear empty state when no logs', () => {
    const src = readFileSync(PAGE_PATH, 'utf-8');
    expect(src).toMatch(/notifications\.inbox\.empty/);
  });

  it('shows error messages from failed notifications inline', () => {
    const src = readFileSync(PAGE_PATH, 'utf-8');
    expect(src).toMatch(/log\.errorMessage/);
  });

  it('cross-links back to /notifications (preferences)', () => {
    const src = readFileSync(PAGE_PATH, 'utf-8');
    expect(src).toMatch(/to=['"]\/notifications['"]/);
  });
});

describe('App.tsx — route wiring', () => {
  it('mounts /notifications/inbox behind notifications:view', () => {
    expect(APP).toMatch(/import\(['"]@\/pages\/NotificationsInbox['"]\)/);
    expect(APP).toMatch(/path=['"]\/notifications\/inbox['"]\s+element=\{<GuardedRoute\s+permission=['"]notifications:view['"]><NotificationsInbox/);
  });
});

describe('Sidebar — Inbox above Preferences', () => {
  it('Inbox link appears before the preferences link', () => {
    const inboxIdx = SIDEBAR.indexOf("to: '/notifications/inbox'");
    const prefsIdx = SIDEBAR.indexOf("to: '/notifications'");
    expect(inboxIdx).toBeGreaterThan(0);
    expect(prefsIdx).toBeGreaterThan(inboxIdx);
    expect(SIDEBAR).toMatch(/label:\s*['"]nav\.notificationsInbox['"]/);
  });
});

describe('Topbar — bell lands on the Inbox', () => {
  it("bell's onClick navigates to /notifications/inbox", () => {
    expect(TOPBAR).toMatch(/navigate\(['"]\/notifications\/inbox['"]\)/);
    // The old /notifications target is gone on the bell.
    expect(TOPBAR).not.toMatch(/navigate\(['"]\/notifications['"]\)/);
  });
});
