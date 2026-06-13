# Support Playbook

> Guidelines for support engineers responding to merchant issues.

---

## First Response

1. **Acknowledge** the merchant's issue
2. **Check** monitoring: run `pnpm ops:monitor:report`
3. **Search** ERROR_CATALOG.md for known error codes
4. **Search** ISSUE_KNOWLEDGE_BASE.md for previous occurrences
5. **If P0** → escalate immediately via INCIDENTS.md
6. **If unknown** → log as support event in `storage/support-error-events.ndjson`

## Support Event Format

Record events in `storage/support-error-events.ndjson`:

```json
{
  "eventId": "sup-<timestamp>-<random>",
  "timestamp": "<ISO timestamp>",
  "checkType": "error_analysis",
  "app": "<affected app>",
  "status": "fail",
  "severity": "P1",
  "errorCode": "ERR-XXX",
  "message": "<merchant-facing description>",
  "fingerprint": "<unique hash for dedup>",
  "recommendation": "<what to check>",
  "source": "support"
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

## Common Questions

**Q: Merchant says "store is down"**
→ Check STORE-001, run `pnpm ops:health`, check storefront dev server

**Q: Merchant says "can't login"**
→ Check AUTH-001, verify credentials, check API server

**Q: Merchant says "orders not going through"**
→ Check ORDER-001, PAY-001, verify payment provider

**Q: Merchant says "theme looks broken"**
→ Check THEME-001, THEME-002, verify theme config
