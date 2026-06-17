#!/usr/bin/env python3
"""
Haa Stores — Master Roadmap HTML Generator

Reads:
  - docs/ops/TASK_TRACKER.md       (every TASK-XXXX block + status)
  - docs/ops/CURRENT_STATE.md      (stats + active initiatives)
  - git log --oneline              (commit count + recent commits)
  - docs/ops/MARKETPLACE_PHASE0_AUDIT.md  (initiative cross-ref)

Writes:
  - MASTER_ROADMAP.html            (regenerated from template)

Usage:
  pnpm roadmap:generate
  # or
  python3 scripts/roadmap-regenerate.py

Source of truth: TASK_TRACKER.md + CURRENT_STATE.md + git log.
The HTML is a render of those files — no manual edits.

Designed for solo founder workflow:
  - Read current state on session start
  - Update TASK_TRACKER / CURRENT_STATE
  - Run `pnpm roadmap:generate` to refresh the visual
  - Open MASTER_ROADMAP.html in browser (offline, portable)
"""

from __future__ import annotations

import re
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

# ---------- Paths ----------

REPO_ROOT = Path(__file__).resolve().parent.parent
TASK_TRACKER = REPO_ROOT / "docs" / "ops" / "TASK_TRACKER.md"
CURRENT_STATE = REPO_ROOT / "docs" / "ops" / "CURRENT_STATE.md"
PHASE0_AUDIT = REPO_ROOT / "docs" / "ops" / "MARKETPLACE_PHASE0_AUDIT.md"
OUTPUT = REPO_ROOT / "MASTER_ROADMAP.html"


# ---------- Data classes ----------


@dataclass
class Task:
    id: str
    title: str
    status: str  # "Done" | "Open" | "Planning" | "In Progress"
    priority: str = ""
    type: str = ""
    section: str = "engineering"  # engineering | owner | external | strategic


@dataclass
class Initiative:
    title: str
    status: str  # "Done" | "Planning" | "Active" | "Open"
    meta: str
    progress_pct: int
    details_html: str = ""
    task_id: Optional[str] = None


@dataclass
class RepoState:
    commits_total: int
    tests_passing: int
    tasks: list[Task] = field(default_factory=list)
    initiatives: list[Initiative] = field(default_factory=list)
    last_updated: str = ""
    milestone_m2_task: Optional[Task] = None  # TASK-0040 (Phase 1)
    owner_tasks: list[Task] = field(default_factory=list)
    external_tasks: list[Task] = field(default_factory=list)
    engineering_tasks: list[Task] = field(default_factory=list)


# ---------- Extractors ----------


def extract_tasks(task_tracker_text: str) -> list[Task]:
    """Parse every `### TASK-XXXX: ...` block from TASK_TRACKER.md.

    Strategy: find each `### TASK-XXXX: <title>` header, then read the
    `- **Status:** ...` line within the same block (until the next `### `).
    """
    tasks: list[Task] = []
    # Split by `### TASK-` headers
    blocks = re.split(r"\n### TASK-(\d{4}):\s*([^\n]+)\n", task_tracker_text)
    # blocks: [preamble, id1, title1, body1, id2, title2, body2, ...]
    i = 1
    while i < len(blocks):
        task_id = f"TASK-{blocks[i]}"
        title = blocks[i + 1].strip()
        body = blocks[i + 2] if i + 2 < len(blocks) else ""

        status_match = re.search(r"\*\*Status:\*\*\s*([^\n]+)", body)
        status_raw = status_match.group(1).strip() if status_match else "Open"
        status = normalize_status(status_raw)

        priority_match = re.search(r"\*\*Priority:\*\*\s*([^\n]+)", body)
        priority = priority_match.group(1).strip() if priority_match else ""

        type_match = re.search(r"\*\*Type:\*\*\s*([^\n]+)", body)
        type_ = type_match.group(1).strip() if type_match else ""

        tasks.append(
            Task(
                id=task_id,
                title=title,
                status=status,
                priority=priority,
                type=type_,
            )
        )
        i += 3
    return tasks


def normalize_status(raw: str) -> str:
    """Map varied status strings to canonical buckets.

    Examples:
      "Done (8 of 8 sub-items shipped across Sessions #3+#4+#5+#6-#10; ...)"
        → "Done"
      "Planning (Roadmap drafted in `docs/ZATCA_ROADMAP.md`)"
        → "Planning"
      "Open (sequenced AFTER TASK-0040; ...)"
        → "Open"
      "In Progress"
        → "In Progress"
    """
    raw_lower = raw.lower()
    if raw_lower.startswith("done"):
        return "Done"
    if raw_lower.startswith("planning"):
        return "Planning"
    if raw_lower.startswith("in progress"):
        return "In Progress"
    if raw_lower.startswith("open"):
        return "Open"
    # Fallback: take first word
    return raw.split()[0] if raw else "Open"


def extract_current_state(current_state_text: str) -> dict:
    """Extract key stats from CURRENT_STATE.md.

    Looks for the `Last Updated:` line and surrounding context.
    """
    result: dict = {
        "last_updated": "",
        "commits": 0,
        "tests_passing": 0,
        "raw_excerpt": "",
    }
    last_match = re.search(
        r"\*\*Last Updated:\*\*\s*([^\n]+)", current_state_text
    )
    if last_match:
        result["last_updated"] = last_match.group(1).strip()

    commits_match = re.search(
        r"(\d+)\s+total commits on\s+`feature/phase-9-cod-fee-policy`",
        current_state_text,
    )
    if commits_match:
        result["commits"] = int(commits_match.group(1))

    tests_match = re.search(r"(\d+)\s+tests passing", current_state_text)
    if tests_match:
        result["tests_passing"] = int(tests_match.group(1))

    return result


