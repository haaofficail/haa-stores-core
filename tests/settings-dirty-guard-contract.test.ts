// Settings — dirty-state guard contract.
//
// Two bugs were combined here:
//
// 1. The Cancel button only reset `form` (the info/contact/SEO
//    slice). Edits to `storeConfig`, `features`, and `giftOptions`
//    stayed dirty after Cancel, so the merchant thought they had
//    discarded changes but they hadn't.
//
// 2. No beforeunload guard. Edits to any section were lost silently
//    when the merchant clicked a sidebar link or reloaded.
//
// Fix: centralized `originalSnapshot` ref (filled at load + after
// save), `isDirty` computed from JSON.stringify diff across all four
// slices, beforeunload listener that prompts when isDirty, Cancel
// button reverts all slices from the snapshot.
//
// Audit reference: P0 #22–#24 (2026-06-25).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/pages/Settings.tsx'),
  'utf-8',
);

describe('Settings — dirty guard', () => {
  it('declares an originalSnapshot ref covering all editable slices', () => {
    expect(SRC).toMatch(/originalSnapshot\s*=\s*useRef/);
    // The shape must include all four slices that can be edited.
    expect(SRC).toMatch(/form:\s*typeof form/);
    expect(SRC).toMatch(/features:\s*typeof features/);
    expect(SRC).toMatch(/storeConfig:\s*typeof storeConfig/);
    expect(SRC).toMatch(/giftOptions:\s*typeof giftOptions/);
  });

  it('isDirty compares every snapshot slice', () => {
    const block = SRC.slice(SRC.indexOf('const isDirty'), SRC.indexOf('const isDirty') + 600);
    expect(block).toMatch(/JSON\.stringify\(snap\.form\)\s*!==\s*JSON\.stringify\(form\)/);
    expect(block).toMatch(/JSON\.stringify\(snap\.features\)\s*!==\s*JSON\.stringify\(features\)/);
    expect(block).toMatch(/JSON\.stringify\(snap\.storeConfig\)\s*!==\s*JSON\.stringify\(storeConfig\)/);
    expect(block).toMatch(/JSON\.stringify\(snap\.giftOptions\)\s*!==\s*JSON\.stringify\(giftOptions\)/);
  });

  it('installs a beforeunload listener gated on isDirty', () => {
    expect(SRC).toMatch(/window\.addEventListener\(['"]beforeunload['"]/);
    expect(SRC).toMatch(/window\.removeEventListener\(['"]beforeunload['"]/);
    // The effect must be gated on isDirty — otherwise the prompt
    // fires on every navigation, breaking links. We assert by
    // looking at the beforeunload effect body specifically.
    const beforeunloadIdx = SRC.indexOf("'beforeunload'");
    expect(beforeunloadIdx).toBeGreaterThan(0);
    const window = SRC.slice(Math.max(0, beforeunloadIdx - 400), beforeunloadIdx);
    expect(window).toMatch(/if\s*\(!isDirty\)\s*return/);
  });

  it('Cancel button reverts every snapshot slice', () => {
    // All 4 setters must appear in the file (the global one — the
    // local Cancel handler — uses all of them). The file has only
    // one place where all four setters appear together.
    expect(SRC).toMatch(/setForm\(snap\.form\)/);
    expect(SRC).toMatch(/setFeatures\(snap\.features\)/);
    expect(SRC).toMatch(/setStoreConfig\(snap\.storeConfig\)/);
    expect(SRC).toMatch(/setGiftOptions\(snap\.giftOptions\)/);
  });

  it('loadAll updates the snapshot for every slice', () => {
    // Without this, the snapshot stays stale after a successful save
    // and isDirty stays true forever.
    expect(SRC).toMatch(/originalSnapshot\.current\.features\s*=\s*data/);
    expect(SRC).toMatch(/originalSnapshot\.current\.storeConfig\s*=\s*data/);
    expect(SRC).toMatch(/originalSnapshot\.current\.giftOptions\s*=\s*next/);
  });
});
