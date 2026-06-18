/**
 * Aramex shipping provider.
 * Env vars: ARAMEX_USERNAME, ARAMEX_PASSWORD, ARAMEX_ACCOUNT_NUMBER,
 *           ARAMEX_ACCOUNT_PIN, ARAMEX_ACCOUNT_ENTITY, ARAMEX_ACCOUNT_COUNTRY_CODE,
 *           ARAMEX_MODE (sandbox|live, default: sandbox)
 *
 * Sandbox: https://ws.aramex.net/ShippingAPI.V2/
 * Production: https://ws.aramex.net/ShippingAPI.V2/
 * (same endpoint — mode controlled by credentials)
 */

import { ARAMEX_CAPABILITIES } from '@haa/shared';
import type { ShippingProviderCapabilities, UnifiedShipmentStatus, ShippingMode } from '@haa/shared';
import type {
  ShippingProvider, ShippingRateInput, ShippingRate, CreateShipmentInput,
  ShipmentResult, TrackingStatus, AddressValidationResult, ShippingLabel,
  ReturnShipmentInput, ReturnResult,
} from './provider.js';

const BASE_URL = 'https://ws.aramex.net/ShippingAPI.V2';

export class AramexShippingProvider implements ShippingProvider {
  readonly code = 'aramex' as const;
  readonly name = 'Aramex';
  readonly capabilities: ShippingProviderCapabilities = ARAMEX_CAPABILITIES;
  readonly mode: ShippingMode = (process.env.ARAMEX_MODE as ShippingMode) ?? 'sandbox';

  get isAvailable(): boolean {
    return !!(
      process.env.ARAMEX_USERNAME &&
      process.env.ARAMEX_PASSWORD &&
      process.env.ARAMEX_ACCOUNT_NUMBER
    );
  }

  private clientInfo() {
    return {
      UserName: process.env.ARAMEX_USERNAME || '',
      Password: process.env.ARAMEX_PASSWORD || '',
      Version: 'v1.0',
      AccountNumber: process.env.ARAMEX_ACCOUNT_NUMBER || '',
      AccountPin: process.env.ARAMEX_ACCOUNT_PIN || '',
      AccountEntity: process.env.ARAMEX_ACCOUNT_ENTITY || 'RUH',
      AccountCountryCode: process.env.ARAMEX_ACCOUNT_COUNTRY_CODE || 'SA',
      Source: 24,
    };
  }

