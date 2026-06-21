import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { classifyInboundMessage, significantDigits } from '../packages/commerce-core/src/whatsapp-campaigns.ts';

const route = readFileSync(new URL('../apps/api/src/routes/webhooks.ts', import.meta.url), 'utf-8');

describe('WhatsApp inbound opt-out (QA WA2)', () => {
  it('classifies STOP keywords (English + Arabic) as opt_out', () => {
    for (const w of ['STOP', 'stop', 'Unsubscribe', 'إيقاف', 'ايقاف', 'إلغاء', 'الغاء', 'توقف']) {
      expect(classifyInboundMessage(w)).toBe('opt_out');
    }
  });

  it('classifies START keywords as opt_in', () => {
    for (const w of ['START', 'subscribe', 'اشتراك', 'ابدأ', 'تفعيل']) {
      expect(classifyInboundMessage(w)).toBe('opt_in');
    }
  });

  it('matches only the first word — avoids accidental opt-out', () => {
    expect(classifyInboundMessage("please don't stop sending")).toBe('none');
    expect(classifyInboundMessage('I love your offers')).toBe('none');
    expect(classifyInboundMessage('')).toBe('none');
    expect(classifyInboundMessage(null)).toBe('none');
  });

  it('first-word STOP still triggers even with trailing text', () => {
    expect(classifyInboundMessage('STOP please')).toBe('opt_out');
    expect(classifyInboundMessage('  إيقاف الرسائل ')).toBe('opt_out');
  });

  it('significantDigits normalizes phone formats to last 9 national digits', () => {
    expect(significantDigits('+966512345678')).toBe('512345678');
    expect(significantDigits('00966512345678')).toBe('512345678');
    expect(significantDigits('0512345678')).toBe('512345678');
    expect(significantDigits('966512345678')).toBe('512345678');
    expect(significantDigits('123')).toBe('');
    expect(significantDigits(null)).toBe('');
  });

  it('webhook route is auth-gated (fail-closed) and uses constant-time token compare', () => {
    expect(route).toContain("'/whatsapp/inbound'");
    expect(route).toContain('WHATSAPP_WEBHOOK_SECRET');
    expect(route).toContain('webhook_disabled'); // 503 when secret unset
    expect(route).toContain('tokenMatches');
    expect(route).toContain('timingSafeEqual');
  });
});
