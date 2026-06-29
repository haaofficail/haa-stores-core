import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf-8');

const adminDialog = read('apps/admin-dashboard/src/components/ui/AdminDialog.tsx');
const marketplace = read('apps/admin-dashboard/src/pages/Marketplace.tsx');
const stores = read('apps/admin-dashboard/src/pages/Stores.tsx');
const tenants = read('apps/admin-dashboard/src/pages/Tenants.tsx');

function blockBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  expect(startIndex, `missing start marker: ${start}`).toBeGreaterThanOrEqual(0);
  const endIndex = source.indexOf(end, startIndex);
  expect(endIndex, `missing end marker after: ${start}`).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex + end.length);
}

describe('Admin dangerous-action dialogs accessibility', () => {
  it('provides one admin dialog wrapper with dialog semantics and escape/scroll handling', () => {
    expect(adminDialog).toContain('export function AdminDialog');
    expect(adminDialog).toContain('role="dialog"');
    expect(adminDialog).toContain('aria-modal="true"');
    expect(adminDialog).toContain('aria-labelledby={titleId}');
    expect(adminDialog).toContain('aria-describedby={description ? descriptionId : undefined}');
    expect(adminDialog).toContain("event.key === 'Escape'");
    expect(adminDialog).toContain("document.body.style.overflow = 'hidden'");
    expect(adminDialog).toContain('dialogRef.current?.focus()');
    expect(adminDialog).toContain('tabIndex={-1}');
  });

  it('marketplace rejection/suspension uses AdminDialog and keeps note gating', () => {
    const block = blockBetween(marketplace, '{decisionModal && (', '</AdminDialog>');

    expect(marketplace).toContain("import { AdminDialog } from '../components/ui/AdminDialog'");
    expect(block).toContain('<AdminDialog');
    expect(block).not.toContain('fixed inset-0');
    expect(block).toContain("review(decisionModal.id, decisionModal.status, rejectNote.trim())");
    expect(block).toContain('disabled={!rejectNote.trim()}');
    expect(block).toContain('aria-label={decisionModal.status');
  });

  it('store and tenant status/delete decisions use AdminDialog while edit forms stay out of scope', () => {
    for (const [name, source] of [['stores', stores], ['tenants', tenants]] as const) {
      expect(source, name).toContain("import { AdminDialog } from '../components/ui/AdminDialog'");

      const dialogCount = source.match(/<AdminDialog/g)?.length ?? 0;
      expect(dialogCount, name).toBeGreaterThanOrEqual(2);

      const statusBlock = blockBetween(source, '{statusDialog && (', '</AdminDialog>');
      expect(statusBlock, name).toContain('<AdminDialog');
      expect(statusBlock, name).not.toContain('fixed inset-0');
      expect(statusBlock, name).toContain('statusReason.trim()');
      expect(statusBlock, name).toContain('disabled={!statusReason.trim()}');
      expect(statusBlock, name).toContain('aria-label="سبب القرار *"');

      expect(source, `${name} edit dialog intentionally remains outside this task`).toContain('{dialogOpen && (');
    }
  });
});
