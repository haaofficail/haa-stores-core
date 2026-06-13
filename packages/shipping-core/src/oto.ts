import { OTO_CAPABILITIES } from "@haa/shared";
import { eq } from "drizzle-orm";
import { createDbClient, type DbClient } from "@haa/db";
import * as s from "@haa/db/schema";
import type {
  ShippingProviderCapabilities,
  UnifiedShipmentStatus,
  ShippingMode,
} from "@haa/shared";
import type {
  ShippingProvider,
  ShippingRateInput,
  ShippingRate,
  CreateShipmentInput,
  ShipmentResult,
  TrackingStatus,
  AddressValidationResult,
  ShippingLabel,
  ReturnShipmentInput,
  ReturnResult,
} from "./provider.js";

export class OtoShippingProvider implements ShippingProvider {
  readonly code = "oto" as const;
  readonly name = "OTO";
  readonly capabilities: ShippingProviderCapabilities = OTO_CAPABILITIES;
  readonly mode: ShippingMode =
    (process.env.SHIPPING_MODE as ShippingMode) ?? "sandbox";

  private apiKey: string | undefined;
  private accessToken: string | undefined;
  private webhookSecret: string | undefined;
  private apiBaseUrl: string;

  constructor(private db: DbClient = createDbClient()) {
    this.apiKey = process.env.OTO_API_KEY ?? process.env.OTO_SANDBOX_API_KEY;
    this.accessToken = process.env.OTO_ACCESS_TOKEN ?? process.env.OTO_MARKETPLACE_TOKEN;
    this.webhookSecret = process.env.OTO_WEBHOOK_SECRET;
    this.apiBaseUrl = process.env.OTO_API_BASE_URL ?? (process.env.OTO_PLATFORM_MODE === "live" ? "https://api.tryoto.com/rest/v2" : "https://staging-api.tryoto.com/rest/v2");
  }

  get isAvailable(): boolean {
    return !!(this.apiKey || this.accessToken);
  }

  private requireConfigured() {
    if (!this.isAvailable) {
      throw new Error("OTO_NOT_CONFIGURED: Set OTO_API_KEY, OTO_ACCESS_TOKEN, or OTO_SANDBOX_API_KEY to enable.");
    }
  }

