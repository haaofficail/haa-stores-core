CREATE TABLE IF NOT EXISTS merchant_acknowledgements (
  id SERIAL PRIMARY KEY,
  merchant_user_id INTEGER NOT NULL,
  store_id INTEGER NOT NULL,
  terms_version VARCHAR(20) NOT NULL,
  privacy_version VARCHAR(20) NOT NULL,
  data_processing_version VARCHAR(20) NOT NULL,
  prohibited_products_version VARCHAR(20) NOT NULL,
  takedown_policy_version VARCHAR(20) NOT NULL,
  acknowledged_items JSONB NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  accepted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_merchant_ack_store ON merchant_acknowledgements(store_id);
CREATE INDEX idx_merchant_ack_user ON merchant_acknowledgements(merchant_user_id);
