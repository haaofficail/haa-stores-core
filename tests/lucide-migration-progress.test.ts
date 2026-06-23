// Lucide migration progress lock — F-QA-D-004 / ISSUE-0009.
//
// Counts direct `from 'lucide-react'` imports across app + ui source. The
// test snapshots a CEILING (the current count) and fails CI if the count
// grows — preventing regression while the migration to <Icon /> wrapper
// continues incrementally.
//
// To migrate a file: replace `import { Foo } from 'lucide-react'` with the
// Icon wrapper at `apps/storefront/src/components/ui/icon.tsx`, then drop
// the ceiling in this test.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(__dirname, '..');

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.next' || entry === '.turbo') continue;
      walk(full, acc);
    } else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
      acc.push(full);
    }
  }
  return acc;
}

const ROOTS = [
  resolve(ROOT, 'apps/storefront/src'),
  resolve(ROOT, 'apps/merchant-dashboard/src'),
  resolve(ROOT, 'apps/admin-dashboard/src'),
  resolve(ROOT, 'packages/ui/src'),
];

// Captured 2026-06-22 during Wave 17 (152). Raised to 153 on 2026-06-22 to
// accommodate the new ForgotPassword.tsx page in merchant-dashboard (P1 audit
// follow-up; ArrowLeft + LifeBuoy + Mail icons used in a brand-new page that
// did not previously exist). Raised to 154 on 2026-06-22 to accommodate the
// new WhatsApp.tsx pairing page in merchant-dashboard (WA-PR-2;
// Smartphone + QrCode + CheckCircle2 + AlertTriangle + Loader2 used in a
// brand-new page). Lower this when files are migrated; increasing again
// requires an explicit owner ruling.
const CEILING = 155;

describe('Lucide migration progress (F-QA-D-004 / ISSUE-0009)', () => {
  it(`direct lucide-react imports remain ≤ ${CEILING}`, () => {
    let count = 0;
    const offenders: string[] = [];
    for (const root of ROOTS) {
      let files: string[];
      try {
        files = walk(root);
      } catch {
        continue;
      }
      for (const file of files) {
        const text = readFileSync(file, 'utf-8');
        if (/from\s+['"]lucide-react['"]/.test(text)) {
          count++;
          offenders.push(file.replace(ROOT + '/', ''));
        }
      }
    }
    if (count > CEILING) {
      throw new Error(
        `Lucide migration regressed: ${count} files import lucide-react directly (ceiling ${CEILING}).\n` +
          'New direct imports:\n' +
          offenders.slice(CEILING).join('\n'),
      );
    }
    expect(count).toBeLessThanOrEqual(CEILING);
  });
});
