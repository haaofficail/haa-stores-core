# Haa Stores — Hostinger Target Source of Truth

This file is the source of truth for Hostinger/VPS/domain targeting for Haa Stores.

## Project

- Project: Haa Stores / متاجر هاء
- Local path: `~/Desktop/haa-stores-core`
- Hostinger MCP server name: `hostinger-haa-stores`

## Approved Haa Stores Server

| Field              | Value                  |
| ------------------ | ---------------------- |
| Approved server IP | `72.61.108.208`        |
| Current role       | `staging`              |
| Future role        | `production_candidate` |
| Production status  | `not_promoted_yet`     |

## Decision

The server `72.61.108.208` is the approved canonical Haa Stores server.

It is currently used as the official Haa Stores staging/target server and may later be promoted to production after readiness checks.

Do not suggest buying a new VPS unless this server is proven unsuitable by evidence.

## Forbidden Infrastructure for Haa Stores

The following server is NOT Haa Stores and must never be used for Haa Stores tasks:

| Field         | Value                    |
| ------------- | ------------------------ |
| VPS IP        | `187.124.41.239`         |
| VPS ID        | `1496264`                |
| Hostname      | `srv1496264.hstgr.cloud` |
| Owner/project | `Nasaq / Haa Soft`       |

Forbidden domains for Haa Stores:

- `nasaqpro.tech`
- `tarmizos.com`
- `haasoft.com`

Forbidden SSH key:

- `nasaq_deploy`

Forbidden project paths:

- `/var/www/nasaq`
- `/var/www/haasoft`
- `/var/www/nasaqpro.tech`

Forbidden PM2 services:

- `nasaq-api`
- `nasaq-whatsapp-worker`
- `nasaq-worker`

## Strict Rules

1. Use `72.61.108.208` as the approved Haa Stores server.
2. Treat `72.61.108.208` as staging now and production candidate later.
3. Do not buy or suggest a new VPS unless `72.61.108.208` is proven unsuitable.
4. Do not use VPS `187.124.41.239` or VPS ID `1496264` for Haa Stores.
5. Do not use `nasaqpro.tech`, `tarmizos.com`, or `haasoft.com` for Haa Stores.
6. Do not infer the Haa Stores target from Hostinger API ordering.
7. Before promoting to production, run a readiness audit.
8. DNS, Nginx, firewall, SSH key changes, VPS mutation, and deploy require explicit approval.
9. Never print API tokens or secrets.
