/**
 * Regression: KYC completionPercent field name consistency
 *
 * Bug history (2026-06-19):
 *   - API returns `completionPercent` (in packages/commerce-core/src/kyc.ts)
 *   - Frontend (Compliance.tsx) was reading `completionPercentage` — ALWAYS undefined
 *   - Result: progress bar stuck at 0% even when profile fields were filled.
 *
 * This test asserts the field name is the SAME everywhere the status payload is
 * consumed in the merchant dashboard, so the binding cannot drift again.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === 'build' || entry === '.git') continue;
      walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

describe('KYC completionPercent field-name consistency', () => {
  const merchantPages = 'apps/merchant-dashboard/src';

  it('frontend never reads the dead `completionPercentage` field on status payload', () => {
    const files = walk(merchantPages).filter(f => /\.(ts|tsx)$/.test(f));
    const offenders: Array<{ file: string; line: number; text: string }> = [];

    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      const lines = src.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Only flag data-binding reads, not translation keys or comments.
        if (line.includes('completionPercentage') && !line.trim().startsWith('//') && !line.includes('labelKey') && !line.includes('t(\'')) {
          offenders.push({ file, line: i + 1, text: line.trim() });
        }
      }
    }

    if (offenders.length > 0) {
      const msg = offenders.map(o => `  ${o.file}:${o.line}  ${o.text}`).join('\n');
      throw new Error(
        `Found ${offenders.length} usage(s) of the dead field \`completionPercentage\`. ` +
        `The API actually returns \`completionPercent\` (see packages/commerce-core/src/kyc.ts). ` +
        `Either rename the API field, or fix the binding. Offenders:\n${msg}`,
      );
    }
  });

  it('API + tests + frontend agree on the canonical field name (completionPercent)', () => {
    const api = readFileSync('packages/commerce-core/src/kyc.ts', 'utf8');
    expect(api).toMatch(/completionPercent\s*:/);
    expect(api).not.toMatch(/completionPercentage\s*:/);

    const smoke = readFileSync('tests/smoke.test.ts', 'utf8');
    expect(smoke).toMatch(/completionPercent/);
  });
});
