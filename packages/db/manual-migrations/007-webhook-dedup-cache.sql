-- P2-Idempotency-B: Extended webhook deduplication cache
-- Prevents duplicate webhook processing for providers without Idempotency-Key header
--
-- Strategy: Store (provider + signature + body_hash) as dedup key with 24h TTL
-- Allows automatic cleanup of old entries via TTL-based delete

CREATE TABLE IF NOT EXISTS webhook_dedup_cache (
  id BIGSERIAL PRIMARY KEY,
  dedup_key VARCHAR(255) NOT NULL UNIQUE, -- (provider:signature:body_hash)
  provider VARCHAR(50) NOT NULL,           -- e.g., 'moyasar', 'oto', 'smsa'
  signature VARCHAR(500) NOT NULL,         -- webhook signature/token
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL            -- TTL: delete after 24h
);

-- Indexes for fast lookup and cleanup
CREATE INDEX IF NOT EXISTS webhook_dedup_cache_provider_idx
  ON webhook_dedup_cache(provider, created_at DESC);

CREATE INDEX IF NOT EXISTS webhook_dedup_cache_expires_idx
  ON webhook_dedup_cache(expires_at)
  WHERE expires_at <= NOW();

-- Optional: Add partitioning by provider for very high-volume webhooks
-- ALTER TABLE webhook_dedup_cache PARTITION BY LIST (provider);
--
-- Or enable automatic old-record cleanup via pg_cron:
-- SELECT cron.schedule('webhook-dedup-cleanup', '0 * * * *',
--   'DELETE FROM webhook_dedup_cache WHERE expires_at <= NOW()');
