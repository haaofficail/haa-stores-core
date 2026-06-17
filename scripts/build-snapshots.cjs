#!/usr/bin/env node
// scripts/build-snapshots.cjs
//
// Drizzle-kit snapshot synthesis for haa-stores-core.
//
// WORKAROUND for the "SyntaxError: Unexpected token Bud1" bug:
// When the migration journal has entries whose *_snapshot.json is missing,
// drizzle-kit's prepareMigrationFolder crashes on validation.
//
// This script deep-clones the previous valid snapshot and applies the
// minimal schema deltas for the missing migrations so the chain is
// complete and drizzle-kit can run normally.
//
// USAGE:  node scripts/build-snapshots.cjs
// SAFE:   Idempotent. Won't overwrite an existing snapshot.
//
// See: memory/drizzle-migration-snapshots.md for the full background.

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'packages', 'db', 'src', 'migrations');
const META_DIR = path.join(MIGRATIONS_DIR, 'meta');
const JOURNAL_PATH = path.join(META_DIR, '_journal.json');

// =============================================================================
// SCHEMA DELTAS — explicit per-migration mutations applied on top of the
// previous snapshot to produce the next one.
//
// Each delta is a function (snap) => void that mutates the snapshot.
// The deltas are sourced directly from the corresponding SQL files.
// To add a new migration: write its delta here AND commit the SQL file.
// =============================================================================

