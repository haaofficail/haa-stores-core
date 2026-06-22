# Claude Project Memory — Haa Stores

You are working on Haa Stores / متاجر هاء.

## Read this first — Mandatory Skill Gate

Before any task that mutates files, the repo, or external state (PRs, CI,
infrastructure), you MUST publish a written **Mandatory Skill Gate**.

- The full rule is **`AGENTS.md` §14** — that file is the authoritative
  source. This file (CLAUDE.md) carries infrastructure rules only; do not
  duplicate §14 here. Read AGENTS.md before your first edit on this repo.
- Skills are defined in `.claude/skills/<slug>/SKILL.md`. The catalogue is
  `docs/agent-os/SKILLS_REGISTRY.md`; short cards live in
  `docs/agent-os/SKILL_CARDS.md`; the file→skill map is
  `docs/agent-os/SKILL_FILE_MAPPING.md`.
- "Skills" in this repository means **Claude Code execution skills and
  task governance** — NOT CSS classes, Tailwind utilities, design tokens,
  or any visual UI change. A report that proves "skills applied" via CSS
  or asset-hash evidence is invalid and will be rejected.
- "Done" requires the Final Skill Compliance Report (template:
  `docs/agent-os/templates/SKILL_COMPLIANCE_REPORT.md`) referenced from
  the PR body, plus the four safety confirmations in §14.6.
- The enforcement script is `pnpm check:skills`; CI uses it.

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
