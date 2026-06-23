/**
 * PROBLEM-015 — ZATCA invoice hash chain (Phase 2 tamper-evidence).
 *
 * Each invoice issued by a store gets exactly one chain entry whose
 * `previousHash` is the prior entry's `currentHash`. The chain is
 * persisted in `zatca_invoice_chain` (see compliance.ts schema) and
 * enforced fork-free by a UNIQUE INDEX on (store_id, previous_hash).
 *
 * This file is the PURE compute layer:
 *   - canonical-string the invoice XML for hashing
 *   - compute the next chain entry given (xml, previousHash, sequence)
 *
 * The DB-aware writer (which reads the head FOR UPDATE, inserts, and
 * handles unique_violation retries) lives in apps/api — kept separate
 * so this package stays DB-free and unit-testable.
 *
 * Status: implementation-ready, requires ZATCA sandbox validation
 * before declaring Phase 2 compliant. The hash scheme matches the
 * generic ZATCA chain pattern (sha256(canonical_xml || prev_hash))
 * but the canonicalization rules ZATCA accepts at portal validation
 * are detailed in their docs and may require additional normalisation
 * (whitespace, namespace ordering, signing block placement, etc.).
 */

import { createHash } from 'node:crypto';

/**
 * Genesis previousHash for the very first invoice in a store's chain.
 * 64 zero hex chars — matches the column width and is unambiguously
 * "no predecessor".
 */
export const GENESIS_PREVIOUS_HASH = '0'.repeat(64);

/**
 * Canonicalise an invoice XML for hashing. Currently a minimal
 * normalisation: trim, collapse trailing whitespace per line. ZATCA
 * Phase 2 may require fuller XML c14n; the sandbox validation step
 * will tell us if that's needed. The function is exported so the
 * writer + verifier always agree on the canonical form.
 */
export function canonicaliseInvoiceXml(xml: string): string {
  return xml
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .join('\n')
    .trim();
}

/**
 * sha256 hex digest of an arbitrary string. Exported for verifiers.
 */
export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export interface ChainEntryInput {
  /** Canonical (or raw — we canonicalise) invoice XML. */
  xml: string;
  /**
   * 64-hex hash of the prior entry's `currentHash`. For the first
   * entry in a store's chain, pass GENESIS_PREVIOUS_HASH.
   */
  previousHash: string;
  /**
   * Monotonic chain position. 1 for the first invoice in a store's
   * chain, 2 for the second, etc. The DB also enforces uniqueness on
   * (storeId, previousHash) so even a wrong sequence can't produce a
   * fork — sequence is informational + index-friendly.
   */
  sequence: number;
}

export interface ChainEntry {
  previousHash: string;
  xmlHash: string;
  currentHash: string;
  sequence: number;
}

/**
 * Compute the next chain entry from an XML payload + the prior
 * entry's currentHash. Pure: no DB access, no I/O. Same input ALWAYS
 * yields the same output — required so verifiers can re-derive any
 * historical entry deterministically.
 *
 * currentHash = sha256( xmlHash + "|" + previousHash )
 *
 * Why concatenate hashes rather than the raw XML?
 *   - The xmlHash is already a stable digest of the canonical XML.
 *   - Hashing the digests keeps `currentHash` cheap and removes any
 *     ambiguity about whitespace in the XML between writer + reader.
 *   - The delimiter "|" prevents length-extension collisions.
 */
export function computeChainEntry(input: ChainEntryInput): ChainEntry {
  if (!/^[0-9a-f]{64}$/.test(input.previousHash)) {
    throw new Error(
      `computeChainEntry: previousHash must be 64 lowercase hex chars (got length ${input.previousHash.length})`,
    );
  }
  if (!Number.isInteger(input.sequence) || input.sequence < 1) {
    throw new Error(
      `computeChainEntry: sequence must be a positive integer (got ${input.sequence})`,
    );
  }
  const canonical = canonicaliseInvoiceXml(input.xml);
  const xmlHash = sha256Hex(canonical);
  const currentHash = sha256Hex(`${xmlHash}|${input.previousHash}`);
  return {
    previousHash: input.previousHash,
    xmlHash,
    currentHash,
    sequence: input.sequence,
  };
}

/**
 * Verify a chain entry against the same inputs. Returns the recomputed
 * entry and a boolean indicating whether the supplied currentHash
 * matches what we would have produced. Useful for audit jobs that walk
 * the chain.
 */
export function verifyChainEntry(
  input: ChainEntryInput & { currentHash: string },
): { ok: boolean; expected: ChainEntry } {
  const expected = computeChainEntry(input);
  return { ok: expected.currentHash === input.currentHash, expected };
}
