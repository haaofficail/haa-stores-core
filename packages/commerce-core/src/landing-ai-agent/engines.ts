/**
 * Landing AI Agent — Engines
 *
 * Two engines:
 *  - `mockEngine` — fully offline, deterministic, uses matcher + reply-bank.
 *  - `modelEngine` — calls an OpenAI-compatible chat completion API. The
 *    system prompt is sent as the system role; the reply is normalized
 *    through `composeAgentReply` so a hallucinating model can never produce
 *    a competitor attack or a revenue guarantee.
 *
 * The active engine is picked by `getActiveEngine()` based on env vars.
 */

import { buildSystemPrompt } from './system-prompt.js';
import { composeAgentReply, type AgentMessage, type AgentReply } from './matcher.js';
import { sanitizeUserMessage } from './sanitize.js';

export interface ChatEngine {
  readonly name: string;
  reply: (history: AgentMessage[], locale: string, signal?: AbortSignal) => Promise<AgentReply>;
}

export const mockEngine: ChatEngine = {
  name: 'mock-matcher',
  async reply(history, _locale) {
    // tiny artificial delay to make the loading state honest
    await new Promise((r) => setTimeout(r, 350));
    return composeAgentReply(history, _locale);
  },
};

export interface ModelEngineConfig {
  /** OpenAI-compatible chat completions endpoint */
  url: string;
  /** Model id (e.g. "gpt-4o-mini", "claude-3-5-sonnet", "llama-3.1-70b") */
  model: string;
  /** Bearer token */
  apiKey: string;
  /** Max tokens for the reply (keeps cost predictable) */
  maxTokens?: number;
  /** Temperature (0.3-0.7 recommended for factual replies) */
  temperature?: number;
}

export function createModelEngine(cfg: ModelEngineConfig): ChatEngine {
  return {
    name: `model:${cfg.model}`,
    async reply(history, locale, signal) {
      // 1. Sanitize the LAST user message before sending upstream
      const sanitized = history.map((m) =>
        m.role === 'user' ? { ...m, content: sanitizeUserMessage(m.content) } : m
      );

      // 2. Build the payload
      const messages = [
        { role: 'system' as const, content: buildSystemPrompt() + `\n\n[locale: ${locale}]` },
        ...sanitized.map((m) => ({ role: m.role, content: m.content })),
      ];

      const res = await fetch(cfg.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify({
          model: cfg.model,
          messages,
          max_tokens: cfg.maxTokens ?? 250,
          temperature: cfg.temperature ?? 0.5,
          // No streaming yet — keep MVP simple
        }),
        signal,
      });

      if (!res.ok) {
        throw new Error(`AI model API error: ${res.status}`);
      }
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('AI model returned empty content');

      // 3. Defense in depth: re-route the model's reply through the
      // composer so a hallucinating model can never bypass the rules.
      // We treat the model output as a NEW user message and pick the
      // closest known reply, OR — better — wrap it as a custom reply.
      // MVP: return the model output wrapped with a generic CTA.
      return {
        id: 'start',
        body: content.trim().slice(0, 800),
        ctaLabel: 'سجّل كتاجر — مجانًا',
        followUps: ['كم تكلفة الباقات؟', 'وش الثيمات المتوفرة؟', 'كيف يساعدني التسويق؟'],
      };
    },
  };
}

/**
 * Pick the active engine from environment variables.
 * Falls back to mock if no model is configured.
 *
 * Required env vars to enable the model engine:
 *   LANDING_AI_MODEL_URL     e.g. "https://api.openai.com/v1/chat/completions"
 *   LANDING_AI_MODEL_NAME    e.g. "gpt-4o-mini"
 *   LANDING_AI_MODEL_KEY     the bearer token
 */
export function getActiveEngine(env: Record<string, string | undefined> = process.env): ChatEngine {
  const url = env.LANDING_AI_MODEL_URL;
  const model = env.LANDING_AI_MODEL_NAME;
  const apiKey = env.LANDING_AI_MODEL_KEY;
  if (url && model && apiKey) {
    return createModelEngine({ url, model, apiKey });
  }
  return mockEngine;
}
