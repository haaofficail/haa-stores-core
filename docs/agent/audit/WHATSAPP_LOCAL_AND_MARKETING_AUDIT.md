# WhatsApp Local (QR Pairing) + Campaigns + Marketing — Audit & Roadmap

> Snapshot: 2026-06-22 · branch: `chore/merchant-dashboard-per-page-audit`
> Method: read-only discovery; no src edits, no migrations, no live sends.

---

## TL;DR

**The product wants:** real WhatsApp messaging where the merchant scans a QR code from their phone (like WhatsApp Web), the server holds the session, and outbound campaigns / abandoned-cart recovery / order updates fire automatically through that paired number. Plus media upload, segmentation, templates, opt-out handling, analytics.

**The codebase has:** the *campaign-scheduling skeleton* (DB schema, worker, service classes, UI pages) wired around `wa.me` **deep links** — i.e. the customer ends up tapping a link that opens THEIR WhatsApp to message the merchant. The merchant never sends anything programmatically. The QR rendered today is a `data:image/svg+xml` SVG of that wa.me link, NOT a WhatsApp pairing QR. A regression test explicitly locks this contact-only mode (`expect(channel.realDelivery).toBe(false)`).

**Gap:** the *send* path doesn't exist. No `@whiskeysockets/baileys` / `whatsapp-web.js`, no session storage, no pairing worker, no outbound encryption. Provider status reports `not_configured` until someone wires a real client.

**Estimated work:** 6–9 PRs across 4 phases. Phase 1 lands the pairing + single-message MVP; Phase 2 adds campaign send; Phase 3 adds media + templates + abandoned-cart hook; Phase 4 hardens (rate limit, retry, audit, analytics, multi-store isolation).

---

## 1. What exists today (verbatim)

### 1.1 DB schema (4 migrations, fully shipped on `main`)

- **`0065_abandoned_cart_campaigns.sql`** — abandoned-cart campaign table with channel selection (whatsapp / email / sms), trigger delay, message template, status.
- **`0066_whatsapp_campaigns.sql`** — `whatsapp_campaigns` table: store, audience filter, status, scheduledAt, sentAt, counts (queued/sent/failed/delivered/read).
- **`0069_whatsapp_consent.sql`** — per-customer `whatsappOptIn` boolean + opt-out audit log.
- **`0070_whatsapp_delivery.sql`** — per-message delivery rows (`messageId`, `phone`, status: queued/sent/delivered/read/failed, `failureCode`, retry count). Has the same idempotency/dedup discipline as the wallet ledger.

### 1.2 Service layer (`packages/commerce-core/src/`)

- **`whatsapp-campaigns.ts`** (325 LOC, `WhatsAppCampaignService` class):
  - `createCampaign(input)`, `scheduleCampaign(id)`, `cancelCampaign(id)`
  - `enqueueDeliveries(campaignId)` — fan out to per-customer rows
  - `markDelivered/Read/Failed(messageId, ...)`
  - Helpers: `significantDigits(phone)`, `classifyInboundMessage(body)` (`opt_out` / `opt_in` / `none`), `mapDeliveryStatus(raw)`.
- **`abandoned-cart-campaigns.ts`** — abandoned cart → campaign trigger logic.
- **`marketing-action-engine.ts`** — generic marketing rule executor (referenced from `MarketingActions.tsx`).
- **`customer-segmentation.ts`** — segment definitions consumed by campaigns.
- **`contact-channels.ts`** — current "WhatsApp" implementation: builds `wa.me/<phone>` links + an SVG QR data URL for the storefront footer. **This is contact-only; no programmatic send.**
- **`provider-status-service.ts`** — exposes `whatsapp.configured` flag (currently always `not_configured` because no live client is wired).

### 1.3 API routes

- **`apps/api/src/routes/notifications.ts`** — provider status + per-channel opt-in/out.
- **`apps/api/src/routes/abandoned-carts.ts`** — abandoned cart listing + campaign trigger.
- **`apps/api/src/routes/webhooks.ts`** — outbound webhook fan-out (campaign events flow through here, not WA inbound).

### 1.4 Worker (`apps/api/src/worker.ts:64-120`)

A BullMQ job `whatsapp.campaign` scheduled by the worker:
```ts
{ name: JOB_NAMES.whatsappCampaign, ... }
// fetches due whatsappCampaigns rows
// then logs `[scheduler] whatsapp.campaign failed for campaign ${id}` on error
```

**Critical finding:** the job dispatches campaigns to the dedupe table but the *actual send call* is missing. The code path ends before reaching any real WhatsApp transport.

