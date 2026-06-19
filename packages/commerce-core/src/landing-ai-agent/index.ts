/**
 * Landing AI Agent — Public surface
 *
 * The Haa landing page Conversational AI Agent. Backend + frontend share
 * this module to guarantee both ends stay in sync on persona, sanitization,
 * rate limits, and the signup gate.
 *
 *   engine       →  mock or model (auto-picked from env)
 *   composeReply →  the pure composer (used by mock + for post-processing
 *                   model output)
 *   sanitize     →  strips PII before any I/O
 *   rate limit   →  in-memory token bucket per IP
 *   signup gate  →  soft conversion nudge after N messages per IP
 */

export type { ChatEngine } from './engines.js';
export { mockEngine, getActiveEngine, createModelEngine } from './engines.js';
export { buildSystemPrompt, VERTICAL_HINTS, PERSONA_NAME, PERSONA_TONE } from './system-prompt.js';
export { sanitizeUserMessage } from './sanitize.js';
export { checkRateLimit, __resetRateLimit } from './rate-limit.js';
export {
  countUserMessage,
  resetCounter,
  getCount,
  __resetSignupCounters,
} from './signup-gate.js';
export { composeAgentReply } from './matcher.js';
export { MAX_MESSAGES_BEFORE_SIGNUP } from './signup-gate.js';
export type { AgentMessage, AgentReply, ReplyId } from './matcher.js';
export { FALLBACK_REPLY } from './reply-bank.js';
