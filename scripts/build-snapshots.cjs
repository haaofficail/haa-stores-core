#!/usr/bin/env node
// scripts/build-snapshots.cjs
//
// Drizzle-kit snapshot synthesis for haa-stores-core.
//
// WORKAROUND for the "SyntaxError: Unexpected token Bud1" bug:
// When the migration journal has entries whose *_snapshot.json is missing,
// drizzle-kit's prepareMigrationFolder crashes on validation.
//
// This script deep-clones the previous valid snapshot and applies the
// minimal schema deltas for the missing migrations so the chain is
// complete and drizzle-kit can run normally.
//
// USAGE:  node scripts/build-snapshots.cjs
// SAFE:   Idempotent. Won't overwrite an existing snapshot. Won't touch
//         migrations that already have a snapshot.
//
// See: memory/drizzle-migration-snapshots.md for the full background.

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'packages', 'db', 'src', 'migrations');
const META_DIR = path.join(MIGRATIONS_DIR, 'meta');
const JOURNAL_PATH = path.join(META_DIR, '_journal.json');

// Manual schema deltas for the migrations that need synthesis.
// Each delta is applied on top of the previous snapshot to produce
// the next one. Format: { '00NN': (snapshot) => { ...mutations... } }
//
// IMPORTANT: keep these in sync with the corresponding SQL files.
// When you add a new migration that needs a synthesized snapshot,
// add a delta here AND ensure the corresponding .sql is committed.
const SCHEMA_DELTAS = {
  // 0050 — store_billing_settings table
  // SQL: CREATE TABLE store_billing_settings (id, store_id, platform_fee_*, is_platform_fee_enabled, ...)
  '0050': (snap) => {
    snap.tables['public.store_billing_settings'] = {
      name: 'store_billing_settings',
      schema: 'public',
      columns: {
        id: { name: 'id', type: 'serial', primaryKey: true, notNull: true },
        store_id: { name: 'store_id', type: 'integer', primaryKey: false, notNull: true },
        platform_fee_mode: { name: 'platform_fee_mode', type: 'varchar(30)', primaryKey: false, notNull: true, default: "'percentage'" },
        platform_fee_pct: { name: 'platform_fee_pct', type: 'numeric(8, 6)', primaryKey: false, notNull: false },
        platform_fee_fixed: { name: 'platform_fee_fixed', type: 'numeric(12, 2)', primaryKey: false, notNull: false },
        is_platform_fee_enabled: { name: 'is_platform_fee_enabled', type: 'boolean', primaryKey: false, notNull: true, default: 'true' },
        effective_from: { name: 'effective_from', type: 'timestamp', primaryKey: false, notNull: false },
        created_at: { name: 'created_at', type: 'timestamp', primaryKey: false, notNull: true, default: 'now()' },
        updated_at: { name: 'updated_at', type: 'timestamp', primaryKey: false, notNull: true, default: 'now()' },
        updated_by: { name: 'updated_by', type: 'integer', primaryKey: false, notNull: false },
        change_reason: { name: 'change_reason', type: 'text', primaryKey: false, notNull: false },
      },
      indexes: {
        store_billing_settings_store_id_unique: {
          name: 'store_billing_settings_store_id_unique',
          columns: ['store_id'],
          isUnique: true,
        },
      },
      foreignKeys: {
        store_billing_settings_store_id_stores_id_fk: {
          name: 'store_billing_settings_store_id_stores_id_fk',
          tableFrom: ['public', 'store_billing_settings'],
          columnsFrom: ['store_id'],
          tableTo: ['public', 'stores'],
          columnsTo: ['id'],
          onUpdate: 'no action',
          onDelete: 'no action',
        },
        store_billing_settings_updated_by_users_id_fk: {
          name: 'store_billing_settings_updated_by_users_id_fk',
          tableFrom: ['public', 'store_billing_settings'],
          columnsFrom: ['updated_by'],
          tableTo: ['public', 'users'],
          columnsTo: ['id'],
          onUpdate: 'no action',
          onDelete: 'no action',
        },
      },
      compositePrimaryKeys: {},
      uniqueConstraints: {
        store_billing_settings_store_id_unique: {
          name: 'store_billing_settings_store_id_unique',
          columns: ['store_id'],
        },
      },
      policies: {},
      checkConstraints: {},
      isRLSEnabled: false,
    };
  },

  // 0051 — wallet_entries: fee_rate_pct + fee_fixed + fee_source columns
  '0051': (snap) => {
    const wallet = snap.tables['public.wallet_entries'];
    if (!wallet) {
      throw new Error('public.wallet_entries table not found in 0051 snapshot; expected 0050 to add it');
    }
    wallet.columns['fee_rate_pct'] = { name: 'fee_rate_pct', type: 'numeric(8, 6)', primaryKey: false, notNull: false };
    wallet.columns['fee_fixed'] = { name: 'fee_fixed', type: 'numeric(12, 2)', primaryKey: false, notNull: false };
    wallet.columns['fee_source'] = { name: 'fee_source', type: 'varchar(30)', primaryKey: false, notNull: false };
  },

  // 0052 — store_billing_settings: CHECK constraint cap at 50% on platform_fee_pct
  '0052': (snap) => {
    const billing = snap.tables['public.store_billing_settings'];
    if (!billing) {
      throw new Error('public.store_billing_settings table not found in 0052 snapshot; expected 0050 to add it');
    }
    billing.checkConstraints = billing.checkConstraints || {};
    billing.checkConstraints['store_billing_settings_pct_cap'] = {
      name: 'store_billing_settings_pct_cap',
      value: '"platform_fee_pct" IS NULL OR "platform_fee_pct" <= 0.5',
    };
  },

  // 0053 — store_billing_settings: COD fee columns + cod_fee_pct cap
  '0053': (snap) => {
    const billing = snap.tables['public.store_billing_settings'];
    if (!billing) {
      throw new Error('public.store_billing_settings table not found in 0053 snapshot; expected 0050 to add it');
    }
    billing.columns['cod_fee_mode'] = { name: 'cod_fee_mode', type: 'varchar(30)', primaryKey: false, notNull: true, default: "'percentage'" };
    billing.columns['cod_fee_pct'] = { name: 'cod_fee_pct', type: 'numeric(8, 6)', primaryKey: false, notNull: false };
    billing.columns['cod_fee_fixed'] = { name: 'cod_fee_fixed', type: 'numeric(12, 2)', primaryKey: false, notNull: false };
    billing.columns['is_cod_fee_enabled'] = { name: 'is_cod_fee_enabled', type: 'boolean', primaryKey: false, notNull: true, default: 'true' };
    billing.checkConstraints = billing.checkConstraints || {};
    billing.checkConstraints['store_billing_settings_cod_pct_cap'] = {
      name: 'store_billing_settings_cod_pct_cap',
      value: '"cod_fee_pct" IS NULL OR "cod_fee_pct" <= 0.5',
    };
  },
};

