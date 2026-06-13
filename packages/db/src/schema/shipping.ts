import { pgTable, serial, varchar, integer, timestamp, boolean, decimal, jsonb, text } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';
import { orders } from './orders.js';

export const shippingProviders = pgTable('shipping_providers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const shippingProviderAccounts = pgTable('shipping_provider_accounts', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  providerId: integer('provider_id').notNull().references(() => shippingProviders.id),
  isEnabled: boolean('is_enabled').notNull().default(false),
  config: jsonb('config'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const shippingMethods = pgTable('shipping_methods', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 30 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  estimatedDeliveryDays: varchar('estimated_delivery_days', { length: 50 }),
  config: jsonb('config'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const shippingZones = pgTable('shipping_zones', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  name: varchar('name', { length: 100 }).notNull(),
  cities: text('cities').array().notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const shippingRates = pgTable('shipping_rates', {
  id: serial('id').primaryKey(),
  shippingMethodId: integer('shipping_method_id').notNull().references(() => shippingMethods.id),
  shippingZoneId: integer('shipping_zone_id').notNull().references(() => shippingZones.id),
  baseRate: decimal('base_rate', { precision: 12, scale: 2 }).notNull().default('0'),
  perKgRate: decimal('per_kg_rate', { precision: 12, scale: 2 }).default('0'),
  freeAboveAmount: decimal('free_above_amount', { precision: 12, scale: 2 }),
  estimatedDaysMin: integer('estimated_days_min'),
  estimatedDaysMax: integer('estimated_days_max'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const shipments = pgTable('shipments', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  orderId: integer('order_id').notNull().references(() => orders.id),
  shippingMethodId: integer('shipping_method_id').references(() => shippingMethods.id),
  provider: varchar('provider', { length: 50 }).notNull().default('manual'),
  status: varchar('status', { length: 30 }).notNull().default('draft'),
  providerShipmentId: varchar('provider_shipment_id', { length: 255 }),
  carrierName: varchar('carrier_name', { length: 100 }),
  trackingNumber: varchar('tracking_number', { length: 100 }),
  trackingUrl: varchar('tracking_url', { length: 500 }),
  shippingCost: decimal('shipping_cost', { precision: 12, scale: 2 }),
  customerFee: decimal('customer_fee', { precision: 12, scale: 2 }),
  merchantCost: decimal('merchant_cost', { precision: 12, scale: 2 }),
  platformCost: decimal('platform_cost', { precision: 12, scale: 2 }),
  recipientName: varchar('recipient_name', { length: 100 }),
  recipientPhone: varchar('recipient_phone', { length: 20 }),
  address: jsonb('address'),
  weightGrams: integer('weight_grams'),
  notes: text('notes'),
  shippedAt: timestamp('shipped_at'),
  deliveredAt: timestamp('delivered_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const shipmentPackages = pgTable('shipment_packages', {
  id: serial('id').primaryKey(),
  shipmentId: integer('shipment_id').notNull().references(() => shipments.id),
  weightGrams: integer('weight_grams'),
  lengthCm: decimal('length_cm', { precision: 8, scale: 2 }),
  widthCm: decimal('width_cm', { precision: 8, scale: 2 }),
  heightCm: decimal('height_cm', { precision: 8, scale: 2 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const shipmentTrackingEvents = pgTable('shipment_tracking_events', {
  id: serial('id').primaryKey(),
  shipmentId: integer('shipment_id').notNull().references(() => shipments.id),
  status: varchar('status', { length: 30 }).notNull(),
  location: varchar('location', { length: 255 }),
  description: text('description'),
  occurredAt: timestamp('occurred_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const shipmentLabels = pgTable('shipment_labels', {
  id: serial('id').primaryKey(),
  shipmentId: integer('shipment_id').notNull().references(() => shipments.id),
  url: varchar('url', { length: 500 }),
  format: varchar('format', { length: 10 }).default('pdf'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const shipmentErrors = pgTable('shipment_errors', {
  id: serial('id').primaryKey(),
  shipmentId: integer('shipment_id').notNull().references(() => shipments.id),
  provider: varchar('provider', { length: 50 }).notNull(),
  errorCode: varchar('error_code', { length: 100 }),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const otoVendorMappings = pgTable('oto_vendor_mappings', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id).unique(),
  integrationModel: varchar('integration_model', { length: 50 }).notNull().default('marketplace_vendor'),
  otoVendorEmail: varchar('oto_vendor_email', { length: 255 }),
  otoClientId: varchar('oto_client_id', { length: 255 }),
  otoVendorStatus: varchar('oto_vendor_status', { length: 50 }).notNull().default('not_registered'),
  remainingCredit: decimal('remaining_credit', { precision: 12, scale: 2 }),
  validityDate: varchar('validity_date', { length: 50 }),
  registeredAt: timestamp('registered_at'),
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const senderLocations = pgTable('sender_locations', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  senderName: varchar('sender_name', { length: 120 }).notNull(),
  senderPhone: varchar('sender_phone', { length: 20 }).notNull(),
  senderEmail: varchar('sender_email', { length: 255 }),
  senderCountry: varchar('sender_country', { length: 2 }).notNull().default('SA'),
  senderCity: varchar('sender_city', { length: 100 }).notNull(),
  senderAddressLine: text('sender_address_line').notNull(),
  senderShortAddressCode: varchar('sender_short_address_code', { length: 50 }),
  lat: decimal('lat', { precision: 10, scale: 7 }),
  lon: decimal('lon', { precision: 10, scale: 7 }),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const otoShipments = pgTable('oto_shipments', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  orderId: integer('order_id').notNull().references(() => orders.id),
  shipmentId: integer('shipment_id').references(() => shipments.id),
  otoOrderId: varchar('oto_order_id', { length: 255 }),
  providerShipmentId: varchar('provider_shipment_id', { length: 255 }),
  deliveryOptionId: varchar('delivery_option_id', { length: 255 }),
  deliveryCompanyName: varchar('delivery_company_name', { length: 255 }),
  trackingNumber: varchar('tracking_number', { length: 100 }),
  trackingUrl: varchar('tracking_url', { length: 500 }),
  labelUrl: varchar('label_url', { length: 500 }),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  syncStatus: varchar('sync_status', { length: 50 }).notNull().default('pending'),
  errorCode: varchar('error_code', { length: 100 }),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