### 1.5 UI surfaces (merchant-dashboard)

- `pages/AbandonedCarts.tsx` — listing + manual "remind" trigger.
- `pages/MarketingActions.tsx` — marketing-action engine UI.
- `pages/Notifications.tsx` — channel preferences + provider status (this is the page Audit Part 5 flagged: switches save ON even when providers are `not_configured`).
- `pages/CustomerSegments.tsx` — segment editor.
- `pages/GrowthInsights.tsx` — analytics dashboard.

### 1.6 Tests (5 files lock the current contact-only contract)

- `tests/whatsapp-qr-regression.test.ts` — locks `realDelivery: false` + the SVG-based QR.
- `tests/whatsapp-consent.test.ts` — opt-in/out flow.
- `tests/whatsapp-inbound-optout.test.ts` — `STOP` / `الغاء` classifier.
- `tests/whatsapp-delivery.test.ts` — delivery status mapping.
- `tests/marketing-events.test.ts` — campaign event pipeline.

**Implication for our work:** the QR regression test explicitly asserts the SVG/wa.me model. When we add real pairing, we MUST add a NEW contract (pairing QR is a different beast from a contact QR) without breaking this existing one — they coexist (contact QR for storefront footer + pairing QR for merchant dashboard).

---

## 2. What's missing (the actual gaps)

