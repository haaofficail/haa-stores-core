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

export type { ChatEngine } from './engines';
export { mockEngine, getActiveEngine, createModelEngine } from './engines';
export { buildSystemPrompt, VERTICAL_HINTS, PERSONA_NAME, PERSONA_TONE } from './system-prompt';
export { sanitizeUserMessage } from './sanitize';
export { checkRateLimit, __resetRateLimit } from './rate-limit';
export {
  countUserMessage,
  resetCounter,
  getCount,
  __resetSignupCounters,
} from './signup-gate';
export { composeAgentReply } from './matcher';
export { MAX_MESSAGES_BEFORE_SIGNUP } from './signup-gate';
export type { AgentMessage, AgentReply, ReplyId } from './matcher';
export { FALLBACK_REPLY } from './reply-bank';
