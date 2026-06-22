import { eq, and, count, isNull, inArray, ne } from "drizzle-orm";
import { createDbClient, type DbClient } from "@haa/db";
import * as s from "@haa/db/schema";
import { createShippingProvider } from "./factory.js";
import type { ShippingProviderCode } from "@haa/shared";
import type { CreateShipmentInput } from "./provider.js";

const RETURN_STATUSES = [
  "return_requested",
  "return_in_transit",
  "returned",
];

export class ShippingService {
  constructor(private db: DbClient = createDbClient()) {}

  async listMethods(storeId: number) {
    return this.db
      .select()
      .from(s.shippingMethods)
      .where(eq(s.shippingMethods.storeId, storeId))
      .orderBy(s.shippingMethods.sortOrder);
  }

  async createMethod(
    storeId: number,
    data: {
      name: string;
      type: string;
      isActive?: boolean;
      sortOrder?: number;
      estimatedDeliveryDays?: string;
      config?: Record<string, unknown>;
    },
  ) {
    const [method] = await this.db
      .insert(s.shippingMethods)
      .values({
        storeId,
        name: data.name,
        type: data.type,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
        estimatedDeliveryDays: data.estimatedDeliveryDays ?? null,
        config: (data.config ?? null) as any,
      })
      .returning();
    return method;
  }

