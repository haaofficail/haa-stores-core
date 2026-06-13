# Error Flow Map

> Detailed trace of how an error travels from occurrence to resolution.
> Use this map when implementing or debugging error capture.

---

## 1. Error Event Lifecycle

```
OCCURRENCE → CAPTURE → SANITIZE → STORE → ANALYZE → ACT
```

Each step is defined below.

---

## 2. Occurrence

### Where errors originate

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React)          │  API Server (Hono)              │
│                            │                                 │
│  storefront               │  route handler throws           │
│    ErrorBoundary catches  │  HTTPException thrown           │
│    Theme component crash  │  Zod validation fails           │
│    Network fetch fails    │  auth-core RBAC denies          │
│                            │  commerce-core rejects state    │
│  merchant-dashboard       │  payment/shipping provider err  │
│    ErrorBoundary catches  │  Worker job fails               │
│    Widget render crash    │  Webhook handler fails           │
└────────────────────────────┴─────────────────────────────────┘
```

---

## 3. Capture

### Who generates the event

#### Frontend (Browser)

| Component | File | How |
|-----------|------|-----|
| `ErrorBoundary` (dashboard) | `apps/merchant-dashboard/src/components/ErrorBoundary.tsx` | `componentDidCatch()` → `POST /internal/support-errors/report` |
| `ErrorBoundary` (storefront) | `apps/storefront/src/components/ErrorBoundary.tsx` | `componentDidCatch()` → `POST /internal/support-errors/report` |

**Flow:**
```
1. React component throws during render
2. getDerivedStateFromError() sets state, generates correlationId
3. componentDidCatch() fires POST to API with:
     - errorCode (DASH-001 / STORE-001)
     - message (error.message)
     - correlationId
     - route (window.location.pathname)
     - app name
     - origin (dashboard/storefront)
     - tags
4. UI shows error message with errorCode + correlationId in Arabic
```

#### Backend (API)

| Component | File | How |
|-----------|------|-----|
| `error-handler.ts` | `apps/api/src/middleware/error-handler.ts` | `catch (err)` → `reportSupportError()` |

**Flow:**
```
1. Hono catches thrown error in ErrorHandler
2. errorHandler() checks:
     - Is it AppError? → extract code, message, details
     - Is it HTTPException? → extract status, body
     - Unknown? → default to API-001
3. Calls reportSupportError() with:
     - errorCode
     - message
     - correlationId (from c.get('requestId'))
     - route, method, statusCode
     - app = 'api', origin = 'api'
     - handled = true (AppError) or false (unexpected)
