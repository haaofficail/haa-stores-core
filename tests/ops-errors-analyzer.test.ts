import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const scriptPath = resolve(projectRoot, 'scripts/analyze-support-errors.mjs');

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

describe('ops error analyzer active window', () => {
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
});