  async updateMethod(
    storeId: number,
    id: number,
    data: Partial<{
      name: string;
      type: string;
      isActive: boolean;
      sortOrder: number;
      estimatedDeliveryDays: string;
      config: Record<string, unknown>;
    }>,
  ) {
    const [updated] = await this.db
      .update(s.shippingMethods)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(s.shippingMethods.id, id),
          eq(s.shippingMethods.storeId, storeId),
        ),
      )
      .returning();
    return updated ?? null;
  }

  async listZones(storeId: number) {
    return this.db
      .select()
      .from(s.shippingZones)
      .where(eq(s.shippingZones.storeId, storeId));
  }

  async createZone(
    storeId: number,
    data: { name: string; cities: string[]; isActive?: boolean },
  ) {
    const [zone] = await this.db
      .insert(s.shippingZones)
      .values({
        storeId,
        ...data,
        isActive: data.isActive ?? true,
      })
      .returning();
    return zone;
  }

  async updateZone(
    storeId: number,
    id: number,
    data: Partial<{ name: string; cities: string[]; isActive: boolean }>,
  ) {
    const [updated] = await this.db
      .update(s.shippingZones)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(s.shippingZones.id, id),
          eq(s.shippingZones.storeId, storeId),
        ),
      )
      .returning();
    return updated ?? null;
  }

  async listRates(storeId: number) {
    return this.db
      .select({
        rate: s.shippingRates,
        methodName: s.shippingMethods.name,
        zoneName: s.shippingZones.name,
      })
      .from(s.shippingRates)
      .innerJoin(
        s.shippingMethods,
        eq(s.shippingRates.shippingMethodId, s.shippingMethods.id),
      )
      .innerJoin(
        s.shippingZones,
        eq(s.shippingRates.shippingZoneId, s.shippingZones.id),
      )
      .where(eq(s.shippingMethods.storeId, storeId));
  }

  async createRate(
    storeId: number,
    data: {
      shippingMethodId: number;
      shippingZoneId: number;
      baseRate: number;
      perKgRate?: number;
      freeAboveAmount?: number;
      estimatedDaysMin?: number;
      estimatedDaysMax?: number;
    },
  ) {
    const [method] = await this.db
      .select()
      .from(s.shippingMethods)
      .where(
        and(
          eq(s.shippingMethods.id, data.shippingMethodId),
          eq(s.shippingMethods.storeId, storeId),
        ),
      );
    if (!method) throw new Error("SHIPPING_METHOD_NOT_FOUND");

    const [zone] = await this.db
      .select()
      .from(s.shippingZones)
      .where(
        and(
          eq(s.shippingZones.id, data.shippingZoneId),
          eq(s.shippingZones.storeId, storeId),
        ),
      );
    if (!zone) throw new Error("SHIPPING_ZONE_NOT_FOUND");

    const [rate] = await this.db
      .insert(s.shippingRates)
      .values({
        ...data,
        baseRate: data.baseRate.toString(),
        perKgRate: data.perKgRate?.toString() ?? null,
        freeAboveAmount: data.freeAboveAmount?.toString() ?? null,
      })
      .returning();
    return rate;
  }

  // ─── Rate edit / delete ────────────────────────────────────────
  // Audit (MD_PAGES_AUDIT_PART_3_COMMERCE.md P0 #2): RatesTab was
  // create-only. A misconfigured rate (e.g. 50 SAR instead of 5 SAR)
  // overcharged every customer until the zone was rebuilt from scratch.
  //
  // Both `updateRate` and `deleteRate` verify ownership by joining to
  // `shippingMethods.storeId` — a rate has no `storeId` column itself,
  // so a naive `where(rates.id = id)` would let one tenant mutate
  // another tenant's rate. The select-then-update/delete pattern
  // forces the cross-tenant check.
  private async assertRateOwnership(storeId: number, rateId: number) {
    const [row] = await this.db
      .select({ rateId: s.shippingRates.id })
      .from(s.shippingRates)
      .innerJoin(
        s.shippingMethods,
        eq(s.shippingRates.shippingMethodId, s.shippingMethods.id),
      )
      .where(
        and(
          eq(s.shippingRates.id, rateId),
          eq(s.shippingMethods.storeId, storeId),
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  async updateRate(
    storeId: number,
    rateId: number,
    data: Partial<{
      shippingMethodId: number;
      shippingZoneId: number;
      baseRate: number;
      perKgRate: number;
      freeAboveAmount: number;
      estimatedDaysMin: number;
      estimatedDaysMax: number;
    }>,
  ) {
    if (!(await this.assertRateOwnership(storeId, rateId))) return null;

    // If the caller is reassigning the rate to a different method or zone,
    // re-verify those belong to the same store — otherwise a tenant could
    // re-target a rate at a foreign method/zone.
    if (data.shippingMethodId !== undefined) {
      const [m] = await this.db
        .select()
        .from(s.shippingMethods)
        .where(
          and(
            eq(s.shippingMethods.id, data.shippingMethodId),
            eq(s.shippingMethods.storeId, storeId),
          ),
        );
      if (!m) throw new Error("SHIPPING_METHOD_NOT_FOUND");
    }
    if (data.shippingZoneId !== undefined) {
      const [z] = await this.db
        .select()
        .from(s.shippingZones)
        .where(
          and(
            eq(s.shippingZones.id, data.shippingZoneId),
            eq(s.shippingZones.storeId, storeId),
          ),
        );
      if (!z) throw new Error("SHIPPING_ZONE_NOT_FOUND");
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.shippingMethodId !== undefined) updateData.shippingMethodId = data.shippingMethodId;
    if (data.shippingZoneId !== undefined) updateData.shippingZoneId = data.shippingZoneId;
    if (data.baseRate !== undefined) updateData.baseRate = data.baseRate.toString();
    if (data.perKgRate !== undefined) updateData.perKgRate = data.perKgRate.toString();
    if (data.freeAboveAmount !== undefined) updateData.freeAboveAmount = data.freeAboveAmount.toString();
    if (data.estimatedDaysMin !== undefined) updateData.estimatedDaysMin = data.estimatedDaysMin;
    if (data.estimatedDaysMax !== undefined) updateData.estimatedDaysMax = data.estimatedDaysMax;

    const [updated] = await this.db
      .update(s.shippingRates)
      .set(updateData)
      .where(eq(s.shippingRates.id, rateId))
      .returning();
    return updated ?? null;
  }

  async deleteRate(storeId: number, rateId: number) {
    if (!(await this.assertRateOwnership(storeId, rateId))) return false;
    await this.db
      .delete(s.shippingRates)
      .where(eq(s.shippingRates.id, rateId));
    return true;
  }

  async listShipments(
    storeId: number,
    opts?: {
      status?: string;
      noTracking?: boolean;
      city?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const conditions = [eq(s.shipments.storeId, storeId)];
    if (opts?.status) conditions.push(eq(s.shipments.status, opts.status));
    if (opts?.noTracking)
      conditions.push(isNull(s.shipments.trackingNumber));

    const items = await this.db
      .select()
      .from(s.shipments)
      .where(and(...conditions))
      .orderBy(s.shipments.createdAt);

    let result = items;
    if (opts?.city) {
      result = result.filter((sh) => {
        const addr = sh.address as any;
        return addr?.city
          ?.toLowerCase()
          .includes(opts.city!.toLowerCase());
      });
    }
    if (opts?.dateFrom) {
      const from = new Date(opts.dateFrom);
      result = result.filter((sh) => sh.createdAt >= from);
    }
    if (opts?.dateTo) {
      const to = new Date(opts.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((sh) => sh.createdAt <= to);
    }

    return result;
  }

  async getOverview(storeId: number) {
    const [methodsResult] = await this.db
      .select({ total: count() })
      .from(s.shippingMethods)
      .where(eq(s.shippingMethods.storeId, storeId));
    const [activeMethodsResult] = await this.db
      .select({ total: count() })
      .from(s.shippingMethods)
      .where(
        and(
          eq(s.shippingMethods.storeId, storeId),
          eq(s.shippingMethods.isActive, true),
        ),
      );
    const [zonesResult] = await this.db
      .select({ total: count() })
      .from(s.shippingZones)
      .where(eq(s.shippingZones.storeId, storeId));
    const [ratesResult] = await this.db
      .select({ total: count() })
      .from(s.shippingRates)
      .innerJoin(
        s.shippingMethods,
        eq(s.shippingRates.shippingMethodId, s.shippingMethods.id),
      )
      .where(eq(s.shippingMethods.storeId, storeId));
    const [shipmentsResult] = await this.db
      .select({ total: count() })
      .from(s.shipments)
      .where(eq(s.shipments.storeId, storeId));
    const [noTrackingResult] = await this.db
      .select({ total: count() })
      .from(s.shipments)
      .where(
        and(
          eq(s.shipments.storeId, storeId),
          isNull(s.shipments.trackingNumber),
        ),
      );
    const [inTransitResult] = await this.db
      .select({ total: count() })
      .from(s.shipments)
      .where(
        and(
          eq(s.shipments.storeId, storeId),
          eq(s.shipments.status, "in_transit"),
        ),
      );
    const [deliveredResult] = await this.db
      .select({ total: count() })
      .from(s.shipments)
      .where(
        and(
          eq(s.shipments.storeId, storeId),
          eq(s.shipments.status, "delivered"),
        ),
      );

    const allShipments = await this.db
      .select({ updatedAt: s.shipments.updatedAt })
      .from(s.shipments)
      .where(eq(s.shipments.storeId, storeId))
      .orderBy(s.shipments.updatedAt)
      .limit(1);

    return {
      activeMethods: Number(activeMethodsResult.total),
      totalMethods: Number(methodsResult.total),
      zones: Number(zonesResult.total),
      rates: Number(ratesResult.total),
      shipments: Number(shipmentsResult.total),
      noTracking: Number(noTrackingResult.total),
      inTransit: Number(inTransitResult.total),
      delivered: Number(deliveredResult.total),
      lastUpdated: allShipments[0]?.updatedAt?.toISOString() ?? null,
    };
  }

  async getShipment(storeId: number, id: number) {
    const [shipment] = await this.db
      .select()
      .from(s.shipments)
      .where(
        and(eq(s.shipments.id, id), eq(s.shipments.storeId, storeId)),
      )
      .limit(1);
    if (!shipment) return null;
    const tracking = await this.db
      .select()
      .from(s.shipmentTrackingEvents)
      .where(eq(s.shipmentTrackingEvents.shipmentId, id))
      .orderBy(s.shipmentTrackingEvents.occurredAt);
    return { ...shipment, trackingEvents: tracking };
  }

  async updateShipmentStatus(
    storeId: number,
    id: number,
    data: {
      status: string;
      trackingNumber?: string;
      trackingUrl?: string;
      carrierName?: string;
    },
  ) {
    const [shipment] = await this.db
      .select()
      .from(s.shipments)
      .where(
        and(eq(s.shipments.id, id), eq(s.shipments.storeId, storeId)),
      )
      .limit(1);
    if (!shipment) return null;

    const updateData: Record<string, unknown> = {
      status: data.status,
      updatedAt: new Date(),
    };
    if (data.trackingNumber) updateData.trackingNumber = data.trackingNumber;
    if (data.trackingUrl) updateData.trackingUrl = data.trackingUrl;
    if (data.carrierName) updateData.carrierName = data.carrierName;
    if (data.status === "shipped") updateData.shippedAt = new Date();
    if (data.status === "delivered") updateData.deliveredAt = new Date();

    await this.db
      .update(s.shipments)
      .set(updateData)
      .where(
        and(eq(s.shipments.id, id), eq(s.shipments.storeId, storeId)),
      );

    await this.db.insert(s.shipmentTrackingEvents).values({
      shipmentId: id,
      status: data.status,
      description: `Status changed to ${data.status}`,
    });

    return this.getShipment(storeId, id);
  }

  async createShipment(
    storeId: number,
    orderId: number,
    data: {
      shippingMethodId: number;
      recipientName: string;
      recipientPhone: string;
      address: CreateShipmentInput["address"];
      items: CreateShipmentInput["items"];
      shippingCost: number;
      customerFee: number;
      merchantCost: number;
      platformCost: number;
      notes?: string;
    },
  ) {
    const [order] = await this.db.select().from(s.orders)
      .where(and(eq(s.orders.id, orderId), eq(s.orders.storeId, storeId))).limit(1);
    if (!order) throw new Error('Order not found or does not belong to this store');
    if (order.status === 'cancelled' || order.status === 'returned') {
      throw new Error(`Cannot create shipment for ${order.status} order`);
    }
    if (!data.recipientPhone && !order.customerPhone) {
      throw new Error('Recipient phone is required');
    }

    const [existing] = await this.db.select().from(s.shipments)
      .where(and(eq(s.shipments.orderId, orderId), eq(s.shipments.storeId, storeId), ne(s.shipments.status, 'cancelled')))
      .limit(1);
    if (existing) throw new Error('A shipment already exists for this order');

    const provider = createShippingProvider();

    let result;
    try {
      result = await provider.createShipment({
        storeId,
        orderId,
        shippingMethodId: data.shippingMethodId,
        recipientName: data.recipientName || order.customerName || '',
        recipientPhone: data.recipientPhone || order.customerPhone || '',
        address: data.address,
        items: data.items,
        shippingCost: data.shippingCost,
        customerFee: data.customerFee,
        merchantCost: data.merchantCost,
        platformCost: data.platformCost,
        notes: data.notes,
      });
    } catch (error) {
      if (provider.code !== 'oto') throw error;
      const message = error instanceof Error ? error.message : 'OTO shipment creation failed';
      const [shipment] = await this.db.insert(s.shipments).values({
        storeId,
        orderId,
        shippingMethodId: data.shippingMethodId,
        provider: 'oto',
        status: 'creation_failed',
        shippingCost: data.shippingCost.toString(),
        customerFee: data.customerFee.toString(),
        merchantCost: data.merchantCost.toString(),
        platformCost: data.platformCost.toString(),
        recipientName: data.recipientName || order.customerName || '',
        recipientPhone: data.recipientPhone || order.customerPhone || '',
        address: data.address,
        notes: data.notes,
      }).returning();
      await this.db.insert(s.shipmentErrors).values({
        shipmentId: shipment.id,
        provider: 'oto',
        errorCode: 'OTO_CREATION_FAILED',
        errorMessage: message,
      });
      result = {
        id: shipment.id,
        provider: 'oto',
        status: 'creation_failed',
      };
    }

    if (result.id) {
      await this.db.insert(s.shipmentTrackingEvents).values({
        shipmentId: result.id,
        status: result.status,
        description: `Shipment created via ${provider.code}`,
      });
    }

    return result;
  }

  async createLabel(storeId: number, shipmentId: number) {
    const provider = createShippingProvider();
    return provider.createLabel(shipmentId);
  }

  async getLabel(storeId: number, shipmentId: number) {
    const provider = createShippingProvider();
    return provider.getLabel(shipmentId);
  }

  async addTrackingEvent(
    storeId: number,
    shipmentId: number,
    data: {
      status: string;
      location?: string;
      description?: string;
      occurredAt?: Date;
    },
  ) {
    const [shipment] = await this.db
      .select()
      .from(s.shipments)
      .where(
        and(
          eq(s.shipments.id, shipmentId),
          eq(s.shipments.storeId, storeId),
        ),
      )
      .limit(1);
    if (!shipment) throw new Error("SHIPMENT_NOT_FOUND");

    const [event] = await this.db
      .insert(s.shipmentTrackingEvents)
      .values({
        shipmentId,
        status: data.status,
        location: data.location ?? null,
        description: data.description ?? null,
        occurredAt: data.occurredAt ?? new Date(),
      })
      .returning();

    await this.db
      .update(s.shipments)
      .set({ status: data.status, updatedAt: new Date() })
      .where(eq(s.shipments.id, shipmentId));

    return event;
  }

  async createReturnShipment(
    storeId: number,
    orderId: number,
    originalShipmentId: number,
    reason: string,
  ) {
    const provider = createShippingProvider();

    const result = await provider.createReturn({
      storeId,
      orderId,
      originalShipmentId,
      reason,
    });

    if (result.id) {
      await this.db.insert(s.shipmentTrackingEvents).values({
        shipmentId: result.id,
        status: "return_requested",
        description: reason,
      });
    }

    return result;
  }

  async listReturns(storeId: number) {
    return this.db
      .select()
      .from(s.shipments)
      .where(
        and(
          eq(s.shipments.storeId, storeId),
          inArray(s.shipments.status, RETURN_STATUSES),
        ),
      )
      .orderBy(s.shipments.createdAt);
  }

  async updateShipmentProvider(
    storeId: number,
    id: number,
    providerCode: ShippingProviderCode,
  ) {
    const [shipment] = await this.db
      .select()
      .from(s.shipments)
      .where(
        and(
          eq(s.shipments.id, id),
          eq(s.shipments.storeId, storeId),
        ),
      )
      .limit(1);
    if (!shipment) return null;

    const [updated] = await this.db
      .update(s.shipments)
      .set({ provider: providerCode, updatedAt: new Date() })
      .where(
        and(
          eq(s.shipments.id, id),
          eq(s.shipments.storeId, storeId),
        ),
      )
      .returning();
    return updated ?? null;
  }
}
