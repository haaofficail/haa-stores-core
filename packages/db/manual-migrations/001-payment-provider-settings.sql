-- Manual migration: Add merchant payment provider settings and credentials tables
-- Phase 2 — Tabby & Tamara BNPL integration
-- Applied: 2026-06 (via psql)
-- 
-- Usage:
--   psql -U <user> -d <database> -f 001-payment-provider-settings.sql
-- Or copy-paste into psql shell.

-- Table: merchant_payment_provider_settings
-- Stores per-store configuration for each BNPL payment provider.
CREATE TABLE IF NOT EXISTS merchant_payment_provider_settings (
    id              SERIAL PRIMARY KEY,
    store_id        INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    provider_code   VARCHAR(20) NOT NULL,
    enabled         BOOLEAN NOT NULL DEFAULT FALSE,
    mode            VARCHAR(10) NOT NULL DEFAULT 'test',
    country         VARCHAR(3) NOT NULL DEFAULT 'SA',
    currency        VARCHAR(3) NOT NULL DEFAULT 'SAR',
    display_name_ar VARCHAR(100),
    display_name_en VARCHAR(100),
    sort_order      INTEGER NOT NULL DEFAULT 0,
    min_order_amount DECIMAL(12, 2),
    max_order_amount DECIMAL(12, 2),
    supported_payment_method VARCHAR(50) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'not_configured',
    last_validated_at TIMESTAMP,
    last_validation_error TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_payment_settings_store_provider UNIQUE (store_id, provider_code)
);

-- Table: merchant_payment_provider_credentials
-- Stores encrypted credentials per provider per store.
-- Secrets are encrypted with AES-256-GCM; never stored as plaintext.
CREATE TABLE IF NOT EXISTS merchant_payment_provider_credentials (
    id              SERIAL PRIMARY KEY,
    store_id        INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    provider_code   VARCHAR(20) NOT NULL,
    encrypted_payload TEXT NOT NULL,
    key_version     VARCHAR(20) NOT NULL DEFAULT 'v1',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    rotated_at      TIMESTAMP,
    CONSTRAINT uq_payment_creds_store_provider UNIQUE (store_id, provider_code)
);
