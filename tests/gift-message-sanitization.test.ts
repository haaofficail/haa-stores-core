import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sanitizeGiftMessage as sanitizeCommerceGiftMessage } from '../packages/commerce-core/src/gift-message-sanitizer.js';
import { sanitizeGiftMessage as sanitizePublicGiftMessage } from '../packages/shared/src/gift-message.js';

const cartSource = readFileSync(new URL('../packages/commerce-core/src/cart.ts', import.meta.url), 'utf-8');
const checkoutSource = readFileSync(new URL('../packages/commerce-core/src/checkout.ts', import.meta.url), 'utf-8');
const ordersSource = readFileSync(new URL('../packages/commerce-core/src/orders.ts', import.meta.url), 'utf-8');
const storefrontDtoSource = readFileSync(new URL('../packages/shared/src/dto/storefront-dto.ts', import.meta.url), 'utf-8');
const orderSuccessSource = readFileSync(new URL('../apps/storefront/src/pages/OrderSuccess.tsx', import.meta.url), 'utf-8');
const trackOrderSource = readFileSync(new URL('../apps/storefront/src/pages/TrackOrderResult.tsx', import.meta.url), 'utf-8');

describe('gift message sanitization', () => {
  it('converts gift messages to plain text before storage or notification use', () => {
    const raw = '  كل عام<script>alert(1)</script><img src=x onerror=alert(1)>javascript:alert(2)\u0000\nبخير  ';
    const sanitized = sanitizeCommerceGiftMessage(raw);

    expect(sanitized).toContain('كل عام');
    expect(sanitized).toContain('بخير');
    expect(sanitized).not.toMatch(/<|>|script|img|onerror|javascript:|\u0000/i);
    expect(sanitizePublicGiftMessage(raw)).toBe(sanitized);
  });

  it('preserves normal Arabic text while removing markup wrappers', () => {
    expect(sanitizeCommerceGiftMessage('<b>أهلاً وسهلاً</b>\nهدية جميلة')).toBe('أهلاً وسهلاً\nهدية جميلة');
    expect(sanitizePublicGiftMessage('<b>أهلاً وسهلاً</b>\nهدية جميلة')).toBe('أهلاً وسهلاً\nهدية جميلة');
  });

  it('returns null for empty or markup-only messages', () => {
    expect(sanitizeCommerceGiftMessage('   ')).toBeNull();
    expect(sanitizeCommerceGiftMessage('<script>alert(1)</script>')).toBeNull();
    expect(sanitizeCommerceGiftMessage(null)).toBeNull();
    expect(sanitizePublicGiftMessage('   ')).toBeNull();
    expect(sanitizePublicGiftMessage('<script>alert(1)</script>')).toBeNull();
    expect(sanitizePublicGiftMessage(null)).toBeNull();
  });

  it('wires the sanitizer through cart, checkout, and order creation paths', () => {
    for (const source of [cartSource, checkoutSource, ordersSource]) {
      expect(source).toContain("from './gift-message-sanitizer.js'");
      expect(source).toContain('sanitizeGiftMessage(');
    }

    expect(cartSource).toMatch(/giftMessage:\s*hasGiftMessageInput\s*\?\s*sanitizedGiftMessage/);
    expect(checkoutSource).toMatch(/message:\s*sanitizedOrderGiftMessage/);
    expect(ordersSource).toMatch(/giftOptions:\s*sanitizedGiftOptions/);
  });

  it('sanitizes legacy gift messages again at public DTO output boundaries', () => {
    expect(storefrontDtoSource).toContain("from '../gift-message.js'");
    expect(storefrontDtoSource).toMatch(/giftMessage:\s*sanitizeGiftMessage\(item\.giftMessage\)/);
    expect(storefrontDtoSource).toMatch(/message:\s*sanitizeGiftMessage\(giftOpts\.message\)/);
    expect(storefrontDtoSource).toMatch(/giftMessage:\s*sanitizeGiftMessage\(cartItem\.giftMessage\)/);
  });

  it('keeps public gift-message rendering out of dangerouslySetInnerHTML sinks', () => {
    expect(orderSuccessSource).toContain('{order.giftOptions.message}');
    expect(orderSuccessSource).toContain('{item.giftMessage}');
    expect(trackOrderSource).toContain('{order.giftOptions.message}');
    expect(trackOrderSource).toContain('{item.giftMessage}');
    expect(orderSuccessSource).not.toContain('dangerouslySetInnerHTML');
    expect(trackOrderSource).not.toContain('dangerouslySetInnerHTML');
  });
});
