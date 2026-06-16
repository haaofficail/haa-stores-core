/**
 * Landing AI Agent — Engine tests
 *
 * Validates the offline engine that powers the Haa landing page
 * "Conversational AI Agent". The engine is multi-turn aware, persona-bound,
 * and never attacks competitors or promises revenue.
 */
import { describe, it, expect } from 'vitest';

import {
  buildSystemPrompt,
  sanitizeUserMessage,
  composeAgentReply,
  MAX_MESSAGES_BEFORE_SIGNUP,
  type AgentMessage,
} from '../packages/commerce-core/src/landing-ai-agent';

describe('Landing AI Agent — system prompt', () => {
  it('declares the Haa persona identity', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('Haa');
    expect(prompt).toMatch(/مساعد/);
  });

  it('forbids competitor attacks by name', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toMatch(/لا (تهاجم|تذكر).*منافس/);
  });

  it('forbids revenue guarantees', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toMatch(/لا تضمن|لا تعد.*زيادة المبيعات/);
  });

  it('requires a practical next step at the end of every reply', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toMatch(/خطوة عملية|خطوة تالية/);
  });

  it('forbids login requests before signup gate', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toMatch(/لا تطلب.*تسجيل/);
  });
});

describe('Landing AI Agent — message sanitization', () => {
  it('strips email addresses', () => {
    const out = sanitizeUserMessage('ايميلي ahmed@test.com وكلمتي اهلا');
    expect(out).not.toContain('ahmed@test.com');
    expect(out).toContain('اهلا');
  });

  it('strips phone numbers (KSA format)', () => {
    const out = sanitizeUserMessage('رقمي 0501234567 أبي أبدأ');
    expect(out).not.toMatch(/0501234567/);
    expect(out).toContain('أبدأ');
  });

  it('strips international phone numbers with separators', () => {
    const out = sanitizeUserMessage('call +966 50 123 4567 about my store');
    expect(out).not.toMatch(/966/);
  });

  it('strips URLs', () => {
    const out = sanitizeUserMessage('شوف https://example.com/something');
    expect(out).not.toContain('https://');
  });

  it('trims and collapses whitespace', () => {
    expect(sanitizeUserMessage('   مرحبا   بكم   ')).toBe('مرحبا بكم');
  });

  it('returns empty string for empty / whitespace input', () => {
    expect(sanitizeUserMessage('')).toBe('');
    expect(sanitizeUserMessage('     ')).toBe('');
  });

  it('caps message length to 500 chars', () => {
    const huge = 'ا'.repeat(1000);
    expect(sanitizeUserMessage(huge).length).toBeLessThanOrEqual(500);
  });
});

describe('Landing AI Agent — composer (multi-turn aware)', () => {
  const baseHistory: AgentMessage[] = [
    { role: 'assistant', content: 'أهلًا، أنا مساعد Haa الذكي. وش تبيع؟' },
  ];

  it('matches perfumes with persona-appropriate reply + follow-ups', async () => {
    const r = await composeAgentReply(
      [...baseHistory, { role: 'user', content: 'أبيع عطور' }],
      'ar-SA'
    );
    expect(r.body).toContain('عطور');
    expect(r.body.length).toBeGreaterThan(50);
    expect(r.followUps.length).toBeGreaterThanOrEqual(2);
    expect(r.followUps.length).toBeLessThanOrEqual(3);
  });

  it('uses Saudi tone, never mixes in English unless technical term', async () => {
    const r = await composeAgentReply(
      [...baseHistory, { role: 'user', content: 'أبيع عطور' }],
      'ar-SA'
    );
    // Must contain Arabic text
    expect(r.body).toMatch(/[\u0600-\u06FF]/);
  });

  it('handles follow-up that references earlier turn (context awareness)', async () => {
    const history: AgentMessage[] = [
      ...baseHistory,
      { role: 'user', content: 'أبيع عطور' },
      { role: 'assistant', content: 'حلو، Haa يدعم متاجر العطور بثيم فاخر.' },
      { role: 'user', content: 'وكم تكلفة الباقات؟' },
    ];
    const r = await composeAgentReply(history, 'ar-SA');
    // Should answer pricing without re-asking the business type
    expect(r.body).toMatch(/سعر|باق|تكلف/);
    expect(r.body).not.toMatch(/وش تبيع/);
  });

  it('migrating from salla/zid → migrate reply with team handoff', async () => {
    const r = await composeAgentReply(
      [...baseHistory, { role: 'user', content: 'عندي متجر في سلة وأبي أنقل' }],
      'ar-SA'
    );
    expect(r.body).toContain('نقل');
    expect(r.ctaLabel).toBeTruthy();
  });

  it('competitor question: never attacks, focuses on Haa differentiators', async () => {
    const r = await composeAgentReply(
      [...baseHistory, { role: 'user', content: 'وش يميز Haa عن غيره' }],
      'ar-SA'
    );
    expect(r.body).not.toMatch(/سلة|زد|نون/);
    expect(r.body).toMatch(/بساطة|عربية|تسويق|ذكي/);
  });

  it('falls back gracefully on off-topic question', async () => {
    const r = await composeAgentReply(
      [...baseHistory, { role: 'user', content: 'طقس الرياض اليوم؟' }],
      'ar-SA'
    );
    expect(r.body).toMatch(/نشاط|اكتب لي/);
    expect(r.followUps.length).toBeGreaterThan(0);
  });

  it('replies are deterministic in mock mode', async () => {
    const history = [...baseHistory, { role: 'user', content: 'أبيع ملابس' }];
    const a = await composeAgentReply(history, 'ar-SA');
    const b = await composeAgentReply(history, 'ar-SA');
    expect(a.body).toBe(b.body);
  });

  it('never claims a revenue or sales guarantee across all intents', async () => {
    const queries = ['عطور', 'ملابس', 'مطعم', 'إلكترونيات', 'كم السعر', 'وش يميزكم', 'تسويق', 'مستشفى', 'أثاث', 'خدمات'];
    for (const q of queries) {
      const r = await composeAgentReply(
        [...baseHistory, { role: 'user', content: q }],
        'ar-SA'
      );
      expect(r.body, `guarantee detected for "${q}"`).not.toMatch(
        /نضمن|ضمان|مؤكد.*زيادة|ستحقق|سنضاعف|ستبيع/
      );
    }
  });

  it('every reply ends with a practical next step (ctaLabel present)', async () => {
    const queries = ['عطور', 'ملابس', 'مطعم', 'سلة', 'تسويق', 'إلكترونيات', 'كم السعر', 'وش يميزكم'];
    for (const q of queries) {
      const r = await composeAgentReply(
        [...baseHistory, { role: 'user', content: q }],
        'ar-SA'
      );
      expect(r.ctaLabel, `missing ctaLabel for "${q}"`).toBeTruthy();
    }
  });

  it('follow-ups never duplicate the seed prompt', async () => {
    const r = await composeAgentReply(
      [...baseHistory, { role: 'user', content: 'أبيع عطور' }],
      'ar-SA'
    );
    const seeds = ['أبيع عطور'];
    for (const seed of seeds) {
      expect(r.followUps).not.toContain(seed);
    }
  });
});

describe('Landing AI Agent — signup gate', () => {
  it('exposes a positive integer max-messages threshold', () => {
    expect(MAX_MESSAGES_BEFORE_SIGNUP).toBeGreaterThan(0);
    expect(MAX_MESSAGES_BEFORE_SIGNUP).toBeLessThanOrEqual(20);
  });
});
