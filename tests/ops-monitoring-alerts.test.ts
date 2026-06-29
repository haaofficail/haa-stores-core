import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const alertScriptPath = resolve(projectRoot, 'scripts/emit-monitoring-alerts.mjs');
const sharedOpsEventsPath = resolve(projectRoot, 'scripts/ops-events.mjs');
const packageJsonPath = resolve(projectRoot, 'package.json');

function runAlerts(params: {
  monitoringEvents?: unknown[];
  supportEvents?: unknown[];
  existingAlerts?: unknown[];
  now?: string;
  lookbackHours?: number;
}) {
  const dir = mkdtempSync(resolve(tmpdir(), 'haa-ops-alerts-'));
  const monitoringPath = resolve(dir, 'monitoring-events.ndjson');
  const supportPath = resolve(dir, 'support-error-events.ndjson');
  const alertsPath = resolve(dir, 'monitoring-alerts.ndjson');

  writeFileSync(
    monitoringPath,
    (params.monitoringEvents || []).map(event => JSON.stringify(event)).join('\n'),
  );
  writeFileSync(
    supportPath,
    (params.supportEvents || []).map(event => JSON.stringify(event)).join('\n'),
  );
  if (params.existingAlerts) {
    writeFileSync(alertsPath, params.existingAlerts.map(event => JSON.stringify(event)).join('\n') + '\n');
  }

  const output = execFileSync(process.execPath, [alertScriptPath], {
    cwd: projectRoot,
    encoding: 'utf-8',
    env: {
      ...process.env,
      HAA_OPS_MONITORING_EVENTS_FILE: monitoringPath,
      HAA_OPS_SUPPORT_EVENTS_FILE: supportPath,
      HAA_OPS_ALERTS_FILE: alertsPath,
      HAA_OPS_NOW: params.now || '2026-06-25T12:00:00.000Z',
      HAA_OPS_ERRORS_LOOKBACK_HOURS: String(params.lookbackHours ?? 24),
    },
  });

  const alerts = existsSync(alertsPath)
    ? readFileSync(alertsPath, 'utf-8')
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line))
    : [];

  return { output, alerts };
}

describe('local monitoring alert emission', () => {
  it('emits an incident alert for an active P0 event with safe evidence metadata', () => {
    const { output, alerts } = runAlerts({
      supportEvents: [
        {
          eventId: 'p0-api-down',
          timestamp: '2026-06-25T11:45:00.000Z',
          severity: 'P0',
          errorCode: 'SYS-001',
          fingerprint: 'SYS-001::api-down',
          message: 'raw message should not be copied into alert evidence',
          app: 'api',
          route: '/health',
        },
      ],
    });

    expect(output).toContain('Alert candidates: 1');
    expect(output).toContain('New alerts emitted: 1');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      dedupeKey: 'incident:p0:SYS-001::api-down',
      kind: 'incident',
      severity: 'P0',
      title: 'P0 incident candidate detected',
      count: 1,
    });
    expect(alerts[0].evidence[0]).toMatchObject({
      eventId: 'p0-api-down',
      errorCode: 'SYS-001',
      fingerprint: 'SYS-001::api-down',
      sourceKind: 'support',
    });
    expect(JSON.stringify(alerts[0])).not.toContain('raw message should not be copied');
  });

  it('emits task and RCA alerts for repeated active P1 events', () => {
    const repeatedEvents = [1, 2, 3].map(n => ({
      eventId: `p1-login-${n}`,
      timestamp: `2026-06-25T11:4${n}:00.000Z`,
      severity: 'P1',
      errorCode: 'AUTH-001',
      fingerprint: 'AUTH-001::merchant-login',
      app: 'merchant-dashboard',
      route: '/login',
    }));

    const { output, alerts } = runAlerts({ supportEvents: repeatedEvents });

    expect(output).toContain('Alert candidates: 2');
    expect(output).toContain('New alerts emitted: 2');
    expect(alerts.map(alert => alert.dedupeKey)).toEqual([
      'task:p1:AUTH-001',
      'rca:fingerprint:AUTH-001::merchant-login',
    ]);
  });

  it('does not write noisy alert records when no event meets alert criteria', () => {
    const { output, alerts } = runAlerts({
      supportEvents: [
        {
          eventId: 'p2-one',
          timestamp: '2026-06-25T11:45:00.000Z',
          severity: 'P2',
          errorCode: 'API-001',
          fingerprint: 'API-001::one-off',
          app: 'api',
          route: '/orders',
        },
      ],
      monitoringEvents: [
        {
          eventId: 'warn-local-api',
          timestamp: '2026-06-25T11:46:00.000Z',
          severity: 'P3',
          status: 'warn',
          target: 'api server not running',
          checkType: 'synthetic',
          app: 'api',
        },
      ],
    });

    expect(output).toContain('Alert candidates: 0');
    expect(output).toContain('No new local monitoring alerts emitted.');
    expect(alerts).toHaveLength(0);
  });

  it('deduplicates previously emitted alerts by dedupeKey', () => {
    const { output, alerts } = runAlerts({
      existingAlerts: [
        {
          dedupeKey: 'rca:fingerprint:API-001::repeat',
          kind: 'root-cause-analysis',
          severity: 'P2',
        },
      ],
      supportEvents: [1, 2, 3].map(n => ({
        eventId: `p2-repeat-${n}`,
        timestamp: `2026-06-25T11:5${n}:00.000Z`,
        severity: 'P2',
        errorCode: 'API-001',
        fingerprint: 'API-001::repeat',
        app: 'api',
        route: '/merchant/1/orders',
      })),
    });

    expect(output).toContain('Alert candidates: 1');
    expect(output).toContain('New alerts emitted: 0');
    expect(alerts).toHaveLength(1);
  });

  it('wires ops:alerts into the root monitor command', () => {
    const packageJson = readFileSync(packageJsonPath, 'utf-8');
    const sharedOpsEvents = readFileSync(sharedOpsEventsPath, 'utf-8');

    expect(packageJson).toContain('"ops:alerts": "node scripts/emit-monitoring-alerts.mjs"');
    expect(packageJson).toContain('"ops:monitor": "pnpm ops:health && pnpm ops:synthetic && pnpm ops:errors && pnpm ops:alerts"');
    expect(sharedOpsEvents).toContain('export function buildOpsAlerts');
  });
});
