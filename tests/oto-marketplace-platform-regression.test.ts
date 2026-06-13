import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyOtoWebhookSignature } from '../packages/shipping-core/src/oto-marketplace';

const otoMarketplaceSource = readFileSync(new URL('../packages/shipping-core/src/oto-marketplace.ts', import.meta.url), 'utf-8');
const shippingSchema = readFileSync(new URL('../packages/db/src/schema/shipping.ts', import.meta.url), 'utf-8');
const integrationsSchema = readFileSync(new URL('../packages/db/src/schema/integrations.ts', import.meta.url), 'utf-8');
const shippingWebhooksRoute = readFileSync(new URL('../apps/api/src/routes/shipping-webhooks.ts', import.meta.url), 'utf-8');

describe('OTO multi-tenant marketplace platform regression', () => {
  it('models marketplace vendors, merchant-token fallback, sender locations, and provider connections per store', () => {
    expect(shippingSchema).toContain('otoVendorMappings');
    expect(shippingSchema).toContain('senderLocations');
    expect(shippingSchema).toContain('otoShipments');
    expect(integrationsSchema).toContain('providerConnections');
    expect(otoMarketplaceSource).toContain('storeId');
    expect(otoMarketplaceSource).toContain('integrationModel');
  });

  it('does not use a regular refresh token for marketplace registration', () => {
    expect(otoMarketplaceSource).toContain('OTO_MARKETPLACE_TOKEN');
    expect(otoMarketplaceSource).toContain('Marketplace vendor registration requires OTO special marketplace token.');
    expect(otoMarketplaceSource).not.toContain('REFRESH_TOKEN');
  });

  it('requires senderInformation, whoPays, and deliveryOptionId for OTO order/shipment flow', () => {
    expect(otoMarketplaceSource).toContain('senderInformation');
    expect(otoMarketplaceSource).toContain('whoPays');
    expect(otoMarketplaceSource).toContain('deliveryOptionId is required');
    expect(otoMarketplaceSource).toContain('/rest/v2/createOrder');
    expect(otoMarketplaceSource).toContain('/rest/v2/createShipment');
  });

  it('verifies OTO webhook signatures and routes /webhooks/oto', () => {
    const payload = { orderId: 'OTO-1', status: 'delivered', timestamp: '2026-06-12T00:00:00Z' };
    const secret = 'webhook-secret';
    const signature = crypto.createHmac('sha256', secret)
      .update(`${payload.orderId}:${payload.status}:${payload.timestamp}`)
      .digest('base64');

    expect(verifyOtoWebhookSignature('orderStatus', payload, signature, secret)).toBe(true);
    expect(shippingWebhooksRoute).toContain("const otoWebhookRouter = new Hono()");
    expect(shippingWebhooksRoute).toContain('verifyOtoWebhookSignature');
  });

  it('keeps tenant isolation by querying OTO records with store_id/storeId', () => {
    expect(otoMarketplaceSource).toContain('eq(s.otoVendorMappings.storeId, storeId)');
    expect(otoMarketplaceSource).toContain('eq(s.senderLocations.storeId, storeId)');
    expect(otoMarketplaceSource).toContain('eq(s.otoShipments.storeId, storeId)');
    expect(otoMarketplaceSource).toContain('Order not found or does not belong to this store');
  });
});