4. Returns safe JSON response to client
```

#### Manual / Test

| Tool | How |
|------|-----|
| `POST /internal/support-errors/report` | Direct HTTP POST with event payload |
| `pnpm ops:errors:simulate` | Generates random event, writes directly to NDJSON |

---

## 4. Sanitize

### What gets stripped before storage

**Implementation:** `apps/api/src/services/support-error-log.ts` → `sanitizePayload()`

**Blocklist (case-insensitive substring match):**
```
password   token   authorization   cookie   secret
apiKey     accessToken   refreshToken   card   cvv   iban   env
```

**Behavior:**
- Recursively walks all objects
- If a key contains any blocklist term → value replaced with `"[REDACTED]"`
- Arrays are preserved as-is (elements not recursed)
- Top-level strings capped at 200 characters

**Stack traces:**
- Stripped from `message` field unless `NODE_ENV=development`
- No separate `stackTrace` field exists in the event schema

---

## 5. Store

### Event destination

| File | Format | Append Mode |
|------|--------|-------------|
| `storage/support-error-events.ndjson` | NDJSON (one JSON object per line) | Always append, never truncate |

**Writer:** `apps/api/src/services/support-error-log.ts` → `appendSupportErrorEvent()`

```
appendFileSync(EVENTS_FILE, JSON.stringify(event) + '\n')
```

**Event schema:**
```typescript
interface SupportErrorEvent {
  eventId: string           // evt-{timestamp}-{random}
  timestamp: string         // ISO 8601
  errorCode: string         // e.g., "DASH-001"
  severity: ErrorSeverity   // "P0" | "P1" | "P2" | "P3" | "P4"
  source: ErrorSource       // "platform_bug" | "merchant_config" | ...
  area: string              // "dashboard" | "api" | "system" | ...
  message: string           // normalized error message (<=200 chars)
  safeMessage: string       // Arabic user-facing message
  correlationId: string     // req_{timestamp}-{random}
  fingerprint: string       // {errorCode}::{area}::{route}::{message[0:60]}
  route?: string            // API route or page path
  method?: string           // HTTP method
  statusCode?: number       // HTTP status
  app: string               // "api" | "merchant-dashboard" | "storefront" | ...
  environment: string       // "development" | "production"
  origin: ErrorOrigin       // "api" | "dashboard" | "storefront" | ...
  handled: boolean          // true = expected error, false = unexpected
  merchantId?: number
  storeId?: number
  userId?: number
  employeeId?: number
  customerId?: number
  orderId?: number
  cartId?: number
  provider?: string
  tags?: string[]
}
```

**Fingerprint algorithm:**
```
fingerprint = `${errorCode}::${source}::${route || 'unknown'}::${normalizedMessage.slice(0, 60)}`
```

**correlationId generation:**
```
correlationId = 'req_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
```

---

## 6. Analyze

### Tools that read the event file

| Command | Script | What it does |
|---------|--------|-------------|
| `pnpm ops:errors` | `scripts/analyze-support-errors.mjs` | Reads both `monitoring-events.ndjson` and `support-error-events.ndjson` |
| `pnpm ops:monitor` | (sequentially) | Runs health + synthetic + errors |
| `pnpm ops:monitor:report` | `scripts/generate-monitoring-report.mjs` | Includes error analysis in report |

### Analysis output

```
=== Events by Severity ===
  P0: 1
  P2: 3
  P3: 5

=== Top Error Codes ===
  VALIDATION-001: 5
  DASH-001: 2

=== Top Fingerprints ===
  VALIDATION-001::validation_error::/api/orders::Invalid...: 3

=== Top Affected Apps ===
  api: 6

=== Top Affected Routes/Targets ===
  /api/orders: 4

🚨 P0 Alerts (1):
  [2026-06-13T...] Storefront not loading — /s/haa-demo

📋 Repeated P1 (>=3) — Suggest Task:

🔍 Repeated Fingerprints (>=3) — Suggest Root Cause Analysis:
  VALIDATION-001::validation_error::/api/orders::Invalid...: 3
```

---

## 7. Act

### Error → Incident → Task → Fix flow

```
┌─────────────────────────────────────────────────┐
│  ops:errors output has P0 alert?                │
│  → YES: Create INCIDENT in incidents.md         │
│    → Stop normal development                    │
│    → Investigate immediately                    │
│  → NO: Check repeated P1 and fingerprints       │
└─────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────┐
│  Repeated P1 (≥3)?                              │
│  → YES: Create TASK in task_tracker.md          │
│    → Assign to developer                        │
│    → Fix within SLA                             │
└─────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────┐
│  Repeated fingerprint (≥3)?                     │
│  → YES: Create RCA in issue_knowledge_base.md   │
│    → Identify root cause                        │
│    → Update regression checklist                │
└─────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────┐
│  Fix implemented                                │
│  → pnpm preflight                               │
│  → pnpm typecheck                               │
│  → pnpm ops:monitor (verify healthy)            │
│  → Update task/incident/rca status              │
│  → Close loop                                   │
└─────────────────────────────────────────────────┘
```

---

## 8. What the Merchant Sees

### Dashboard ErrorBoundary

```
┌──────────────────────────────────┐
│  ⚠️                             │
│  تعذر تحميل هذا الجزء من         │
│  لوحة التحكم                     │
│                                  │
│  رمز الخطأ: DASH-001             │
│  رقم التتبع: req_abc123def       │
│                                  │
│  إذا استمرت المشكلة، أرسل رقم    │
│  التتبع للدعم الفني.             │
│                                  │
│  [ تحديث الصفحة ]                │
└──────────────────────────────────┘
```

### Storefront ErrorBoundary

```
┌──────────────────────────────────┐
│  ⚠️                             │
│  تعذر تحميل الصفحة حاليًا        │
│                                  │
│  رمز الخطأ: STORE-001            │
│  رقم التتبع: req_abc456def       │
│                                  │
│  يرجى المحاولة لاحقًا.           │
│                                  │
│  [ تحديث الصفحة ]                │
└──────────────────────────────────┘
```

---

## 9. What Support Sees

```
pnpm ops:errors
  → Finds event by correlationId
  → Looks up errorCode in ERROR_CATALOG.md
  → Checks ISSUE_KNOWLEDGE_BASE.md for same fingerprint
  → If P0: escalate via INCIDENTS.md
  → If P1/P2: apply known fix from catalog

