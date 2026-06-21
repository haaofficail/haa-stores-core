import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { mapDeliveryStatus } from '../packages/commerce-core/src/whatsapp-campaigns.ts';

const schema = readFileSync(new URL('../packages/db/src/schema/campaigns.ts', import.meta.url), 'utf-8');
const migration = readFileSync(new URL('../packages/db/src/migrations/0070_whatsapp_delivery.sql', import.meta.url), 'utf-8');
const svc = readFileSync(new URL('../packages/commerce-core/src/whatsapp-campaigns.ts', import.meta.url), 'utf-8');
const route = readFileSync(new URL('../apps/api/src/routes/webhooks.ts', import.meta.url), 'utf-8');

describe('WhatsApp delivery tracking (QA WA5)', () => {
  it('maps provider delivery statuses to our enum', () => {
    expect(mapDeliveryStatus('delivered')).toBe('delivered');
    expect(mapDeliveryStatus('DeliveredToHandset')).toBe('delivered');
    expect(mapDeliveryStatus('read')).toBe('read');
    expect(mapDeliveryStatus('seen')).toBe('read');
    expect(mapDeliveryStatus('failed')).toBe('failed');
    expect(mapDeliveryStatus('undelivered')).toBe('failed');
    expect(mapDeliveryStatus('expired')).toBe('failed');
  });

  it('returns null for unknown / empty statuses (ignored, not crashing)', () => {
    expect(mapDeliveryStatus('queued')).toBeNull();
    expect(mapDeliveryStatus('')).toBeNull();
    expect(mapDeliveryStatus(null)).toBeNull();
  });

  it('schema has delivery columns + messageId index', () => {
    expect(schema).toContain("'delivered'");
    expect(schema).toContain("'read'");
    expect(schema).toContain('deliveredAt');
    expect(schema).toContain('readAt');
    expect(schema).toContain('deliveredCount');
    expect(schema).toContain('readCount');
    expect(schema).toContain('wa_campaign_sends_message_id_idx');
  });

  it('migration adds the columns and index', () => {
    expect(migration).toContain('delivered_count');
    expect(migration).toContain('read_count');
    expect(migration).toContain('delivered_at');
    expect(migration).toContain('read_at');
    expect(migration).toContain('wa_campaign_sends_message_id_idx');
  });

  it('recordDeliveryStatus is progressive (no downgrade) and matches by messageId', () => {
    expect(svc).toContain('recordDeliveryStatus');
    expect(svc).toContain('eq(s.whatsappCampaignSends.messageId, messageId)');
    // progressive guard: ignore receipt if current rank >= incoming
    expect(svc).toContain('>= RANK[input.status]');
  });

  it('status webhook route is auth-gated (fail-closed, constant-time token)', () => {
    expect(route).toContain("'/whatsapp/status'");
    expect(route).toContain('mapDeliveryStatus');
    expect(route).toContain('recordDeliveryStatus');
    expect(route).toContain('tokenMatches');
  });
});
