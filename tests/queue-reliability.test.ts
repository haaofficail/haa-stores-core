// Queue & Worker Reliability — Batch 3 (Path A: Safety Hardening)
//
// Pure-logic unit tests for resolveQueueStatus (the queue-mode classifier)
// plus wiring tests that the health endpoint exposes queue status without
// leaking secrets.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveQueueStatus } from '../apps/api/src/services/queue.js';

const ROOT = resolve(import.meta.dirname, '..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8');

describe('resolveQueueStatus — queue mode classifier', () => {
  it('persistent + ok when the bullmq backend is active', () => {
    const s = resolveQueueStatus({ backend: 'bullmq', nodeEnv: 'production', redisConfigured: true, allowNoop: false });
    expect(s.mode).toBe('persistent');
    expect(s.health).toBe('ok');
    expect(s.safe).toBe(true);
  });

  it('DEGRADED + error when QUEUE_REDIS_URL is set but the queue fell back to noop', () => {
    // intended persistent, but bullmq failed to load/connect -> silent fallback hole
    const s = resolveQueueStatus({ backend: 'noop', nodeEnv: 'production', redisConfigured: true, allowNoop: false });
    expect(s.mode).toBe('degraded');
    expect(s.health).toBe('error');
    expect(s.safe).toBe(false);
  });

  it('noop + warn (safe) in development with no Redis', () => {
    const s = resolveQueueStatus({ backend: 'noop', nodeEnv: 'development', redisConfigured: false, allowNoop: false });
    expect(s.mode).toBe('noop');
    expect(s.health).toBe('warn');
    expect(s.safe).toBe(true);
  });

  it('noop is ERROR + unsafe in production without ALLOW_NOOP_QUEUE', () => {
    const s = resolveQueueStatus({ backend: 'noop', nodeEnv: 'production', redisConfigured: false, allowNoop: false });
    expect(s.mode).toBe('noop');
    expect(s.health).toBe('error');
    expect(s.safe).toBe(false);
  });

  it('noop is ERROR + unsafe in staging without ALLOW_NOOP_QUEUE', () => {
    const s = resolveQueueStatus({ backend: 'noop', nodeEnv: 'staging', redisConfigured: false, allowNoop: false });
    expect(s.health).toBe('error');
    expect(s.safe).toBe(false);
  });

  it('noop in production WITH ALLOW_NOOP_QUEUE is allowed but still flagged (warn, not safe)', () => {
    const s = resolveQueueStatus({ backend: 'noop', nodeEnv: 'production', redisConfigured: false, allowNoop: true });
    expect(s.mode).toBe('noop');
    expect(s.health).toBe('warn');
    expect(s.safe).toBe(false); // explicitly permitted, but the operator owns the risk
  });

  it('always returns a human-readable reason and never throws', () => {
    const s = resolveQueueStatus({ backend: 'noop', nodeEnv: 'production', redisConfigured: false, allowNoop: false });
    expect(typeof s.reason).toBe('string');
    expect(s.reason.length).toBeGreaterThan(0);
  });
});

describe('Queue exports', () => {
  it('queue.ts exports resolveQueueStatus, getQueueStatus, logQueueStartupStatus', () => {
    const src = read('apps/api/src/services/queue.ts');
    expect(src).toContain('export function resolveQueueStatus');
    expect(src).toContain('export function getQueueStatus');
    expect(src).toContain('export function logQueueStartupStatus');
    expect(src).toContain('ALLOW_NOOP_QUEUE');
  });
});

describe('Health endpoint exposes queue status without secrets', () => {
  const src = read('apps/api/src/routes/health.ts');

  it('health returns a queue block sourced from getQueueStatus', () => {
    expect(src).toContain('getQueueStatus');
    expect(src).toContain('queue');
  });

  it('health never reads or returns the raw QUEUE_REDIS_URL / connection string', () => {
    // Only a boolean (redisConfigured) may be exposed — never the URL itself.
    expect(src).not.toContain('QUEUE_REDIS_URL');
  });
});

describe('Startup logging is wired once (no per-enqueue spam added)', () => {
  it('index.ts calls logQueueStartupStatus at boot', () => {
    const src = read('apps/api/src/index.ts');
    expect(src).toContain('logQueueStartupStatus');
  });
});
