// PROBLEM-015 — ZATCA invoice hash chain (Phase 2 tamper-evidence).
//
// Pure-compute tests for the chain helpers in
// packages/zatca-core/src/chain.ts. The DB-aware writer (which holds
// SELECT ... FOR UPDATE on the chain head + handles unique_violation
// retries) is tested separately via the integration suite; here we
// verify the deterministic core.
//
// What we guard:
//   - GENESIS previousHash is exactly 64 zero hex chars.
//   - Chain links: entry[N+1].previousHash === entry[N].currentHash.
//   - Determinism: same XML + same previousHash → same currentHash.
//   - Tamper-evidence: changing the XML changes currentHash.
//   - Linkage: changing the previousHash changes currentHash even
//     when XML is unchanged.
//   - Invalid inputs are rejected (bad hex, non-positive sequence).
//   - The fork-prevention DB constraint is documented in the
//     migration file we just shipped.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  GENESIS_PREVIOUS_HASH,
  canonicaliseInvoiceXml,
  sha256Hex,
  computeChainEntry,
  verifyChainEntry,
} from '@haa/zatca-core';

const XML_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice><cbc:ID>INV-1</cbc:ID></Invoice>`;

const XML_OTHER = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice><cbc:ID>INV-2</cbc:ID></Invoice>`;

describe('PROBLEM-015 — chain primitives', () => {
  it('GENESIS_PREVIOUS_HASH is 64 zero hex chars', () => {
    expect(GENESIS_PREVIOUS_HASH).toMatch(/^0{64}$/);
    expect(GENESIS_PREVIOUS_HASH).toHaveLength(64);
  });

  it('canonicaliseInvoiceXml normalises CRLF, trailing whitespace, outer whitespace', () => {
    // CRLF → LF; trailing whitespace per line stripped; document
    // .trim()ed so leading/trailing blank chars don't change the hash.
    // Internal indentation is preserved (only trailing per-line ws).
    const messy = '  <a>\r\n  <b/>  \r\n</a>\r\n';
    const clean = canonicaliseInvoiceXml(messy);
    expect(clean).toBe('<a>\n  <b/>\n</a>');
  });

  it('sha256Hex output is 64 lowercase hex chars', () => {
    const digest = sha256Hex('hello world');
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    // Verified against `echo -n "hello world" | shasum -a 256`:
    expect(digest).toBe(
      'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
    );
  });
});