function main() {
  const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, 'utf8'));
  const existingSnapshots = new Set(
    fs.readdirSync(META_DIR).filter((f) => f.endsWith('_snapshot.json')),
  );

  // Build a map of journal entries by tag (so we can read prevId for chain)
  const journalByTag = {};
  for (const entry of journal.entries) {
    journalByTag[entry.tag] = entry;
  }

  // For each missing snapshot, find the most recent existing one before it
  // and synthesize forward.
  const sortedTags = Object.keys(journalByTag).sort();
  let generated = 0;
  let skipped = 0;

  for (const tag of sortedTags) {
    const shortTag = tag.split('_')[0]; // e.g. '0050_store_billing_settings' → '0050'
    const snapFile = `${shortTag}_snapshot.json`;
    const snapPath = path.join(META_DIR, snapFile);

    if (existingSnapshots.has(snapFile)) {
      skipped++;
      continue;
    }

    if (!SCHEMA_DELTAS[shortTag]) {
      console.warn(`⚠️  No schema delta defined for ${shortTag}; skipping (${tag})`);
      continue;
    }

    // Find the most recent existing snapshot before this tag
    let prevSnapshot = null;
    let prevTag = null;
    for (let i = sortedTags.indexOf(tag) - 1; i >= 0; i--) {
      const prevShort = sortedTags[i].split('_')[0];
      const prevFile = `${prevShort}_snapshot.json`;
      if (existingSnapshots.has(prevFile)) {
        prevSnapshot = JSON.parse(fs.readFileSync(path.join(META_DIR, prevFile), 'utf8'));
        prevTag = prevShort;
        break;
      }
    }

    if (!prevSnapshot) {
      console.error(`❌ Cannot find a previous snapshot for ${shortTag} (${tag})`);
      process.exit(1);
    }

    // Clone + apply delta
    const newSnap = JSON.parse(JSON.stringify(prevSnapshot));
    newSnap.id = shortTag;
    newSnap.prevId = prevTag;
    newSnap.lastModified = Date.now();

    SCHEMA_DELTAS[shortTag](newSnap);

    // Write
    fs.writeFileSync(snapPath, JSON.stringify(newSnap, null, 2));
    console.log(`✅ Synthesized ${snapFile} from ${prevTag}_snapshot.json`);
    generated++;
    existingSnapshots.add(snapFile); // so subsequent syntheses can use it as prev
  }

  console.log(`\n📊 Summary: ${generated} generated, ${skipped} already existed`);
  if (generated === 0) {
    console.log('✨ Snapshot chain already complete — no synthesis needed.');
  } else {
    console.log('🧪 Run `pnpm --filter @haa/db generate` to verify drizzle-kit works.');
  }
}

main();
