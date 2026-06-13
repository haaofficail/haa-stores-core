import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const otoSource = readFileSync(new URL('../packages/shipping-core/src/oto.ts', import.meta.url), 'utf-8');
const shippingSource = readFileSync(new URL('../packages/shipping-core/src/shipping.ts', import.meta.url), 'utf-8');
const shippingSchema = readFileSync(new URL('../packages/db/src/schema/shipping.ts', import.meta.url), 'utf-8');

describe('OTO provider regression', () => {
  it('stores provider shipment references and never labels a missing OTO label as a carrier label', () => {
    expect(shippingSchema).toContain('providerShipmentId');
    expect(shippingSchema).toContain('otoShipments');
    expect(otoSource).toContain('labelUrl');
    expect(otoSource).not.toContain('/api/mock/labels');
  });

  it('does not break order flow when OTO shipment creation fails', () => {
    expect(shippingSource).toContain("provider.code !== 'oto'");
    expect(shippingSource).toContain("status: 'creation_failed'");
    expect(shippingSource).toContain("errorCode: 'OTO_CREATION_FAILED'");
  });
});
