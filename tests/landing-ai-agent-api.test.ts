/**
 * Landing AI Agent — API logic tests
 *
 * Tests the pure request-handling logic (no Hono runtime required) so this
 * file can run inside the root test suite. Full Hono integration is verified
 * by `pnpm dev:api` + manual browser QA on the landing page.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { __resetRateLimit, checkRateLimit } from '../packages/commerce-core/src/landing-ai-agent/rate-limit';
import {
  __resetSignupCounters,
  countUserMessage,
  getCount,
  MAX_MESSAGES_BEFORE_SIGNUP,
} from '../packages/commerce-core/src/landing-ai-agent';
import { sanitizeUserMessage } from '../packages/commerce-core/src/landing-ai-agent/sanitize';
import { composeAgentReply } from '../packages/commerce-core/src/landing-ai-agent/matcher';

describe('Landing AI Agent — request pipeline', () => {
  beforeEach(() => {
    __resetRateLimit();
    __resetSignupCounters();
  });

  describe('rate limit', () => {
    it('allows up to 30 requests per IP per window', () => {
      for (let i = 0; i < 30; i++) {
        expect(checkRateLimit('9.9.9.1').allowed).toBe(true);
      }
    });

    it('blocks the 31st request from the same IP', () => {
      for (let i = 0; i < 30; i++) checkRateLimit('9.9.9.2');
      const blocked = checkRateLimit('9.9.9.2');
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it('tracks each IP independently', () => {
      for (let i = 0; i < 30; i++) checkRateLimit('9.9.9.3');
      expect(checkRateLimit('9.9.9.4').allowed).toBe(true);
    });
  });

  describe('sanitize (request boundary)', () => {
    it('strips email before any downstream work', () => {
      expect(sanitizeUserMessage('hello ahmed@example.com world')).not.toContain('@');
    });
    it('strips KSA phone', () => {
      expect(sanitizeUserMessage('رقمي 0501234567 راسلني')).not.toMatch(/0501234567/);
    });
    it('returns empty for whitespace', () => {
      expect(sanitizeUserMessage('   ')).toBe('');
    });
  });

  describe('signup gate counter', () => {
    it('counts up per IP', () => {
      expect(countUserMessage('1.1.1.1')).toBe(1);
      expect(countUserMessage('1.1.1.1')).toBe(2);
      expect(countUserMessage('1.1.1.1')).toBe(3);
      expect(getCount('1.1.1.1')).toBe(3);
    });
    it('tracks IPs independently', () => {
      countUserMessage('2.2.2.1');
      countUserMessage('2.2.2.1');
      countUserMessage('2.2.2.2');
      expect(getCount('2.2.2.1')).toBe(2);
      expect(getCount('2.2.2.2')).toBe(1);
    });
    it('exposes a sane threshold', () => {
      expect(MAX_MESSAGES_BEFORE_SIGNUP).toBeGreaterThan(0);
      expect(MAX_MESSAGES_BEFORE_SIGNUP).toBeLessThanOrEqual(20);
    });
  });

  describe('end-to-end pipeline (engine)', () => {
    it('produces a valid reply for a perfume query', async () => {
      const r = await composeAgentReply(
        [{ role: 'assistant', content: 'أهلًا' }, { role: 'user', content: 'أبيع عطور' }],
        'ar-SA'
      );
      expect(r.body).toContain('عطور');
      expect(r.ctaLabel).toBeTruthy();
      expect(r.followUps.length).toBeGreaterThan(0);
    });

    it('produces a pricing reply that never names a fabricated number', async () => {
      const r = await composeAgentReply(
        [
          { role: 'assistant', content: 'أهلًا' },
          { role: 'user', content: 'أبيع عطور' },
          { role: 'assistant', content: 'حلو' },
          { role: 'user', content: 'وكم تكلفة الباقات' },
        ],
        'ar-SA'
      );
      expect(r.body).toMatch(/سعر|باق|تكلف/);
      // No fabricated SAR numbers
      expect(r.body).not.toMatch(/\d+\s*ر\.س/);
    });

    it('returns a fallback for off-topic input', async () => {
      const r = await composeAgentReply(
        [{ role: 'assistant', content: 'أهلًا' }, { role: 'user', content: 'طقس الرياض' }],
        'ar-SA'
      );
      expect(r.body).toMatch(/نشاط|اكتب لي/);
    });

    it('never echoes back PII', async () => {
      const r = await composeAgentReply(
        [{ role: 'assistant', content: 'أهلًا' }, { role: 'user', content: 'ايميلي leak@x.com أبي أبدأ' }],
        'ar-SA'
      );
      expect(r.body).not.toContain('leak@x.com');
    });
  });
});
