# P2-DB-Connection: Connection Pool Tuning

**Date:** July 2, 2026  
**Status:** AUDIT & CONFIGURATION (No code changes required)

---

## Current Configuration

The database connection pool is already properly tuned via environment variables in `packages/db/src/index.ts`:

```typescript
const max = parseInt(process.env.DATABASE_MAX_CONNECTIONS || "20", 10);
const idleTimeout = parseInt(process.env.DATABASE_IDLE_TIMEOUT || "30000", 10);
const connectTimeout = parseInt(
  process.env.DATABASE_CONNECT_TIMEOUT || "10000",
  10,
);

const client = postgres(connectionString, {
  prepare: false,
  max, // Connection pool size
  idle_timeout: idleTimeout, // Time before idle connection closes (ms)
  connect_timeout: connectTimeout, // Timeout for new connections (ms)
});
```

### Default Values

| Setting                    | Default | Recommended | Notes                                      |
| -------------------------- | ------- | ----------- | ------------------------------------------ |
| `DATABASE_MAX_CONNECTIONS` | 20      | 15–25       | Per instance; total = instances × max      |
| `DATABASE_IDLE_TIMEOUT`    | 30000ms | 30–60s      | Close idle connections after 30–60 seconds |
| `DATABASE_CONNECT_TIMEOUT` | 10000ms | 5–15s       | Timeout for new connection attempts        |

---

## Recommended Deployment Configuration

### Staging (Single instance)

```bash
DATABASE_MAX_CONNECTIONS=20
DATABASE_IDLE_TIMEOUT=30000
DATABASE_CONNECT_TIMEOUT=10000
```

**Rationale:**

- Single instance can maintain 20 connections
- 30s idle timeout prevents connection leak
- 10s connect timeout balances reliability vs latency

### Production (Multi-instance / Load balanced)

```bash
# Per-instance pool size:
# For N instances, total pool = N × DATABASE_MAX_CONNECTIONS
# PostgreSQL default max_connections = 100 (can be increased to 200–500)
# Haa Stores instances: typically 2–4 instances

# Configuration for 3 instances (60 total connections):
DATABASE_MAX_CONNECTIONS=20
DATABASE_IDLE_TIMEOUT=60000
DATABASE_CONNECT_TIMEOUT=10000

# For 4+ instances, reduce per-instance:
DATABASE_MAX_CONNECTIONS=15
DATABASE_IDLE_TIMEOUT=60000
DATABASE_CONNECT_TIMEOUT=10000
```

**Rationale:**

- Longer idle timeout (60s) in production to reduce connection thrashing
- Total connections ≤ PostgreSQL `max_connections` (typically 100–200)
- Per-instance: 15–20 depending on instance count and request volume

---

## Monitoring Checklist

To verify pool health in production, monitor:

1. **Active Connections** (via `pg_stat_activity`):

   ```sql
   SELECT count(*) FROM pg_stat_activity WHERE pid <> pg_backend_pid();
   ```

   Expected: 20–50 total (depending on load and instance count)

2. **Connection Churn** (via logs):
   - Query execution time (should be <100ms for most queries)
   - If many "too many connections" errors → increase pool size or instances
   - If high CPU with low connection count → N+1 queries (use connection count metric)

3. **Pool Exhaustion Symptoms**:
   - Requests timeout waiting for a connection
   - Logs show "Client request slams into LIMIT" (redis or other resource)
   - Response times spike randomly

### Action Plan if Pool is Exhausted

1. Check for N+1 queries: Enable query logging, look for repeated queries in fast succession
2. Increase `DATABASE_MAX_CONNECTIONS` by +5 and monitor impact
3. If still exhausted: Increase instance count and scale horizontally
4. Consider read-only replicas for reporting queries (future enhancement)

---

## Implementation Notes

### Already in Place

✅ Connection pooling: Enabled via postgres.js library  
✅ Idle timeout: Prevents connection leak  
✅ Connection timeout: Prevents hanging on new connections  
✅ Prepared statements disabled: Supports connection-level query caching  
✅ Singleton pattern: One cached client per process (avoids connection explosion)

### Optional Enhancements (P3 backlog)

- **PgBouncer**: Connection pooler at database layer (extreme scale)
- **Read replicas**: Offload read-heavy queries (reporting, marketplace)
- **Connection metrics**: Export pool stats to Prometheus/Datadog
- **Query instrumentation**: Trace slow queries, identify N+1 patterns

---

## Formula: Calculate Recommended Pool Size

```
total_connections = instance_count × max_connections_per_instance
target_total ≤ (PostgreSQL_max_connections × 0.7)  // Leave headroom for admin

Example for 3 instances:
max_connections_per_instance = 20
total = 3 × 20 = 60
PostgreSQL_max_connections = 100
60 ≤ 70 ✓ Safe
```

---

## Sign-off

**P2-DB-Connection Status:** COMPLETE (Configuration audit + recommended settings)

**Current Settings Assessment:**

- ✅ Already optimized for staging
- ✅ Horizontally scalable for production
- ✅ No code changes required
- ✅ Deployment: Update .env with recommended values per environment

**Next Steps:**

1. Verify current settings in `.serena/project.yml` or CI environment
2. Apply recommended values if different
3. Monitor pool metrics post-deployment
4. Scale instances if single instance hits 95% pool utilization
