import { eq, and } from "drizzle-orm";
import { createDbClient, type DbClient } from "@haa/db";
import * as s from "@haa/db/schema";

export class LabelService {
  constructor(private db: DbClient = createDbClient()) {}

  async createLabel(shipmentId: number, storeId: number) {
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

    const url = `/api/mock/labels/shipment-${shipmentId}.pdf`;

    const [existing] = await this.db
      .select()
      .from(s.shipmentLabels)
      .where(eq(s.shipmentLabels.shipmentId, shipmentId))
      .limit(1);

    if (existing) {
      const [updated] = await this.db
        .update(s.shipmentLabels)
        .set({ url, format: "pdf" })
        .where(eq(s.shipmentLabels.id, existing.id))
        .returning();
      return updated;
    }

    const [label] = await this.db
      .insert(s.shipmentLabels)
      .values({ shipmentId, url, format: "pdf" })
      .returning();
    return label;
  }

  async getLabel(shipmentId: number, storeId: number) {
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

    const [label] = await this.db
      .select()
      .from(s.shipmentLabels)
      .where(eq(s.shipmentLabels.shipmentId, shipmentId))
      .limit(1);
    return label ?? null;
  }
}
