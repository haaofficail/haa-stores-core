// SSRF guard for outbound (merchant-configured) webhooks.
//
// Without this, a merchant with settings:update could register a webhook URL
// like http://169.254.169.254/... (cloud metadata) or http://localhost:6379/
// (internal service); the platform fetches it on every event and stores the
// response body for the merchant to read back — a textbook SSRF with
// exfiltration. The API route only validates `z.string().url()`, which accepts
// all of those, so the guard must live in the delivery service.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertWebhookUrlAllowed,
  assertWebhookTargetResolvesPublic,
  isBlockedIp,
  WebhookUrlNotAllowedError,
} from '@haa/commerce-core';

describe('isBlockedIp — private / reserved ranges', () => {
  const blocked = [
    '127.0.0.1', '127.1.2.3', // loopback
    '10.0.0.1', '10.255.255.255', // private
    '172.16.0.1', '172.31.255.255', // private
    '192.168.0.1', '192.168.1.1', // private
    '169.254.169.254', '169.254.0.1', // link-local + cloud metadata
    '100.64.0.1', // CGNAT
    '0.0.0.0', // unspecified
    '198.18.0.1', // benchmark
    '224.0.0.1', '240.0.0.1', // multicast / reserved
    '::1', // IPv6 loopback
    'fe80::1', // IPv6 link-local
    'fc00::1', 'fd12:3456::1', // IPv6 ULA
    '::ffff:127.0.0.1', '::ffff:169.254.169.254', // IPv4-mapped
  ];
  for (const ip of blocked) {
    it(`blocks ${ip}`, () => expect(isBlockedIp(ip)).toBe(true));
  }

  const allowed = ['8.8.8.8', '1.1.1.1', '203.0.113.10', '172.15.0.1', '172.32.0.1', '2606:4700:4700::1111'];
  for (const ip of allowed) {
    it(`allows public ${ip}`, () => expect(isBlockedIp(ip)).toBe(false));
  }
});

describe('assertWebhookUrlAllowed — config-time shape + literal-host guard', () => {
  it('accepts a normal public https URL', () => {
    expect(() => assertWebhookUrlAllowed('https://hooks.example.com/haa')).not.toThrow();
  });

  it('rejects non-http(s) schemes', () => {
    for (const u of ['file:///etc/passwd', 'gopher://x/', 'ftp://h/', 'data:text/plain,x']) {
      expect(() => assertWebhookUrlAllowed(u)).toThrow(WebhookUrlNotAllowedError);
    }
  });

  it('rejects embedded credentials (used to confuse parsers)', () => {
    expect(() => assertWebhookUrlAllowed('https://user:pass@evil.example.com/')).toThrow(WebhookUrlNotAllowedError);
  });

  it('rejects literal private / loopback / metadata hosts', () => {
    for (const u of [
      'http://169.254.169.254/latest/meta-data/',
      'http://127.0.0.1:6379/',
      'http://localhost/internal',
      'http://10.0.0.5/',
      'http://192.168.1.1/',
      'http://[::1]:8080/',
    ]) {
      expect(() => assertWebhookUrlAllowed(u)).toThrow(WebhookUrlNotAllowedError);
    }
  });

  it('rejects internal-looking hostnames', () => {
    for (const u of ['http://db.internal/', 'http://printer.local/', 'http://api.localhost/']) {
      expect(() => assertWebhookUrlAllowed(u)).toThrow(WebhookUrlNotAllowedError);
    }
  });

  it('rejects a garbage URL', () => {
    expect(() => assertWebhookUrlAllowed('not a url')).toThrow(WebhookUrlNotAllowedError);
  });
});

describe('assertWebhookTargetResolvesPublic — delivery-time DNS guard', () => {
  it('rejects a literal private IP without DNS', async () => {
    await expect(assertWebhookTargetResolvesPublic('http://169.254.169.254/')).rejects.toBeInstanceOf(WebhookUrlNotAllowedError);
  });

  it('rejects a hostname that resolves to loopback (DNS-rebinding class)', async () => {
    // localhost resolves to 127.0.0.1 / ::1 — both blocked.
    await expect(assertWebhookTargetResolvesPublic('http://localhost/')).rejects.toBeInstanceOf(WebhookUrlNotAllowedError);
  });

  it('honours the WEBHOOK_ALLOW_PRIVATE_HOSTS dev opt-out', async () => {
    const prev = process.env.WEBHOOK_ALLOW_PRIVATE_HOSTS;
    process.env.WEBHOOK_ALLOW_PRIVATE_HOSTS = 'true';
    try {
      await expect(assertWebhookTargetResolvesPublic('http://127.0.0.1:3000/')).resolves.toBeInstanceOf(URL);
    } finally {
      if (prev === undefined) delete process.env.WEBHOOK_ALLOW_PRIVATE_HOSTS;
      else process.env.WEBHOOK_ALLOW_PRIVATE_HOSTS = prev;
    }
  });
});

describe('OutboundWebhookService wiring', () => {
  const SRC = readFileSync(resolve(__dirname, '../packages/commerce-core/src/outbound-webhook.ts'), 'utf-8');

  it('validates the URL at create + update time', () => {
    expect(SRC).toMatch(/createEndpoint[\s\S]{0,200}assertWebhookUrlAllowed\(data\.url\)/);
    expect(SRC).toMatch(/updateEndpoint[\s\S]{0,260}assertWebhookUrlAllowed\(data\.url\)/);
  });

  it('re-resolves the target before fetch and refuses redirects', () => {
    const deliverIdx = SRC.indexOf('assertWebhookTargetResolvesPublic(url)');
    const fetchIdx = SRC.indexOf('await fetch(url');
    expect(deliverIdx).toBeGreaterThan(-1);
    expect(fetchIdx).toBeGreaterThan(deliverIdx); // guard precedes the fetch
    expect(SRC).toMatch(/redirect:\s*'error'/);
  });
});
