# Claude Project Memory — Haa Stores

You are working on Haa Stores / متاجر هاء.

## Canonical project path

`~/Desktop/haa-stores-core`

## Infrastructure source of truth

Before any Hostinger, VPS, domain, DNS, Nginx, deploy, or infrastructure task, read:

- `docs/ops/HAA_STORES_HOSTINGER_TARGET.md`
- `.haa/hostinger-target.json`

## Approved Haa Stores server

- Approved server IP: `72.61.108.208`
- Current role: `staging`
- Future role: `production_candidate`
- Production status: `not_promoted_yet`

This is the official Haa Stores server. Do not suggest buying a new VPS unless this server is proven unsuitable.

## Production promotion rule

The approved server `72.61.108.208` may later be promoted to production only after a readiness audit and explicit owner approval.

## Forbidden server

Never use the following server for Haa Stores:

- VPS IP: `187.124.41.239`
- VPS ID: `1496264`
- Hostname: `srv1496264.hstgr.cloud`
- Owner/project: `Nasaq / Haa Soft`

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

## Non-negotiable rules

- Use `72.61.108.208` as the Haa Stores target.
- Treat it as staging now and production candidate later.
- Do not use Nasaq or Haa Soft infrastructure for Haa Stores.
- Do not use VPS `187.124.41.239` or VPS ID `1496264` for Haa Stores.
- Do not select servers based on Hostinger API ordering.
- Never print API tokens or secrets.
- Do not change DNS, Nginx, firewall, SSH keys, VPS settings, or deploy without explicit approval.
- If any Hostinger result conflicts with this file, stop and report the conflict.
