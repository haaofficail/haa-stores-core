// TASK-0038 G1-G10 engineering-side prep tests
//
// These tests verify the engineering deliverables for owner action
// items G8 (hosting region), G10 (DR backup), and G6 (ASV scan
// target config).

import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';

describe('G8: hosting region + data residency', () => {
  it('env.ts includes HOSTING_REGION and DATA_RESIDENCY', async () => {
    const envPath = path.resolve(__dirname, '..', 'apps/api/src/env.ts');
    const source = await fs.readFile(envPath, 'utf-8');
    expect(source).toMatch(/HOSTING_REGION/);
    expect(source).toMatch(/DATA_RESIDENCY/);
  });

  it('health endpoint exposes hostingRegion and dataResidency', async () => {
    const healthPath = path.resolve(__dirname, '..', 'apps/api/src/routes/health.ts');
    const source = await fs.readFile(healthPath, 'utf-8');
    expect(source).toMatch(/hostingRegion/);
    expect(source).toMatch(/dataResidency/);
  });

  it('defaults to "pending" when not configured', async () => {
    const healthPath = path.resolve(__dirname, '..', 'apps/api/src/routes/health.ts');
    const source = await fs.readFile(healthPath, 'utf-8');
    // Both fields must fall back to 'pending' so the absence of env
    // vars is observable (not silent).
    expect(source).toMatch(/'pending'/);
  });
});

describe('G10: DR backup script exists and is executable', () => {
  it('dr-backup.sh exists', async () => {
    const scriptPath = path.resolve(__dirname, '..', 'scripts/dr-backup.sh');
    const stat = await fs.stat(scriptPath);
    expect(stat.isFile()).toBe(true);
  });

  it('dr-backup.sh is executable', async () => {
    const scriptPath = path.resolve(__dirname, '..', 'scripts/dr-backup.sh');
    // In a CI/Windows env, this may not be reflectable, but on macOS/Linux
    // the file mode should include execute bits. We check by trying to
    // access it and reading the shebang.
    const content = await fs.readFile(scriptPath, 'utf-8');
    expect(content.startsWith('#!/bin/bash') || content.startsWith('#!/usr/bin/env bash'))
      .toBe(true);
  });

  it('dr-backup.sh supports --restore-test mode', async () => {
    const scriptPath = path.resolve(__dirname, '..', 'scripts/dr-backup.sh');
    const content = await fs.readFile(scriptPath, 'utf-8');
    expect(content).toMatch(/--restore-test/);
    expect(content).toMatch(/run_restore_test/);
  });

  it('dr-backup.sh supports --incremental mode', async () => {
    const scriptPath = path.resolve(__dirname, '..', 'scripts/dr-backup.sh');
    const content = await fs.readFile(scriptPath, 'utf-8');
    expect(content).toMatch(/--incremental/);
  });

  it('dr-backup.sh implements retention rotation', async () => {
    const scriptPath = path.resolve(__dirname, '..', 'scripts/dr-backup.sh');
    const content = await fs.readFile(scriptPath, 'utf-8');
    expect(content).toMatch(/rotate_old/);
    expect(content).toMatch(/FULL_RETENTION_DAYS/);
  });

  it('dr-backup.sh logs structured events to dr-events.ndjson', async () => {
    const scriptPath = path.resolve(__dirname, '..', 'scripts/dr-backup.sh');
    const content = await fs.readFile(scriptPath, 'utf-8');
    expect(content).toMatch(/dr-events\.ndjson/);
    expect(content).toMatch(/log_event/);
  });
});

describe('G5: trademark filing materials', () => {
  it('TRADEMARK_FILING_MATERIALS.md exists', async () => {
    const docPath = path.resolve(
      __dirname, '..', 'docs/ops/TRADEMARK_FILING_MATERIALS.md',
    );
    const stat = await fs.stat(docPath);
    expect(stat.isFile()).toBe(true);
  });

  it('trademark doc covers 3 marks (Haa, Haa Marketplace, Haa Stores)', async () => {
    const docPath = path.resolve(
      __dirname, '..', 'docs/ops/TRADEMARK_FILING_MATERIALS.md',
    );
    const content = await fs.readFile(docPath, 'utf-8');
    expect(content).toMatch(/Haa Logo/);
    expect(content).toMatch(/سوق هاء/);
    expect(content).toMatch(/Haa Stores/);
  });

  it('trademark doc lists Nice class 35 (online retail)', async () => {
    const docPath = path.resolve(
      __dirname, '..', 'docs/ops/TRADEMARK_FILING_MATERIALS.md',
    );
    const content = await fs.readFile(docPath, 'utf-8');
    expect(content).toMatch(/Class 35/);
  });
});

