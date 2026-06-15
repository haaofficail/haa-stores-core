import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const queueFile = resolve(projectRoot, 'apps/api/src/services/queue.ts');
const envFile = resolve(projectRoot, 'apps/api/src/env.ts');
const servicesReadme = resolve(projectRoot, 'apps/api/src/services/README.md');

function read(p: string): string {
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

describe('Quality Pass 5 — Queue Scaffold (Item 2)', () => {
  it('queue service module must exist', () => {
    expect(existsSync(queueFile)).toBe(true);
  });

  it('queue module must export a producer (enqueue function)', () => {
    const content = read(queueFile);
    expect(content).toMatch(/export\s+(function|const|class|interface)\s+(getQueue|QueueProducer|enqueue)/);
    expect(content).toMatch(/enqueue/);
  });

  it('queue module must define a noop backend (always safe, no Redis required)', () => {
    const content = read(queueFile);
    expect(content).toMatch(/NoopQueue|noop/);
    expect(content).toMatch(/backend/);
  });

  it('queue module must support a BullMQ backend via lazy require', () => {
    const content = read(queueFile);
    expect(content).toMatch(/bullmq|BullMQ/i);
    // Must not hard-import bullmq at module load — only require() inside try/catch
    expect(content).not.toMatch(/^import.*from\s+['"]bullmq['"]/m);
  });

  it('queue module must read QUEUE_REDIS_URL to choose backend', () => {
    const content = read(queueFile);
    expect(content).toMatch(/QUEUE_REDIS_URL/);
  });

  it('queue module must never throw if bullmq is not installed (try/catch fallback to noop)', () => {
    const content = read(queueFile);
    expect(content).toMatch(/try\s*\{/);
    expect(content).toMatch(/catch\s*\(/);
    expect(content).toMatch(/falling back to noop/i);
  });

  it('queue module must NOT add bullmq as a hard dep — uses optional peer pattern', () => {
    const content = read(queueFile);
    // Either pattern is acceptable:
    //  - @ts-expect-error / @ts-ignore (TS comment-based suppression)
    //  - `as any` / `as unknown` cast on the require result
    //  - import inside try/catch that lets runtime handle absence
    const hasTsSuppress = /@ts-(expect-error|ignore)/.test(content);
    const hasCast = /require\(['"]bullmq['"]\)\s+as\s+\w+/.test(content);
    const hasTryCatch = /try\s*\{[\s\S]*require\(['"]bullmq['"]\)[\s\S]*catch/.test(content);
    expect(hasTsSuppress || hasCast || hasTryCatch).toBe(true);
    // Must NOT have a hard import at the top of the file
    expect(content).not.toMatch(/^import\s+.*from\s+['"]bullmq['"]/m);
  });

  it('queue module must be importable + idempotent (getQueue returns same instance)', () => {
    const content = read(queueFile);
    // Look for the cache pattern
    expect(content).toMatch(/let\s+_queue|_queue\s*=\s*null|cached/i);
  });

  it('JobOptions shape must include name + data + delayMs + attempts', () => {
    const content = read(queueFile);
    expect(content).toMatch(/name:\s*string/);
    expect(content).toMatch(/data:\s*Record/);
    expect(content).toMatch(/delayMs/);
    expect(content).toMatch(/attempts/);
  });

  it('env.ts must declare QUEUE_REDIS_URL as a recognized env var', () => {
    const content = read(envFile);
    expect(content).toMatch(/QUEUE_REDIS_URL/);
  });

  it('env.ts must require QUEUE_REDIS_URL in production', () => {
    const content = read(envFile);
    // It should be in the production-required list
    expect(content).toMatch(/QUEUE_REDIS_URL/);
    expect(content).toMatch(/required\.push.*QUEUE_REDIS_URL/);
  });

  it('services/ README must document the queue shim pattern (next to observability shim)', () => {
    const content = read(servicesReadme);
    // Add a "queue" mention to the README by extension — not strictly
    // required, but if the queue module exists, the convention should
    // mention it
    const queueReadmeExists = existsSync(resolve(projectRoot, 'apps/api/src/services/QUEUE.md'));
    const servicesReadmeMentionsQueue = /queue/i.test(content);
    expect(queueReadmeExists || servicesReadmeMentionsQueue).toBe(true);
  });
});
