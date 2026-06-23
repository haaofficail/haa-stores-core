import { and, eq } from 'drizzle-orm';
import { createDbClient, type DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import {
  ShippingService,
  LabelService,
  ReturnService,
  createShippingProvider,
  getShippingProviderStatus,
} from '@haa/shipping-core';
import type { CreateShipmentInput, ShipmentResult } from '@haa/shipping-core';
import { OrdersService } from './orders.js';

/**
 * Result envelope returned by every public method on
 * ShipmentsService. Routes consume this envelope to map to
 * HTTP status codes without re-running the validation
 * themselves.
 *
 * Codes match the strings the route used to return before
 * the migration, so the public API is byte-identical for
 * clients.
 */
export type ShipmentsResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; code: string; message: string };

/**
 * ShipmentsService — owns the route-facing shipment
 * business logic for the merchant shipments surface.
 *
 * Originally extracted from `apps/api/src/routes/shipments.ts`
 * as part of Quality Pass 5, Route Migration 17/24.
 *
 * The route had ~12 lines of business logic inlined:
 *   1. Order lookup + status/phone pre-validation before
 *      calling ShippingService.createShipment
 *   2. try/catch around createShipment to map carrier
 *      errors to a structured 400 response
 *   3. Direct DB lookup of the original shipment to verify
 *      store ownership before calling ReturnService.createReturn
 *   4. try/catch around createReturn to map return errors
 *   5. try/catch around createLabel and cancel
 *
 * Those 5 concerns now live here. The route is a pure
 * transport shell that translates ShipmentsResult into
 * HTTP status codes (404, 400, 201, 200).
 *
 * Pre-existing services (ShippingService, LabelService,
 * ReturnService, createShippingProvider) are reused. We
 * do NOT re-implement carrier/provider logic, do NOT touch
 * the shipments schema, and do NOT change error messages
 * for clients.
 *
 * Why @haa/commerce-core and not @haa/shipping-core?
 * The service composes OrdersService (commerce-core) with
 * shipping-side services (shipping-core). commerce-core
 * already depends on shipping-core; the reverse direction
 * would be a circular dependency. This matches the
 * convention used by DashboardService, StoreSettingsService,
 * ProviderStatusService.
 */
export class ShipmentsService {
  constructor(private db: DbClient = createDbClient()) {}

  /**
   * Provider status (read-only, no DB access — kept here so
   * the route has a single service dependency for the
   * shipments surface).
   */
  getProviderStatus() {
    return getShippingProviderStatus();
  }

  /**
   * List shipments, optionally filtered by status. Pure
   * delegation to ShippingService.
   */
  async listShipments(
    storeId: number,
    opts: { status?: string },
  ): Promise<ShipmentsResult> {
    try {
      const data = await new ShippingService(this.db).listShipments(
        storeId,
        opts,
      );
      return { success: true, data };
    } catch (e) {
      return this.toError(e, 'SHIPMENT_ERROR', 'List shipments failed');
    }
  }

  /**
   * Fetch a single shipment by ID. Returns NOT_FOUND if the
   * shipment does not belong to the store.
   */
  async getShipment(
    storeId: number,
    id: number,
  ): Promise<ShipmentsResult> {
    const data = await new ShippingService(this.db).getShipment(storeId, id);
    if (!data) {
      return {
        success: false,
        code: 'NOT_FOUND',
        message: 'Shipment not found',
      };
    }
    return { success: true, data };
  }

