import { eq, and, desc } from "drizzle-orm";
import { createDbClient } from "@haa/db";
import * as s from "@haa/db/schema";
import { MANUAL_CAPABILITIES } from "@haa/shared";
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

export class ManualShippingProvider implements ShippingProvider {
  readonly code = "manual" as const;
  readonly name = "شحن يدوي";
  readonly capabilities: ShippingProviderCapabilities = MANUAL_CAPABILITIES;
  readonly isAvailable = true;
  readonly mode: ShippingMode = "manual";

  private db = createDbClient();

  async calculateRates(input: ShippingRateInput): Promise<ShippingRate[]> {
    const zones = await this.db
      .select()
      .from(s.shippingZones)
      .where(
        and(
          eq(s.shippingZones.storeId, input.storeId),
          eq(s.shippingZones.isActive, true),
        ),
      );

    const matchingZone = zones.find((z) =>
      z.cities.some(
        (c) =>
          c.includes(input.destination.city) ||
          input.destination.city.includes(c),
      ),
    );
    if (!matchingZone) return [];

    const methods = await this.db
      .select()
      .from(s.shippingMethods)
      .where(
        and(
          eq(s.shippingMethods.storeId, input.storeId),
          eq(s.shippingMethods.isActive, true),
        ),
      )
      .orderBy(s.shippingMethods.sortOrder);

    const rates: ShippingRate[] = [];

    for (const method of methods) {
      const zoneRates = await this.db
        .select()
        .from(s.shippingRates)
        .where(
          and(
            eq(s.shippingRates.shippingMethodId, method.id),
            eq(s.shippingRates.shippingZoneId, matchingZone.id),
          ),
        );

      for (const rate of zoneRates) {
        let cost = Number(rate.baseRate);

        if (rate.perKgRate && Number(rate.perKgRate) > 0) {
          const totalWeightG = input.items
            .filter((i) => i.requiresShipping)
            .reduce(
              (sum, i) => sum + (i.weightGrams ?? 0) * i.quantity,
              0,
            );
          const totalKg = Math.ceil(totalWeightG / 1000);
          cost += totalKg * Number(rate.perKgRate);
        }

        if (
          rate.freeAboveAmount &&
          input.subtotal >= Number(rate.freeAboveAmount)
        ) {
          cost = 0;
        }

        rates.push({
          methodId: method.id,
          methodName: method.name,
          type: method.type,
          cost,
          estimatedDaysMin: rate.estimatedDaysMin ?? undefined,
          estimatedDaysMax: rate.estimatedDaysMax ?? undefined,
          freeAbove: rate.freeAboveAmount
            ? Number(rate.freeAboveAmount)
            : null,
        });
      }
    }

    return rates.sort((a, b) => a.cost - b.cost);
  }

  async createShipment(input: CreateShipmentInput): Promise<ShipmentResult> {
    const [shipment] = await this.db
      .insert(s.shipments)
      .values({
        storeId: input.storeId,
        orderId: input.orderId,
        shippingMethodId: input.shippingMethodId,
        provider: "manual",
        status: "draft",
        recipientName: input.recipientName,
        recipientPhone: input.recipientPhone,
        address: input.address,
        shippingCost: input.shippingCost.toString(),
        customerFee: input.customerFee.toString(),
        merchantCost: input.merchantCost.toString(),
        platformCost: input.platformCost.toString(),
        notes: input.notes ?? null,
      })
      .returning();

    return {
      id: shipment.id,
      provider: "manual",
      status: "draft",
    };
  }

  async cancelShipment(shipmentId: string | number, storeId?: number): Promise<void> {
    const id = Number(shipmentId);
    const conditions = [eq(s.shipments.id, id)];
    if (storeId) conditions.push(eq(s.shipments.storeId, storeId));
    await this.db
      .update(s.shipments)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(...conditions));
  }

  async getShipmentStatus(
    shipmentId: string | number,
  ): Promise<{ status: string; providerStatus?: string }> {
    const id = Number(shipmentId);
    const [shipment] = await this.db
      .select()
      .from(s.shipments)
      .where(eq(s.shipments.id, id))
      .limit(1);
    if (!shipment) {
      return { status: "unknown" };
    }
    return { status: shipment.status, providerStatus: shipment.status };
  }

  async getTracking(shipmentId: string | number): Promise<TrackingStatus> {
    const id = Number(shipmentId);
    const [shipment] = await this.db
      .select()
      .from(s.shipments)
      .where(eq(s.shipments.id, id))
      .limit(1);
    const [lastEvent] = await this.db
      .select()
      .from(s.shipmentTrackingEvents)
      .where(eq(s.shipmentTrackingEvents.shipmentId, id))
      .orderBy(desc(s.shipmentTrackingEvents.occurredAt))
      .limit(1);

    return {
      status: shipment?.status ?? "unknown",
      location: lastEvent?.location ?? undefined,
      description: lastEvent?.description ?? undefined,
      occurredAt: lastEvent?.occurredAt ?? new Date(),
    };
  }

  async createLabel(
    _shipmentId: string | number,
  ): Promise<ShippingLabel> {
    return { format: "pdf" };
  }

  async getLabel(
    shipmentId: string | number,
  ): Promise<ShippingLabel | null> {
    const id = Number(shipmentId);
    const [label] = await this.db
      .select()
      .from(s.shipmentLabels)
      .where(eq(s.shipmentLabels.shipmentId, id))
      .limit(1);
    if (!label) return null;
    return { url: label.url ?? undefined, format: label.format ?? "pdf" };
  }

  async createReturn(input: ReturnShipmentInput): Promise<ReturnResult> {
    const [shipment] = await this.db
      .insert(s.shipments)
      .values({
        storeId: input.storeId,
        orderId: input.orderId,
        provider: "manual",
        status: "return_requested",
        notes: input.reason,
      })
      .returning();

    return {
      id: shipment.id,
      status: "return_requested",
    };
  }

  verifyWebhookSignature(
    _payload: string | Buffer,
    _signature: string,
  ): boolean {
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
      draft: "draft",
      shipped: "in_transit",
      label_created: "label_created",
      in_transit: "in_transit",
      out_for_delivery: "out_for_delivery",
      delivered: "delivered",
      delivery_failed: "delivery_failed",
      cancelled: "cancelled",
      return_requested: "return_requested",
      return_in_transit: "return_in_transit",
      returned: "returned",
      exception: "exception",
      awaiting_pickup: "awaiting_pickup",
      picked_up: "picked_up",
      quoted: "quoted",
    };
    return statusMap[providerStatus] ?? "draft";
  }

  mapProviderError(errorCode: string): string {
    const errorMap: Record<string, string> = {
      INVALID_ADDRESS: "عنوان الشحن غير صالح",
      INVALID_PHONE: "رقم الهاتف غير صالح",
      WEIGHT_EXCEEDED: "الوزن يتجاوز الحد المسموح",
      SHIPPING_METHOD_NOT_FOUND: "طريقة الشحن غير موجودة",
    };
    return errorMap[errorCode] ?? "خطأ غير متوقع في الشحن";
  }

  async validateAddress(address: {
    city: string;
    state?: string;
    country: string;
  }): Promise<AddressValidationResult> {
    if (!address.city || !address.country) {
      return { valid: false, message: "City and country are required" };
    }
    return {
      valid: true,
      normalized: {
        city: address.city,
        state: address.state,
        postalCode: undefined,
      },
    };
  }
}