describe('PROBLEM-015 — chain construction', () => {
  it('first invoice (genesis) produces a deterministic currentHash', () => {
    const e = computeChainEntry({
      xml: XML_SAMPLE,
      previousHash: GENESIS_PREVIOUS_HASH,
      sequence: 1,
    });
    expect(e.previousHash).toBe(GENESIS_PREVIOUS_HASH);
    expect(e.xmlHash).toMatch(/^[0-9a-f]{64}$/);
    expect(e.currentHash).toMatch(/^[0-9a-f]{64}$/);

    // Determinism: re-running yields the same result.
    const e2 = computeChainEntry({
      xml: XML_SAMPLE,
      previousHash: GENESIS_PREVIOUS_HASH,
      sequence: 1,
    });
    expect(e2.currentHash).toBe(e.currentHash);
    expect(e2.xmlHash).toBe(e.xmlHash);
  });

  it('three sequential invoices link correctly', () => {
    const e1 = computeChainEntry({
      xml: XML_SAMPLE,
      previousHash: GENESIS_PREVIOUS_HASH,
      sequence: 1,
    });
    const e2 = computeChainEntry({
      xml: XML_OTHER,
      previousHash: e1.currentHash,
      sequence: 2,
    });
    const e3 = computeChainEntry({
      xml: XML_SAMPLE, // intentionally same as e1 — different position
      previousHash: e2.currentHash,
      sequence: 3,
    });
    expect(e2.previousHash).toBe(e1.currentHash);
    expect(e3.previousHash).toBe(e2.currentHash);
    // Same XML at sequence 1 and 3 → same xmlHash but different
    // currentHash (because previousHash differs). This is the property
    // that makes the chain tamper-evident.
    expect(e3.xmlHash).toBe(e1.xmlHash);
    expect(e3.currentHash).not.toBe(e1.currentHash);
  });

  it('changing the XML changes the currentHash (tamper-evident)', () => {
    const e1 = computeChainEntry({
      xml: XML_SAMPLE,
      previousHash: GENESIS_PREVIOUS_HASH,
      sequence: 1,
    });
    const e1tampered = computeChainEntry({
      xml: XML_SAMPLE + ' ',
      previousHash: GENESIS_PREVIOUS_HASH,
      sequence: 1,
    });
    // The whitespace IS stripped by canonicalisation — so this case
    // should produce identical hashes.
    expect(e1tampered.currentHash).toBe(e1.currentHash);

    // But a real content change does break the hash.
    const e1real = computeChainEntry({
      xml: XML_SAMPLE.replace('INV-1', 'INV-99'),
      previousHash: GENESIS_PREVIOUS_HASH,
      sequence: 1,
    });
    expect(e1real.currentHash).not.toBe(e1.currentHash);
  });

  it('changing the previousHash changes the currentHash', () => {
    const a = computeChainEntry({
      xml: XML_SAMPLE,
      previousHash: GENESIS_PREVIOUS_HASH,
      sequence: 1,
    });
    const b = computeChainEntry({
      xml: XML_SAMPLE,
      previousHash: 'f'.repeat(64),
      sequence: 1,
    });
    expect(a.xmlHash).toBe(b.xmlHash);
    expect(a.currentHash).not.toBe(b.currentHash);
  });

  it('verifyChainEntry returns ok:true for an unchanged entry, ok:false after tamper', () => {
    const e = computeChainEntry({
      xml: XML_SAMPLE,
      previousHash: GENESIS_PREVIOUS_HASH,
      sequence: 1,
    });
    const good = verifyChainEntry({
      xml: XML_SAMPLE,
      previousHash: GENESIS_PREVIOUS_HASH,
      sequence: 1,
      currentHash: e.currentHash,
    });
    expect(good.ok).toBe(true);

    // Pretend the stored XML was edited after the fact:
    const bad = verifyChainEntry({
      xml: XML_SAMPLE.replace('INV-1', 'INV-99'),
      previousHash: GENESIS_PREVIOUS_HASH,
      sequence: 1,
      currentHash: e.currentHash,
    });
    expect(bad.ok).toBe(false);
    expect(bad.expected.currentHash).not.toBe(e.currentHash);
  });

  it('rejects invalid previousHash (length / hex)', () => {
    expect(() =>
      computeChainEntry({
        xml: XML_SAMPLE,
        previousHash: 'short',
        sequence: 1,
      }),
    ).toThrow(/previousHash must be 64/);
    expect(() =>
      computeChainEntry({
        xml: XML_SAMPLE,
        previousHash: 'G'.repeat(64), // not hex
        sequence: 1,
      }),
    ).toThrow(/previousHash must be 64/);
  });

  it('rejects invalid sequence (zero, negative, non-integer)', () => {
    const ok = { xml: XML_SAMPLE, previousHash: GENESIS_PREVIOUS_HASH };
    expect(() => computeChainEntry({ ...ok, sequence: 0 })).toThrow(/sequence/);
    expect(() => computeChainEntry({ ...ok, sequence: -1 })).toThrow(/sequence/);
    expect(() => computeChainEntry({ ...ok, sequence: 1.5 })).toThrow(/sequence/);
  });
});

describe('PROBLEM-015 — schema + migration artefacts', () => {
  const root = resolve(new URL('..', import.meta.url).pathname);

  it('compliance.ts declares zatcaInvoiceChain with the fork-prevention unique index', () => {
    const src = readFileSync(
      resolve(root, 'packages/db/src/schema/compliance.ts'),
      'utf-8',
    );
    expect(src).toMatch(/zatcaInvoiceChain/);
    expect(src).toMatch(/uniqueIndex\('zatca_chain_invoice_uuid_uq'\)/);
    expect(src).toMatch(/uniqueIndex\('zatca_chain_store_previous_uq'\)\.on\(t\.storeId,\s*t\.previousHash\)/);
  });

  it('migration 0076 is registered in _journal.json', () => {
    const journal = JSON.parse(
      readFileSync(
        resolve(root, 'packages/db/src/migrations/meta/_journal.json'),
        'utf-8',
      ),
    );
    const tags: string[] = journal.entries.map((e: { tag: string }) => e.tag);
    expect(tags).toContain('0076_zatca_invoice_chain');
  });

  it('migration 0076 SQL is idempotent (IF NOT EXISTS) and declares both unique indexes', () => {
    const sql = readFileSync(
      resolve(
        root,
        'packages/db/src/migrations/0076_zatca_invoice_chain.sql',
      ),
      'utf-8',
    );
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS "zatca_invoice_chain"/);
    expect(sql).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS "zatca_chain_invoice_uuid_uq"/);
    expect(sql).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS "zatca_chain_store_previous_uq"/);
  });
});
