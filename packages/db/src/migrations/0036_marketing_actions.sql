-- Marketing Action Center tables
-- Created: 2025-06-14

-- marketing_action_settings table
CREATE TABLE IF NOT EXISTS marketing_action_settings (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  key VARCHAR(100) NOT NULL,
  value_json JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS marketing_action_settings_store_key_unique 
  ON marketing_action_settings (store_id, key);

CREATE INDEX IF NOT EXISTS marketing_action_settings_store_id_idx 
  ON marketing_action_settings (store_id);

-- marketing_action_states table
CREATE TABLE IF NOT EXISTS marketing_action_states (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  action_fingerprint VARCHAR(255) NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  snoozed_until TIMESTAMP,
  dismissed_at TIMESTAMP,
  done_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS marketing_action_states_store_fingerprint_unique 
  ON marketing_action_states (store_id, action_fingerprint);

CREATE INDEX IF NOT EXISTS marketing_action_states_store_id_idx 
  ON marketing_action_states (store_id);

CREATE INDEX IF NOT EXISTS marketing_action_states_status_idx 
  ON marketing_action_states (status);

CREATE INDEX IF NOT EXISTS marketing_action_states_fingerprint_idx 
  ON marketing_action_states (action_fingerprint);

-- marketing_action_logs table
CREATE TABLE IF NOT EXISTS marketing_action_logs (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  action_id INTEGER REFERENCES marketing_action_states(id) ON DELETE SET NULL,
  action_fingerprint VARCHAR(255) NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  event VARCHAR(50) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS marketing_action_logs_store_id_idx 
  ON marketing_action_logs (store_id);

CREATE INDEX IF NOT EXISTS marketing_action_logs_action_id_idx 
  ON marketing_action_logs (action_id);

CREATE INDEX IF NOT EXISTS marketing_action_logs_fingerprint_idx 
  ON marketing_action_logs (action_fingerprint);

CREATE INDEX IF NOT EXISTS marketing_action_logs_created_at_idx 
  ON marketing_action_logs (created_at);