| # | Gap | Severity | Why it matters |
|---|---|---|---|
| WA-001 | No real WhatsApp client library (Baileys / whatsapp-web.js) | **P0** | The entire "send" half of the product does not exist. |
| WA-002 | No `whatsapp_sessions` table for paired-device session credentials | **P0** | Baileys credentials must persist encrypted (the QR pairing is a one-time event; the session blob is what authenticates subsequent sends for weeks). |
| WA-003 | No QR pairing UI in merchant-dashboard | **P0** | The merchant needs to scan a QR from their physical phone's "Linked Devices" screen. |
| WA-004 | No outbound send service (`sendMessage(storeId, to, body, media?)`) | **P0** | Closes the loop with the existing campaign scheduler in `worker.ts`. |
| WA-005 | No media upload pipeline for outbound media messages | **P0** | "رفع صور وملفات" requirement. Must hit object storage (MinIO/S3), not stay in memory. |
| WA-006 | No template store + variable substitution | **P0** | Production-grade messaging needs templated bodies with `{customer.name}`, `{order.id}`, etc. — not raw strings. |
| WA-007 | No abandoned-cart → WhatsApp wiring (the scheduler exists; the send doesn't) | **P0** | Owner explicitly asked for this integration. |
| WA-008 | No rate-limiting / throttling on outbound sends | **P1** | WhatsApp bans paired numbers that exceed ~200 msg/hour. Production-grade = enforce client-side. |
| WA-009 | No automatic opt-out enforcement on inbound `STOP` / `الغاء` | **P1** | Classifier exists (`classifyInboundMessage`); the inbound handler that flips `whatsappOptIn=false` is missing. |
| WA-010 | No retry / backoff on transient send failures | **P1** | The `whatsapp_delivery` table has `retry_count`; nothing increments it. |
| WA-011 | No audit log for WhatsApp actions per merchant | **P1** | Compliance + dispute resolution. Settlement-class scrutiny on a comms channel. |
| WA-012 | No analytics: delivered / read / opt-out / conversion-rate | **P1** | The columns exist on the table; no dashboard reads them. |
| WA-013 | No multi-store isolation guard on sessions (one merchant's Baileys session must NEVER be reachable from another store's API key) | **P0** | Cross-tenant leakage = catastrophic. |
| WA-014 | No pairing-status webhook (so the merchant can react in-app when their phone disconnects) | **P1** | Phone losing connection should toast / banner the merchant. |
| WA-015 | No real-time notifications hub: in-app toast / push / browser notification for incoming WhatsApp replies + delivery receipts | **P1** | "إشعارات متكاملة" requirement. |
| WA-016 | No notification settings audit on the existing toggle (Audit Part 5: switches save ON before configured) | **P1** | Pre-existing gap from page audit. |

---

## 3. Roadmap — closure plan

### Phase 1 — Pairing + send MVP (3 PRs)

| PR | Title | Scope |
|---|---|---|
| WA-PR-1 | feat(whatsapp): add Baileys + session schema | Add `@whiskeysockets/baileys` dependency. New `whatsapp_sessions` table (`store_id` unique, `creds` BYTEA encrypted with `ENCRYPTION_KEY`, `phone`, `device_jid`, `status` enum `disconnected/pairing/connected`, `lastSeenAt`). Migration is **schema-only**; owner runs `db:migrate`. Encrypted-at-rest via existing AES-GCM helper. |
| WA-PR-2 | feat(whatsapp): merchant-dashboard pairing UI + worker | New `pages/WhatsApp.tsx`: shows pairing QR (SSE/WebSocket from worker), status banner, "disconnect" action. New worker process `whatsapp.session` that holds the Baileys client per active session. Multi-tenant isolation: client map keyed by `storeId`, never crosses. |
| WA-PR-3 | feat(whatsapp): outbound send service + idempotent retry | `POST /merchant/:storeId/whatsapp/send {to, body}` route → enqueue → worker pulls session → sends. Persists to `whatsapp_delivery` with `Idempotency-Key`. Rate-limit ≤120 msg/hour/store (configurable). Retries 3× on transient errors with exponential backoff. |

**Why phase 1 stops here:** Phase 1 proves the loop (pair → send a test message → see it on phone). Everything after this is feature work that builds on the loop.

### Phase 2 — Campaigns (2 PRs)

| PR | Scope |
|---|---|
| WA-PR-4 | Wire `worker.ts` `whatsapp.campaign` job to actually call the WA-PR-3 send service. Per-recipient rate cap + dedup via `whatsapp_delivery` partial unique index. Campaign status reflects real delivered/read/failed counts pulled from session. |
| WA-PR-5 | Template store (`whatsapp_templates` table) + variable substitution (`{customer.name}`, `{order.number}`, `{order.total}`). Merchant UI for creating + previewing templates. |

### Phase 3 — Media + abandoned cart + segments (2 PRs)

| PR | Scope |
|---|---|
| WA-PR-6 | Media upload pipeline for outbound: merchant uploads to MinIO via existing presigned URL flow → message references object key → worker streams to Baileys. File-size cap, MIME allow-list (image/*, video/mp4, application/pdf). |
| WA-PR-7 | Abandoned-cart → WhatsApp wiring: the existing scheduler triggers a templated WhatsApp send when the cart age crosses the configured threshold (1h / 6h / 24h fallback ladder). Audience uses `customer-segmentation` for opt-in + segment filter. |

### Phase 4 — Hardening (2 PRs)

| PR | Scope |
|---|---|
| WA-PR-8 | Inbound handler: subscribe to Baileys `messages.upsert` → classify with `classifyInboundMessage` → flip `whatsappOptIn=false` on `STOP`/`الغاء` → write to `whatsapp_consent_log`. Surface inbound replies as in-app notifications (server-sent events to the merchant dashboard). |
| WA-PR-9 | Analytics + notifications hub: Reports tab "WhatsApp" — sent / delivered / read / opt-out / conversion. In-app notifications drawer in Topbar showing live delivery receipts + customer replies, with click-through to the campaign or customer. |

---

## 4. Risk register

| # | Risk | Mitigation |
|---|---|---|
| WR-1 | WhatsApp may detect/ban the paired number if rate is too high or behavior looks botty | Strict per-store rate cap (start ≤120/hr); 3–10s jitter between messages; never send before merchant is "active" on their phone for ≥30s. |
| WR-2 | Multi-tenant session crosstalk (one merchant ends up sending via another's number) | Baileys client registry keyed by `storeId` with explicit ACL; every send call validates `session.storeId === request.storeId`. Locked by integration test. |
| WR-3 | Session credentials are highly sensitive (full WhatsApp account access) | Encrypt at rest with `ENCRYPTION_KEY` (existing AES-GCM helper from `auth-core`); never log; never include in error responses; clear from memory on disconnect. |
| WR-4 | Phone disconnect mid-campaign → partial send + scary inconsistency | Worker watches Baileys `connection.update` → on `close`, pauses the campaign + sets banner + retries on reconnect. `whatsapp_delivery` row stays `queued` so resume is idempotent. |
| WR-5 | Inbound opt-out must be honored across campaigns + transactional messages | `whatsappOptIn` checked at enqueue time AND at send time (race-safe); inbound `STOP` flips the flag before any in-flight message goes out. |
| WR-6 | Existing wa.me/contact-only path must keep working (storefront footer) | The contact QR test (`tests/whatsapp-qr-regression.test.ts`) stays green. New pairing QR is a separate code path with its own test. |
| WR-7 | Worker process needs Redis (BullMQ) | Already a known dependency (`PROBLEM-003`); owner-gated. **Phase 1 cannot deploy without Redis.** |
| WR-8 | `0066_whatsapp_campaigns.sql` already on `main` but `db:migrate` not executed on staging | Owner must `pnpm db:migrate` before WA-PR-1 can be tested live. |

---

## 5. Owner-gated dependencies (before Phase 1 can land on staging)

1. **Redis / BullMQ provisioning** (`PROBLEM-003`) — Baileys client + scheduler depend on a durable queue.
2. **`db:migrate` execution** for the 4 existing WA migrations + the new `whatsapp_sessions` migration in WA-PR-1.
3. **Worker process** in `deploy/staging/docker-compose.yml` — currently `api` service runs the worker in-process; for Baileys we may want a separate `whatsapp-worker` service to isolate the long-lived sockets. **Note:** the CLAUDE.md forbidden list explicitly forbids `nasaq-whatsapp-worker` — that's a different project's worker. A Haa-Stores-owned `haa-whatsapp-worker` is allowed.
4. **MinIO bucket** for outbound media (WA-PR-6) — already provisioned for product images; reuse with a `wa-media/` prefix.

---

## 6. What this audit is NOT recommending

- Twilio / 360dialog / Meta Cloud API. The product asked for **local pairing** (QR from merchant's phone); that's specifically the Baileys path, not the official Business API (which requires a verified business + monthly fee + per-message cost). The two paths can coexist later, but Phase 1–4 are 100% Baileys.
- Building a custom WhatsApp protocol implementation. Baileys is the maintained open-source MD client; rolling our own is a years-long effort and would not survive WhatsApp protocol updates.
- Cross-channel merging (SMS / email / WhatsApp under one "send" call). The provider-status-service already represents them as separate channels; collapsing them adds risk without a clear benefit.

---

## 7. Acceptance criteria for Phase 1 (the "definition of done" for the pairing MVP)

- [ ] Merchant can navigate to `/whatsapp` in dashboard.
- [ ] Pairing QR is shown live (refreshes every ~30s if not scanned).
- [ ] After scanning from the merchant's phone "Linked Devices" screen, the page transitions to "متصل" with the phone's display name.
- [ ] Merchant can send a test message to their own number via a dedicated button; the message arrives.
- [ ] Disconnecting from the phone's "Linked Devices" reflects in the dashboard within 5s.
- [ ] `provider-status-service` reports `whatsapp.configured: true` only when at least one store has an active session.
- [ ] Multi-store isolation test: send-as-storeA call signed for storeB returns 403 / can't access B's session.
- [ ] Cleartext credentials NEVER appear in DB, logs, or API responses (audited via grep guard + integration test).
- [ ] Existing `whatsapp-qr-regression.test.ts` (the contact-only contract for storefront footer) is still green.
- [ ] `pnpm check:skills` + `pnpm typecheck` + `pnpm lint` + targeted vitest all green.

---

## 8. Notification + alert integration ("ابي تنبيهات" — the user-visible UX)

Beyond WhatsApp itself, the user asked for **integrated alerts/notifications**. Today:

- `Topbar.tsx` already has a bell icon with a red dot — but it's static; it doesn't reflect any real event count.
- `pages/Notifications.tsx` is a settings page (channel preferences), not a notifications inbox.
- No SSE/WebSocket connection from server to dashboard for live events.

**Proposed (separate PR, post-WA-PR-9):**

- Server-sent-events endpoint `GET /merchant/:storeId/events/stream` emitting: new order, abandoned cart aged into reminder window, WhatsApp delivery receipt, low stock, support ticket reply, payout status change.
- Topbar bell shows a real unread count + click opens a slide-over drawer with the last 50 events.
- Each event row links to the relevant page.
- Browser-level `Notification` API used (with permission gate) so alerts appear even when the tab is in background.

---

## 9. Status

**AWAITING OWNER APPROVAL** for Phase 1 scope (WA-PR-1, WA-PR-2, WA-PR-3 — sequenced; do NOT open all three at once).

Once approved, agent will:
1. Open WA-PR-1 (schema only, no code paths active yet — safest landing).
2. Pause for review + the owner's `pnpm db:migrate` on staging.
3. Open WA-PR-2 (pairing UI + worker).
4. Pause for staging verification by the owner (scan a real QR from their phone).
5. Open WA-PR-3 (send loop).
6. Then sequentially Phase 2 / 3 / 4 with the same pause-after-each cadence.

**No PR in this audit. No src edits. No deploy. No db:migrate. No secrets.**
