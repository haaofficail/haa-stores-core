// (No import of the redis factory — we read process.env.QUEUE_REDIS_URL
// directly. The BullMQ backend is created lazily inside the factory.)

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

function tryCreateBullMqQueue(): QueueProducer | null {
  try {
    // Lazy require — keeps bullmq optional in dev/test.
    // The `as unknown` cast is the same pattern as observability.ts:
    // the package is optional and TS shouldn't reject this file when
    // it's absent.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const BullMQ = require('bullmq') as any;

    if (!process.env.QUEUE_REDIS_URL) return null;

    // We use the simple Queue constructor; Connection is via the URL.
    // BullMQ signature: new Queue(name, { connection, defaultJobOptions })
    // We accept any name; the caller passes `opts.name` per job.
    const queue = new BullMQ.Queue('haa-default', {
      connection: { url: process.env.QUEUE_REDIS_URL },
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
    process.stderr.write(
      `[queue] QUEUE_REDIS_URL set but bullmq is not available; falling back to noop. ` +
        `Reason: ${(err as Error).message}\n`
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
