CREATE TABLE IF NOT EXISTS settlement_batches (
  id serial PRIMARY KEY,
  provider varchar(50) NOT NULL DEFAULT 'geidea',
  provider_batch_id varchar(255),
  currency varchar(3) NOT NULL DEFAULT 'SAR',
  gross_amount decimal(14, 2) NOT NULL DEFAULT '0',
  gateway_fees decimal(14, 2) NOT NULL DEFAULT '0',
  platform_fees decimal(14, 2) NOT NULL DEFAULT '0',
  merchant_payable decimal(14, 2) NOT NULL DEFAULT '0',
  status varchar(30) NOT NULL DEFAULT 'pending',
  reconciled_at timestamp,
  metadata jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_provider_transactions (
  id serial PRIMARY KEY,
  store_id integer NOT NULL REFERENCES stores(id),
  settlement_batch_id integer REFERENCES settlement_batches(id),
  provider varchar(50) NOT NULL DEFAULT 'geidea',
  provider_transaction_id varchar(255) NOT NULL,
  order_id integer,
  order_number varchar(50),
  amount decimal(14, 2) NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'SAR',
  gateway_fees decimal(14, 2) NOT NULL DEFAULT '0',
  platform_fees decimal(14, 2) NOT NULL DEFAULT '0',
  merchant_payable decimal(14, 2) NOT NULL DEFAULT '0',
  status varchar(30) NOT NULL DEFAULT 'pending',
  reconciliation_status varchar(30) NOT NULL DEFAULT 'unmatched',
  metadata jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payout_requests (
  id serial PRIMARY KEY,
  store_id integer NOT NULL REFERENCES stores(id),
  wallet_account_id integer NOT NULL REFERENCES wallet_accounts(id),
  amount decimal(14, 2) NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'SAR',
  status varchar(30) NOT NULL DEFAULT 'pending',
  reference varchar(100) NOT NULL,
  bank_account_id integer,
  failure_reason text,
  metadata jsonb,
  requested_at timestamp NOT NULL DEFAULT now(),
  processed_at timestamp,
  paid_at timestamp,
  failed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wallet_settlement_readiness (
  id serial PRIMARY KEY,
  store_id integer REFERENCES stores(id),
  funds_model varchar(80) NOT NULL DEFAULT 'platform_collects_and_settles',
  safeguarded_account_configured boolean NOT NULL DEFAULT false,
  psp_settlement_partner_confirmed boolean NOT NULL DEFAULT false,
  merchant_of_record_confirmed boolean NOT NULL DEFAULT false,
  sama_compliance_status varchar(40) NOT NULL DEFAULT 'unconfirmed',
  live_payout_enabled boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS settlement_batches_provider_batch_idx ON settlement_batches(provider, provider_batch_id);
CREATE INDEX IF NOT EXISTS settlement_batches_status_idx ON settlement_batches(status);
CREATE INDEX IF NOT EXISTS payment_provider_transactions_store_provider_idx ON payment_provider_transactions(store_id, provider, provider_transaction_id);
CREATE INDEX IF NOT EXISTS payment_provider_transactions_store_reconciliation_idx ON payment_provider_transactions(store_id, reconciliation_status);
CREATE INDEX IF NOT EXISTS payout_requests_store_status_idx ON payout_requests(store_id, status);
CREATE INDEX IF NOT EXISTS payout_requests_reference_idx ON payout_requests(reference);
CREATE INDEX IF NOT EXISTS wallet_settlement_readiness_store_idx ON wallet_settlement_readiness(store_id);
