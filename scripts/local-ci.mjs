#!/usr/bin/env node
// Haa Stores Core — Local CI Script
// Runs the same checks a remote CI would run, locally.
// Use this before committing to enforce quality gates.
//
// Quality Pass 1 — Item 4: Local CI script (no remote GitHub repo exists).

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

const PASS = '\x1b[32m✅\x1b[0m';
const FAIL = '\x1b[31m❌\x1b[0m';
const SKIP = '\x1b[33m⏭\x1b[0m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

const steps = [
  {
    name: 'preflight (project structure)',
    cmd: 'pnpm preflight',
    required: true,
  },
  {
    name: 'typecheck (all 21 packages)',
    cmd: 'pnpm typecheck',
    required: true,
  },
  {
    name: 'lint (eslint .)',
    cmd: 'pnpm lint',
    required: true,
  },
  {
    name: 'test (vitest run)',
    cmd: 'pnpm test',
    required: true,
    note: 'Pre-existing test DB issues may cause failures unrelated to your change',
  },
];

function runStep(step) {
  const start = Date.now();
  process.stdout.write(`\n${BOLD}▶ ${step.name}${RESET}\n`);
  try {
    execSync(step.cmd, {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' },
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    process.stdout.write(`${PASS} ${step.name} (${elapsed}s)\n`);
    return { name: step.name, status: 'pass', elapsed };
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    process.stdout.write(`${FAIL} ${step.name} (${elapsed}s)\n`);
    if (step.note) {
      process.stdout.write(`  ${SKIP} ${step.note}\n`);
    }
    return { name: step.name, status: 'fail', elapsed, error: err.message };
  }
}

function main() {
  // Verify we're in the right directory
  if (!existsSync(resolve(projectRoot, 'package.json'))) {
    process.stderr.write(`${FAIL} Not in Haa Stores Core project root\n`);
    process.stderr.write(`  Expected: ${projectRoot}\n`);
    process.exit(2);
  }

  console.log(`${BOLD}=== Haa Stores Core — Local CI ===${RESET}`);
  console.log(`Project root: ${projectRoot}`);
  console.log(`Steps: ${steps.length}`);

  const results = [];
  for (const step of steps) {
    results.push(runStep(step));
  }

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const totalElapsed = results.reduce((sum, r) => sum + parseFloat(r.elapsed), 0).toFixed(1);

  console.log(`\n${BOLD}=== Summary ===${RESET}`);
  console.log(`  ${PASS} ${passed} passed`);
  console.log(`  ${FAIL} ${failed} failed`);
  console.log(`  Total: ${totalElapsed}s`);

  if (failed > 0) {
    console.log(`\n${FAIL} Local CI FAILED. Fix issues before committing.`);
    process.exit(1);
  } else {
    console.log(`\n${PASS} Local CI PASSED. Safe to commit.`);
    process.exit(0);
  }
}

main();