const SCHEMA_DELTAS = {
  // ── 0003: coupons table — add name/description/max_discount_amount
  '0003': (snap) => {
    const coupons = snap.tables['public.coupons'];
    if (coupons) {
      coupons.columns['name'] = { name: 'name', type: 'varchar(255)', primaryKey: false, notNull: true, default: "''" };
      coupons.columns['description'] = { name: 'description', type: 'text', primaryKey: false, notNull: false };
      coupons.columns['max_discount_amount'] = { name: 'max_discount_amount', type: 'numeric(12, 2)', primaryKey: false, notNull: false };
    }
  },

  // ── 0017: store_settings — add theme_config jsonb
  '0017': (snap) => {
    const ss = snap.tables['public.store_settings'];
    if (ss) {
      ss.columns['theme_config'] = { name: 'theme_config', type: 'jsonb', primaryKey: false, notNull: false };
    }
  },

  // ── 0020: gifts + pickup + fulfillment
  '0020': (snap) => {
    const products = snap.tables['public.products'];
    const storeSettings = snap.tables['public.store_settings'];
    const orders = snap.tables['public.orders'];
    const orderItems = snap.tables['public.order_items'];
    if (products) {
      products.columns['gift_wrap_available'] = { name: 'gift_wrap_available', type: 'boolean', primaryKey: false, notNull: true, default: 'false' };
      products.columns['gift_wrap_price_override'] = { name: 'gift_wrap_price_override', type: 'numeric(12, 2)', primaryKey: false, notNull: false };
    }
    if (storeSettings) {
      storeSettings.columns['gift_wrap_default_price'] = { name: 'gift_wrap_default_price', type: 'numeric(12, 2)', primaryKey: false, notNull: false, default: "'0'" };
      storeSettings.columns['gift_message_max_length'] = { name: 'gift_message_max_length', type: 'integer', primaryKey: false, notNull: false, default: '250' };
      storeSettings.columns['gift_wrap_instructions'] = { name: 'gift_wrap_instructions', type: 'text', primaryKey: false, notNull: false };
      storeSettings.columns['pickup_instructions'] = { name: 'pickup_instructions', type: 'text', primaryKey: false, notNull: false };
    }
    if (orders) {
      orders.columns['fulfillment_type'] = { name: 'fulfillment_type', type: 'varchar(20)', primaryKey: false, notNull: false, default: "'shipping'" };
      orders.columns['pickup_location_id'] = { name: 'pickup_location_id', type: 'integer', primaryKey: false, notNull: false };
      orders.columns['gift_options'] = { name: 'gift_options', type: 'jsonb', primaryKey: false, notNull: false };
    }
    if (orderItems) {
      orderItems.columns['gift_wrap_selected'] = { name: 'gift_wrap_selected', type: 'boolean', primaryKey: false, notNull: false, default: 'false' };
      orderItems.columns['gift_wrap_price'] = { name: 'gift_wrap_price', type: 'numeric(12, 2)', primaryKey: false, notNull: false };
      orderItems.columns['send_as_gift'] = { name: 'send_as_gift', type: 'boolean', primaryKey: false, notNull: false, default: 'false' };
      orderItems.columns['gift_message'] = { name: 'gift_message', type: 'text', primaryKey: false, notNull: false };
    }
    // New table: pickup_locations
    snap.tables['public.pickup_locations'] = {
      name: 'pickup_locations',
      schema: 'public',
      columns: {
        id: { name: 'id', type: 'serial', primaryKey: true, notNull: true },
        store_id: { name: 'store_id', type: 'integer', primaryKey: false, notNull: true },
        name: { name: 'name', type: 'varchar(255)', primaryKey: false, notNull: true },
        address: { name: 'address', type: 'text', primaryKey: false, notNull: true },
        city: { name: 'city', type: 'varchar(100)', primaryKey: false, notNull: true },
        phone: { name: 'phone', type: 'varchar(20)', primaryKey: false, notNull: false },
        maps_url: { name: 'maps_url', type: 'text', primaryKey: false, notNull: false },
        hours: { name: 'hours', type: 'text', primaryKey: false, notNull: false },
        is_active: { name: 'is_active', type: 'boolean', primaryKey: false, notNull: true, default: 'true' },
        sort_order: { name: 'sort_order', type: 'integer', primaryKey: false, notNull: true, default: '0' },
        created_at: { name: 'created_at', type: 'timestamp', primaryKey: false, notNull: true, default: 'now()' },
        updated_at: { name: 'updated_at', type: 'timestamp', primaryKey: false, notNull: true, default: 'now()' },
      },
      indexes: {},
      foreignKeys: {},
      compositePrimaryKeys: {},
      uniqueConstraints: {},
      policies: {},
      checkConstraints: {},
      isRLSEnabled: false,
    };
  },

  // ── 0021: shipping_methods — add config jsonb
  '0021': (snap) => {
    const sm = snap.tables['public.shipping_methods'];
    if (sm) {
      sm.columns['config'] = { name: 'config', type: 'jsonb', primaryKey: false, notNull: false };
    }
  },

  // ── 0022: cart_items — gift columns
  '0022': (snap) => {
    const ci = snap.tables['public.cart_items'];
    if (ci) {
      ci.columns['gift_wrap_selected'] = { name: 'gift_wrap_selected', type: 'boolean', primaryKey: false, notNull: true, default: 'false' };
      ci.columns['gift_wrap_price'] = { name: 'gift_wrap_price', type: 'numeric(12, 2)', primaryKey: false, notNull: false };
      ci.columns['send_as_gift'] = { name: 'send_as_gift', type: 'boolean', primaryKey: false, notNull: true, default: 'false' };
      ci.columns['gift_message'] = { name: 'gift_message', type: 'varchar(1000)', primaryKey: false, notNull: false };
    }
  },

  // ── 0023: pickup_locations — add phone
  '0023': (snap) => {
    const pl = snap.tables['public.pickup_locations'];
    if (pl) {
      pl.columns['phone'] = { name: 'phone', type: 'varchar(20)', primaryKey: false, notNull: false };
    }
  },

  // ── 0024: product_variants — add is_active
  '0024': (snap) => {
    const pv = snap.tables['public.product_variants'];
    if (pv) {
      pv.columns['is_active'] = { name: 'is_active', type: 'boolean', primaryKey: false, notNull: true, default: 'true' };
    }
  },

  // ── 0027: users — add token_version (used twice in journal; same delta)
  '0027': (snap) => {
    const users = snap.tables['public.users'];
    if (users) {
      users.columns['token_version'] = { name: 'token_version', type: 'integer', primaryKey: false, notNull: true, default: '0' };
    }
  },

  // ── 0031: payout_requests — workflow columns
  '0031': (snap) => {
    const pr = snap.tables['public.payout_requests'];
    if (pr) {
      pr.columns['requested_by_user_id'] = { name: 'requested_by_user_id', type: 'integer', primaryKey: false, notNull: false };
      pr.columns['reviewed_by_user_id'] = { name: 'reviewed_by_user_id', type: 'integer', primaryKey: false, notNull: false };
      pr.columns['approved_by_user_id'] = { name: 'approved_by_user_id', type: 'integer', primaryKey: false, notNull: false };
      pr.columns['transferred_by_user_id'] = { name: 'transferred_by_user_id', type: 'integer', primaryKey: false, notNull: false };
      pr.columns['verified_by_user_id'] = { name: 'verified_by_user_id', type: 'integer', primaryKey: false, notNull: false };
      pr.columns['rejected_by_user_id'] = { name: 'rejected_by_user_id', type: 'integer', primaryKey: false, notNull: false };
      pr.columns['rejection_reason'] = { name: 'rejection_reason', type: 'text', primaryKey: false, notNull: false };
      pr.columns['internal_notes'] = { name: 'internal_notes', type: 'text', primaryKey: false, notNull: false };
      pr.columns['public_notes'] = { name: 'public_notes', type: 'text', primaryKey: false, notNull: false };
      pr.columns['reviewed_at'] = { name: 'reviewed_at', type: 'timestamp', primaryKey: false, notNull: false };
      pr.columns['approved_at'] = { name: 'approved_at', type: 'timestamp', primaryKey: false, notNull: false };
      pr.columns['transferred_at'] = { name: 'transferred_at', type: 'timestamp', primaryKey: false, notNull: false };
      pr.columns['verified_at'] = { name: 'verified_at', type: 'timestamp', primaryKey: false, notNull: false };
    }
  },

  // ── 0032: cart_items — fix FK from products → product_variants
  // (FK rename only; column structure unchanged)
  '0032': (snap) => {
    const ci = snap.tables['public.cart_items'];
    if (ci && ci.foreignKeys) {
      // Remove the old FK name if present; add the corrected one
      delete ci.foreignKeys['cart_items_variant_id_products_id_fk'];
      ci.foreignKeys['cart_items_variant_id_product_variants_id_fk'] = {
        name: 'cart_items_variant_id_product_variants_id_fk',
        tableFrom: 'cart_items',       // STRING format, not array
        columnsFrom: ['variant_id'],
        tableTo: 'product_variants',
        columnsTo: ['id'],
        onUpdate: 'no action',
        onDelete: 'no action',
      };
    }
  },

  // ── 0033: Haa marketplace — products + orders + order_items
  '0033': (snap) => {
    const products = snap.tables['public.products'];
    const orders = snap.tables['public.orders'];
    const orderItems = snap.tables['public.order_items'];
    if (products) {
      products.columns['haa_marketplace_enabled'] = { name: 'haa_marketplace_enabled', type: 'boolean', primaryKey: false, notNull: true, default: 'false' };
      products.columns['haa_marketplace_commission_rate'] = { name: 'haa_marketplace_commission_rate', type: 'numeric(5, 4)', primaryKey: false, notNull: true, default: '0.0500' };
    }
    if (orders) {
      orders.columns['platform_commission'] = { name: 'platform_commission', type: 'numeric(12, 2)', primaryKey: false, notNull: false };
    }
    if (orderItems) {
      orderItems.columns['source'] = { name: 'source', type: 'varchar(30)', primaryKey: false, notNull: true, default: "'storefront'" };
      orderItems.columns['platform_commission_rate'] = { name: 'platform_commission_rate', type: 'numeric(5, 4)', primaryKey: false, notNull: false };
      orderItems.columns['platform_commission'] = { name: 'platform_commission', type: 'numeric(12, 2)', primaryKey: false, notNull: false };
    }
  },

  // ── 0034: marketplace_orders + marketplace_order_links (new tables)
  '0034': (snap) => {
    snap.tables['public.marketplace_orders'] = {
      name: 'marketplace_orders',
      schema: 'public',
      columns: {
        id: { name: 'id', type: 'serial', primaryKey: true, notNull: true },
        marketplace_order_number: { name: 'marketplace_order_number', type: 'varchar(50)', primaryKey: false, notNull: true },
        status: { name: 'status', type: 'varchar(30)', primaryKey: false, notNull: true, default: "'created'" },
        payment_status: { name: 'payment_status', type: 'varchar(30)', primaryKey: false, notNull: true, default: "'unpaid'" },
        fulfillment_status: { name: 'fulfillment_status', type: 'varchar(30)', primaryKey: false, notNull: true, default: "'unfulfilled'" },
        customer_name: { name: 'customer_name', type: 'varchar(100)', primaryKey: false, notNull: true },
        customer_phone: { name: 'customer_phone', type: 'varchar(20)', primaryKey: false, notNull: true },
        customer_email: { name: 'customer_email', type: 'varchar(255)', primaryKey: false, notNull: false },
        shipping_address: { name: 'shipping_address', type: 'jsonb', primaryKey: false, notNull: false },
        subtotal: { name: 'subtotal', type: 'numeric(12, 2)', primaryKey: false, notNull: true },
        shipping_total: { name: 'shipping_total', type: 'numeric(12, 2)', primaryKey: false, notNull: true, default: '0' },
        total: { name: 'total', type: 'numeric(12, 2)', primaryKey: false, notNull: true },
        platform_commission: { name: 'platform_commission', type: 'numeric(12, 2)', primaryKey: false, notNull: true, default: '0' },
        payment_method: { name: 'payment_method', type: 'varchar(50)', primaryKey: false, notNull: false },
        created_at: { name: 'created_at', type: 'timestamp', primaryKey: false, notNull: true, default: 'now()' },
        updated_at: { name: 'updated_at', type: 'timestamp', primaryKey: false, notNull: true, default: 'now()' },
      },
      indexes: {
        marketplace_orders_marketplace_order_number_unique: {
          name: 'marketplace_orders_marketplace_order_number_unique',
          columns: ['marketplace_order_number'],
          isUnique: true,
        },
      },
      foreignKeys: {},
      compositePrimaryKeys: {},
      uniqueConstraints: {
        marketplace_orders_marketplace_order_number_unique: {
          name: 'marketplace_orders_marketplace_order_number_unique',
          columns: ['marketplace_order_number'],
        },
      },
      policies: {},
      checkConstraints: {},
      isRLSEnabled: false,
    };
    snap.tables['public.marketplace_order_links'] = {
      name: 'marketplace_order_links',
      schema: 'public',
      columns: {
        id: { name: 'id', type: 'serial', primaryKey: true, notNull: true },
        marketplace_order_id: { name: 'marketplace_order_id', type: 'integer', primaryKey: false, notNull: true },
        merchant_order_id: { name: 'merchant_order_id', type: 'integer', primaryKey: false, notNull: true },
        merchant_store_id: { name: 'merchant_store_id', type: 'integer', primaryKey: false, notNull: true },
        created_at: { name: 'created_at', type: 'timestamp', primaryKey: false, notNull: true, default: 'now()' },
      },
      indexes: {},
      foreignKeys: {},
      compositePrimaryKeys: {},
      uniqueConstraints: {},
      policies: {},
      checkConstraints: {},
      isRLSEnabled: false,
    };
  },

  // ── 0035: marketplace governance — products add review + featured columns
  '0035': (snap) => {
    const products = snap.tables['public.products'];
    if (products) {
      products.columns['haa_marketplace_review_status'] = { name: 'haa_marketplace_review_status', type: 'varchar(30)', primaryKey: false, notNull: true, default: "'pending'" };
      products.columns['haa_marketplace_review_note'] = { name: 'haa_marketplace_review_note', type: 'text', primaryKey: false, notNull: false };
      products.columns['haa_marketplace_reviewed_at'] = { name: 'haa_marketplace_reviewed_at', type: 'timestamp', primaryKey: false, notNull: false };
      products.columns['haa_marketplace_reviewed_by'] = { name: 'haa_marketplace_reviewed_by', type: 'integer', primaryKey: false, notNull: false };
      products.columns['haa_marketplace_featured'] = { name: 'haa_marketplace_featured', type: 'boolean', primaryKey: false, notNull: true, default: 'false' };
      products.columns['haa_marketplace_featured_until'] = { name: 'haa_marketplace_featured_until', type: 'timestamp', primaryKey: false, notNull: false };
      products.columns['haa_marketplace_featured_sort_order'] = { name: 'haa_marketplace_featured_sort_order', type: 'integer', primaryKey: false, notNull: true, default: '0' };
    }
  },

  // ── 0036: marketing_action_settings + marketing_actions (new tables)
  '0036': (snap) => {
    snap.tables['public.marketing_action_settings'] = {
      name: 'marketing_action_settings',
      schema: 'public',
      columns: {
        id: { name: 'id', type: 'serial', primaryKey: true, notNull: true },
        store_id: { name: 'store_id', type: 'integer', primaryKey: false, notNull: true },
        key: { name: 'key', type: 'varchar(100)', primaryKey: false, notNull: true },
        value_json: { name: 'value_json', type: 'jsonb', primaryKey: false, notNull: true },
        created_at: { name: 'created_at', type: 'timestamp', primaryKey: false, notNull: true, default: 'now()' },
        updated_at: { name: 'updated_at', type: 'timestamp', primaryKey: false, notNull: true, default: 'now()' },
      },
      indexes: {},
      foreignKeys: {
        marketing_action_settings_store_id_stores_id_fk: {
          name: 'marketing_action_settings_store_id_stores_id_fk',
          tableFrom: 'marketing_action_settings',  // STRING format
          columnsFrom: ['store_id'],
          tableTo: 'stores',
          columnsTo: ['id'],
          onUpdate: 'no action',
          onDelete: 'cascade',
        },
      },
      compositePrimaryKeys: {},
      uniqueConstraints: {
        marketing_action_settings_store_key_unique: {
          name: 'marketing_action_settings_store_key_unique',
          columns: ['store_id', 'key'],
        },
      },
      policies: {},
      checkConstraints: {},
      isRLSEnabled: false,
    };
    snap.tables['public.marketing_actions'] = {
      name: 'marketing_actions',
      schema: 'public',
      columns: {
        id: { name: 'id', type: 'serial', primaryKey: true, notNull: true },
        store_id: { name: 'store_id', type: 'integer', primaryKey: false, notNull: true },
        action_type: { name: 'action_type', type: 'varchar(50)', primaryKey: false, notNull: true },
        title: { name: 'title', type: 'varchar(255)', primaryKey: false, notNull: true },
        description: { name: 'description', type: 'text', primaryKey: false, notNull: false },
        priority: { name: 'priority', type: 'varchar(20)', primaryKey: false, notNull: true, default: "'medium'" },
        status: { name: 'status', type: 'varchar(30)', primaryKey: false, notNull: true, default: "'pending'" },
        action_data: { name: 'action_data', type: 'jsonb', primaryKey: false, notNull: false },
        expires_at: { name: 'expires_at', type: 'timestamp', primaryKey: false, notNull: false },
        completed_at: { name: 'completed_at', type: 'timestamp', primaryKey: false, notNull: false },
        created_at: { name: 'created_at', type: 'timestamp', primaryKey: false, notNull: true, default: 'now()' },
        updated_at: { name: 'updated_at', type: 'timestamp', primaryKey: false, notNull: true, default: 'now()' },
      },
      indexes: {},
      foreignKeys: {},
      compositePrimaryKeys: {},
      uniqueConstraints: {},
      policies: {},
      checkConstraints: {},
      isRLSEnabled: false,
    };
  },

  // ── 0037: marketing_events + marketing_sessions + product_performance_daily (repair migration)
  '0037': (snap) => {
    snap.tables['public.marketing_events'] = {
      name: 'marketing_events',
      schema: 'public',
      columns: {
        id: { name: 'id', type: 'serial', primaryKey: true, notNull: true },
        store_id: { name: 'store_id', type: 'integer', primaryKey: false, notNull: true },
        event_type: { name: 'event_type', type: 'varchar(50)', primaryKey: false, notNull: true },
        session_id: { name: 'session_id', type: 'varchar(255)', primaryKey: false, notNull: true },
        customer_id: { name: 'customer_id', type: 'integer', primaryKey: false, notNull: false },
        product_id: { name: 'product_id', type: 'integer', primaryKey: false, notNull: false },
        cart_id: { name: 'cart_id', type: 'uuid', primaryKey: false, notNull: false },
        order_id: { name: 'order_id', type: 'integer', primaryKey: false, notNull: false },
        path: { name: 'path', type: 'text', primaryKey: false, notNull: false },
        referrer: { name: 'referrer', type: 'text', primaryKey: false, notNull: false },
        device_type: { name: 'device_type', type: 'varchar(50)', primaryKey: false, notNull: false },
        user_agent: { name: 'user_agent', type: 'text', primaryKey: false, notNull: false },
        ip_address: { name: 'ip_address', type: 'varchar(45)', primaryKey: false, notNull: false },
        utm_source: { name: 'utm_source', type: 'varchar(255)', primaryKey: false, notNull: false },
        utm_medium: { name: 'utm_medium', type: 'varchar(255)', primaryKey: false, notNull: false },
        utm_campaign: { name: 'utm_campaign', type: 'varchar(255)', primaryKey: false, notNull: false },
        metadata: { name: 'metadata', type: 'jsonb', primaryKey: false, notNull: false },
        created_at: { name: 'created_at', type: 'timestamp', primaryKey: false, notNull: true, default: 'now()' },
      },
      indexes: {},
      foreignKeys: {
        marketing_events_store_id_stores_id_fk: {
          name: 'marketing_events_store_id_stores_id_fk',
          tableFrom: 'marketing_events',  // STRING format
          columnsFrom: ['store_id'],
          tableTo: 'stores',
          columnsTo: ['id'],
          onUpdate: 'no action',
          onDelete: 'cascade',
        },
      },
      compositePrimaryKeys: {},
      uniqueConstraints: {},
      policies: {},
      checkConstraints: {},
      isRLSEnabled: false,
    };
    snap.tables['public.marketing_sessions'] = {
      name: 'marketing_sessions',
      schema: 'public',
      columns: {
        id: { name: 'id', type: 'serial', primaryKey: true, notNull: true },
        store_id: { name: 'store_id', type: 'integer', primaryKey: false, notNull: true },
        session_id: { name: 'session_id', type: 'varchar(255)', primaryKey: false, notNull: true },
        customer_id: { name: 'customer_id', type: 'integer', primaryKey: false, notNull: false },
        first_seen_at: { name: 'first_seen_at', type: 'timestamp', primaryKey: false, notNull: true, default: 'now()' },
        last_seen_at: { name: 'last_seen_at', type: 'timestamp', primaryKey: false, notNull: true, default: 'now()' },
        event_count: { name: 'event_count', type: 'integer', primaryKey: false, notNull: true, default: '0' },
        converted: { name: 'converted', type: 'boolean', primaryKey: false, notNull: true, default: 'false' },
        order_id: { name: 'order_id', type: 'integer', primaryKey: false, notNull: false },
        total_value: { name: 'total_value', type: 'numeric(12, 2)', primaryKey: false, notNull: false },
      },
      indexes: {},
      foreignKeys: {},
      compositePrimaryKeys: {},
      uniqueConstraints: {},
      policies: {},
      checkConstraints: {},
      isRLSEnabled: false,
    };
    snap.tables['public.product_performance_daily'] = {
      name: 'product_performance_daily',
      schema: 'public',
      columns: {
        id: { name: 'id', type: 'serial', primaryKey: true, notNull: true },
        store_id: { name: 'store_id', type: 'integer', primaryKey: false, notNull: true },
        product_id: { name: 'product_id', type: 'integer', primaryKey: false, notNull: true },
        date: { name: 'date', type: 'date', primaryKey: false, notNull: true },
        views: { name: 'views', type: 'integer', primaryKey: false, notNull: true, default: '0' },
        add_to_cart: { name: 'add_to_cart', type: 'integer', primaryKey: false, notNull: true, default: '0' },
        purchases: { name: 'purchases', type: 'integer', primaryKey: false, notNull: true, default: '0' },
        revenue: { name: 'revenue', type: 'numeric(12, 2)', primaryKey: false, notNull: true, default: '0' },
        created_at: { name: 'created_at', type: 'timestamp', primaryKey: false, notNull: true, default: 'now()' },
        updated_at: { name: 'updated_at', type: 'timestamp', primaryKey: false, notNull: true, default: 'now()' },
      },
      indexes: {},
      foreignKeys: {},
      compositePrimaryKeys: {},
      uniqueConstraints: {},
      policies: {},
      checkConstraints: {},
      isRLSEnabled: false,
    };
  },

  // ── 0038: products add rating/review_count/sales_count
  '0038': (snap) => {
    const products = snap.tables['public.products'];
    if (products) {
      products.columns['rating'] = { name: 'rating', type: 'integer', primaryKey: false, notNull: false };
      products.columns['review_count'] = { name: 'review_count', type: 'integer', primaryKey: false, notNull: true, default: '0' };
      products.columns['sales_count'] = { name: 'sales_count', type: 'integer', primaryKey: false, notNull: true, default: '0' };
    }
  },

  // ── 0039: knowledge_base_articles (repair migration for support KB)
  '0039': (snap) => {
    snap.tables['public.knowledge_base_articles'] = {
      name: 'knowledge_base_articles',
      schema: 'public',
      columns: {
        id: { name: 'id', type: 'serial', primaryKey: true, notNull: true },
        store_id: { name: 'store_id', type: 'integer', primaryKey: false, notNull: true },
        title: { name: 'title', type: 'varchar(500)', primaryKey: false, notNull: true },
        slug: { name: 'slug', type: 'varchar(500)', primaryKey: false, notNull: true },
        content: { name: 'content', type: 'text', primaryKey: false, notNull: true },
        category: { name: 'category', type: 'varchar(100)', primaryKey: false, notNull: false },
        is_published: { name: 'is_published', type: 'boolean', primaryKey: false, notNull: true, default: 'false' },
        sort_order: { name: 'sort_order', type: 'integer', primaryKey: false, notNull: true, default: '0' },
        created_at: { name: 'created_at', type: 'timestamp', primaryKey: false, notNull: true, default: 'now()' },
        updated_at: { name: 'updated_at', type: 'timestamp', primaryKey: false, notNull: true, default: 'now()' },
      },
      indexes: {},
      foreignKeys: {},
      compositePrimaryKeys: {},
      uniqueConstraints: {},
      policies: {},
      checkConstraints: {},
      isRLSEnabled: false,
    };
  },

  // ── 0047: stores add is_demo
  '0047': (snap) => {
    const stores = snap.tables['public.stores'];
    if (stores) {
      stores.columns['is_demo'] = { name: 'is_demo', type: 'boolean', primaryKey: false, notNull: true, default: 'false' };
    }
  },

  // ── 0048: marketing_action_logs (repair migration)
  '0048': (snap) => {
    snap.tables['public.marketing_action_logs'] = {
      name: 'marketing_action_logs',
      schema: 'public',
      columns: {
        id: { name: 'id', type: 'serial', primaryKey: true, notNull: true },
        store_id: { name: 'store_id', type: 'integer', primaryKey: false, notNull: true },
        action_id: { name: 'action_id', type: 'integer', primaryKey: false, notNull: false },
        event_type: { name: 'event_type', type: 'varchar(50)', primaryKey: false, notNull: true },
        actor_user_id: { name: 'actor_user_id', type: 'integer', primaryKey: false, notNull: false },
        notes: { name: 'notes', type: 'text', primaryKey: false, notNull: false },
        metadata: { name: 'metadata', type: 'jsonb', primaryKey: false, notNull: false },
        created_at: { name: 'created_at', type: 'timestamp', primaryKey: false, notNull: true, default: 'now()' },
      },
      indexes: {},
      foreignKeys: {},
      compositePrimaryKeys: {},
      uniqueConstraints: {},
      policies: {},
      checkConstraints: {},
      isRLSEnabled: false,
    };
  },

  // ── 0049: stores.tenantId FK CASCADE (constraint change, no schema delta)
  '0049': (snap) => {
    const stores = snap.tables['public.stores'];
    if (stores && stores.foreignKeys) {
      const fk = stores.foreignKeys['stores_tenant_id_tenants_id_fk'];
      if (fk) fk.onDelete = 'cascade';
    }
  },

  // ── 0050: store_billing_settings table
  // SQL: CREATE TABLE store_billing_settings (id, store_id, platform_fee_*, is_platform_fee_enabled, ...)
  '0050': (snap) => {
    snap.tables['public.store_billing_settings'] = {
      name: 'store_billing_settings',
      schema: 'public',
      columns: {
        id: { name: 'id', type: 'serial', primaryKey: true, notNull: true },
        store_id: { name: 'store_id', type: 'integer', primaryKey: false, notNull: true },
        platform_fee_mode: { name: 'platform_fee_mode', type: 'varchar(30)', primaryKey: false, notNull: true, default: "'percentage'" },
        platform_fee_pct: { name: 'platform_fee_pct', type: 'numeric(8, 6)', primaryKey: false, notNull: false },
        platform_fee_fixed: { name: 'platform_fee_fixed', type: 'numeric(12, 2)', primaryKey: false, notNull: false },
        is_platform_fee_enabled: { name: 'is_platform_fee_enabled', type: 'boolean', primaryKey: false, notNull: true, default: 'true' },
        effective_from: { name: 'effective_from', type: 'timestamp', primaryKey: false, notNull: false },
        created_at: { name: 'created_at', type: 'timestamp', primaryKey: false, notNull: true, default: 'now()' },
        updated_at: { name: 'updated_at', type: 'timestamp', primaryKey: false, notNull: true, default: 'now()' },
        updated_by: { name: 'updated_by', type: 'integer', primaryKey: false, notNull: false },
        change_reason: { name: 'change_reason', type: 'text', primaryKey: false, notNull: false },
      },
      indexes: {
        store_billing_settings_store_id_unique: {
          name: 'store_billing_settings_store_id_unique',
          columns: ['store_id'],
          isUnique: true,
        },
      },
      foreignKeys: {
        store_billing_settings_store_id_stores_id_fk: {
          name: 'store_billing_settings_store_id_stores_id_fk',
          tableFrom: 'store_billing_settings',  // STRING format
          columnsFrom: ['store_id'],
          tableTo: 'stores',
          columnsTo: ['id'],
          onUpdate: 'no action',
          onDelete: 'no action',
        },
        store_billing_settings_updated_by_users_id_fk: {
          name: 'store_billing_settings_updated_by_users_id_fk',
          tableFrom: 'store_billing_settings',
          columnsFrom: ['updated_by'],
          tableTo: 'users',
          columnsTo: ['id'],
          onUpdate: 'no action',
          onDelete: 'no action',
        },
      },
      compositePrimaryKeys: {},
      uniqueConstraints: {
        store_billing_settings_store_id_unique: {
          name: 'store_billing_settings_store_id_unique',
          columns: ['store_id'],
        },
      },
      policies: {},
      checkConstraints: {},
      isRLSEnabled: false,
    };
  },

  // ── 0051: wallet_entries — fee_rate_pct + fee_fixed + fee_source columns
  '0051': (snap) => {
    const wallet = snap.tables['public.wallet_entries'];
    if (wallet) {
      wallet.columns['fee_rate_pct'] = { name: 'fee_rate_pct', type: 'numeric(8, 6)', primaryKey: false, notNull: false };
      wallet.columns['fee_fixed'] = { name: 'fee_fixed', type: 'numeric(12, 2)', primaryKey: false, notNull: false };
      wallet.columns['fee_source'] = { name: 'fee_source', type: 'varchar(30)', primaryKey: false, notNull: false };
    }
  },

  // ── 0052: store_billing_settings — pct cap CHECK constraint
  '0052': (snap) => {
    const billing = snap.tables['public.store_billing_settings'];
    if (billing) {
      billing.checkConstraints = billing.checkConstraints || {};
      billing.checkConstraints['store_billing_settings_pct_cap'] = {
        name: 'store_billing_settings_pct_cap',
        value: '"platform_fee_pct" IS NULL OR "platform_fee_pct" <= 0.5',
      };
    }
  },

  // ── 0053: store_billing_settings — COD fee columns + cap
  '0053': (snap) => {
    const billing = snap.tables['public.store_billing_settings'];
    if (billing) {
      billing.columns['cod_fee_mode'] = { name: 'cod_fee_mode', type: 'varchar(30)', primaryKey: false, notNull: true, default: "'percentage'" };
      billing.columns['cod_fee_pct'] = { name: 'cod_fee_pct', type: 'numeric(8, 6)', primaryKey: false, notNull: false };
      billing.columns['cod_fee_fixed'] = { name: 'cod_fee_fixed', type: 'numeric(12, 2)', primaryKey: false, notNull: false };
      billing.columns['is_cod_fee_enabled'] = { name: 'is_cod_fee_enabled', type: 'boolean', primaryKey: false, notNull: true, default: 'true' };
      billing.checkConstraints = billing.checkConstraints || {};
      billing.checkConstraints['store_billing_settings_cod_pct_cap'] = {
        name: 'store_billing_settings_cod_pct_cap',
        value: '"cod_fee_pct" IS NULL OR "cod_fee_pct" <= 0.5',
      };
    }
  },
};

