import crypto from "crypto";
import { and, eq } from "drizzle-orm";
import { createDbClient, type DbClient } from "@haa/db";
import * as s from "@haa/db/schema";

export type OtoIntegrationModel = "marketplace_vendor" | "merchant_token" | "not_configured";
export type OtoProviderStatus =
  | "configured"
  | "not_configured"
  | "marketplace_token_required"
  | "missing_sender_location"
  | "merchant_token_required";

export interface OtoPlatformStatus {
  provider: "oto";
  integrationModel: OtoIntegrationModel;
  marketplaceTokenAvailable: boolean;
  vendorRegistered: boolean;
  senderLocationConfigured: boolean;
  mode: "sandbox" | "live";
  status: OtoProviderStatus;
  manualFallback: boolean;
}

export interface RegisterVendorInput {
  companyName: string;
  email: string;
  fullName: string;
  mobileNumber: string;
  crNumber?: string;
  vatNumber?: string;
  billingAddress?: string;
  companyLogoURL?: string;
}

export function getOtoMode(): "sandbox" | "live" {
  return process.env.OTO_PLATFORM_MODE === "live" ? "live" : "sandbox";
}

export function getOtoApiBaseUrl(): string {
  if (process.env.OTO_API_BASE_URL) return process.env.OTO_API_BASE_URL;
  return getOtoMode() === "sandbox" ? "https://staging-api.tryoto.com" : "https://api.tryoto.com";
}

export function hasOtoMarketplaceToken(): boolean {
  return !!process.env.OTO_MARKETPLACE_TOKEN;
}

