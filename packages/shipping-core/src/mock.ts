import { eq, and, desc } from "drizzle-orm";
import { createDbClient } from "@haa/db";
import * as s from "@haa/db/schema";
import { HAA_MOCK_CAPABILITIES } from "@haa/shared";
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

function randomTracking(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return "HAA-MOCK-" + result;
}

export class HaaMockShippingProvider implements ShippingProvider {
  readonly code = "haa_mock" as const;
  readonly name = "شحن هاء (تجريبي)";
  readonly capabilities: ShippingProviderCapabilities = HAA_MOCK_CAPABILITIES;
  readonly isAvailable = true;
  readonly mode: ShippingMode = "mock";

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

    rates.push(
      {
        methodId: 0,
        methodName: "شحن إكسبرس (تجريبي)",
        type: "express",
        cost: 35,
        estimatedDaysMin: 1,
        estimatedDaysMax: 2,
        freeAbove: null,
      },
      {
        methodId: 0,
        methodName: "شحن عادي (تجريبي)",
        type: "standard",
        cost: 20,
        estimatedDaysMin: 3,
        estimatedDaysMax: 5,
        freeAbove: 500,
      },
    );

    return rates.sort((a, b) => a.cost - b.cost);
  }

  async createShipment(input: CreateShipmentInput): Promise<ShipmentResult> {
    const trackingNumber = randomTracking();
    const [shipment] = await this.db
      .insert(s.shipments)
      .values({
        storeId: input.storeId,
        orderId: input.orderId,
        shippingMethodId: input.shippingMethodId,
        provider: "haa_mock",
        status: "label_created",
        trackingNumber,
        trackingUrl: `https://mock.haastores.com/tracking/${trackingNumber}`,
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

    await this.db.insert(s.shipmentTrackingEvents).values({
      shipmentId: shipment.id,
      status: "label_created",
      description: "تم إنشاء الشحنة في النظام التجريبي",
    });

    return {
      id: shipment.id,
      provider: "haa_mock",
      status: "label_created",
      trackingNumber,
      trackingUrl: `https://mock.haastores.com/tracking/${trackingNumber}`,
      carrierName: "شحن هاء (تجريبي)",
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
    return {
      status: shipment.status,
      providerStatus: `haa_mock_${shipment.status}`,
    };
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
    shipmentId: string | number,
  ): Promise<ShippingLabel> {
    const id = Number(shipmentId);
    const url = `/api/mock/labels/shipment-${id}.pdf`;

    await this.db.insert(s.shipmentLabels).values({
      shipmentId: id,
      url,
      format: "pdf",
    });

    return { url, format: "pdf" };
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
    const trackingNumber = randomTracking();
    const [shipment] = await this.db
      .insert(s.shipments)
      .values({
        storeId: input.storeId,
        orderId: input.orderId,
        provider: "haa_mock",
        status: "return_requested",
        trackingNumber,
        notes: input.reason,
      })
      .returning();

    return {
      id: shipment.id,
      status: "return_requested",
      trackingNumber,
      rmaNumber: "RMA-" + trackingNumber,
    };
  }

  verifyWebhookSignature(
    _payload: string | Buffer,
    _signature: string,
  ): boolean {
    return true;
  }

  async handleWebhook(
    _payload: Record<string, unknown>,
    _idempotencyKey?: string,
  ): Promise<{ success: boolean; eventType?: string; shipmentId?: number }> {
    return { success: true, eventType: "mock_webhook_received" };
  }

  mapProviderStatus(providerStatus: string): UnifiedShipmentStatus {
    const statusMap: Record<string, UnifiedShipmentStatus> = {
      haa_mock_label_created: "label_created",
      haa_mock_in_transit: "in_transit",
      haa_mock_out_for_delivery: "out_for_delivery",
      haa_mock_delivered: "delivered",
      haa_mock_delivery_failed: "delivery_failed",
      haa_mock_cancelled: "cancelled",
      haa_mock_return_requested: "return_requested",
      haa_mock_returned: "returned",
      label_created: "label_created",
      in_transit: "in_transit",
      out_for_delivery: "out_for_delivery",
      delivered: "delivered",
      delivery_failed: "delivery_failed",
      cancelled: "cancelled",
      return_requested: "return_requested",
      returned: "returned",
    };
    return statusMap[providerStatus] ?? "exception";
  }

  mapProviderError(errorCode: string): string {
    const errorMap: Record<string, string> = {
      INVALID_ADDRESS: "عنوان الشحن غير صالح",
      INVALID_PHONE: "رقم الهاتف غير صالح",
      WEIGHT_EXCEEDED: "الوزن يتجاوز الحد المسموح",
      SERVICE_UNAVAILABLE: "الخدمة غير متاحة حالياً",
      MOCK_ERROR: "خطأ تجريبي في النظام",
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
