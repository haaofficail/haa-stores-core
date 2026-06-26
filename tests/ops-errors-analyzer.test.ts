import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const scriptPath = resolve(projectRoot, 'scripts/analyze-support-errors.mjs');
const reportScriptPath = resolve(projectRoot, 'scripts/generate-monitoring-report.mjs');
const sharedOpsEventsPath = resolve(projectRoot, 'scripts/ops-events.mjs');

function runAnalyzer(params: {
  monitoringEvents?: unknown[];
  supportEvents?: unknown[];
  now?: string;
  lookbackHours?: number;
}) {
  const dir = mkdtempSync(resolve(tmpdir(), 'haa-ops-errors-'));
  const monitoringPath = resolve(dir, 'monitoring-events.ndjson');
  const supportPath = resolve(dir, 'support-error-events.ndjson');
  writeFileSync(
    monitoringPath,
    (params.monitoringEvents || []).map(event => JSON.stringify(event)).join('\n'),
  );
  writeFileSync(
    supportPath,
    (params.supportEvents || []).map(event => JSON.stringify(event)).join('\n'),
  );

  return execFileSync(process.execPath, [scriptPath], {
    cwd: projectRoot,
    encoding: 'utf-8',
    env: {
      ...process.env,
      HAA_OPS_MONITORING_EVENTS_FILE: monitoringPath,
      HAA_OPS_SUPPORT_EVENTS_FILE: supportPath,
      HAA_OPS_NOW: params.now || '2026-06-25T12:00:00.000Z',
      HAA_OPS_ERRORS_LOOKBACK_HOURS: String(params.lookbackHours ?? 24),
    },
  });
}

function runReport(params: {
  monitoringEvents?: unknown[];
  supportEvents?: unknown[];
  now?: string;
  lookbackHours?: number;
}) {
  const dir = mkdtempSync(resolve(tmpdir(), 'haa-monitor-report-'));
  const monitoringPath = resolve(dir, 'monitoring-events.ndjson');
  const supportPath = resolve(dir, 'support-error-events.ndjson');
  writeFileSync(
    monitoringPath,
    (params.monitoringEvents || []).map(event => JSON.stringify(event)).join('\n'),
  );
  writeFileSync(
    supportPath,
    (params.supportEvents || []).map(event => JSON.stringify(event)).join('\n'),
  );

  return execFileSync(process.execPath, [reportScriptPath], {
    cwd: projectRoot,
    encoding: 'utf-8',
    env: {
      ...process.env,
      HAA_OPS_MONITORING_EVENTS_FILE: monitoringPath,
      HAA_OPS_SUPPORT_EVENTS_FILE: supportPath,
      HAA_OPS_NOW: params.now || '2026-06-25T12:00:00.000Z',
      HAA_OPS_ERRORS_LOOKBACK_HOURS: String(params.lookbackHours ?? 24),
    },
  });
}