  private async request(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
    this.requireConfigured();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    };
    if (this.accessToken) headers.Authorization = `Bearer ${this.accessToken}`;
    if (this.apiKey) headers["x-api-key"] = this.apiKey;
    const res = await fetch(`${this.apiBaseUrl}${path}`, { ...init, headers });
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    if (!res.ok) {
      const message = typeof body.message === "string" ? body.message : `OTO API returned ${res.status}`;
      throw new Error(message);
    }
    return body;
  }

  async calculateRates(_input: ShippingRateInput): Promise<ShippingRate[]> {
    this.requireConfigured();
    return [];
  }

  async createShipment(input: CreateShipmentInput): Promise<ShipmentResult> {
    this.requireConfigured();
    const response = await this.request("/createOrder", {
      method: "POST",
      body: JSON.stringify({
        orderId: input.orderId,
        deliveryOptionId: input.shippingMethodId,
        customerName: input.recipientName,
        customerPhone: input.recipientPhone,
        deliveryAddress: input.address,
        items: input.items,
        amount: input.customerFee,
      }),
    });
    const providerShipmentId = String(response.otoId ?? response.orderId ?? response.shipmentId ?? "");
    const trackingNumber = String(response.trackingNumber ?? providerShipmentId);
    const trackingUrl = typeof response.trackingUrl === "string" ? response.trackingUrl : undefined;
    const labelUrl = typeof response.labelUrl === "string" ? response.labelUrl : undefined;
    const [shipment] = await this.db.insert(s.shipments).values({
      storeId: input.storeId,
      orderId: input.orderId,
      shippingMethodId: input.shippingMethodId,
      provider: "oto",
      status: labelUrl ? "label_created" : "pickup_requested",
      providerShipmentId: providerShipmentId || null,
      trackingNumber: trackingNumber || null,
      trackingUrl: trackingUrl ?? null,
      carrierName: typeof response.carrierName === "string" ? response.carrierName : "OTO",
      shippingCost: input.shippingCost.toString(),
      customerFee: input.customerFee.toString(),
      merchantCost: input.merchantCost.toString(),
      platformCost: input.platformCost.toString(),
      recipientName: input.recipientName,
      recipientPhone: input.recipientPhone,
      address: input.address,
      weightGrams: input.items.reduce((sum, item) => sum + (item.weightGrams ?? 0) * item.quantity, 0),
      notes: input.notes,
    }).returning();
    if (labelUrl) {
      await this.db.insert(s.shipmentLabels).values({ shipmentId: shipment.id, url: labelUrl, format: "pdf" });
    }
    return {
      id: shipment.id,
      provider: "oto",
      status: shipment.status,
      providerShipmentId: providerShipmentId || undefined,
      trackingNumber: trackingNumber || undefined,
      trackingUrl,
      carrierName: shipment.carrierName ?? undefined,
      labelUrl,
    };
  }

  async cancelShipment(_shipmentId: string | number, _storeId?: number): Promise<void> {
    this.requireConfigured();
  }

  async getShipmentStatus(
    _shipmentId: string | number,
  ): Promise<{ status: string; providerStatus?: string }> {
    this.requireConfigured();
    return { status: "pickup_requested" };
  }

  async getTracking(_shipmentId: string | number): Promise<TrackingStatus> {
    const id = Number(_shipmentId);
    const [shipment] = await this.db.select().from(s.shipments).where(eq(s.shipments.id, id)).limit(1);
    return {
      status: shipment?.status ?? "unknown",
      occurredAt: new Date(),
      description: shipment?.trackingNumber ? `OTO tracking ${shipment.trackingNumber}` : undefined,
    };
  }

  async createLabel(shipmentId: string | number): Promise<ShippingLabel> {
    this.requireConfigured();
    const id = Number(shipmentId);
    const response = await this.request(`/labels/${id}`, { method: "POST" });
    const url = typeof response.labelUrl === "string" ? response.labelUrl : undefined;
    if (!url) return { format: "pdf" };
    await this.db.insert(s.shipmentLabels).values({ shipmentId: id, url, format: "pdf" }).onConflictDoNothing();
    return { url, format: "pdf" };
  }

  async getLabel(shipmentId: string | number): Promise<ShippingLabel | null> {
    const id = Number(shipmentId);
    const [label] = await this.db.select().from(s.shipmentLabels).where(eq(s.shipmentLabels.shipmentId, id)).limit(1);
    if (!label) return null;
    return { url: label.url ?? undefined, format: label.format ?? "pdf" };
  }

  async createReturn(_input: ReturnShipmentInput): Promise<ReturnResult> {
    this.requireConfigured();
    return { status: "return_requested" };
  }

  verifyWebhookSignature(
    _payload: string | Buffer,
    _signature: string,
  ): boolean {
    if (!this.webhookSecret) return false;
    return false;
  }

  async handleWebhook(
    _payload: Record<string, unknown>,
    _idempotencyKey?: string,
  ): Promise<{ success: boolean; eventType?: string; shipmentId?: number }> {
    return { success: false };
  }

  mapProviderStatus(providerStatus: string): UnifiedShipmentStatus {
    const statusMap: Record<string, UnifiedShipmentStatus> = {
      OTO_CREATED: "label_created",
      OTO_PICKED: "picked_up",
      OTO_IN_TRANSIT: "in_transit",
      OTO_OUT_FOR_DELIVERY: "out_for_delivery",
      OTO_DELIVERED: "delivered",
      OTO_FAILED: "delivery_failed",
      OTO_RETURNED: "returned",
      OTO_CANCELLED: "cancelled",
    };
    return statusMap[providerStatus] ?? "exception";
  }

  mapProviderError(errorCode: string): string {
    const errorMap: Record<string, string> = {
      OTO_AUTH_FAILED: "فشل المصادقة مع OTO",
      OTO_INVALID_ADDRESS: "عنوان الشحن غير صالح في OTO",
      OTO_SERVICE_DOWN: "خدمة OTO غير متاحة",
    };
    return errorMap[errorCode] ?? "خطأ في خدمة OTO";
  }

  async validateAddress(address: {
    city: string;
    state?: string;
    country: string;
  }): Promise<AddressValidationResult> {
    return {
      valid: !!address.city && !!address.country,
      message: !address.city || !address.country ? "City and country are required" : undefined,
      normalized: address.city && address.country ? { city: address.city, state: address.state } : undefined,
    };
  }
}
