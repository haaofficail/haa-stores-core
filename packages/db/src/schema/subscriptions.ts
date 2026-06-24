import { pgTable, serial, varchar, integer, timestamp, boolean, decimal } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';

export const subscriptionPlans = pgTable('subscription_plans', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 30 }).notNull().unique(),
  description: varchar('description', { length: 500 }),
  priceMonthly: decimal('price_monthly', { precision: 10, scale: 2 }).notNull().default('0'),
  priceAnnual: decimal('price_annual', { precision: 10, scale: 2 }).notNull().default('0'),
  productLimit: integer('product_limit').default(-1),
  staffLimit: integer('staff_limit').default(1),
  storageLimitMb: integer('storage_limit_mb').default(100),
  orderLimit: integer('order_limit').default(-1),
  trialDays: integer('trial_days').default(14),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const merchantSubscriptions = pgTable('merchant_subscriptions', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id).unique(),
  planId: integer('plan_id').notNull().references(() => subscriptionPlans.id),
  status: varchar('status', { length: 30 }).notNull().default('trialing'),
  billingCycle: varchar('billing_cycle', { length: 10 }).notNull().default('monthly'),
  currentPeriodStart: timestamp('current_period_start').notNull().defaultNow(),
  currentPeriodEnd: timestamp('current_period_end'),
  trialEnd: timestamp('trial_end'),
  // HAA-SUB-RENEWAL — dedupe anchor for the renewal-reminder email
  // ladder. The notifier (SubscriptionRenewalNotifier.runDailySweep)
  // fires at most one reminder per (period, step) pair:
  //   - lastRenewalReminderStep: which ladder step we last reminded
  //     for (7 = 7-day reminder, 1 = 1-day reminder). NULL means
  //     "never reminded for the current period".
  //   - lastRenewalReminderAt: when that reminder was sent. The
  //     skip predicate anchors on currentPeriodStart so a brand-new
  //     period resets dedup naturally without any backfill.
  lastRenewalReminderAt: timestamp('last_renewal_reminder_at'),
  lastRenewalReminderStep: integer('last_renewal_reminder_step'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const subscriptionInvoices = pgTable('subscription_invoices', {
  id: serial('id').primaryKey(),
  subscriptionId: integer('subscription_id').notNull().references(() => merchantSubscriptions.id),
  storeId: integer('store_id').notNull().references(() => stores.id),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  vatAmount: decimal('vat_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  billingPeriod: varchar('billing_period', { length: 20 }),
  dueDate: timestamp('due_date'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