  /**
   * Create a shipment for an order. The pre-validation that
   * used to live in the route (order exists, order not
   * cancelled/returned, recipient phone resolvable) now
   * lives here and returns structured codes.
   *
   * ShippingService.createShipment still performs the same
   * validation as a defense-in-depth check — we just
   * surface a more user-friendly error before that throw.
   */
  async createShipment(
    storeId: number,
    orderId: number,
    body: {
      shippingMethodId: number;
      recipientName: string;
      recipientPhone?: string;
      address: CreateShipmentInput['address'];
      notes?: string;
    },
  ): Promise<ShipmentsResult<ShipmentResult>> {
    const order = await new OrdersService(this.db).getById(storeId, orderId);
    if (!order) {
      return {
        success: false,
        code: 'NOT_FOUND',
        message: 'Order not found',
      };
    }
    if (order.status === 'cancelled' || order.status === 'returned') {
      return {
        success: false,
        code: 'INVALID_STATUS',
        message: 'Cannot ship cancelled/returned order',
      };
    }

    // Payment / address / duplicate guard (HAA-1004)
    //
    // COD "confirmed" = paymentMethod === 'cash_on_delivery' AND paymentStatus === 'pending'.
    // checkout.ts sets paymentStatus → 'pending' when a COD order is confirmed.
    // paymentStatus === 'unpaid' on a COD order means the merchant has not yet acknowledged
    // collection intent.
    // TODO: add a dedicated codStatus field (confirmed/rejected) when the merchant-COD-
    // confirmation flow is built; gate here on codStatus ∈ ['confirmed','approved'].
    //
    // NOTE — fulfillmentStatus is intentionally NOT checked here:
    // In this codebase fulfillmentStatus becomes 'fulfilled' only when an order reaches
    // 'completed' or 'picked_up' (post-delivery). A ready_to_ship order always has
    // fulfillmentStatus = 'unfulfilled'. The ORDER STATUS itself (ready_to_ship) is the
    // preparation signal. There is no 'prepared' or 'packed' enum value yet.
    // TODO: add a preparationStatus field (unfulfilled → prepared → packed) and gate
    // createShipment on preparationStatus ∈ ['prepared', 'packed'] once implemented.
    const blockers: string[] = [];
    const isCOD = order.paymentMethod === 'cash_on_delivery';
    const paymentOk =
      order.paymentStatus === 'paid' ||
      (isCOD && order.paymentStatus === 'pending');
    if (!paymentOk) {
      if (isCOD) {
        blockers.push('COD order is not confirmed (paymentStatus must be pending)');
      } else {
        blockers.push('paymentStatus is unpaid and order is not COD');
      }
    }
    const addr = order.shippingAddress as Record<string, unknown> | null;
    const missingAddrFields: string[] = [];
    if (!addr?.city) missingAddrFields.push('city');
    if (!addr?.street && !addr?.addressLine1 && !addr?.address) missingAddrFields.push('street');
    if (!addr?.country && !addr?.countryCode) missingAddrFields.push('country');
    if (!order.customerName) missingAddrFields.push('customerName');
    if (!order.customerPhone && !body.recipientPhone) missingAddrFields.push('phone');
    if (missingAddrFields.length > 0) {
      blockers.push(`shipping address is incomplete (missing: ${missingAddrFields.join(', ')})`);
    }
    const [existingShipment] = await this.db
      .select({ id: s.shipments.id })
      .from(s.shipments)
      .where(
        and(
          eq(s.shipments.orderId, orderId),
          eq(s.shipments.storeId, storeId),
        ),
      )
      .limit(1);
    if (existingShipment) {
      blockers.push('an active shipment already exists for this order');
    }
    if (blockers.length > 0) {
      return {
        success: false,
        code: 'ORDER_NOT_SHIPPABLE',
        message: `لا يمكن إنشاء بوليصة لأن الطلب غير مدفوع ولم يتم تجهيزه. ${blockers.join('; ')}`,
      };
    }

    const recipientPhone = body.recipientPhone || order.customerPhone || '';
    if (!recipientPhone) {
      return {
        success: false,
        code: 'MISSING_ADDRESS',
        message: 'Recipient phone required',
      };
    }

    try {
      const data = await new ShippingService(this.db).createShipment(
        storeId,
        orderId,
        {
          shippingMethodId: body.shippingMethodId,
          recipientName: body.recipientName,
          recipientPhone,
          address: body.address,
          notes: body.notes,
          items: [],
          shippingCost: 0,
          customerFee: 0,
          merchantCost: 0,
          platformCost: 0,
        },
      );
      return { success: true, data };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Shipment creation failed';
      return {
        success: false,
        code: 'SHIPMENT_ERROR',
        message: msg,
      };
    }
  }

  /**
   * Create a label for a shipment. Returns NOT_FOUND if the
   * underlying provider can't find it, SHIPMENT_ERROR on
   * carrier failure.
   */
  async createLabel(
    storeId: number,
    shipmentId: number,
  ): Promise<ShipmentsResult> {
    try {
      const data = await new ShippingService(this.db).createLabel(
        storeId,
        shipmentId,
      );
      if (!data) {
        return {
          success: false,
          code: 'NOT_FOUND',
          message: 'Shipment not found',
        };
      }
      return { success: true, data };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Label creation failed';
      return {
        success: false,
        code: 'LABEL_ERROR',
        message: msg,
      };
    }
  }

