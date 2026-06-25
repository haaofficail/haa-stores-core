// IntegrationHub deduplication contract.
//
// IntegrationHub.tsx was a near-clone of Marketplaces.tsx — same
// `marketplaceApi.hub` call, same PROVIDERS list, same disconnect
// dialog. Worse, the old syncAll handler showed a `toast.success`
// even when `result.totalFailed > 0`, so the merchant was told a
// sync had succeeded when it had not. Marketplaces.tsx is the
// canonical, fixed implementation.
//
// PR removes IntegrationHub.tsx and replaces the route
// `/settings/integrations` with a `<Navigate>` redirect to
// `/channels`. Old bookmarks and the existing in-app links from
// Notifications.tsx continue to work — they land at the canonical
// page instead.
//
// Audit reference: P0 #31 (2026-06-25).

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const APP_SRC = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/App.tsx'),
  'utf-8',
);
const HUB_PATH = resolve(__dirname, '../apps/merchant-dashboard/src/pages/IntegrationHub.tsx');

describe('IntegrationHub deduplication', () => {
  it('IntegrationHub.tsx page file is removed', () => {
    expect(existsSync(HUB_PATH)).toBe(false);
  });

  it('App.tsx no longer imports IntegrationHub', () => {
    // Comments referencing IntegrationHub as historical context are
    // fine; what must be gone is the lazy import + the route element.
    expect(APP_SRC).not.toMatch(/lazy\(\(\)\s*=>\s*import\(['"]@\/pages\/IntegrationHub['"]\)\)/);
    expect(APP_SRC).not.toMatch(/<IntegrationHub\s*\/>/);
  });

  it('/settings/integrations redirects to the channels canonical', () => {
    // The path stays in the route table (BC for bookmarks and the
    // notification links) but resolves via <Navigate>.
    // IA W3 (PR #241): the channels canonical itself moved from
    // `/channels` to `/sales/channels`. This redirect now points
    // directly at the new canonical, skipping a double-redirect.
    expect(APP_SRC).toMatch(/path=['"]\/settings\/integrations['"]\s+element=\{<Navigate\s+to=['"]\/sales\/channels['"]\s+replace\s*\/>/);
  });
});