describe('ops error analyzer active window', () => {
  it('uses a shared ops event classification module across analyzer and report scripts', () => {
    const analyzerSource = readFileSync(scriptPath, 'utf-8');
    const reportSource = readFileSync(reportScriptPath, 'utf-8');
    const sharedSource = readFileSync(sharedOpsEventsPath, 'utf-8');

    expect(analyzerSource).toContain("from './ops-events.mjs'");
    expect(reportSource).toContain("from './ops-events.mjs'");
    expect(sharedSource).toContain('function isActionableEvent');
    expect(sharedSource).toContain('function partitionOpsEvents');
  });

  it('does not recommend incidents or RCA from stale historical support errors', () => {
    const output = runAnalyzer({
      supportEvents: [
        {
          eventId: 'old-p0',
          timestamp: '2026-06-19T12:00:00.000Z',
          severity: 'P0',
          errorCode: 'DASH-001',
          fingerprint: 'DASH-001::old',
          message: 'old dashboard crash',
          app: 'merchant-dashboard',
        },
        {
          eventId: 'old-r1',
          timestamp: '2026-06-19T12:01:00.000Z',
          severity: 'P2',
          errorCode: 'API-001',
          fingerprint: 'API-001::old-repeat',
          message: 'old API error',
          app: 'api',
        },
        {
          eventId: 'old-r2',
          timestamp: '2026-06-19T12:02:00.000Z',
          severity: 'P2',
          errorCode: 'API-001',
          fingerprint: 'API-001::old-repeat',
          message: 'old API error',
          app: 'api',
        },
        {
          eventId: 'old-r3',
          timestamp: '2026-06-19T12:03:00.000Z',
          severity: 'P2',
          errorCode: 'API-001',
          fingerprint: 'API-001::old-repeat',
          message: 'old API error',
          app: 'api',
        },
      ],
    });

    expect(output).toContain('Actionable events in window: 0');
    expect(output).toContain('Historical events outside window: 4');
    expect(output).toContain('No tasks recommended at this time.');
    expect(output).toContain('No incidents recommended.');
    expect(output).not.toContain('Record 1 P0 incident');
    expect(output).not.toContain('Open Root Cause Analysis for fingerprint: API-001::old-repeat');
  });

  it('keeps recent repeated support fingerprints actionable', () => {
    const output = runAnalyzer({
      supportEvents: [1, 2, 3].map(n => ({
        eventId: `recent-${n}`,
        timestamp: `2026-06-25T11:0${n}:00.000Z`,
        severity: 'P2',
        errorCode: 'API-001',
        fingerprint: 'API-001::recent-repeat',
        message: 'recent API error',
        app: 'api',
        route: '/merchant/1/wallet/summary',
      })),
    });

    expect(output).toContain('Actionable events in window: 3');
    expect(output).toContain('API-001::recent-repeat: 3 times');
    expect(output).toContain('Open Root Cause Analysis for fingerprint: API-001::recent-repeat');
  });

  it('keeps repeated P3 support fingerprints visible for RCA while ignoring passive monitoring noise', () => {
    const output = runAnalyzer({
      supportEvents: [1, 2, 3].map(n => ({
        eventId: `recent-p3-${n}`,
        timestamp: `2026-06-25T11:1${n}:00.000Z`,
        severity: 'P3',
        errorCode: 'NETWORK-001',
        fingerprint: 'NETWORK-001::storefront-fetch-repeat',
        message: 'recent storefront fetch warning',
        app: 'storefront',
        route: '/pricing',
      })),
      monitoringEvents: [
        {
          eventId: 'pass-p3',
          timestamp: '2026-06-25T11:20:00.000Z',
          status: 'pass',
          severity: 'P3',
          target: 'storefront runtime',
          checkType: 'health',
          app: 'storefront',
        },
      ],
    });

    expect(output).toContain('Actionable events in window: 3');
    expect(output).toContain('Passive pass/warn events ignored for recommendations: 1');
    expect(output).toContain('P3: 3');
    expect(output).toContain('NETWORK-001::storefront-fetch-repeat: 3 times');
    expect(output).toContain(
      'Open Root Cause Analysis for fingerprint: NETWORK-001::storefront-fetch-repeat',
    );
    expect(output).not.toContain('storefront runtime: 1');
  });

  it('ignores passive monitoring pass events when ranking actionable targets', () => {
    const output = runAnalyzer({
      monitoringEvents: [
        {
          eventId: 'pass-1',
          timestamp: '2026-06-25T11:30:00.000Z',
          status: 'pass',
          severity: 'P3',
          target: 'package.json exists',
          checkType: 'health',
          app: 'system',
        },
        {
          eventId: 'fail-1',
          timestamp: '2026-06-25T11:31:00.000Z',
          status: 'fail',
          severity: 'P1',
          errorCode: 'SYS-003',
          target: 'api-health',
          checkType: 'synthetic',
          app: 'api',
          fingerprint: 'SYS-003::api-health',
        },
      ],
    });

    expect(output).toContain('Actionable events in window: 1');
    expect(output).toContain('Passive pass/warn events ignored for recommendations: 1');
    expect(output).toContain('api-health: 1');
    expect(output).not.toContain('package.json exists: 1');
  });

  it('monitoring report does not mark stale P0 events as critical', () => {
    const output = runReport({
      supportEvents: [
        {
          eventId: 'old-p0',
          timestamp: '2026-06-19T12:00:00.000Z',
          severity: 'P0',
          errorCode: 'DASH-001',
          fingerprint: 'DASH-001::old',
          message: 'old dashboard crash',
          app: 'merchant-dashboard',
        },
      ],
    });

    expect(output).toContain('Overall Status: Unknown');
  });

  it('monitoring report status uses the latest result per check target', () => {
    const output = runReport({
      monitoringEvents: [
        {
          eventId: 'warn-api',
          timestamp: '2026-06-25T10:00:00.000Z',
          source: 'synthetic-checks.mjs',
          checkType: 'synthetic',
          target: 'api-health',
          app: 'api',
          status: 'warn',
          severity: 'P3',
        },
        {
          eventId: 'pass-api',
          timestamp: '2026-06-25T11:00:00.000Z',
          source: 'synthetic-checks.mjs',
          checkType: 'synthetic',
          target: 'api-health',
          app: 'api',
          status: 'pass',
          severity: 'P3',
        },
      ],
    });

    expect(output).toContain('Overall Status: Healthy');
  });
});
