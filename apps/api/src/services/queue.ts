// (No import of the redis factory — we read process.env.QUEUE_REDIS_URL
// directly. The BullMQ backend is created lazily inside the factory.)
//
// The api is ESM ("type": "module"), so plain `require()` is undefined.
// `createRequire` gives us a CJS-style require bound to this module's URL
// so we can lazy-load optional deps (bullmq, ioredis) without making the
// whole factory async (call sites are synchronous).
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/**
 * Queue shim — provides a minimal job-queue contract for the API.
 *
 * Design (mirrors apps/api/src/services/observability.ts):
 *  - If BullMQ is installed AND QUEUE_REDIS_URL is set → real BullMQ-backed
 *    queue. Lazily required so the dep stays optional.
 *  - Otherwise → noop queue. Jobs are "scheduled" into an in-memory array
 *    (lost on process restart) and "processed" by an async no-op. This is
 *    intentional: dev/local runs shouldn't pay the BullMQ + Redis cost.
 *  - Never throws at boot. The noop path logs to stderr so jobs aren't
 *    silently lost in production (the operator sees them).
 *
 * For now we provide only the **producer** surface (`enqueue`). The worker
 * surface (`process`) lives in a future iteration of Quality Pass 5.
 *
 * The shape is intentionally BullMQ-flavored (`name`, `data`, `delayMs`,
 * `attempts`) so the noop and real impl are interchangeable.
 */

export type QueueName = string;

export interface JobOptions {
  /** Job name — used by the worker to route to the right handler. */
  name: string;
  /** Serializable payload. The worker deserializes it. */
  data: Record<string, unknown>;
  /** Delay before the worker should process the job (milliseconds). */
  delayMs?: number;
  /** Max attempts before the job is moved to the failed queue. */
  attempts?: number;
}

export interface QueueProducer {
  enqueue(opts: JobOptions): Promise<void>;
  /** Number of jobs currently buffered (noop only). 0 for BullMQ. */
  depth(): number;
  /** Which backend is active. Useful for diagnostics + tests. */
  readonly backend: 'bullmq' | 'noop';
}

// ── Noop Backend ──────────────────────────────────────
//
// In-memory list of jobs. Intentionally tiny — it's a contract scaffold,
// not a real queue. Production deployments that need durability MUST
// install bullmq and set QUEUE_REDIS_URL.

class NoopQueue implements QueueProducer {
  readonly backend = 'noop' as const;
  private buffered: JobOptions[] = [];

  async enqueue(opts: JobOptions): Promise<void> {
    this.buffered.push(opts);
    // Surface to stderr so production operators see what would have been queued.
    process.stderr.write(
      `[noop-queue] enqueue ${JSON.stringify({ name: opts.name, delayMs: opts.delayMs ?? 0 })}\n`
    );
  }

  depth(): number {
    return this.buffered.length;
  }
}

// ── BullMQ Backend (lazy) ────────────────────────────
//
// Only constructed if `bullmq` is installed and QUEUE_REDIS_URL is set.
// The require is wrapped in try/catch — if bullmq isn't installed we
// return a noop and warn once, so the rest of the app keeps working.

// Captures the actual exception so /api/health can surface it without
// requiring SSH access to the api container stderr stream.
let _bullmqInitError: string | null = null;
export function getBullmqInitError(): string | null {
  return _bullmqInitError;
}

function tryCreateBullMqQueue(): QueueProducer | null {
  try {
    // Lazy require — keeps bullmq optional in dev/test.
    const BullMQ = require('bullmq') as any;

    if (!process.env.QUEUE_REDIS_URL) return null;

    // BullMQ v5 requires an IORedis instance (or host/port options), not
    // a `{ url }` object — and requires `maxRetriesPerRequest: null` on
    // the connection so the worker poll doesn't time out mid-blocking-read.
    const IORedis = require('ioredis') as any;
    const Redis = IORedis.default ?? IORedis;
    const connection = new Redis(process.env.QUEUE_REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });

    const queue = new BullMQ.Queue('haa-default', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });

    return {
      backend: 'bullmq' as const,
      async enqueue(opts: JobOptions): Promise<void> {
        await queue.add(opts.name, opts.data, {
          delay: opts.delayMs,
          attempts: opts.attempts,
        });
      },
      depth(): number {
        // BullMQ exposes counts via getJobCounts(); we keep it simple
        // and report 0 (caller can use the BullMQ dashboard for real
        // numbers). Returning a count would require an async API.
        return 0;
      },
    };
  } catch (err) {
    const msg = (err as Error).message;
    _bullmqInitError = msg;
    process.stderr.write(
      `[queue] QUEUE_REDIS_URL set but bullmq is not available; falling back to noop. ` +
        `Reason: ${msg}\n`
    );
    return null;
  }
}

// ── Factory ───────────────────────────────────────────

let _queue: QueueProducer | null = null;

/**
 * Get the active queue producer. Idempotent — same instance on repeat calls.
 *  - bullmq installed + QUEUE_REDIS_URL set → real BullMQ queue
 *  - otherwise → noop queue (always safe, never throws)
 */