function main() {
  const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, 'utf8'));
  const existingSnapshots = new Set(
    fs.readdirSync(META_DIR).filter((f) => f.endsWith('_snapshot.json')),
  );

  const sortedTags = Object.keys(journal.entries.reduce((acc, e) => { acc[e.tag] = true; return acc; }, {})).sort();
  let generated = 0;
  let skipped = 0;

  for (const tag of sortedTags) {
    const shortTag = tag.split('_')[0];
    const snapFile = `${shortTag}_snapshot.json`;
    const snapPath = path.join(META_DIR, snapFile);

    if (existingSnapshots.has(snapFile)) {
      skipped++;
      continue;
    }

    if (!SCHEMA_DELTAS[shortTag]) {
      console.warn(`⚠️  No schema delta defined for ${shortTag}; skipping (${tag})`);
      continue;
    }

    // Find the most recent existing snapshot before this tag
    let prevSnapshot = null;
    let prevTag = null;
    for (let i = sortedTags.indexOf(tag) - 1; i >= 0; i--) {
      const prevShort = sortedTags[i].split('_')[0];
      const prevFile = `${prevShort}_snapshot.json`;
      if (existingSnapshots.has(prevFile)) {
        prevSnapshot = JSON.parse(fs.readFileSync(path.join(META_DIR, prevFile), 'utf8'));
        prevTag = prevShort;
        break;
      }
    }

    if (!prevSnapshot) {
      console.error(`❌ Cannot find a previous snapshot for ${shortTag} (${tag})`);
      process.exit(1);
    }

    // Clone + apply delta
    const newSnap = JSON.parse(JSON.stringify(prevSnapshot));
    newSnap.id = shortTag;
    newSnap.prevId = prevTag;
    newSnap.lastModified = Date.now();

    SCHEMA_DELTAS[shortTag](newSnap);

    fs.writeFileSync(snapPath, JSON.stringify(newSnap, null, 2));
    console.log(`✅ Synthesized ${snapFile} from ${prevTag}_snapshot.json`);
    generated++;
    existingSnapshots.add(snapFile);
  }

  console.log(`\n📊 Summary: ${generated} generated, ${skipped} already existed`);
  if (generated === 0) {
    console.log('✨ Snapshot chain already complete — no synthesis needed.');
  } else {
    console.log('🧪 Run `pnpm --filter @haa/db generate` to verify drizzle-kit works.');
  }
}

main();
