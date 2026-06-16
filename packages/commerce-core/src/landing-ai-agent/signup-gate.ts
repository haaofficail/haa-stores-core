/**
 * Landing AI Agent — Signup Gate (per-IP conversation count)
 *
 * Tracks how many "user" messages a given IP has sent across the chat.
 * Beyond `MAX_MESSAGES_BEFORE_SIGNUP`, the assistant gently asks the
 * visitor to sign up — it does NOT hard-block. This is a soft, polite
 * conversion nudge, not a captcha or wall.
 *
 * In-memory, MVP-friendly. For production a Redis counter is recommended.
 */

/** Max user messages allowed before we ask the visitor to sign up. */
export const MAX_MESSAGES_BEFORE_SIGNUP = 8;

const counters = new Map<string, number>();

/** Count a user message from the given IP. Returns the new total. */
export function countUserMessage(ip: string): number {
  const key = ip || 'unknown';
  const current = counters.get(key) ?? 0;
  const next = current + 1;
  counters.set(key, next);
  return next;
}

/** Reset count for an IP (e.g. on successful signup). */
export function resetCounter(ip: string): void {
  counters.delete(ip || 'unknown');
}

/** Read current count without incrementing. */
export function getCount(ip: string): number {
  return counters.get(ip || 'unknown') ?? 0;
}

/** Test-only: reset all counters. */
export function __resetSignupCounters() {
  counters.clear();
}
