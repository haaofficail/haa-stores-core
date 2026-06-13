import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildWhatsappContactChannel,
  buildWhatsappLink,
  isValidWhatsappPhone,
  normalizeWhatsappPhone,
} from '../packages/commerce-core/src/contact-channels';

const notificationsRoute = readFileSync(new URL('../apps/api/src/routes/notifications.ts', import.meta.url), 'utf-8');
const footerSource = readFileSync(new URL('../apps/storefront/src/components/Footer.tsx', import.meta.url), 'utf-8');

describe('WhatsApp QR contact regression', () => {
  it('validates E.164 phones and generates local wa.me contact data without external QR services', () => {
    expect(normalizeWhatsappPhone('00966551234567')).toBe('+966551234567');
    expect(isValidWhatsappPhone('+966551234567')).toBe(true);
    expect(buildWhatsappLink('+966551234567')).toBe('https://wa.me/966551234567');
    const channel = buildWhatsappContactChannel(true, '+966551234567', 'hello');
    expect(channel.enabled).toBe(true);
    expect(channel.realDelivery).toBe(false);
    expect(channel.qrDataUrl).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(channel.qrDataUrl).not.toContain('qrserver');
  });

  it('validates WhatsApp preferences and renders contact-only links in storefront footer', () => {
    expect(notificationsRoute).toContain('WhatsApp phone must be E.164');
    expect(footerSource).toContain('whatsappContact?.enabled');
    expect(footerSource).toContain('WhatsApp');
  });
});