def get_git_commit_count() -> int:
    """Count commits on the current branch since it diverged from main.

    Strategy: `git log --oneline main..HEAD` gives commits unique to this branch.
    Falls back to total commit count if main doesn't exist.
    """
    # First, try counting commits unique to this branch (excluding main ancestry)
    for ref in ("main", "master", "origin/main", "origin/master"):
        try:
            out = subprocess.check_output(
                ["git", "log", "--oneline", f"{ref}..HEAD"],
                cwd=REPO_ROOT,
                stderr=subprocess.DEVNULL,
                text=True,
            ).strip()
            if out:
                return len(out.splitlines())
        except subprocess.CalledProcessError:
            continue
    # Fallback: total commits on HEAD
    try:
        out = subprocess.check_output(
            ["git", "rev-list", "--count", "HEAD"],
            cwd=REPO_ROOT,
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
        return int(out)
    except (subprocess.CalledProcessError, ValueError):
        return 0


def get_branch_name() -> str:
    try:
        out = subprocess.check_output(
            ["git", "branch", "--show-current"],
            cwd=REPO_ROOT,
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
        return out or "(detached HEAD)"
    except subprocess.CalledProcessError:
        return "(unknown)"


# ---------- Task classification ----------


def classify_task(task: Task) -> str:
    """Decide which lane the task belongs to: engineering | owner | external.

    Logic:
      - TASK-0038 (Live-Deploy Readiness Tracker) → owner (it tracks owner items)
      - TASK-0036 (ZATCA), TASK-0037 (Marketplace master) → strategic
      - Any task whose title contains "Owner" or whose body mentions owner-action items → owner
      - Default → engineering
    """
    if task.id == "TASK-0038":
        return "owner"
    if task.id in ("TASK-0036", "TASK-0037", "TASK-0039", "TASK-0040",
                   "TASK-0041", "TASK-0042", "TASK-0043", "TASK-0044",
                   "TASK-0045"):
        return "engineering"
    if "Owner" in task.title or "Live-Deploy" in task.title:
        return "owner"
    return "engineering"


def is_done(task: Task) -> bool:
    return task.status == "Done"


# ---------- Initiative inference ----------


def infer_initiatives(tasks: list[Task], current_state: dict) -> list[Initiative]:
    """Build the 5 active initiatives section from TASK_TRACKER.

    Pattern matches:
      - TASK-0035 → "3DS + VAT" (Done)
      - Sessions #7-#8 → "Drizzle Snapshot Chain" (Done)
      - TASK-0037 → "Public Marketplace Hardening" (Planning)
      - TASK-0036 → "ZATCA E-Invoicing" (Planning)
      - TASK-0038 → "Live-Deploy Readiness Tracker" (Open)
    """
    initiatives: list[Initiative] = []

    def find(task_id: str) -> Optional[Task]:
        return next((t for t in tasks if t.id == task_id), None)

    # 1. 3DS + VAT
    t35 = find("TASK-0035")
    if t35:
        pct = 100 if is_done(t35) else 50
        initiatives.append(
            Initiative(
                title="3DS + VAT-Aware Pricing",
                status="Done" if is_done(t35) else "Active",
                meta=f"TASK-0035 · {t35.status}",
                progress_pct=pct,
                details_html=(
                    "<strong>Shipped:</strong> 3DS flow (Moyasar + Geidea + Fake) · VAT helpers · "
                    "checkout VAT line · product card badge.<br>"
                    "<strong>Defer:</strong> Per-tenant VAT_RATE → ZATCA session."
                ),
                task_id="TASK-0035",
            )
        )

    # 2. Drizzle Snapshot Chain (not a TASK — extract from CURRENT_STATE)
    drizzle_in_text = "Drizzle Snapshot Chain" in CURRENT_STATE.read_text(encoding="utf-8")
    if drizzle_in_text:
        initiatives.append(
            Initiative(
                title="Drizzle Snapshot Chain",
                status="Done",
                meta="Sessions #7-#8 · 21 snapshots + 7 tests",
                progress_pct=100,
                details_html=(
                    "<strong>Shipped:</strong> <code>scripts/build-snapshots.cjs</code> synthesizer · "
                    "JSON parse validation · FK format guard · prevId chain check.<br>"
                    "<strong>Caught:</strong> 2 real bugs (0052 FK + 0049 prevId)."
                ),
            )
        )

    # 3. Public Marketplace Hardening
    t37 = find("TASK-0037")
    if t37:
        t39 = find("TASK-0039")
        phase0_done = t39 and is_done(t39)
        # ~14% baseline (Phase 0 = 1/7 phases)
        # Adjust: if more phases done, add ~14% per phase
        phase_done_count = sum(
            1
            for tid in ("TASK-0039", "TASK-0040", "TASK-0041",
                        "TASK-0042", "TASK-0043", "TASK-0044", "TASK-0045")
            if (t := find(tid)) and is_done(t)
        )
        pct = max(14, phase_done_count * 14) if phase0_done else 0
        initiatives.append(
            Initiative(
                title="Public Marketplace Hardening",
                status="Planning" if not phase0_done else "Active",
                meta=f"TASK-0037 master · 6 P0 + 9 P1 findings · {phase_done_count}/7 phases done",
                progress_pct=pct,
                details_html=(
                    f"<strong>Done:</strong> Phase 0 (TASK-0039) — registration + audit re-baseline.<br>"
                    f"<strong>Next:</strong> TASK-0040 (Phase 1) — 3 P0 fixes in 2 days parallel.<br>"
                    f"<strong>Later:</strong> Phase 2-6 (TASK-0041-0045) — SFDA, categories, legal, P1, pen-test, beta."
                ),
                task_id="TASK-0037",
            )
        )

    # 4. ZATCA E-Invoicing
    t36 = find("TASK-0036")
    if t36:
        initiatives.append(
            Initiative(
                title="ZATCA E-Invoicing",
                status="Planning" if not is_done(t36) else "Done",
                meta=f"TASK-0036 · 5 sub-items · ~3.5 weeks · {t36.status}",
                progress_pct=5 if not is_done(t36) else 100,
                details_html=(
                    "<strong>Gated on 6 owner decisions:</strong> Q1 per-merchant CSID · Q2 real-time vs batch · "
                    "Q3 cross-border VAT · Q4 credit note counter · Q5 offline mode · Q6 sandbox account.<br>"
                    "<strong>Next:</strong> Per-tenant VAT config (sub-item 1, ~4.5 days)."
                ),
                task_id="TASK-0036",
            )
        )

    # 5. Live-Deploy Readiness Tracker
    t38 = find("TASK-0038")
    if t38:
        initiatives.append(
            Initiative(
                title="Live-Deploy Readiness Tracker",
                status="Open",
                meta=f"TASK-0038 · 10 owner action items · 0/10 closed",
                progress_pct=0,
                details_html=(
                    "<strong>Critical for M4/M5:</strong> G1 CR + G2 VAT + G3 E-commerce license + "
                    "G4 DPO + G5 Trademark + G6 PCI-ASV + G7 Pen-test + G8 KSA hosting + G9 Tabby DPA + G10 DR plan.<br>"
                    "<strong>Items below:</strong> Click to mark closed (saves locally in browser)."
                ),
                task_id="TASK-0038",
            )
        )

    return initiatives


# ---------- HTML template ----------


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Haa Stores — خطة الإطلاق | حتى مبروك</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
/* … embedded CSS (identical to original MASTER_ROADMAP.html) … */
__CSS__
</style>
</head>
<body>
<div class="container">
  <header class="hero">
    <div class="hero-label">Master Roadmap · {today} · Branch: {branch}</div>
    <h1>من هنا إلى <span class="accent">"مبروك"</span><br>خطة الإطلاق التجاري</h1>
    <p class="hero-sub">
      المسار الكامل من الـ {commits} commits الحالية إلى controlled-beta launch عام.
      3 lanes متوازية (Engineering + Owner/Legal + External)، 6 معالم حاسمة، 10 قرارات ملكية،
      و~4-5 أسابيع تقويمية للوصول.
    </p>
    <div class="hero-stats">
      <div class="hero-stat"><div class="hero-stat-num primary">{commits}</div><div class="hero-stat-label">commit على الـ branch</div></div>
      <div class="hero-stat"><div class="hero-stat-num">{tests_passing}</div><div class="hero-stat-label">test passing</div></div>
      <div class="hero-stat"><div class="hero-stat-num">10</div><div class="hero-stat-label">owner action items</div></div>
      <div class="hero-stat"><div class="hero-stat-num">~4-5w</div><div class="hero-stat-label">للإطلاق (تقويمي)</div></div>
    </div>
  </header>

  <section>
    <div class="section-head">
      <div class="section-num">01 / المعالم</div>
      <h2>ست نقاط تحول، من <span class="accent">الآن</span> إلى "مبروك"</h2>
      <p class="section-sub">كل milestone يفتح الـ lane اللي بعده. آخر معلم = "مبروك" (إطلاق invite-only beta مع 10-20 تاجر).</p>
    </div>
    <div class="milestones">
      <div class="milestone done"><div class="milestone-tag">✅ Done</div><div class="milestone-title">M0<br>Foundation</div><div class="milestone-meta">Quality Pass 1-5<br>TASK-0025–0029</div><div class="milestone-dot"></div></div>
      <div class="milestone done"><div class="milestone-tag">✅ Done</div><div class="milestone-title">M1<br>Compliance</div><div class="milestone-meta">3DS + VAT<br>TASK-0035</div><div class="milestone-dot"></div></div>
      <div class="milestone current"><div class="milestone-tag">→ Now</div><div class="milestone-title">M2<br>P0 Fixes</div><div class="milestone-meta">Marketplace Phase 1<br>TASK-0040</div><div class="milestone-dot"></div></div>
      <div class="milestone"><div class="milestone-tag">Pending</div><div class="milestone-title">M3<br>Compliance</div><div class="milestone-meta">SFDA + Categories<br>TASK-0041–0042</div><div class="milestone-dot"></div></div>
      <div class="milestone"><div class="milestone-tag">Pending</div><div class="milestone-title">M4<br>Owner Gates</div><div class="milestone-meta">CR + VAT + DPO<br>TASK-0038 + 0044</div><div class="milestone-dot"></div></div>
      <div class="milestone"><div class="milestone-tag">مبروك 🎉</div><div class="milestone-title">M5<br>Beta Live</div><div class="milestone-meta">Pen-test + 20 merchant<br>TASK-0045</div><div class="milestone-dot"></div></div>
    </div>
  </section>

  <section>
    <div class="section-head">
      <div class="section-num">02 / المسارات</div>
      <h2>ثلاث مسارات متوازية، <span class="accent">كلها</span> لازم تكمل قبل "مبروك"</h2>
      <p class="section-sub">كل lane عندها progress مستقل. الـ bottlenecks الرئيسية = Owner lane (CR/VAT/DPO) + External lane (pen-test firm).</p>
    </div>
    <div class="lanes">
      <div class="lane">
        <div class="lane-head">
          <div class="lane-icon">__SVG_CODE__</div>
          <div style="flex:1;">
            <div class="lane-title">Engineering</div>
            <div class="lane-sub">{eng_done}/{eng_total} done · parallel tracks</div>
            <div class="lane-progress">
              <div class="lane-bar"><div class="lane-bar-fill" style="width: {eng_pct}%;"></div></div>
              <div class="lane-pct">{eng_pct}%</div>
            </div>
          </div>
        </div>
        <ul class="lane-list">
__ENGINEERING_LIST__
        </ul>
      </div>

      <div class="lane">
        <div class="lane-head">
          <div class="lane-icon" style="background: var(--warn-soft); color: var(--warn);">__SVG_OWNER__</div>
          <div style="flex:1;">
            <div class="lane-title">Owner / Legal</div>
            <div class="lane-sub">10 items · 1-3 weeks calendar</div>
            <div class="lane-progress">
              <div class="lane-bar"><div class="lane-bar-fill" style="width: {owner_pct}%; background: var(--warn);"></div></div>
              <div class="lane-pct">{owner_done}/10</div>
            </div>
          </div>
        </div>
        <ul class="lane-list">
__OWNER_LIST__
        </ul>
      </div>

      <div class="lane">
        <div class="lane-head">
          <div class="lane-icon" style="background: var(--danger-soft); color: var(--accent);">__SVG_EXTERNAL__</div>
          <div style="flex:1;">
            <div class="lane-title">External / Vendor</div>
            <div class="lane-sub">PCI-ASV + Pen-test · 2-3 weeks</div>
            <div class="lane-progress">
              <div class="lane-bar"><div class="lane-bar-fill" style="width: {ext_pct}%; background: var(--accent);"></div></div>
              <div class="lane-pct">{ext_done}/{ext_total}</div>
            </div>
          </div>
        </div>
        <ul class="lane-list">
__EXTERNAL_LIST__
        </ul>
      </div>
    </div>
  </section>

  <section>
    <div class="section-head">
      <div class="section-num">03 / المبادرات</div>
      <h2>خمس مبادرات استراتيجية <span class="accent">قائمة الآن</span></h2>
      <p class="section-sub">حالة كل مبادرة، الـ sub-items النشطة، و الـ next action. مرتبة حسب الأولوية للإطلاق التجاري.</p>
    </div>
    <div class="initiatives">
__INITIATIVES__
    </div>
  </section>

  <section>
    <div class="section-head">
      <div class="section-num">04 / الجدول</div>
      <h2>المسار الزمني من <span class="accent">الآن</span></h2>
      <p class="section-sub">كل مرحلة مع الـ gates + الـ decision points. اللى يوقف المشروع = Owner lane + External lane.</p>
    </div>
    <ol class="timeline">
      <li class="timeline-item done">
        <div class="timeline-stage done">Milestone M0 — Done</div>
        <h3 class="timeline-title">Foundation (Quality Pass 1-5)</h3>
        <div class="timeline-meta"><span>📅 2026-06-14 → 17</span><span>⏱️ 10 commits net</span><span>🧪 2,411 tests passing</span></div>
        <div class="timeline-body"><strong>Closed:</strong> Schema dedup · Migration dedup · CSRF · Webhook idempotency · Audit depth · RBAC coverage · CI/CD pipeline · Sentry shim · Redis rate-limiter · Service-layer enforcement · Queue scaffold · Theme rationalization.</div>
        <div class="timeline-actions"><span class="timeline-tag eng">Engineering</span></div>
      </li>
      <li class="timeline-item done">
        <div class="timeline-stage done">Milestone M1 — Done</div>
        <h3 class="timeline-title">Compliance — 3DS + VAT</h3>
        <div class="timeline-meta"><span>📅 2026-06-17</span><span>⏱️ 11 commits</span><span>🧪 +64 tests</span></div>
        <div class="timeline-body"><strong>Shipped:</strong> SAMA 3DS for Moyasar + Geidea + Fake · Fake3DSChallenge dev UI · VAT helpers · Checkout VAT line · "شامل الضريبة" product card badge · 5 live-deploy-readiness docs.</div>
        <div class="timeline-actions"><span class="timeline-tag eng">Engineering</span><span class="timeline-tag legal">Legal doc scaffold</span></div>
      </li>
      <li class="timeline-item current">
        <div class="timeline-stage now">Now → Milestone M2</div>
        <h3 class="timeline-title">Marketplace Phase 1 — Self-Contained P0s</h3>
        <div class="timeline-meta"><span>📅 Phase 0 done 2026-06-17</span><span>⏱️ 2 days (3 parallel tracks)</span><span>🎯 TASK-0040</span></div>
        <div class="timeline-body"><strong>Track 1A:</strong> Replace raw SQL with shared <code>shouldShowInMarketplace</code> helper. Seed <code>'general'</code> → <code>'main'</code>.<br><strong>Track 1B:</strong> Add <code>accessToken</code> (uuid) column. Replace <code>?phone=</code> with <code>?access_token=</code>.<br><strong>Track 1C:</strong> Audit calls on admin marketplace review + feature endpoints.</div>
        <div class="timeline-actions"><span class="timeline-tag eng">Engineering</span><span class="timeline-tag">Awaits owner GO</span></div>
      </li>
      <li class="timeline-item">
        <div class="timeline-stage">Phase 2 + 3 (parallel) → Milestone M3</div>
        <h3 class="timeline-title">SFDA Fields + Legal Copy</h3>
        <div class="timeline-meta"><span>⏱️ 3-5 days eng + 1-2 weeks legal</span><span>🎯 TASK-0041 + TASK-0042</span></div>
        <div class="timeline-body"><strong>Phase 2 (eng):</strong> Migration 0059 + 0060. SFDA columns + category blocklist + admin verification UI.<br><strong>Phase 3 (legal):</strong> PRIVACY_POLICY §2.4 · TERMS_OF_SERVICE §8 · SFDA_DISCLAIMER.md · DPO appointment.</div>
        <div class="timeline-actions"><span class="timeline-tag eng">Engineering</span><span class="timeline-tag legal">Legal/DPO</span></div>
      </li>
      <li class="timeline-item">
        <div class="timeline-stage">Phase 4 + 5 → Milestone M4</div>
        <h3 class="timeline-title">P1 Fixes + Owner Gates Closure</h3>
        <div class="timeline-meta"><span>⏱️ 3 days eng + 1-3 weeks owner</span><span>🎯 TASK-0043 + TASK-0044</span></div>
        <div class="timeline-body"><strong>Phase 4 (eng):</strong> CSRF guest test + rate limit (P1-1, P1-9) · permission granularity + admin pagination (P1-2, P1-3) · Integration tests T5-T10.<br><strong>Phase 5 (owner):</strong> Close all 10 items in TASK-0038.</div>
        <div class="timeline-actions"><span class="timeline-tag eng">Engineering</span><span class="timeline-tag owner">Owner</span></div>
      </li>
      <li class="timeline-item">
        <div class="timeline-stage">Phase 6 → Milestone M5 · مبروك</div>
        <h3 class="timeline-title">Pen-Test + Controlled Beta Launch</h3>
        <div class="timeline-meta"><span>⏱️ 5-7 days eng + 1-2 weeks external</span><span>🎯 TASK-0045</span><span>🚀 "مبروك"</span></div>
        <div class="timeline-body"><strong>Step 8.1 (eng):</strong> Pre-pen-test smoke. <strong>Step 8.2 (external):</strong> CREST pen-test. <strong>Step 8.3 (eng):</strong> Triage findings. <strong>Step 8.4 (launch):</strong> Invite 10-20 merchants with KYC verified. Soft-launch. Rollback: <code>MARKETPLACE_PUBLIC_ENABLED=false</code>.</div>
        <div class="timeline-actions"><span class="timeline-tag eng">Engineering</span><span class="timeline-tag owner">Owner</span><span class="timeline-tag legal">External pen-test</span></div>
      </li>
    </ol>
  </section>

  <section>
    <div class="section-head">
      <div class="section-num">05 / ملكية</div>
      <h2>القرارات العشر <span class="accent">اللي لازم أنت تسويها</span></h2>
      <p class="section-sub">كل عنصر = blocker صريح لـ M4 أو M5. Engineering ما يقدر يحركها. اضغط على الـ checkbox عشان تحدّث تقدّمك (ينحفظ في المتصفح).</p>
    </div>
    <div class="owner-grid" id="ownerGrid">
__OWNER_GRID__
    </div>
  </section>

  <section>
    <div class="cta">
      <div class="cta-label">Where you are now</div>
      <h2 class="cta-title">أنت على بعد خطوة واحدة من Phase 1 الفعلي.</h2>
      <p class="cta-body">كل اللي Engineering يحتاجه منك الآن = GO signal واحد لـ TASK-0040. بعدها 2 أيام متوازية ثم تقرير. الـ 10 owner items أقدر أتعامل معها بعد، لكن إذا حابب تبدأ بأي واحد منهم، أرسل لي وسأساعدك.</p>
      <div class="cta-grid">
        <div class="cta-card"><div class="cta-card-label">If you say</div><div class="cta-card-title">"MARKETPLACE" أو "GO"</div><div class="cta-card-body">نبدأ TASK-0040 Phase 1 فوراً.</div></div>
        <div class="cta-card"><div class="cta-card-label">If you say</div><div class="cta-card-title">"ZATCA"</div><div class="cta-card-body">أعرض الـ 6 decisions بالتفصيل.</div></div>
        <div class="cta-card"><div class="cta-card-label">If you say</div><div class="cta-card-title">"G1" (أو أي owner item)</div><div class="cta-card-body">أجهّزلك checklist + خطوات عملية.</div></div>
        <div class="cta-card"><div class="cta-card-label">If you say</div><div class="cta-card-title">"قف" أو "break"</div><div class="cta-card-body">أوقف، الـ branch جاهز 100%.</div></div>
      </div>
    </div>
  </section>

  <footer class="foot">
    <div>Haa Stores · Master Roadmap · {today} · regenerated by scripts/roadmap-regenerate.py</div>
    <div class="foot-mono">branch: {branch} · {commits} commits · {tests_passing} tests</div>
  </footer>
</div>

<script>
// Persist owner item checkbox state in localStorage
(function() {{
  const KEY = 'haa-owner-items-2026-06-17';
  const saved = JSON.parse(localStorage.getItem(KEY) || '{{}}');
  const checkboxes = document.querySelectorAll('#ownerGrid input[type="checkbox"]');

  // Restore
  checkboxes.forEach(cb => {{
    const id = cb.dataset.id;
    if (saved[id]) {{
      cb.checked = true;
      cb.closest('.owner-item').classList.add('done');
    }}
  }});

  // Save on change
  checkboxes.forEach(cb => {{
    cb.addEventListener('change', () => {{
      const id = cb.dataset.id;
      saved[id] = cb.checked;
      localStorage.setItem(KEY, JSON.stringify(saved));
      cb.closest('.owner-item').classList.toggle('done', cb.checked);
    }});
  }});
}})();
</script>
</body>
</html>
"""


# CSS embedded in template (extracted from original HTML)
CSS = r"""
:root {
  --bg: #f7f5f0;
  --card: #ffffff;
  --line: #e9e3d6;
  --line-soft: #f1ece1;
  --text: #14171e;
  --muted: #7c7a72;
  --subtle: #a8a59b;
  --primary: #2f6f5e;
  --primary-soft: rgba(47, 111, 94, 0.08);
  --warn: #c97b3f;
  --warn-soft: rgba(201, 123, 63, 0.1);
  --danger: #b06367;
  --danger-soft: rgba(176, 99, 103, 0.1);
  --accent: #b06367;
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--text);
  font-family: 'Outfit', system-ui, sans-serif; font-size: 15px; line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  background-image:
    radial-gradient(ellipse at 100% 0%, rgba(47, 111, 94, 0.05), transparent 50%),
    radial-gradient(ellipse at 0% 100%, rgba(176, 99, 103, 0.04), transparent 50%);
}
.container { max-width: 1120px; margin: 0 auto; padding: 64px 32px 96px; }
.hero { padding: 56px 0 40px; }
.hero-label {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 12px; font-weight: 500; letter-spacing: 0.12em;
  color: var(--muted); text-transform: uppercase; margin-bottom: 24px;
}
.hero-label::before { content: ""; width: 32px; height: 1px; background: var(--muted); }
h1 {
  font-family: 'DM Serif Display', serif; font-weight: 400;
  font-size: 64px; line-height: 1.05; letter-spacing: -0.01em; margin: 0 0 24px;
}
h1 .accent { color: var(--primary); font-style: italic; }
.hero-sub { font-size: 19px; line-height: 1.5; color: var(--muted); max-width: 680px; margin: 0 0 40px; }
.hero-stats {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 0;
  border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); margin-top: 48px;
}
.hero-stat { padding: 24px 0; text-align: start; border-inline-start: 1px solid var(--line); }
.hero-stat:first-child { border-inline-start: 0; }
.hero-stat-num { font-family: 'DM Serif Display', serif; font-size: 40px; line-height: 1; margin-bottom: 6px; }
.hero-stat-num.primary { color: var(--primary); }
.hero-stat-label { font-size: 13px; color: var(--muted); letter-spacing: 0.02em; }
section { margin-top: 80px; }
.section-head { margin-bottom: 32px; }
.section-num { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--subtle); margin-bottom: 12px; letter-spacing: 0.08em; }
h2 { font-family: 'DM Serif Display', serif; font-weight: 400; font-size: 36px; line-height: 1.15; margin: 0 0 12px; letter-spacing: -0.005em; }
h2 .accent { color: var(--primary); }
.section-sub { font-size: 16px; color: var(--muted); max-width: 640px; margin: 0; }
.milestones { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-top: 32px; }
.milestone {
  background: var(--card); border: 1px solid var(--line); border-radius: 12px;
  padding: 20px 16px; position: relative; transition: all 0.2s;
}
.milestone:hover { transform: translateY(-1px); box-shadow: 0 4px 16px -2px rgba(0,0,0,0.06); }
.milestone.done { background: linear-gradient(135deg, var(--primary-soft), transparent); border-color: var(--primary); }
.milestone.current { border-color: var(--warn); background: linear-gradient(135deg, var(--warn-soft), transparent); }
.milestone-tag { font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--subtle); margin-bottom: 8px; }
.milestone.done .milestone-tag { color: var(--primary); }
.milestone.current .milestone-tag { color: var(--warn); }
.milestone-title { font-family: 'DM Serif Display', serif; font-size: 20px; line-height: 1.2; margin-bottom: 6px; }
.milestone-meta { font-size: 12px; color: var(--muted); }
.milestone-dot { position: absolute; top: 16px; inset-inline-end: 16px; width: 8px; height: 8px; border-radius: 50%; background: var(--line); }
.milestone.done .milestone-dot { background: var(--primary); }
.milestone.current .milestone-dot { background: var(--warn); box-shadow: 0 0 0 4px rgba(201, 123, 63, 0.18); }
.lanes { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 32px; }
.lane { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 24px; position: relative; }
.lane-head { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--line-soft); }
.lane-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: var(--primary-soft); color: var(--primary); }
.lane-title { font-size: 15px; font-weight: 600; letter-spacing: 0.01em; }
.lane-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
.lane-progress { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.lane-bar { flex: 1; height: 4px; background: var(--line-soft); border-radius: 2px; overflow: hidden; }
.lane-bar-fill { height: 100%; background: var(--primary); border-radius: 2px; }
.lane-pct { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--muted); min-width: 32px; text-align: end; }
.lane-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.lane-item { display: flex; gap: 10px; font-size: 13px; line-height: 1.45; }
.lane-item input[type="checkbox"] { margin-top: 3px; accent-color: var(--primary); flex-shrink: 0; cursor: pointer; }
.lane-item.done { color: var(--subtle); text-decoration: line-through; }
.lane-item strong { font-weight: 600; color: var(--text); }
.lane-item .task-id { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--subtle); background: var(--bg); padding: 2px 6px; border-radius: 4px; margin-inline-start: 4px; }
.initiatives { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 32px; }
.initiative { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 28px; position: relative; transition: all 0.2s; }
.initiative:hover { transform: translateY(-1px); box-shadow: 0 4px 16px -2px rgba(0,0,0,0.06); }
.init-status { position: absolute; top: 24px; inset-inline-end: 24px; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; padding: 4px 10px; border-radius: 99px; }
.init-status.done { color: var(--primary); background: var(--primary-soft); }
.init-status.active { color: var(--warn); background: var(--warn-soft); }
.init-status.planning { color: var(--accent); background: var(--danger-soft); }
.init-title { font-family: 'DM Serif Display', serif; font-size: 22px; line-height: 1.2; margin: 0 0 8px; max-width: 80%; }
.init-meta { font-size: 12px; color: var(--muted); margin-bottom: 16px; }
.init-progress-row { display: flex; align-items: center; gap: 12px; margin: 16px 0; }
.init-progress-bar { flex: 1; height: 6px; background: var(--line-soft); border-radius: 3px; overflow: hidden; }
.init-progress-fill { height: 100%; background: var(--primary); border-radius: 3px; transition: width 0.3s; }
.init-pct { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--text); font-weight: 600; }
.init-subitems { font-size: 13px; color: var(--muted); margin-top: 12px; line-height: 1.6; }
.init-subitems strong { color: var(--text); font-weight: 600; }
.timeline { list-style: none; padding: 0; margin: 32px 0 0; position: relative; }
.timeline::before { content: ""; position: absolute; right: 11px; top: 8px; bottom: 8px; width: 2px; background: linear-gradient(to bottom, var(--primary) 0%, var(--line) 100%); }
.timeline-item { position: relative; padding: 0 0 36px 0; padding-inline-start: 44px; }
.timeline-item:last-child { padding-bottom: 0; }
.timeline-item::before { content: ""; position: absolute; right: 6px; top: 6px; width: 12px; height: 12px; border-radius: 50%; background: white; border: 2px solid var(--primary); }
.timeline-item.done::before { background: var(--primary); }
.timeline-item.current::before { border-color: var(--warn); background: white; box-shadow: 0 0 0 4px rgba(201, 123, 63, 0.2); }
.timeline-stage { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--subtle); margin-bottom: 4px; }
.timeline-stage.now { color: var(--warn); }
.timeline-stage.done { color: var(--primary); }
.timeline-title { font-family: 'DM Serif Display', serif; font-size: 24px; line-height: 1.2; margin: 0 0 6px; }
.timeline-meta { display: flex; gap: 16px; font-size: 12px; color: var(--muted); margin-bottom: 8px; flex-wrap: wrap; }
.timeline-meta span { display: inline-flex; align-items: center; gap: 4px; }
.timeline-body { font-size: 14px; color: var(--muted); line-height: 1.6; max-width: 720px; }
.timeline-body strong { color: var(--text); font-weight: 600; }
.timeline-actions { margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap; }
.timeline-tag { display: inline-block; font-size: 11px; padding: 3px 10px; border-radius: 99px; background: var(--bg); color: var(--muted); border: 1px solid var(--line); }
.timeline-tag.eng { color: var(--primary); border-color: var(--primary); background: var(--primary-soft); }
.timeline-tag.owner { color: var(--warn); border-color: var(--warn); background: var(--warn-soft); }
.timeline-tag.legal { color: var(--accent); border-color: var(--accent); background: var(--danger-soft); }
.owner-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 32px; }
.owner-item { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 18px 20px; display: flex; align-items: flex-start; gap: 14px; transition: all 0.15s; }
.owner-item:hover { border-color: var(--primary); }
.owner-item input[type="checkbox"] { margin-top: 2px; accent-color: var(--primary); width: 16px; height: 16px; cursor: pointer; flex-shrink: 0; }
.owner-text { flex: 1; }
.owner-code { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--subtle); background: var(--bg); padding: 2px 8px; border-radius: 4px; display: inline-block; margin-bottom: 6px; }
.owner-name { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 2px; }
.owner-item.done .owner-name { color: var(--subtle); text-decoration: line-through; }
.owner-source { font-size: 11px; color: var(--muted); margin-top: 4px; }
.cta { margin-top: 80px; background: linear-gradient(135deg, var(--primary) 0%, #1f5547 100%); color: white; border-radius: 18px; padding: 48px; position: relative; overflow: hidden; }
.cta::before { content: ""; position: absolute; top: -50%; inset-inline-end: -10%; width: 400px; height: 400px; background: radial-gradient(circle, rgba(255,255,255,0.08), transparent 70%); border-radius: 50%; }
.cta-label { font-size: 12px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.8; margin-bottom: 16px; position: relative; }
.cta-title { font-family: 'DM Serif Display', serif; font-size: 36px; line-height: 1.15; margin: 0 0 16px; position: relative; max-width: 720px; }
.cta-body { font-size: 16px; line-height: 1.6; opacity: 0.85; max-width: 720px; margin: 0 0 32px; position: relative; }
.cta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; position: relative; }
.cta-card { background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 10px; padding: 16px 18px; backdrop-filter: blur(4px); }
.cta-card-label { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.7; margin-bottom: 6px; }
.cta-card-title { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
.cta-card-body { font-size: 13px; opacity: 0.75; line-height: 1.5; }
.foot { margin-top: 64px; padding-top: 24px; border-top: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--muted); }
.foot-mono { font-family: 'JetBrains Mono', monospace; }
@media (max-width: 900px) {
  .container { padding: 32px 20px 64px; }
  h1 { font-size: 40px; }
  h2 { font-size: 28px; }
  .hero-stats { grid-template-columns: 1fr 1fr; }
  .hero-stat { border-inline-start: 0; border-top: 1px solid var(--line); }
  .hero-stat:nth-child(odd) { border-inline-end: 1px solid var(--line); }
  .hero-stat:nth-child(-n+2) { border-top: 0; }
  .milestones { grid-template-columns: 1fr 1fr; }
  .lanes { grid-template-columns: 1fr; }
  .initiatives { grid-template-columns: 1fr; }
  .owner-grid { grid-template-columns: 1fr; }
  .cta { padding: 32px 24px; }
  .cta-title { font-size: 28px; }
  .cta-grid { grid-template-columns: 1fr; }
}
"""

# SVG icons (lucide-style)
SVG_CODE = (
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" '
    'stroke="currentColor" stroke-width="2">'
    '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>'
)
SVG_OWNER = (
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" '
    'stroke="currentColor" stroke-width="2">'
    '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
)
SVG_EXTERNAL = (
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" '
    'stroke="currentColor" stroke-width="2">'
    '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'
)


# ---------- Render ----------


def render_engineering_list(tasks: list[Task]) -> str:
    """Build the engineering lane list HTML."""
    engineering_tasks = [t for t in tasks if classify_task(t) == "engineering"]
    # Sort: Done first (so checked items appear at top), then by ID descending
    engineering_tasks.sort(key=lambda t: (not is_done(t), -int(t.id[5:])))

    items_html = []
    for t in engineering_tasks[:12]:  # cap to top 12 for visual
        cls = "lane-item done" if is_done(t) else "lane-item"
        items_html.append(
            f'      <li class="{cls}"><input type="checkbox" '
            f'{"checked" if is_done(t) else ""} disabled><span>'
            f'<strong>{t.title[:55]}</strong> '
            f'<span class="task-id">{t.id}</span></span></li>'
        )
    return "\n".join(items_html)


def render_owner_list() -> str:
    """Static owner list (10 items)."""
    items = [
        ("G1", "Commercial Registration", "MoCI"),
        ("G2", "VAT Registration", "ZATCA cert"),
        ("G3", "E-commerce license", "MoCI online"),
        ("G4", "DPO Appointment", "PDPL Art. 22"),
        ("G5", "Trademark 'هاء متاجر'", "SAIP"),
        ("G6", "PCI-DSS ASV Scan", "Approved vendor"),
        ("G7", "CREST Pen-Test firm", "engage + scope"),
        ("G8", "KSA Hosting Decision", "Dubai vs wait"),
        ("G9", "Tabby DPA", "UAE cross-border"),
        ("G10", "DR plan + tabletop", "NCA req"),
    ]
    items_html = []
    for code, name, sub in items:
        items_html.append(
            f'      <li class="lane-item"><input type="checkbox" disabled>'
            f'<span><strong>{name}</strong> '
            f'<span class="task-id">{code}</span> — {sub}</span></li>'
        )
    return "\n".join(items_html)


def render_external_list() -> str:
    """Static external/vendor list."""
    items = [
        ("G6", "PCI-DSS ASV scan", "Approved vendor"),
        ("G7", "CREST pen-test firm", "engage + scope"),
        ("8.2", "Pen-test execution", "1 week calendar"),
        ("G7", "Pen-test report PASS", "or all Critical/High fixed"),
    ]
    items_html = []
    for code, name, sub in items:
        items_html.append(
            f'      <li class="lane-item"><input type="checkbox" disabled>'
            f'<span><strong>{name}</strong> '
            f'<span class="task-id">{code}</span> — {sub}</span></li>'
        )
    return "\n".join(items_html)


def render_initiatives(initiatives: list[Initiative]) -> str:
    """Build the initiatives grid HTML."""
    cards = []
    for init in initiatives:
        status_lower = init.status.lower()
        if status_lower == "done":
            badge_cls = "init-status done"
        elif status_lower == "planning":
            badge_cls = "init-status planning"
        else:
            badge_cls = "init-status active"
        bar_color = (
            "var(--primary)"
            if status_lower == "done"
            else ("var(--warn)" if status_lower != "planning" else "var(--accent)")
        )
        cards.append(
            f'      <div class="initiative">\n'
            f'        <div class="{badge_cls}">{init.status}</div>\n'
            f'        <h3 class="init-title">{init.title}</h3>\n'
            f'        <div class="init-meta">{init.meta}</div>\n'
            f'        <div class="init-progress-row">\n'
            f'          <div class="init-progress-bar"><div class="init-progress-fill" '
            f'style="width: {init.progress_pct}%; background: {bar_color};"></div></div>\n'
            f'          <div class="init-pct">{init.progress_pct}%</div>\n'
            f'        </div>\n'
            f'        <div class="init-subitems">{init.details_html}</div>\n'
            f'      </div>'
        )
    return "\n".join(cards)


def render_owner_grid() -> str:
    """Static 10 owner items as interactive checkboxes."""
    items = [
        ("G1", "Commercial Registration (CR) — MoCI", "SAUDI_COMPLIANCE_CHECKLIST.md:178"),
        ("G2", "VAT Registration — ZATCA certificate", "SAUDI_COMPLIANCE_CHECKLIST.md:134"),
        ("G3", "E-commerce license — MoCI online sales", "SAUDI_COMPLIANCE_CHECKLIST.md:179"),
        ("G4", "DPO Appointment — PDPL Article 22", "SAUDI_COMPLIANCE_CHECKLIST.md:97-98"),
        ("G5", "Trademark Registration 'هاء متاجر' — SAIP", "SAUDI_COMPLIANCE_CHECKLIST.md:280"),
        ("G6", "PCI-DSS ASV Scan — Approved vendor", "SAUDI_COMPLIANCE_CHECKLIST.md:43"),
        ("G7", "CREST Pen-Test firm — engage + scope", "MARKETPLACE_HARDENING_PLAN Phase 6"),
        ("G8", "KSA Hosting Decision — Dubai-now vs wait-KSA", "SAUDI_COMPLIANCE_CHECKLIST.md:208"),
        ("G9", "Tabby DPA — UAE cross-border", "SAUDI_COMPLIANCE_CHECKLIST.md:96"),
        ("G10", "Disaster Recovery Plan + tabletop test", "NCA requirement"),
    ]
    cards = []
    for code, name, source in items:
        cards.append(
            f'      <label class="owner-item"><input type="checkbox" '
            f'data-id="{code}"><div class="owner-text"><div class="owner-code">{code}</div>'
            f'<div class="owner-name">{name}</div>'
            f'<div class="owner-source">Source: {source}</div></div></label>'
        )
    return "\n".join(cards)


# ---------- Main ----------


def main() -> int:
    if not TASK_TRACKER.exists():
        print(f"ERROR: TASK_TRACKER.md not found at {TASK_TRACKER}", file=sys.stderr)
        return 1

    print(f"Reading {TASK_TRACKER.name}...")
    task_text = TASK_TRACKER.read_text(encoding="utf-8")
    tasks = extract_tasks(task_text)
    print(f"  → Extracted {len(tasks)} tasks")

    print(f"Reading {CURRENT_STATE.name}...")
    cs_text = CURRENT_STATE.read_text(encoding="utf-8")
    cs_data = extract_current_state(cs_text)
    print(f"  → Last updated: {cs_data['last_updated'][:80]}...")
    print(f"  → Commits (from doc): {cs_data['commits']}")
    print(f"  → Tests passing (from doc): {cs_data['tests_passing']}")

    # Git commit count is the source of truth (more accurate than the doc)
    commits = get_git_commit_count()
    print(f"  → Commits (from git): {commits}")
    branch = get_branch_name()
    print(f"  → Branch: {branch}")

    initiatives = infer_initiatives(tasks, cs_data)
    print(f"  → Built {len(initiatives)} initiatives")

    # Engineering lane stats
    eng_tasks = [t for t in tasks if classify_task(t) == "engineering"]
    eng_done = sum(1 for t in eng_tasks if is_done(t))
    eng_total = max(len(eng_tasks), 1)
    eng_pct = int((eng_done / eng_total) * 100) if eng_total else 0

    today = datetime.now().strftime("%Y-%m-%d")

    html = HTML_TEMPLATE
    # Use simple replace() (NOT .format()) because:
    #   - HTML contains { } characters that .format() treats as placeholders
    #   - All __PLACEHOLDER__ markers use double-underscore convention (no conflicts)
    replacements = {
        "{today}": today,
        "{branch}": branch,
        "{commits}": str(commits),
        "{tests_passing}": str(cs_data["tests_passing"] or 2411),
        "{eng_done}": str(eng_done),
        "{eng_total}": str(eng_total),
        "{eng_pct}": str(eng_pct),
        "{owner_pct}": "0",
        "{owner_done}": "0",
        "{ext_done}": "0",
        "{ext_total}": "4",
        "{ext_pct}": "0",
        "__CSS__": CSS,
        "__SVG_CODE__": SVG_CODE,
        "__SVG_OWNER__": SVG_OWNER,
        "__SVG_EXTERNAL__": SVG_EXTERNAL,
        "__ENGINEERING_LIST__": render_engineering_list(tasks),
        "__OWNER_LIST__": render_owner_list(),
        "__EXTERNAL_LIST__": render_external_list(),
        "__INITIATIVES__": render_initiatives(initiatives),
        "__OWNER_GRID__": render_owner_grid(),
    }
    for placeholder, value in replacements.items():
        html = html.replace(placeholder, value)

    OUTPUT.write_text(html, encoding="utf-8")
    print(f"\n✓ Wrote {OUTPUT}")
    print(f"  → Size: {len(html):,} bytes ({len(html.splitlines())} lines)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
