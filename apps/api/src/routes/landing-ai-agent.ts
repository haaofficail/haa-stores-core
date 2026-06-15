/**
 * Landing AI Agent — API route
 *
 * Public endpoint that powers the Haa landing-page Conversational AI Agent.
 *
 *   POST /api/landing-ai-agent/chat
 *     body: { message: string, history?: AgentMessage[] }
 *     200:  { reply, requiresSignup, remaining, resetAt }
 *     400:  invalid body
 *     429:  rate limit exceeded
 *
 * Design choices
 * ──────────────
 *  - No auth required (the whole point is pre-signup trial).
 *  - Per-IP rate limit: 30 req/min (in-memory bucket; swap to Redis in prod).
 *  - Per-IP soft signup gate: after `MAX_MESSAGES_BEFORE_SIGNUP` user
 *    messages, the reply is replaced with a polite "سجّل كتاجر" message
 *    AND `requiresSignup: true` is returned so the UI can show the
 *    signup CTA more prominently.
 *  - All user text is sanitized (PII strip) before reaching the engine.
 *  - Engine is auto-selected: model if `LANDING_AI_MODEL_*` env is set,
 *    otherwise the offline mock.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import {
  getActiveEngine,
  sanitizeUserMessage,
  checkRateLimit,
  countUserMessage,
  MAX_MESSAGES_BEFORE_SIGNUP,
  type AgentMessage,
} from '@haa/commerce-core/landing-ai-agent';

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(2000),
      })
    )
    .max(40)
    .optional()
    .default([]),
});

const engine = getActiveEngine();

export const SIGNUP_NUDGE_REPLY = {
  body:
    'تمام، وصلتني أسئلتك وأقدر أساعدك أكثر بعد التسجيل. سجّل كتاجر مجانًا (بدون بطاقة بنكية) عشان نخصص لك تجربة كاملة: باقات تناسبك، ثيمات، وأدوات تسويق. دقيقة واحدة فقط.',
  ctaLabel: 'سجّل كتاجر — مجانًا',
  followUps: [],
};

export function createLandingAIAgentRoute() {
  const router = new Hono();

  router.post(
    '/chat',
    zValidator('json', chatSchema, (result, c) => {
      if (!result.success) {
        return c.json({ error: 'invalid_request', details: result.error.flatten() }, 400);
      }
    }),
    async (c) => {
      const ip =
        c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
        c.req.header('x-real-ip') ??
        'unknown';
      const locale = c.req.header('accept-language')?.split(',')[0] ?? 'ar-SA';

      // 1. Rate limit
      const rl = checkRateLimit(ip);
      if (!rl.allowed) {
        return c.json(
          {
            error: 'rate_limited',
            message: 'تجاوزت الحد المسموح من الرسائل. حاول بعد دقيقة.',
            resetAt: rl.resetAt,
          },
          429
        );
      }

      const body = c.req.valid('json');
      const cleanMessage = sanitizeUserMessage(body.message);
      if (!cleanMessage) {
        return c.json({ error: 'empty_message', message: 'الرسالة فارغة' }, 400);
      }

      // 2. Signup gate
      const userCount = countUserMessage(ip);
      if (userCount > MAX_MESSAGES_BEFORE_SIGNUP) {
        return c.json({
          reply: SIGNUP_NUDGE_REPLY,
          requiresSignup: true,
          remaining: 0,
          engine: engine.name,
        });
      }

      // 3. Build the conversation history (sanitize any pre-existing user turns)
      const sanitizedHistory: AgentMessage[] = (body.history ?? []).map((m) => ({
        role: m.role,
        content: m.role === 'user' ? sanitizeUserMessage(m.content) : m.content,
      }));
      // Append the new user turn
      const history: AgentMessage[] = [
        ...sanitizedHistory,
        { role: 'user', content: cleanMessage },
      ];

      // 4. Call the engine
      try {
        const reply = await engine.reply(history, locale);
        return c.json({
          reply,
          requiresSignup: false,
          remaining: Math.max(0, MAX_MESSAGES_BEFORE_SIGNUP - userCount),
          engine: engine.name,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error';
        return c.json({ error: 'engine_error', message }, 502);
      }
    }
  );

  return router;
}
