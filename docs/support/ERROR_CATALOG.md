# Error Catalog

> Known error codes with merchant-facing messages and support instructions.
>
> Every runtime error produces an event with: errorCode + correlationId + eventId + fingerprint.
> Use `pnpm ops:errors` to analyze recorded events.
> Use `pnpm ops:errors:simulate` to generate a test event.

---

## API-001: Internal Server Error

- **Merchant Message:** A system error occurred. Our team has been notified.
- **Support Meaning:** Generic 500 error — details in server logs
- **Severity:** P1 (P0 if repeated)
- **Source:** API server
- **First Checks:** Check API logs for stack trace, verify request payload
- **Escalation Criteria:** Repeated 3+ times in 1 hour

## SYS-001: Configuration Missing

- **Merchant Message:** System configuration error. Contact support.
- **Support Meaning:** Required environment variable or config file is missing
- **Severity:** P2
- **Source:** System startup
- **First Checks:** Verify `.env` file exists, check required vars
- **Escalation Criteria:** N/A — fix by restoring config

## STORE-001: Storefront Unavailable

- **Merchant Message:** The storefront is temporarily unavailable.
- **Support Meaning:** Storefront server is not responding
- **Severity:** P0
- **Source:** Storefront server
- **First Checks:** Is the dev server running? Check for 500 errors
- **Escalation Criteria:** Immediate incident

## DASH-001: Dashboard Unavailable

- **Merchant Message:** The merchant dashboard is temporarily unavailable.
- **Support Meaning:** Dashboard server is not responding
- **Severity:** P0
- **Source:** Merchant dashboard server
- **First Checks:** Is the dev server running? Check for 500 errors
- **Escalation Criteria:** Immediate incident

## THEME-001: Theme Not Found

- **Merchant Message:** The store theme could not be loaded.
- **Support Meaning:** Active theme configuration is missing or invalid
- **Severity:** P1
- **Source:** Storefront / Theme engine
- **First Checks:** Verify theme package exists, check theme config
- **Escalation Criteria:** P0 if all stores affected

## THEME-002: Theme Render Error

- **Merchant Message:** The store theme encountered an error.
- **Support Meaning:** Theme component threw an error during render
- **Severity:** P2
- **Source:** Storefront / Theme component
- **First Checks:** Check browser console for errors, verify theme compatibility
- **Related Issues:** ISSUE-0002 (global !important style injection), ISSUE-0001 (theme system import leakage)
- **Escalation Criteria:** P1 if storefront is broken

## PAY-001: Payment Provider Error

- **Merchant Message:** The payment provider is temporarily unavailable.
- **Support Meaning:** Payment gateway returned an error
- **Severity:** P1
- **Source:** API / Payment integration
- **First Checks:** Check payment provider status, verify API keys
- **Escalation Criteria:** P0 if no fallback payment method available

## SHIP-001: Shipping Label Error

- **Merchant Message:** Shipping label could not be generated.
- **Support Meaning:** Carrier API returned an error
- **Severity:** P1
- **Source:** API / Shipping integration
- **First Checks:** Check carrier API status, verify shipping config
- **Escalation Criteria:** P0 if shipping is completely blocked

## ORDER-001: Invalid Order State

- **Merchant Message:** The order could not be processed in its current state.
- **Support Meaning:** State machine rejected the transition
- **Severity:** P2
- **Source:** API / Order system
- **First Checks:** Verify order state, check state machine rules
- **Escalation Criteria:** P1 if merchant cannot manage orders

## RBAC-001: Unauthorized Action

- **Merchant Message:** You do not have permission to perform this action.
- **Support Meaning:** User lacks required permission for the requested action
- **Severity:** P2
- **Source:** API / Auth core
- **First Checks:** Verify user roles, check permission definitions
- **Escalation Criteria:** P0 if users see permissions they shouldn't

## WEBHOOK-001: Webhook Delivery Failed

- **Merchant Message:** Webhook delivery failed after multiple attempts.
- **Support Meaning:** External endpoint is not responding
- **Severity:** P2
- **Source:** API / Webhook system
- **First Checks:** Verify endpoint URL, check network connectivity
- **Escalation Criteria:** P1 if critical integrations depend on it

## JOB-001: Background Job Failure

- **Merchant Message:** A background process failed.
- **Support Meaning:** Queue worker encountered an error
- **Severity:** P2
- **Source:** API / Worker
- **First Checks:** Check worker logs, verify queue connection
- **Escalation Criteria:** P1 if jobs are critical (e.g., order processing)

## VALIDATION-001: Invalid Input

- **Merchant Message:** يرجى التأكد من صحة البيانات المدخلة.
- **Support Meaning:** Request payload failed schema validation
- **Severity:** P3
- **Source:** API / Validation layer
- **First Checks:** Check request payload, verify field types and required fields
- **Escalation Criteria:** P2 if merchant cannot complete a workflow due to validation bugs

## NETWORK-001: Connection Error

- **Merchant Message:** تعذر الاتصال بالخادم. يرجى التحقق من اتصالك.
- **Support Meaning:** Network-level failure (timeout, DNS, connection refused)
- **Severity:** P3
- **Source:** Network / Connectivity
- **First Checks:** Check if dev server is running, verify network connectivity
- **Escalation Criteria:** P1 if persistent and affecting all users
