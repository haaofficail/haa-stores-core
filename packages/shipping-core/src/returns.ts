import { eq, and, or, inArray } from "drizzle-orm";
import { createDbClient, type DbClient } from "@haa/db";
import * as s from "@haa/db/schema";

const RETURN_STATUSES = [
  "return_requested",
  "return_in_transit",
  "returned",
];

export class ReturnService {
  constructor(private db: DbClient = createDbClient()) {}

  async createReturn(
    storeId: number,
    orderId: number,
    originalShipmentId: number,
    reason: string,
  ) {
    const [shipment] = await this.db
      .insert(s.shipments)
      .values({
        storeId,
        orderId,
        provider: "manual",
        status: "return_requested",
        notes: reason,
      })
      .returning();

    return shipment;
  }

  async getReturn(storeId: number, id: number) {
    const [shipment] = await this.db
      .select()
      .from(s.shipments)
      .where(
        and(
          eq(s.shipments.id, id),
          eq(s.shipments.storeId, storeId),
          inArray(s.shipments.status, RETURN_STATUSES),
        ),
      )
      .limit(1);
    return shipment ?? null;
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
}
