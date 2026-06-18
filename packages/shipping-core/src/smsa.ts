/**
 * SMSA Express shipping provider (Saudi Post subsidiary).
 * Env vars: SMSA_PASS_KEY, SMSA_SENDER_ID, SMSA_MODE (sandbox|live)
 *
 * REST API: https://sam.smsaexpress.com/restservicesar/
 */

import { SMSA_CAPABILITIES } from '@haa/shared';
import type { ShippingProviderCapabilities, UnifiedShipmentStatus, ShippingMode } from '@haa/shared';
import type {
  ShippingProvider, ShippingRateInput, ShippingRate, CreateShipmentInput,
  ShipmentResult, TrackingStatus, AddressValidationResult, ShippingLabel,
  ReturnShipmentInput, ReturnResult,
} from './provider.js';

const SMSA_BASE = 'https://sam.smsaexpress.com/restservicesar';

export class SmsaShippingProvider implements ShippingProvider {
  readonly code = 'smsa' as const;
  readonly name = 'SMSA Express';
  readonly capabilities: ShippingProviderCapabilities = SMSA_CAPABILITIES;
  readonly mode: ShippingMode = (process.env.SMSA_MODE as ShippingMode) ?? 'sandbox';

  get isAvailable(): boolean {
    return !!(process.env.SMSA_PASS_KEY && process.env.SMSA_SENDER_ID);
  }

  private auth() {
    return {
      passKey: process.env.SMSA_PASS_KEY || '',
      senderID: process.env.SMSA_SENDER_ID || '',
    };
  }

  private async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${SMSA_BASE}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`SMSA ${path} ${res.status}: ${await res.text()}`);
    return res.json() as Promise<T>;
  }

  async calculateRates(_input: ShippingRateInput): Promise<ShippingRate[]> {
    // SMSA does not have a public rate calculation API — return a standard rate
    return [{
      methodId: 950,
      methodName: 'SMSA Express',
      type: 'courier',
      cost: 25,
      estimatedDaysMin: 1,
      estimatedDaysMax: 2,
    }];
  }

  async createShipment(input: CreateShipmentInput): Promise<ShipmentResult> {
    const { passKey, senderID } = this.auth();
    const totalWeightKg = input.items.reduce((sum, i) => sum + ((i.weightGrams ?? 500) * i.quantity) / 1000, 0);

    const data = await this.post<{ sawb?: string; errors?: string[] }>('addshipment', {
      passKey,
      refNo: `ORDER-${input.orderId}`,
      senderID,
      shipDate: new Date().toISOString().slice(0, 10),
      shipType: 'DLV',
      PCs: input.items.reduce((sum, i) => sum + i.quantity, 0),
      weight: Math.max(totalWeightKg, 0.5).toFixed(2),
      codAmt: input.shippingCost,
      custName: input.recipientName,
      custPhone: input.recipientPhone,
      custAddress: `${input.address.street || ''} ${input.address.district || ''}`.trim(),
      custCity: input.address.city,
      custZip: input.address.postalCode || '',
      custCountry: 'SA',
      itemDesc: 'Merchandise',
    });

    if (!data.sawb) throw new Error(`SMSA createShipment failed: ${data.errors?.join(', ')}`);

    return {
      provider: 'smsa',
      status: 'label_created',
      trackingNumber: data.sawb,
      trackingUrl: `https://www.smsaexpress.com/en/tracking?trackingnumbers=${data.sawb}`,
      providerShipmentId: data.sawb,
    };
  }

  async getShipmentStatus(shipmentId: string | number): Promise<{ status: string; providerStatus?: string }> {
    const tracking = await this.getTracking(shipmentId);
    return { status: this.mapProviderStatus(tracking.status), providerStatus: tracking.status };
  }

  async getTracking(shipmentId: string | number): Promise<TrackingStatus> {
    const { passKey } = this.auth();
    const data = await this.post<{ trackDetails?: Array<{ activity?: string; activityDate?: string; activityCity?: string }> }>(
      'trackmessage',
      { passKey, awbNo: String(shipmentId), lang: 'A' },
    );

    const latest = data.trackDetails?.[0];
    return {
      status: latest?.activity || 'unknown',
      location: latest?.activityCity,
      description: latest?.activity,
      occurredAt: latest?.activityDate ? new Date(latest.activityDate) : new Date(),
    };
  }

  async createLabel(_shipmentId: string | number): Promise<ShippingLabel> {
    return { format: 'url', url: undefined };
  }

  async getLabel(_shipmentId: string | number): Promise<ShippingLabel | null> { return null; }

  async cancelShipment(shipmentId: string | number): Promise<void> {
    const { passKey } = this.auth();
    await this.post('cancelshipment', { passKey, awbNo: String(shipmentId) });
  }

  async createReturn(input: ReturnShipmentInput): Promise<ReturnResult> {
    return { status: 'pending', rmaNumber: `RMA-SMSA-${input.originalShipmentId}` };
  }

  verifyWebhookSignature(_payload: string | Buffer, _signature: string): boolean { return true; }

  async handleWebhook(_payload: Record<string, unknown>): Promise<{ success: boolean }> {
    return { success: true };
  }

  mapProviderStatus(providerStatus: string): UnifiedShipmentStatus {
    const lower = providerStatus.toLowerCase();
    if (lower.includes('delivered') || lower.includes('تم التسليم')) return 'delivered';
    if (lower.includes('out for delivery') || lower.includes('خارج')) return 'out_for_delivery';
    if (lower.includes('transit') || lower.includes('في الطريق')) return 'in_transit';
    if (lower.includes('picked') || lower.includes('تم الاستلام')) return 'picked_up';
    if (lower.includes('cancel') || lower.includes('ملغي')) return 'cancelled';
    if (lower.includes('return') || lower.includes('إرجاع')) return 'returned';
    return 'in_transit';
  }

  mapProviderError(errorCode: string): string {
    return `SMSA error: ${errorCode}`;
  }

  async validateAddress(address: { city: string; country: string }): Promise<AddressValidationResult> {
    return { valid: address.country === 'SA', message: address.country !== 'SA' ? 'SMSA supports Saudi Arabia only' : undefined };
  }
}
