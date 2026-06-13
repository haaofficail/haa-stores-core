# Health Checks

> Defines each health check, its purpose, pass/fail conditions, and actions.

---

## API Health

| Field | Value |
|-------|-------|
| **Purpose** | Verify the API server is running and responding |
| **Endpoint** | `http://localhost:3000/health` (only — `/api/health` is NOT used) |
| **Pass** | HTTP 200 from `/health` |
| **Fail** | HTTP 500+ or no response |
| **Severity** | P0 — API is the backbone of all apps |
| **Error Code** | `SYS-003` |
| **Support Action** | Check if API process is running, restart if needed |
| **Developer Action** | Check logs, verify database connection, check for config errors |

---

## Storefront Health

| Field | Value |
|-------|-------|
| **Purpose** | Verify the public storefront is serving pages |
| **Pass** | HTTP 200-399 from storefront URL |
| **Fail** | HTTP 500+ or no response |
| **Severity** | P0 — customers cannot shop |
| **Error Code** | `STORE-001` |
| **Support Action** | Check if storefront dev server is running |
| **Developer Action** | Check build output, verify API connectivity, review theme |

---

## Merchant Dashboard Health

| Field | Value |
|-------|-------|
| **Purpose** | Verify the merchant dashboard loads |
| **Pass** | HTTP 200-399 from dashboard URL |
| **Fail** | HTTP 500+ or no response |
| **Severity** | P0 — merchants cannot manage their store |
| **Error Code** | `DASH-001` |
| **Support Action** | Check if dashboard dev server is running |
| **Developer Action** | Check for API connection issues, RBAC configuration |

---

## Database Health

| Field | Value |
|-------|-------|
| **Purpose** | Verify database is available and migrations are applied |
| **Pass** | Database responds to query |
| **Fail** | Connection refused or migration not applied |
| **Severity** | P0 — all data-dependent features break |
| **Error Code** | `DB-001` |
| **Support Action** | Check PostgreSQL is running |
| **Developer Action** | Run `pnpm db:migrate`, check connection string |

---

## Project Structure Health

| Field | Value |
|-------|-------|
| **Purpose** | Verify all required project files and directories exist |
| **Pass** | All expected files/folders are present |
| **Fail** | Critical file or directory missing |
| **Severity** | P2 — broken structure causes build/dev failures |
| **Error Code** | `SYS-001` |
| **Support Action** | Re-clone or verify project integrity |
| **Developer Action** | Check for accidental deletion or corruption |

---

## Environment Health

| Field | Value |
|-------|-------|
| **Purpose** | Verify environment is correctly configured |
| **Pass** | `.env` present, Node version >= 20, pnpm >= 9 |
| **Fail** | Missing config or wrong version |
| **Severity** | P2 — dev environment issues |
| **Error Code** | `SYS-002` |
| **Support Action** | Verify environment setup steps |
| **Developer Action** | Copy `.env.example` to `.env`, install correct Node/pnpm |