export function getQueue(): QueueProducer {
  if (_queue) return _queue;
  const bull = tryCreateBullMqQueue();
  _queue = bull ?? new NoopQueue();
  return _queue;
}

/** Test/diagnostic helper: reset the cached queue. */
export function _resetQueue(): void {
  _queue = null;
}
// ── Queue mode / reliability (Batch 3, Path A) ────────────────────────────
//
// Make the queue mode explicit and visible so an operator can never be
// silently running on the in-memory noop backend in staging/production.
//
//   persistent — bullmq is active (durable; survives restart)
//   degraded   — QUEUE_REDIS_URL is set (persistent was INTENDED) but the
//                queue fell back to noop (bullmq missing / failed to load).
//                This is the silent-fallback hole and is always unsafe.
//   noop       — no QUEUE_REDIS_URL; the in-memory scaffold. Safe in
//                dev/local only. In staging/production it requires an
//                explicit ALLOW_NOOP_QUEUE=true opt-in (and is still flagged).

export type QueueMode = 'persistent' | 'noop' | 'degraded';

export interface QueueStatus {
  /** Resolved queue mode. */
  mode: QueueMode;
  /** Active backend implementation. */
  backend: 'bullmq' | 'noop';
  /** Whether QUEUE_REDIS_URL is configured. BOOLEAN ONLY — never the value. */
  redisConfigured: boolean;
  /** Whether noop is explicitly permitted in this environment. */
  allowNoop: boolean;
  /** Whether the current mode is safe for the running environment. */
  safe: boolean;
  /** Health signal for the /health endpoint. */
  health: 'ok' | 'warn' | 'error';
  /** Human-readable explanation (safe to log / expose; no secrets). */
  reason: string;
}

function isProdLike(nodeEnv: string): boolean {
  return nodeEnv === 'production' || nodeEnv === 'staging';
}

/**
 * Pure classifier for the queue mode. No I/O, no secrets — takes the already
 * resolved inputs so it is fully unit-testable.
 */
export function resolveQueueStatus(input: {
  backend: 'bullmq' | 'noop';
  nodeEnv: string;
  redisConfigured: boolean;
  allowNoop: boolean;
}): QueueStatus {
  const { backend, nodeEnv, redisConfigured, allowNoop } = input;
  const base = { backend, redisConfigured, allowNoop };

  if (backend === 'bullmq') {
    return { ...base, mode: 'persistent', safe: true, health: 'ok',
      reason: 'Persistent BullMQ queue is active (durable across restarts).' };
  }

  // backend === 'noop' from here on.
  if (redisConfigured) {
    // QUEUE_REDIS_URL is set, so persistence was intended, but we are on noop.
    return { ...base, mode: 'degraded', safe: false, health: 'error',
      reason: 'QUEUE_REDIS_URL is set but the queue fell back to the in-memory noop backend (bullmq missing or failed to connect). Jobs are NOT durable.' };
  }

  if (!isProdLike(nodeEnv)) {
    return { ...base, mode: 'noop', safe: true, health: 'warn',
      reason: 'In-memory noop queue (no QUEUE_REDIS_URL). Acceptable in dev/local; jobs are lost on restart.' };
  }

  // prod/staging on noop.
  if (allowNoop) {
    return { ...base, mode: 'noop', safe: false, health: 'warn',
      reason: 'In-memory noop queue explicitly permitted via ALLOW_NOOP_QUEUE in a prod-like environment. Jobs are NOT durable — operator owns this risk.' };
  }
  return { ...base, mode: 'noop', safe: false, health: 'error',
    reason: 'In-memory noop queue in a prod-like environment without ALLOW_NOOP_QUEUE. Configure QUEUE_REDIS_URL + bullmq, or set ALLOW_NOOP_QUEUE=true to acknowledge the risk.' };
}

/** Resolve the live queue status from the active backend + process env. */
export function getQueueStatus(): QueueStatus {
  const status = resolveQueueStatus({
    backend: getQueue().backend,
    nodeEnv: process.env.NODE_ENV || 'development',
    redisConfigured: !!process.env.QUEUE_REDIS_URL,
    allowNoop: process.env.ALLOW_NOOP_QUEUE === 'true',
  });
  const initErr = getBullmqInitError();
  if (initErr && status.mode === 'degraded') {
    return { ...status, reason: `${status.reason} initError: ${initErr}` };
  }
  return status;
}

/**
 * Emit a SINGLE clear queue-mode line at startup (no per-enqueue spam).
 * error → stderr, warn → stderr, ok → stdout. Never prints secrets.
 */
export function logQueueStartupStatus(): void {
  const s = getQueueStatus();
  const line = `[queue] mode=${s.mode} backend=${s.backend} redisConfigured=${s.redisConfigured} health=${s.health} — ${s.reason}\n`;
  if (s.health === 'ok') {
    process.stdout.write(line);
  } else {
    process.stderr.write(line);
  }
}
