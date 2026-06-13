ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

-- Add a comment to document the purpose
COMMENT ON COLUMN users.token_version IS 'Version number used for JWT token revocation. Incremented on logout to invalidate all existing tokens.';