  /**
   * Get a label by shipment ID. Pure delegation to
   * LabelService.getLabel.
   */
  async getLabel(
    storeId: number,
    shipmentId: number,
  ): Promise<ShipmentsResult> {
    const data = await new LabelService(this.db).getLabel(
      shipmentId,
      storeId,
    );
    if (!data) {
      return {
        success: false,
        code: 'NOT_FOUND',
        message: 'Label not found',
      };
    }
    return { success: true, data };
  }

  /**
   * Update shipment status. Returns NOT_FOUND if the
   * shipment does not exist for this store. Tracking fields
   * (number/url/carrier) are passed through.
   */
  async updateStatus(
    storeId: number,
    shipmentId: number,
    body: {
      status: string;
      trackingNumber?: string;
      trackingUrl?: string;
      carrierName?: string;
    },
  ): Promise<ShipmentsResult> {
    const data = await new ShippingService(this.db).updateShipmentStatus(
      storeId,
      shipmentId,
      body,
    );
    if (!data) {
      return {
        success: false,
        code: 'NOT_FOUND',
        message: 'Shipment not found',
      };
    }
    return { success: true, data };
  }

  /**
   * Add a tracking event. Returns NOT_FOUND if the shipment
   * does not exist for this store.
   */
  async addTrackingEvent(
    storeId: number,
    shipmentId: number,
    body: { status: string; description?: string; location?: string },
  ): Promise<ShipmentsResult> {
    const data = await new ShippingService(this.db).addTrackingEvent(
      storeId,
      shipmentId,
      body,
    );
    if (!data) {
      return {
        success: false,
        code: 'NOT_FOUND',
        message: 'Shipment not found',
      };
    }
    return { success: true, data };
  }

  /**
   * Create a return for a shipment. Verifies the original
   * shipment belongs to the store (the lookup the route
   * used to do inline) and delegates to ReturnService.
   */
  async createReturn(
    storeId: number,
    shipmentId: number,
    body: { reason: string },
  ): Promise<ShipmentsResult> {
    // Verify the original shipment belongs to the store.
    // This used to be a direct db.select in the route.
    // We also need its orderId for the ReturnService call.
    const [shipment] = await this.db
      .select({ id: s.shipments.id, orderId: s.shipments.orderId })
      .from(s.shipments)
      .where(
        and(
          eq(s.shipments.id, shipmentId),
          eq(s.shipments.storeId, storeId),
        ),
      )
      .limit(1);

    if (!shipment) {
      return {
        success: false,
        code: 'NOT_FOUND',
        message: 'Shipment not found',
      };
    }

    try {
      const data = await new ReturnService(this.db).createReturn(
        storeId,
        shipment.orderId,
        shipmentId,
        body.reason,
      );
      return { success: true, data };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Return creation failed';
      return {
        success: false,
        code: 'RETURN_ERROR',
        message: msg,
      };
    }
  }

  /**
   * Cancel a shipment via the configured shipping provider.
   * The provider is responsible for verifying the shipment
   * belongs to the store.
   */
  async cancel(
    storeId: number,
    shipmentId: number,
  ): Promise<ShipmentsResult<{ message: string }>> {
    try {
      const provider = createShippingProvider();
      await provider.cancelShipment(shipmentId, storeId);
      return {
        success: true,
        data: { message: 'Shipment cancelled' },
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Cancel failed';
      return {
        success: false,
        code: 'CANCEL_ERROR',
        message: msg,
      };
    }
  }

  /**
   * List returns for a store. Pure delegation to
   * ReturnService.listReturns.
   */
  async listReturns(storeId: number): Promise<ShipmentsResult> {
    const data = await new ReturnService(this.db).listReturns(storeId);
    return { success: true, data };
  }

  private toError(
    e: unknown,
    code: string,
    fallback: string,
  ): ShipmentsResult {
    const msg = e instanceof Error ? e.message : fallback;
    return { success: false, code, message: msg };
  }
}
