import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { eq } from 'drizzle-orm';
import type { ZatcaSellerConfig } from '@haa/zatca-core';

export async function resolveSellerConfig(storeId: number): Promise<ZatcaSellerConfig> {
  try {
    const db = createDbClient();
    const [row] = await db
      .select({
        tenantName: s.tenants.name,
        vatNumber: s.tenants.vatNumber,
      })
      .from(s.stores)
      .innerJoin(s.tenants, eq(s.stores.tenantId, s.tenants.id))
      .where(eq(s.stores.id, storeId))
      .limit(1);

    return {
      sellerName: row?.tenantName ?? process.env.ZATCA_SELLER_NAME ?? 'متجر هاء',
      vatNumber: row?.vatNumber ?? process.env.ZATCA_VAT_NUMBER ?? '',
      street: process.env.ZATCA_STREET ?? 'شارع الملك عبدالعزيز',
      district: process.env.ZATCA_DISTRICT,
      city: process.env.ZATCA_CITY ?? 'الرياض',
      postalCode: process.env.ZATCA_POSTAL_CODE ?? '12345',
    };
  } catch {
    return {
      sellerName: process.env.ZATCA_SELLER_NAME ?? 'متجر هاء',
      vatNumber: process.env.ZATCA_VAT_NUMBER ?? '',
      street: process.env.ZATCA_STREET ?? 'شارع الملك عبدالعزيز',
      district: process.env.ZATCA_DISTRICT,
      city: process.env.ZATCA_CITY ?? 'الرياض',
      postalCode: process.env.ZATCA_POSTAL_CODE ?? '12345',
    };
  }
}
