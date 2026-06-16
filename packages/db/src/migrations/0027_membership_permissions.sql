CREATE TABLE IF NOT EXISTS membership_permissions (
  id SERIAL PRIMARY KEY,
  membership_id INTEGER NOT NULL REFERENCES tenant_users(id),
  permission_key VARCHAR(100) NOT NULL,
  scope_type VARCHAR(20) NOT NULL DEFAULT 'store',
  scope_id INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by_user_id INTEGER
);

CREATE INDEX IF NOT EXISTS idx_membership_permissions_membership_id ON membership_permissions(membership_id);
CREATE INDEX IF NOT EXISTS idx_membership_permissions_permission_key ON membership_permissions(permission_key);

-- Unique constraint on membership_id + permission_key + scope_type + scope_id
-- For store scope (scope_id is NULL), we need a partial unique index
-- Since Postgres treats NULL != NULL, we create two indexes:
-- 1. For non-NULL scope_id
-- 2. For NULL scope_id (store scope)

CREATE UNIQUE INDEX IF NOT EXISTS uq_membership_permissions_store 
  ON membership_permissions (membership_id, permission_key, scope_type) 
  WHERE scope_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_membership_permissions_scoped 
  ON membership_permissions (membership_id, permission_key, scope_type, scope_id) 
  WHERE scope_id IS NOT NULL;