export function verifyOtoWebhookSignature(
  eventType: string,
  payload: Record<string, unknown>,
  signature: string,
  secret = process.env.OTO_WEBHOOK_AUTHORIZATION_KEY ?? process.env.OTO_WEBHOOK_PUBLIC_KEY,
): boolean {
  if (!secret || !signature) return false;
  const orderId = String(payload.orderId ?? payload.otoOrderId ?? "");
  const timestamp = String(payload.timestamp ?? payload.timeStamp ?? "");
  const middle = eventType === "shipmentError"
    ? String(payload.errorCode ?? "")
    : String(payload.status ?? "");
  const signedPayload = `${orderId}:${middle}:${timestamp}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("base64");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export class OtoMarketplaceService {
  constructor(private db: DbClient = createDbClient()) {}

  async getDefaultSenderLocation(storeId: number) {
    const [location] = await this.db.select().from(s.senderLocations)
      .where(and(eq(s.senderLocations.storeId, storeId), eq(s.senderLocations.isDefault, true)))
      .limit(1);
    return location ?? null;
  }

  async getVendorMapping(storeId: number) {
    const [mapping] = await this.db.select().from(s.otoVendorMappings)
      .where(eq(s.otoVendorMappings.storeId, storeId))
      .limit(1);
    return mapping ?? null;
  }

  async getProviderConnection(storeId: number) {
    const [connection] = await this.db.select().from(s.providerConnections)
      .where(and(
        eq(s.providerConnections.storeId, storeId),
        eq(s.providerConnections.providerType, "shipping"),
        eq(s.providerConnections.providerName, "oto"),
      ))
      .limit(1);
    return connection ?? null;
  }

  async getPlatformStatus(storeId: number): Promise<OtoPlatformStatus> {
    const [mapping, connection, senderLocation] = await Promise.all([
      this.getVendorMapping(storeId),
      this.getProviderConnection(storeId),
      this.getDefaultSenderLocation(storeId),
    ]);
    const marketplaceTokenAvailable = hasOtoMarketplaceToken();
    const integrationModel = (connection?.integrationModel as OtoIntegrationModel | undefined)
      ?? (mapping?.integrationModel as OtoIntegrationModel | undefined)
      ?? (marketplaceTokenAvailable ? "marketplace_vendor" : "not_configured");
    const vendorRegistered = !!mapping?.otoClientId && mapping.otoVendorStatus === "registered";
    const senderLocationConfigured = !!senderLocation;
    let status: OtoProviderStatus = "not_configured";

    if (integrationModel === "marketplace_vendor") {
      if (!marketplaceTokenAvailable) status = "marketplace_token_required";
      else if (!vendorRegistered) status = "marketplace_token_required";
      else if (!senderLocationConfigured) status = "missing_sender_location";
      else status = "configured";
    } else if (integrationModel === "merchant_token") {
      if (!connection?.credentialsEncrypted) status = "merchant_token_required";
      else if (!senderLocationConfigured) status = "missing_sender_location";
      else status = "configured";
    }

    return {
      provider: "oto",
      integrationModel,
      marketplaceTokenAvailable,
      vendorRegistered,
      senderLocationConfigured,
      mode: getOtoMode(),
      status,
      manualFallback: status !== "configured",
    };
  }

  async registerVendorForStore(storeId: number, input: RegisterVendorInput) {
    if (!hasOtoMarketplaceToken()) {
      throw new Error("Marketplace vendor registration requires OTO special marketplace token.");
    }
    const body = {
      companyName: input.companyName,
      email: input.email,
      fullName: input.fullName,
      mobileNumber: input.mobileNumber,
      crNumber: input.crNumber,
      vatNumber: input.vatNumber,
      billingAddress: input.billingAddress,
      companyLogoURL: input.companyLogoURL,
      webhookURL: process.env.OTO_WEBHOOK_URL,
      webhookMethod: "POST",
      webhookSecretKey: process.env.OTO_WEBHOOK_AUTHORIZATION_KEY,
      currency: "SAR",
    };
    const response = await fetch(`${getOtoApiBaseUrl()}/rest/v2/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OTO_MARKETPLACE_TOKEN}`,
      },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      throw new Error(typeof result.message === "string" ? result.message : "OTO vendor registration failed");
    }
    const otoClientId = String(result.clientId ?? result.otoClientId ?? result.id ?? input.email);
    const [mapping] = await this.db.insert(s.otoVendorMappings).values({
      storeId,
      integrationModel: "marketplace_vendor",
      otoVendorEmail: input.email,
      otoClientId,
      otoVendorStatus: "registered",
      registeredAt: new Date(),
      lastSyncedAt: new Date(),
    }).onConflictDoUpdate({
      target: s.otoVendorMappings.storeId,
      set: {
        otoVendorEmail: input.email,
        otoClientId,
        otoVendorStatus: "registered",
        registeredAt: new Date(),
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      },
    }).returning();
    return mapping;
  }

  async createOtoOrderFromHaaOrder(orderId: number, storeId: number) {
    const [order] = await this.db.select().from(s.orders)
      .where(and(eq(s.orders.id, orderId), eq(s.orders.storeId, storeId)))
      .limit(1);
    if (!order) throw new Error("Order not found or does not belong to this store");
    const [store] = await this.db.select().from(s.stores).where(eq(s.stores.id, storeId)).limit(1);
    const senderLocation = await this.getDefaultSenderLocation(storeId);
    if (!senderLocation) throw new Error("missing_sender_location");
    const status = await this.getPlatformStatus(storeId);
    if (status.status !== "configured") throw new Error(status.status);
    const items = await this.db.select().from(s.orderItems).where(eq(s.orderItems.orderId, orderId));
    const amount = Number(order.total);
    const paymentMethod = order.paymentMethod === "cash_on_delivery" ? "cod" : "paid";
    const payload = {
      orderId: order.orderNumber,
      storeName: store?.name ?? `Store ${storeId}`,
      payment_method: paymentMethod,
      amount,
      amount_due: paymentMethod === "cod" ? amount : 0,
      currency: "SAR",
      shippingAmount: Number(order.shippingCost ?? 0),
      subtotal: Number(order.subtotal),
      senderInformation: {
        name: senderLocation.senderName,
        mobileNumber: senderLocation.senderPhone,
        email: senderLocation.senderEmail,
        country: senderLocation.senderCountry,
        city: senderLocation.senderCity,
        address: senderLocation.senderAddressLine,
        shortAddressCode: senderLocation.senderShortAddressCode,
      },
      customer: {
        name: order.customerName,
        mobileNumber: order.customerPhone,
        email: order.customerEmail,
        address: order.shippingAddress,
      },
      items: items.map((item) => ({
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        price: Number(item.unitPrice),
      })),
      whoPays: "sellerPaysDeliveryFee",
    };
    const response = await fetch(`${getOtoApiBaseUrl()}/rest/v2/createOrder`, {
      method: "POST",
      headers: this.authHeaders(status.integrationModel),
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      await this.upsertOtoShipment(storeId, orderId, {
        status: "creation_failed",
        syncStatus: "failed",
        errorMessage: typeof result.message === "string" ? result.message : "OTO createOrder failed",
      });
      throw new Error("OTO createOrder failed");
    }
    return this.upsertOtoShipment(storeId, orderId, {
      otoOrderId: String(result.orderId ?? result.otoOrderId ?? order.orderNumber),
      status: "order_created",
      syncStatus: "synced",
    });
  }

  async createOtoShipment(storeId: number, orderId: number, deliveryOptionId: string) {
    if (!deliveryOptionId) throw new Error("deliveryOptionId is required");
    const [otoOrder] = await this.db.select().from(s.otoShipments)
      .where(and(eq(s.otoShipments.storeId, storeId), eq(s.otoShipments.orderId, orderId)))
      .limit(1);
    if (!otoOrder?.otoOrderId) {
      throw new Error("OTO order must be created before shipment creation");
    }
    const status = await this.getPlatformStatus(storeId);
    if (status.status !== "configured") throw new Error(status.status);
    const response = await fetch(`${getOtoApiBaseUrl()}/rest/v2/createShipment`, {
      method: "POST",
      headers: this.authHeaders(status.integrationModel),
      body: JSON.stringify({ orderId: otoOrder.otoOrderId, deliveryOptionId }),
    });
    const result = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      await this.upsertOtoShipment(storeId, orderId, {
        deliveryOptionId,
        status: "creation_failed",
        syncStatus: "failed",
        errorCode: typeof result.errorCode === "string" ? result.errorCode : undefined,
        errorMessage: typeof result.message === "string" ? result.message : "OTO createShipment failed",
      });
      return { success: false, status: "creation_failed" };
    }
    return this.upsertOtoShipment(storeId, orderId, {
      deliveryOptionId,
      providerShipmentId: String(result.otoId ?? result.shipmentId ?? ""),
      deliveryCompanyName: typeof result.deliveryCompanyName === "string" ? result.deliveryCompanyName : undefined,
      trackingNumber: typeof result.trackingNumber === "string" ? result.trackingNumber : undefined,
      trackingUrl: typeof result.trackingUrl === "string" ? result.trackingUrl : undefined,
      labelUrl: typeof result.printAWBURL === "string" ? result.printAWBURL : typeof result.labelUrl === "string" ? result.labelUrl : undefined,
      status: "label_created",
      syncStatus: "synced",
    });
  }

  async handleWebhook(eventType: string, payload: Record<string, unknown>) {
    const otoOrderId = String(payload.orderId ?? payload.otoOrderId ?? "");
    const [otoShipment] = await this.db.select().from(s.otoShipments)
      .where(eq(s.otoShipments.otoOrderId, otoOrderId))
      .limit(1);
    if (!otoShipment) return { success: false, eventType, message: "OTO order not found" };
    if (eventType === "shipmentError") {
      await this.upsertOtoShipment(otoShipment.storeId, otoShipment.orderId, {
        status: "creation_failed",
        syncStatus: "failed",
        errorCode: typeof payload.errorCode === "string" ? payload.errorCode : undefined,
        errorMessage: typeof payload.errorMessage === "string" ? payload.errorMessage : undefined,
      });
      return { success: true, eventType, shipmentId: otoShipment.shipmentId ?? undefined };
    }
    const status = String(payload.status ?? "in_transit").toLowerCase();
    const mapped = status.includes("delivered") ? "delivered" : status.includes("returned") ? "returned" : "in_transit";
    if (otoShipment.shipmentId) {
      await this.db.update(s.shipments).set({
        status: mapped,
        trackingNumber: typeof payload.trackingNumber === "string" ? payload.trackingNumber : undefined,
        trackingUrl: typeof payload.trackingUrl === "string" ? payload.trackingUrl : undefined,
        carrierName: typeof payload.deliveryCompany === "string" ? payload.deliveryCompany : undefined,
        updatedAt: new Date(),
      }).where(and(eq(s.shipments.id, otoShipment.shipmentId), eq(s.shipments.storeId, otoShipment.storeId)));
      await this.db.insert(s.shipmentTrackingEvents).values({
        shipmentId: otoShipment.shipmentId,
        status: mapped,
        description: `OTO ${eventType}: ${status}`,
      });
    }
    await this.upsertOtoShipment(otoShipment.storeId, otoShipment.orderId, {
      status: mapped,
      trackingNumber: typeof payload.trackingNumber === "string" ? payload.trackingNumber : undefined,
      trackingUrl: typeof payload.trackingUrl === "string" ? payload.trackingUrl : undefined,
      deliveryCompanyName: typeof payload.deliveryCompany === "string" ? payload.deliveryCompany : undefined,
      syncStatus: "synced",
    });
    return { success: true, eventType, shipmentId: otoShipment.shipmentId ?? undefined };
  }

  private authHeaders(integrationModel: OtoIntegrationModel): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (integrationModel === "marketplace_vendor" && process.env.OTO_MARKETPLACE_TOKEN) {
      headers.Authorization = `Bearer ${process.env.OTO_MARKETPLACE_TOKEN}`;
    }
    return headers;
  }

  private async upsertOtoShipment(
    storeId: number,
    orderId: number,
    values: Partial<typeof s.otoShipments.$inferInsert>,
  ) {
    const [existing] = await this.db.select().from(s.otoShipments)
      .where(and(eq(s.otoShipments.storeId, storeId), eq(s.otoShipments.orderId, orderId)))
      .limit(1);
    if (existing) {
      const [updated] = await this.db.update(s.otoShipments).set({ ...values, updatedAt: new Date() })
        .where(and(eq(s.otoShipments.storeId, storeId), eq(s.otoShipments.orderId, orderId)))
        .returning();
      return updated;
    }
    const [created] = await this.db.insert(s.otoShipments).values({ storeId, orderId, ...values }).returning();
    return created;
  }
}