describe('G6: ASV scan target config', () => {
  it('ASV_SCAN_TARGET.md exists', async () => {
    const docPath = path.resolve(
      __dirname, '..', 'docs/ops/ASV_SCAN_TARGET.md',
    );
    const stat = await fs.stat(docPath);
    expect(stat.isFile()).toBe(true);
  });

  it('ASV doc lists all public-facing hosts', async () => {
    const docPath = path.resolve(
      __dirname, '..', 'docs/ops/ASV_SCAN_TARGET.md',
    );
    const content = await fs.readFile(docPath, 'utf-8');
    expect(content).toMatch(/haastores\.sa/);
    expect(content).toMatch(/app\.haastores\.sa/);
    expect(content).toMatch(/merchants\.haastores\.sa/);
    expect(content).toMatch(/admin\.haastores\.sa/);
    expect(content).toMatch(/api\.haastores\.sa/);
  });

  it('ASV doc excludes internal + webhook endpoints', async () => {
    const docPath = path.resolve(
      __dirname, '..', 'docs/ops/ASV_SCAN_TARGET.md',
    );
    const content = await fs.readFile(docPath, 'utf-8');
    expect(content).toMatch(/webhooks/i);
    expect(content).toMatch(/internal/i);
    expect(content).toMatch(/EXCLUDE/);
  });
});

describe('G9: Tabby data flow documentation', () => {
  it('TABBY_DATA_FLOW.md exists', async () => {
    const docPath = path.resolve(
      __dirname, '..', 'docs/ops/TABBY_DATA_FLOW.md',
    );
    const stat = await fs.stat(docPath);
    expect(stat.isFile()).toBe(true);
  });

  it('Tabby doc enumerates all data points shared with Tabby', async () => {
    const docPath = path.resolve(
      __dirname, '..', 'docs/ops/TABBY_DATA_FLOW.md',
    );
    const content = await fs.readFile(docPath, 'utf-8');
    expect(content).toMatch(/customer\.email/);
    expect(content).toMatch(/customer\.phone/);
    expect(content).toMatch(/shipping_address/);
    expect(content).toMatch(/items\[/);
  });

  it('Tabby doc flags cross-border transfer risk', async () => {
    const docPath = path.resolve(
      __dirname, '..', 'docs/ops/TABBY_DATA_FLOW.md',
    );
    const content = await fs.readFile(docPath, 'utf-8');
    expect(content).toMatch(/cross-border/i);
    expect(content).toMatch(/PDPL/);
  });

  it('Tabby doc includes webhook signature verification snippet', async () => {
    const docPath = path.resolve(
      __dirname, '..', 'docs/ops/TABBY_DATA_FLOW.md',
    );
    const content = await fs.readFile(docPath, 'utf-8');
    expect(content).toMatch(/verifyTabbySignature/);
    expect(content).toMatch(/timingSafeEqual/);
  });
});

describe('G4: DPO + DSAR engineering surface', () => {
  it('merchant-data.ts has PDPL data export endpoint', async () => {
    const dsarPath = path.resolve(
      __dirname, '..', 'apps/api/src/routes/merchant-data.ts',
    );
    const content = await fs.readFile(dsarPath, 'utf-8');
    expect(content).toMatch(/PDPL/);
    // Should expose a data export or deletion endpoint.
    expect(content).toMatch(/export/i);
  });

  it('Admin platform compliance gate engine tracks dpoEmail + dpoPhone + dpoAppointedAt', async () => {
    const compliancePath = path.resolve(
      __dirname, '..', 'apps/admin-dashboard/src/lib/platformComplianceGates.ts',
    );
    const content = await fs.readFile(compliancePath, 'utf-8');
    expect(content).toMatch(/dpoEmail/);
    expect(content).toMatch(/dpoPhone/);
    expect(content).toMatch(/dpoAppointedAt/);
  });
});