  private async post<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ClientInfo: this.clientInfo(), ...body }),
    });
    if (!res.ok) throw new Error(`Aramex ${endpoint} ${res.status}: ${await res.text()}`);
    return res.json() as Promise<T>;
  }

  async calculateRates(input: ShippingRateInput): Promise<ShippingRate[]> {
    const totalWeightKg = input.items.reduce((sum, i) => sum + ((i.weightGrams ?? 500) * i.quantity) / 1000, 0);
    const data = await this.post<{ HasErrors?: boolean; RateDetails?: Array<{ TotalAmount?: { Value?: number }; ProductDescription?: string }> }>(
      'RateCalculator/Service_1_0.svc/json/CalculateRate',
      {
        OriginAddress: { City: 'Riyadh', CountryCode: 'SA' },
        DestinationAddress: { City: input.destination.city, CountryCode: input.destination.country },
        ShipmentDetails: {
          Dimensions: null,
          ActualWeight: { Unit: 'KG', Value: Math.max(totalWeightKg, 0.5) },
          ChargeableWeight: null,
          DescriptionOfGoods: 'Merchandise',
          GoodsOriginCountry: 'SA',
          NumberOfPieces: input.items.reduce((sum, i) => sum + i.quantity, 0),
          ProductGroup: 'DOM',
          ProductType: 'PPX',
          PaymentType: 'P',
          PaymentOptions: '',
          CustomsValueAmount: null,
          CashOnDeliveryAmount: null,
          InsuranceAmount: null,
          CollectAmount: null,
          Services: '',
        },
      },
    );

    if (data.HasErrors || !data.RateDetails) return [];

    return data.RateDetails.map((r, idx) => ({
      methodId: idx + 900,
      methodName: r.ProductDescription || 'Aramex',
      type: 'courier',
      cost: r.TotalAmount?.Value ?? 0,
      estimatedDaysMin: 1,
      estimatedDaysMax: 3,
    }));
  }

  async createShipment(input: CreateShipmentInput): Promise<ShipmentResult> {
    const totalWeightKg = input.items.reduce((sum, i) => sum + ((i.weightGrams ?? 500) * i.quantity) / 1000, 0);
    const data = await this.post<{ HasErrors?: boolean; Shipments?: Array<{ ID?: string; Label?: { ShipmentLabel?: string }; TrackingNumber?: string }> }>(
      'Shipping/Service_1_0.svc/json/CreateShipments',
      {
        Shipments: [{
          Shipper: {
            AccountNumber: process.env.ARAMEX_ACCOUNT_NUMBER,
            PartyAddress: { City: 'Riyadh', CountryCode: 'SA', Line1: 'Riyadh' },
            Contact: { PersonName: 'هاء ستورز', PhoneNumber1: process.env.STORE_PHONE || '' },
          },
          Consignee: {
            PartyAddress: {
              Line1: input.address.street || '',
              City: input.address.city,
              StateOrProvinceCode: input.address.state || '',
              PostCode: input.address.postalCode || '',
              CountryCode: input.address.country,
            },
            Contact: { PersonName: input.recipientName, PhoneNumber1: input.recipientPhone },
          },
          ShippingDateTime: new Date().toISOString(),
          DueDate: new Date(Date.now() + 3 * 86400000).toISOString(),
          Details: {
            Dimensions: null,
            ActualWeight: { Unit: 'KG', Value: Math.max(totalWeightKg, 0.5) },
            DescriptionOfGoods: 'Merchandise',
            GoodsOriginCountry: 'SA',
            NumberOfPieces: input.items.reduce((sum, i) => sum + i.quantity, 0),
            ProductGroup: 'DOM',
            ProductType: 'PPX',
            PaymentType: 'P',
            PaymentOptions: '',
            Services: '',
          },
          Reference1: `ORDER-${input.orderId}`,
          Notes: input.notes || '',
        }],
      },
    );

    if (data.HasErrors || !data.Shipments?.[0]) {
      throw new Error('Aramex createShipment failed');
    }

    const shipment = data.Shipments[0];
    return {
      provider: 'aramex',
      status: 'label_created',
      trackingNumber: shipment.TrackingNumber,
      trackingUrl: shipment.TrackingNumber
        ? `https://www.aramex.com/track/results?ShipmentNumber=${shipment.TrackingNumber}`
        : undefined,
      labelUrl: shipment.Label?.ShipmentLabel,
      providerShipmentId: shipment.ID,
    };
  }

  async getShipmentStatus(shipmentId: string | number): Promise<{ status: string; providerStatus?: string }> {
    const tracking = await this.getTracking(shipmentId);
    return { status: this.mapProviderStatus(tracking.status), providerStatus: tracking.status };
  }

  async getTracking(shipmentId: string | number): Promise<TrackingStatus> {
    const data = await this.post<{ TrackingResults?: Array<{ Value?: Array<{ WaybillNumber?: string; TrackingDateTime?: string; UpdateLocation?: string; UpdateDescription?: string; ActivityType?: string }> }> }>(
      'Tracking/Service_1_0.svc/json/TrackShipments',
      { Shipments: [{ WaybillNumber: String(shipmentId) }], GetLastTrackingUpdateOnly: true },
    );

    const result = data.TrackingResults?.[0]?.Value?.[0];
    return {
      status: result?.ActivityType || 'unknown',
      location: result?.UpdateLocation,
      description: result?.UpdateDescription,
      occurredAt: result?.TrackingDateTime ? new Date(result.TrackingDateTime) : new Date(),
    };
  }

  async createLabel(shipmentId: string | number): Promise<ShippingLabel> {
    return { url: `https://www.aramex.com/track/results?ShipmentNumber=${shipmentId}`, format: 'url' };
  }

  async getLabel(_shipmentId: string | number): Promise<ShippingLabel | null> { return null; }

  async cancelShipment(_shipmentId: string | number): Promise<void> {
    // Aramex does not support API cancellation — contact customer service
    throw new Error('Aramex shipment cancellation must be done via customer service');
  }

  async createReturn(input: ReturnShipmentInput): Promise<ReturnResult> {
    return { status: 'pending', rmaNumber: `RMA-ARAMEX-${input.originalShipmentId}` };
  }

  verifyWebhookSignature(_payload: string | Buffer, _signature: string): boolean { return true; }

  async handleWebhook(_payload: Record<string, unknown>): Promise<{ success: boolean; eventType?: string; shipmentId?: number }> {
    return { success: true };
  }

  mapProviderStatus(providerStatus: string): UnifiedShipmentStatus {
    const map: Record<string, UnifiedShipmentStatus> = {
      'SH007': 'delivered',
      'SH006': 'out_for_delivery',
      'SH004': 'in_transit',
      'SH003': 'picked_up',
      'SH002': 'awaiting_pickup',
      'SH001': 'label_created',
      'SH010': 'delivery_failed',
      'SH011': 'returned',
      'SH012': 'cancelled',
    };
    return map[providerStatus] ?? 'in_transit';
  }

  mapProviderError(errorCode: string): string {
    return `Aramex error: ${errorCode}`;
  }

  async validateAddress(address: { city: string; state?: string; country: string }): Promise<AddressValidationResult> {
    return { valid: address.country === 'SA', message: address.country !== 'SA' ? 'Aramex DOM only supports SA' : undefined };
  }
}
