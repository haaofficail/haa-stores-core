# Support Playbook

> Guidelines for support engineers responding to merchant issues.
>
> **Key identifiers to collect from the merchant:**
> - errorCode (e.g., DASH-001, STORE-001)
> - correlationId (e.g., req_xxxx)
> - eventId (e.g., evt-xxxx) if available
> - fingerprint (for deduplicating across merchants)

---

## First Response

1. **Acknowledge** the merchant's issue; ask for errorCode and correlationId
2. **Check** monitoring: run `pnpm ops:monitor:report`
3. **Analyze** errors: run `pnpm ops:errors` to see recent events by severity/fingerprint
4. **Search** ERROR_CATALOG.md for the merchant's errorCode (or nearest match)
5. **Search** ISSUE_KNOWLEDGE_BASE.md for previous occurrences by fingerprint
6. **If correlateable** — find the event by correlationId in `storage/support-error-events.ndjson`
7. **If P0** → escalate immediately via INCIDENTS.md

## Support Event Format

Errors are automatically captured to `storage/support-error-events.ndjson` by:
- The `ErrorBoundary` components (dashboard and storefront)
- The API error handler middleware
- The `POST /internal/support-errors/report` endpoint

Each event follows this schema:

```json
{
  "eventId": "evt-<timestamp>-<random>",
  "timestamp": "<ISO timestamp>",
  "errorCode": "DASH-001",
  "severity": "P0",
  "source": "platform_bug",
  "area": "dashboard",
  "message": "<normalized error message>",
  "safeMessage": "<Arabic merchant-facing message>",
  "correlationId": "req_<timestamp>-<random>",
  "fingerprint": "DASH-001::dashboard::/route::message",
  "route": "/dashboard/orders",
  "method": "GET",
  "statusCode": 500,
  "app": "merchant-dashboard",
  "environment": "development",
  "origin": "dashboard",
  "handled": true,
  "merchantId": 1,
  "tags": ["error-boundary", "react-runtime"]
}
```

## Escalation Path

| Severity | Response Time | Escalate To |
|----------|---------------|-------------|
| P0 | Immediate | Developer on-call |
| P1 | < 4 hours | Developer lead |
| P2 | < 24 hours | Developer team |
| P3 | < 1 week | Product owner |
| P4 | Backlog | Product owner |

## CorrelationId Flow

The correlationId ties together frontend errors, API errors, and log entries:
- Frontend `ErrorBoundary` generates a correlationId on catch
- API `error-handler.ts` reuses the `X-Request-Id` header as correlationId
- Both sources write to the same `support-error-events.ndjson` file
- Use `grep '<correlationId>' storage/support-error-events.ndjson` to trace the full error flow

## Common Questions

**Q: Merchant says "store is down"**
→ Check STORE-001, run `pnpm ops:health`, check storefront dev server

**Q: Merchant says "can't login"**
→ Check AUTH-001, verify credentials, check API server

**Q: Merchant says "orders not going through"**
→ Check ORDER-001, PAY-001, verify payment provider

**Q: Merchant says "theme looks broken"**
→ Check THEME-001, THEME-002, verify theme config

**Q: Merchant sees an error code in the UI**
→ Look up the error code in ERROR_CATALOG.md, search for the correlationId in the events file

**Q: Merchant sees "رقم التتبع" (tracking number)**
→ That is the correlationId. Use it to find the event in `storage/support-error-events.ndjson`

**Q: How do I test the error capture pipeline?**
→ Run `pnpm ops:errors:simulate` then `pnpm ops:errors` to see the simulated event
