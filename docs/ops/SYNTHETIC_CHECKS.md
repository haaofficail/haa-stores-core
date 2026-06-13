# Synthetic Checks

> Non-destructive simulated user requests that verify system functionality.

---

## Storefront Synthetic

| Field | Value |
|-------|-------|
| **Purpose** | Verify the storefront home page loads without errors |
| **Method** | HTTP GET to storefront root URL |
| **Pass** | HTTP 200-399 response |
| **Fail** | HTTP 500 or connection error |
| **Severity** | P0 if fail, P3 if server not running |
| **Destructive** | No — read-only |

## Merchant Dashboard Synthetic

| Field | Value |
|-------|-------|
| **Purpose** | Verify the merchant dashboard loads |
| **Method** | HTTP GET to dashboard root URL |
| **Pass** | HTTP 200-399 response |
| **Fail** | HTTP 500 or connection error |
| **Severity** | P0 if fail, P3 if server not running |
| **Destructive** | No — read-only |

## API Synthetic

| Field | Value |
|-------|-------|
| **Purpose** | Verify the API is responding correctly |
| **Method** | HTTP GET to `/health` and `/api/health` endpoints |
| **Pass** | HTTP 200-399 response |
| **Fail** | HTTP 500 or connection error |
| **Severity** | P1 if fail, P3 if server not running |
| **Destructive** | No — read-only endpoints |

## Checkout Synthetic (Non-Destructive)

| Field | Value |
|-------|-------|
| **Purpose** | Future: verify checkout endpoints are available |
| **Method** | Read-only: check payment methods availability |
| **Pass** | Endpoint responds without error |
| **Fail** | Connection or server error |
| **Destructive** | No — never creates real orders or payments |
| **Note** | Requires API key and test mode — deferred |

## Theme Synthetic

| Field | Value |
|-------|-------|
| **Purpose** | Future: verify active theme renders without errors |
| **Method** | Load storefront pages with active theme applied |
| **Pass** | Pages render without console errors |
| **Fail** | Theme-related errors detected |
| **Destructive** | No |
| **Note** | Requires Playwright or browser automation — deferred |