grep req_abc123def storage/support-error-events.ndjson
  → Returns full event with all fields
```

---

## 10. What the Developer Sees

```
grep req_abc123def storage/support-error-events.ndjson | jq .

{
  "eventId": "evt-mqbqvouw-ihq0sl",
  "errorCode": "DASH-001",
  "severity": "P0",
  "source": "platform_bug",
  "area": "dashboard",
  "message": "Cannot read properties of undefined",
  "correlationId": "req_abc123def",
  "fingerprint": "DASH-001::platform_bug::/dashboard/orders::Cannot_read_properties_of_undefined",
  "route": "/dashboard/orders",
  "app": "merchant-dashboard",
  ...
}
```

---

## 11. Error Code Quick Reference

| Code | Severity | Source | Safe Message |
|------|----------|--------|-------------|
| API-001 | P2 | platform_bug | تعذر تنفيذ العملية حاليًا |
| SYS-001 | P2 | unknown | حدث خطأ غير متوقع في النظام |
| STORE-001 | P0 | platform_bug | المتجر غير متاح حاليًا |
| DASH-001 | P0 | platform_bug | تعذر تحميل هذا الجزء من لوحة التحكم |
| THEME-001 | P1 | theme_runtime | تعذر تحميل الثيم |
| THEME-002 | P2 | theme_runtime | حدث خطأ أثناء تحميل الثيم |
| PAY-001 | P1 | external_provider | تعذر تهيئة الدفع. يرجى المحاولة لاحقًا |
| SHIP-001 | P1 | external_provider | تعذر إنشاء بوليصة الشحن. يرجى المحاولة لاحقًا |
| ORDER-001 | P2 | platform_bug | تعذر تغيير حالة الطلب |
| RBAC-001 | P2 | permission_denied | لا تملك الصلاحية الكافية |
| WEBHOOK-001 | P2 | external_provider | تعذر معالجة الإشعار الخارجي |
| JOB-001 | P2 | platform_bug | تعذر تنفيذ مهمة الخلفية |
| VALIDATION-001 | P3 | validation_error | يرجى التأكد من صحة البيانات المدخلة |
| NETWORK-001 | P3 | network_error | تعذر الاتصال بالخادم. يرجى التحقق من اتصالك |

---

## 12. Key Files in the Error Pipeline

| File | Role |
|------|------|
| `packages/shared/src/error-codes.ts` | Error code definitions, severity/source/origin enums, helpers |
| `apps/api/src/services/support-error-log.ts` | Event builder, sanitizer, NDJSON writer, ErrorMonitor |
| `apps/api/src/middleware/error-handler.ts` | Hono error handler, wires local monitor |
| `apps/api/src/routes/support-errors.ts` | POST /internal/support-errors/report (local-only) |
| `apps/merchant-dashboard/src/components/ErrorBoundary.tsx` | Dashboard React error catch + report |
| `apps/storefront/src/components/ErrorBoundary.tsx` | Storefront React error catch + report |
| `scripts/simulate-support-error.mjs` | Generate test events |
| `scripts/analyze-support-errors.mjs` | Read + analyze events |
| `storage/support-error-events.ndjson` | Append-only event log |
| `docs/support/ERROR_CATALOG.md` | Human-readable error lookup |
| `docs/support/ERROR_CODE_TAXONOMY.md` | Error classification guide |
| `docs/support/SUPPORT_PLAYBOOK.md` | Support engineer workflow |
| `docs/support/ESCALATION_GUIDE.md` | Escalation criteria and paths |
