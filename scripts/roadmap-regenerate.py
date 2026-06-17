#!/usr/bin/env python3
"""
Haa Stores — Master Roadmap (LIVE-DATA rebuild 2026-06-17)

Reads live data from:
  - git log (commits + latest message + commit messages for P0 detection)
  - TASK_TRACKER.md (task statuses)
  - CURRENT_STATE.md (tests passing + last updated)

Hardcoded only the static descriptions (P0 names, milestone names,
CTA options) — everything that can change is detected at runtime.

Usage:
  pnpm roadmap:generate
"""

from __future__ import annotations

import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TASK_TRACKER = REPO_ROOT / "docs" / "ops" / "TASK_TRACKER.md"
CURRENT_STATE = REPO_ROOT / "docs" / "ops" / "CURRENT_STATE.md"
OUTPUT = REPO_ROOT / "ROADMAP.html"

# Static: only descriptions that don't change frequently
P0_INFO = {
    "P0-1": "SFDA field + workflow",
    "P0-2": "Category blocklist",
    "P0-3": "Order tracking via accessToken",
    "P0-4": "Demo isolation contract",
    "P0-5": "Audit log on admin moderation",
    "P0-6": "Legal copy (PRIVACY + TERMS + SFDA_DISCLAIMER)",
}

P0_DESCRIPTIONS = {
    "P0-1": "Migration + Zod regex + service validation + admin verification UI.",
    "P0-2": "prohibited_in_marketplace column + 5 query filter sites.",
    "P0-3": "uuid token بدل ?phone=. يحل phone enumeration + PDPL leak.",
    "P0-4": "استبدال raw SQL بـ whitelist. seed 'general' → 'main'.",
    "P0-5": "audit.record على review + feature endpoints. PDPL Art. 17.",
    "P0-6": "PRIVACY_POLICY §2.4 + TERMS §8 + SFDA_DISCLAIMER. owner legal review.",
}

MILESTONES_STATIC = [
    ("M0", "Foundation", "Quality Pass 1-5", "TASK-0025-0029"),
    ("M1", "Compliance", "3DS + VAT", "TASK-0035"),
    ("M2", "Marketplace P0", "Phase 1+2: 6 P0s closed", "TASK-0040 + 0041"),
    ("M3", "Marketplace P1", "Phase 3+4: Legal + P1 fixes", "TASK-0042 + 0043"),
    ("M4", "Owner Gates", "Phase 5: TASK-0038 closure", "TASK-0044"),
    ("M5", "Beta Live", "Phase 6: pen-test + 20 merchants", "TASK-0045"),
]

CTAS = [
    ("MARKETPLACE", "نبدأ TASK-0041 Track 2.2 أو Phase جديدة",
     "engineering — يحبسك GO واحد."),
    ("ZATCA", "أعرض الـ 6 decisions بالتفصيل",
     "TASK-0036 gated على 6 owner questions."),
    ("G1 أو G2", "أجهّز checklist + خطوات عملية",
     "CR/VAT أبسط البداية للـ owner track."),
    ("قف", "أوقف، الـ branch جاهز 100%",
     "ROADMAP + DASHBOARD + preflight clean."),
]


def get_git_data() -> dict:
    """Returns dict with commits, latest, branch, p0_commits."""
    result = {"commits": 0, "latest": "", "branch": "(unknown)", "p0_commits": set()}
    for ref in ("main", "master", "origin/main", "origin/master"):
        try:
            count_out = subprocess.check_output(
                ["git", "log", "--oneline", f"{ref}..HEAD"],
                cwd=REPO_ROOT, stderr=subprocess.DEVNULL, text=True,
            ).strip()
            count = len(count_out.splitlines()) if count_out else 0
            if count:
                result["commits"] = count
                # Latest commit
                latest = subprocess.check_output(
                    ["git", "log", "-1", "--pretty=format:%h %s"],
                    cwd=REPO_ROOT, stderr=subprocess.DEVNULL, text=True,
                ).strip()
                result["latest"] = latest
                # Branch name
                branch = subprocess.check_output(
                    ["git", "branch", "--show-current"],
                    cwd=REPO_ROOT, stderr=subprocess.DEVNULL, text=True,
                ).strip()
                result["branch"] = branch or "(detached)"
                # All commit messages (full) for P0 detection
                msgs = subprocess.check_output(
                    ["git", "log", f"{ref}..HEAD", "--pretty=format:%s"],
                    cwd=REPO_ROOT, stderr=subprocess.DEVNULL, text=True,
                )
                for m in re.findall(r"P0-[1-6]", msgs):
                    result["p0_commits"].add(m)
                return result
        except subprocess.CalledProcessError:
            continue
    return result


def extract_task_statuses() -> dict:
    """Parse TASK_TRACKER.md → dict of task_id → status (lowercase, short)."""
    result = {}
    if not TASK_TRACKER.exists():
        return result
    text = TASK_TRACKER.read_text(encoding="utf-8")
    pattern = re.compile(
        r"###\s+(TASK-\d{4}):\s*([^\n]+)\n[\s\S]*?\*\*Status:\*\*\s*([^\n]+)",
        re.MULTILINE,
    )
    for m in pattern.finditer(text):
        tid = m.group(1)
        status_raw = m.group(3).strip().lower()
        # Normalize: "Done" → done, "Open" → open, etc.
        if status_raw.startswith("done"):
            result[tid] = "done"
        elif status_raw.startswith("open"):
            result[tid] = "open"
        elif "in progress" in status_raw:
            result[tid] = "in_progress"
        elif status_raw.startswith("planning"):
            result[tid] = "planning"
        else:
            result[tid] = status_raw.split()[0] if status_raw else "unknown"
    return result


def extract_state() -> dict:
    result = {"last_updated": "", "tests_passing": 0}
    if not CURRENT_STATE.exists():
        return result
    text = CURRENT_STATE.read_text(encoding="utf-8")
    m = re.search(r"\*\*Last Updated:\*\*\s*([^\n]+)", text)
    if m:
        result["last_updated"] = m.group(1).strip()
    m = re.search(r"(\d+)\s+tests passing", text)
    if m:
        result["tests_passing"] = int(m.group(1))
    return result


def compute_p0_statuses(git_p0_commits: set, task_statuses: dict) -> list:
    """Returns list of (code, status, description) for P0-1..P0-6.

    A P0 is "Done" if either:
    - Its commit message appears in git log (P0-X keyword)
    - OR the corresponding task is marked Done in TASK_TRACKER

    Mapping:
      P0-1 (SFDA)         → not yet a TASK in tracker; relies on commit
      P0-2 (Category)     → TASK-0041 (Phase 2)
      P0-3 (accessToken)  → TASK-0040 (Phase 1)
      P0-4 (Demo)         → TASK-0040 (Phase 1)
      P0-5 (Audit)        → TASK-0040 (Phase 1)
      P0-6 (Legal)        → TASK-0042 (Phase 3)
    """
    # P0 → relevant TASK mapping
    p0_task_map = {
        "P0-1": [],  # No dedicated task yet (Track 2.2 pending)
        "P0-2": ["TASK-0041"],
        "P0-3": ["TASK-0040"],
        "P0-4": ["TASK-0040"],
        "P0-5": ["TASK-0040"],
        "P0-6": ["TASK-0042"],
    }
    statuses = []
    for code in ["P0-1", "P0-2", "P0-3", "P0-4", "P0-5", "P0-6"]:
        closed = False
        # Check git commit messages
        if code in git_p0_commits:
            closed = True
        # Check task statuses
        for tid in p0_task_map[code]:
            if task_statuses.get(tid) == "done":
                closed = True
                break
        statuses.append((code, "done" if closed else "open", P0_DESCRIPTIONS[code]))
    return statuses


def compute_milestone_statuses(task_statuses: dict) -> list:
    """Compute status for each milestone based on task statuses."""
    # M0: TASK-0025 + TASK-0026 + TASK-0027 + TASK-0028 + TASK-0029 all Done
    m0_done = all(
        task_statuses.get(f"TASK-00{n}") == "done"
        for n in [25, 26, 27, 28, 29]
    )
    # M1: TASK-0035 Done
    m1_done = task_statuses.get("TASK-0035") == "done"
    # M2: TASK-0040 Done + TASK-0041 Done (Phase 1+2)
    m2_done = (
        task_statuses.get("TASK-0040") == "done"
        and task_statuses.get("TASK-0041") == "done"
    )
    m2_current = (
        task_statuses.get("TASK-0040") == "done"
        and task_statuses.get("TASK-0041") != "done"
    )
    # M3: TASK-0042 + TASK-0043 Done
    m3_done = (
        task_statuses.get("TASK-0042") == "done"
        and task_statuses.get("TASK-0043") == "done"
    )
    m3_current = (
        m2_done
        and not m3_done
        and (task_statuses.get("TASK-0042") != "done" or task_statuses.get("TASK-0043") != "done")
    )
    # M4: TASK-0044 Done (which requires TASK-0038 closed — owner actions)
    m4_done = task_statuses.get("TASK-0044") == "done"
    m4_current = m3_done and not m4_done
    # M5: TASK-0045 Done
    m5_done = task_statuses.get("TASK-0045") == "done"
    m5_current = m4_done and not m5_done

    return [
        ("done" if m0_done else "pending", m0_done),
        ("done" if m1_done else "pending", m1_done),
        ("done" if m2_done else "current" if m2_current else "pending", m2_done),
        ("done" if m3_done else "current" if m3_current else "pending", m3_done),
        ("done" if m4_done else "current" if m4_current else "pending", m4_done),
        ("done" if m5_done else "current" if m5_current else "pending", m5_done),
    ]


def compute_lane_progress(task_statuses: dict, p0_statuses: list) -> list:
    """Returns lane progress: (lane_id, done_count, total_count, items)."""
    # Engineering: TASK-0040, 0041, 0042, 0043, 0045 + ZATCA-style TASK-0036 (optional)
    eng_tasks = [
        ("TASK-0040", "Marketplace Phase 1", "3 P0s closed"),
        ("TASK-0041", "Marketplace Phase 2", "1 of 2 tracks done"),
        ("TASK-0042", "Phase 3 — Legal copy", "PRIVACY + TERMS + SFDA"),
        ("TASK-0043", "Phase 4 — P1 + tests", "T5-T10 integration"),
        ("TASK-0045", "Phase 6 — Pen-test + Beta", "20 merchants"),
    ]
    eng_items = []
    eng_done = 0
    for tid, name, sub in eng_tasks:
        status = task_statuses.get(tid, "unknown")
        if status == "done":
            eng_items.append(("done", f"{name} ✅", tid, sub))
            eng_done += 1
        elif status in ("in_progress", "open", "planning"):
            # Mark active if it's the first non-Done
            if not any(i[0] == "active" for i in eng_items):
                eng_items.append(("active", name, tid, sub))
            else:
                eng_items.append(("pending", name, tid, sub))
        else:
            eng_items.append(("pending", name, tid, sub))

    # Owner: TASK-0038 — count its closed items (placeholder, hardcoded for now)
    owner_items = [
        ("TASK-0038", "G1: CR (MoCI)", "السجل التجاري"),
        ("TASK-0038", "G2: VAT cert (ZATCA)", "فاتورة ضريبية"),
        ("TASK-0038", "G3: E-commerce license", "ترخيص مبيعات"),
        ("TASK-0038", "G4: DPO (PDPL Art. 22)", "حماية البيانات"),
        ("TASK-0038", "G5: Trademark (SAIP)", "تسجيل علامة"),
        ("TASK-0038", "G6: PCI-DSS ASV scan", "مورد معتمد"),
        ("TASK-0038", "G7: Pen-test firm", "CREST certified"),
        ("TASK-0038", "G8: KSA hosting", "قرار استضافة"),
        ("TASK-0038", "G9: Tabby DPA", "اتفاقية معالجة"),
        ("TASK-0038", "G10: DR plan", "إجراءات الكوارث"),
    ]
    # Owner items all pending — tracked in TASK-0038 separately
    owner_done_count = 0  # TODO: count from a checklist when available

    # External: pen-test firm + ASV scan
    ext_items = [
        ("TASK-0045", "PCI-DSS ASV scan", "approved vendor"),
        ("TASK-0045", "Pen-test firm engage", "CREST certified"),
        ("TASK-0045", "Pen-test report PASS", "1 week calendar"),
    ]

    lanes = [
        {
            "id": "eng", "title": "Engineering", "sub": "16-19 eng days · parallel",
            "done": eng_done, "total": len(eng_tasks),
            "items": [(s, n, t, sub) for s, n, t, sub in eng_items],
        },
        {
            "id": "owner", "title": "Owner / Legal", "sub": "10 items · 1-3 weeks",
            "done": owner_done_count, "total": 10,
            "items": [("pending", n, t, sub) for t, n, sub in owner_items],
        },
        {
            "id": "ext", "title": "External / Vendor", "sub": "Pen-test firm",
            "done": 0, "total": 3,
            "items": [("pending", n, t, sub) for t, n, sub in ext_items],
        },
    ]
    return lanes


def find_current_task(task_statuses: dict) -> tuple[str, str]:
    """Find the current active task (earliest non-Done in TASK-0040+)."""
    priority_ids = ["TASK-0040", "TASK-0041", "TASK-0042", "TASK-0043", "TASK-0044", "TASK-0045"]
    for tid in priority_ids:
        if task_statuses.get(tid) != "done":
            # Read the title from tracker
            if TASK_TRACKER.exists():
                text = TASK_TRACKER.read_text(encoding="utf-8")
                m = re.search(
                    rf"###\s+{tid}:\s*([^\n]+)", text
                )
                if m:
                    title = m.group(1).strip()
                    return (tid, title)
            return (tid, "—")
    return ("—", "كل المهام مكتملة أو مغلقة")


# ----------------- HTML template (same as before) -----------------

CSS = r"""
:root {
  --bg: #f7f5f0; --card: #ffffff; --line: #e9e3d6; --line-soft: #f1ece1;
  --text: #14171e; --muted: #7c7a72; --subtle: #a8a59b;
  --primary: #2f6f5e; --primary-soft: rgba(47, 111, 94, 0.08);
  --warn: #c97b3f; --warn-soft: rgba(201, 123, 63, 0.1);
  --danger: #b06367; --danger-soft: rgba(176, 99, 103, 0.1);
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--text);
  font-family: 'Outfit', system-ui, sans-serif; font-size: 15px; line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  background-image:
    radial-gradient(ellipse at 100% 0%, rgba(47, 111, 94, 0.04), transparent 50%),
    radial-gradient(ellipse at 0% 100%, rgba(176, 99, 103, 0.03), transparent 50%);
}
.container { max-width: 960px; margin: 0 auto; padding: 56px 24px 80px; }
h1 {
  font-family: 'DM Serif Display', serif; font-weight: 400;
  font-size: 48px; line-height: 1.1; letter-spacing: -0.01em; margin: 0 0 12px;
}
h1 .accent { color: var(--primary); font-style: italic; }
.subtitle { color: var(--muted); font-size: 17px; max-width: 640px; margin: 0 0 40px; line-height: 1.5; }
section { margin-top: 56px; }
.section-num { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--subtle); letter-spacing: 0.1em; margin-bottom: 8px; }
h2 { font-family: 'DM Serif Display', serif; font-weight: 400; font-size: 28px; line-height: 1.2; margin: 0 0 8px; }
h2 .accent { color: var(--primary); }
.section-sub { color: var(--muted); font-size: 14px; max-width: 640px; margin: 0 0 24px; line-height: 1.5; }
.hero-stats { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.hero-stat { padding: 20px 0; text-align: start; border-inline-start: 1px solid var(--line); }
.hero-stat:first-child { border-inline-start: 0; }
.hero-stat-num { font-family: 'DM Serif Display', serif; font-size: 32px; line-height: 1; margin-bottom: 4px; }
.hero-stat-num.primary { color: var(--primary); }
.hero-stat-label { font-size: 12px; color: var(--muted); }
.milestones { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-top: 24px; }
.m { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 16px 12px; min-height: 110px; }
.m.done { background: var(--primary-soft); border-color: var(--primary); }
.m.current { background: var(--warn-soft); border-color: var(--warn); border-width: 2px; }
.m-tag { font-size: 9px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--subtle); margin-bottom: 6px; }
.m.done .m-tag { color: var(--primary); }
.m.current .m-tag { color: var(--warn); }
.m-code { font-family: 'DM Serif Display', serif; font-size: 22px; line-height: 1.1; margin-bottom: 4px; }
.m-name { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
.m-desc { font-size: 11px; color: var(--muted); line-height: 1.3; }
.lanes { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 24px; }
.lane { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 20px; }
.lane-head { padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid var(--line-soft); }
.lane-title { font-size: 16px; font-weight: 600; margin-bottom: 2px; }
.lane-sub { font-size: 11px; color: var(--muted); margin-bottom: 10px; }
.lane-progress { display: flex; align-items: center; gap: 8px; }
.lane-bar { flex: 1; height: 4px; background: var(--line-soft); border-radius: 2px; overflow: hidden; }
.lane-bar-fill { height: 100%; background: var(--primary); border-radius: 2px; }
.lane-pct { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--muted); }
.lane-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.lane-item { font-size: 12px; line-height: 1.4; display: flex; gap: 6px; align-items: flex-start; }
.lane-item.done { color: var(--subtle); text-decoration: line-through; }
.lane-item.active { color: var(--text); font-weight: 500; }
.lane-item .icon { flex-shrink: 0; margin-top: 1px; }
.lane-item .task-id { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--subtle); background: var(--bg); padding: 1px 5px; border-radius: 3px; margin-inline-start: 4px; }
.lane-item .item-sub { font-size: 10px; color: var(--muted); margin-inline-start: 4px; }
.p0-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 24px; }
.p0 { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 16px; border-inline-start: 4px solid var(--subtle); }
.p0.done { border-inline-start-color: var(--primary); }
.p0.open { border-inline-start-color: var(--warn); }
.p0-code { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 600; color: var(--subtle); margin-bottom: 4px; }
.p0.done .p0-code { color: var(--primary); }
.p0.open .p0-code { color: var(--warn); }
.p0-title { font-size: 13px; font-weight: 600; margin-bottom: 4px; line-height: 1.3; }
.p0-desc { font-size: 11px; color: var(--muted); line-height: 1.4; }
.active-card { background: linear-gradient(135deg, var(--primary) 0%, #1f5547 100%); color: white; border-radius: 14px; padding: 28px; margin-top: 24px; }
.active-label { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.7; margin-bottom: 8px; }
.active-title { font-family: 'DM Serif Display', serif; font-size: 24px; line-height: 1.2; margin-bottom: 8px; }
.active-sub { font-size: 14px; opacity: 0.85; line-height: 1.5; }
.cta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }
.cta { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; }
.cta-label { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin-bottom: 4px; }
.cta-title { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
.cta-body { font-size: 12px; color: var(--muted); line-height: 1.4; }
footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--line); display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); }
.mono { font-family: 'JetBrains Mono', monospace; }
@media (max-width: 768px) {
  .container { padding: 32px 16px 64px; }
  h1 { font-size: 36px; }
  .hero-stats { grid-template-columns: 1fr 1fr; }
  .hero-stat { border-inline-start: 0; border-top: 1px solid var(--line); }
  .hero-stat:nth-child(odd) { border-inline-end: 1px solid var(--line); }
  .hero-stat:nth-child(-n+2) { border-top: 0; }
  .milestones { grid-template-columns: 1fr 1fr; }
  .lanes { grid-template-columns: 1fr; }
  .p0-grid { grid-template-columns: 1fr; }
  .cta-grid { grid-template-columns: 1fr; }
}
"""

HTML = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Haa Stores — خريطة الإطلاق</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>__CSS__</style>
</head>
<body>
<div class="container">
  <header>
    <h1>من هنا إلى <span class="accent">"مبروك"</span></h1>
    <p class="subtitle">خريطة الإطلاق التجاري. 6 معالم · 3 مسارات متوازية · 6 حاصرات P0 · 10 قرارات ملكية. <strong>أنت هنا:</strong> __CURRENT_MARKER__.</p>
    <div class="hero-stats">
      <div class="hero-stat"><div class="hero-stat-num primary">__COMMITS__</div><div class="hero-stat-label">commits</div></div>
      <div class="hero-stat"><div class="hero-stat-num">__TESTS__</div><div class="hero-stat-label">tests passing</div></div>
      <div class="hero-stat"><div class="hero-stat-num primary">__P0_DONE__/6</div><div class="hero-stat-label">P0 closed (__P0_PCT__%)</div></div>
      <div class="hero-stat"><div class="hero-stat-num">__LATEST_HASH__</div><div class="hero-stat-label">__LATEST_MSG__</div></div>
    </div>
  </header>

  <section>
    <div class="section-num">01 / المعالم</div>
    <h2>ست نقاط تحول من <span class="accent">الآن</span> إلى "مبروك"</h2>
    <p class="section-sub">كل milestone يفتح الـ lane اللي بعده. M5 = invite-only beta مع 10-20 تاجر يدوياً.</p>
    <div class="milestones">__MILESTONES__</div>
  </section>

  <section>
    <div class="section-num">02 / المسارات</div>
    <h2>ثلاث مسارات متوازية — <span class="accent">كلها</span> لازم تكمل قبل "مبروك"</h2>
    <p class="section-sub">كل lane عندها progress مستقل. الـ bottlenecks: Owner track (CR/VAT/DPO) + External (pen-test firm).</p>
    <div class="lanes">__LANES__</div>
  </section>

  <section>
    <div class="section-num">03 / حاصرات P0</div>
    <h2>ست حاصرات P0 — <span class="accent">__P0_DONE__ مغلقة</span>، __P0_OPEN__ مفتوحة</h2>
    <p class="section-sub">من docs/ops/PUBLIC_MARKETPLACE_AUDIT.md. الـ status يحدّث تلقائياً من git log (commits مع P0-X keyword) + TASK_TRACKER.md.</p>
    <div class="p0-grid">__P0_LIST__</div>
  </section>

  <section>
    <div class="section-num">04 / الآن</div>
    <h2>المهمة الحالية</h2>
    <p class="section-sub">__CURRENT_DETAIL__</p>
    <div class="active-card">
      <div class="active-label">__CURRENT_TASK_ID__</div>
      <div class="active-title">__CURRENT_TASK_TITLE__</div>
      <div class="active-sub">__CURRENT_TASK_NOTE__</div>
    </div>
  </section>

  <section>
    <div class="section-num">05 / الخطوة التالية</div>
    <h2>وش تسوي الحين</h2>
    <p class="section-sub">4 خيارات واضحة. اختر واحدة أو اكتب scope مختلف.</p>
    <div class="cta-grid">__CTAS__</div>
  </section>

  <footer>
    <div>__TODAY__ · regenerated by scripts/roadmap-regenerate.py</div>
    <div class="mono">branch: __BRANCH__ · pnpm roadmap:generate</div>
  </footer>
</div>
</body>
</html>
"""


def render_milestones(milestone_statuses) -> str:
    cards = []
    for (code, name, desc, _tasks), (status, _) in zip(MILESTONES_STATIC, milestone_statuses):
        cls = "m " + status
        marker = {"done": "✅", "current": "→", "pending": ""}[status]
        cards.append(
            f'<div class="{cls}">'
            f'<div class="m-tag">{marker}</div>'
            f'<div class="m-code">{code}</div>'
            f'<div class="m-name">{name}</div>'
            f'<div class="m-desc">{desc}</div>'
            f'</div>'
        )
    return "\n      ".join(cards)


def render_lanes(lanes) -> str:
    cards = []
    for lane in lanes:
        items = []
        for status, name, tid, sub in lane["items"]:
            icon = {"done": "✓", "active": "→", "pending": "○"}.get(status, "○")
            cls = "lane-item " + status
            items.append(
                f'<li class="{cls}">'
                f'<span class="icon">{icon}</span>'
                f'<span>{name}'
                f'<span class="task-id">{tid}</span>'
                f'<span class="item-sub">— {sub}</span>'
                f'</span></li>'
            )
        pct = int((lane["done"] / lane["total"]) * 100) if lane["total"] else 0
        cards.append(
            f'<div class="lane">'
            f'<div class="lane-head">'
            f'<div class="lane-title">{lane["title"]}</div>'
            f'<div class="lane-sub">{lane["sub"]}</div>'
            f'<div class="lane-progress">'
            f'<div class="lane-bar"><div class="lane-bar-fill" style="width:{pct}%"></div></div>'
            f'<div class="lane-pct">{lane["done"]}/{lane["total"]}</div>'
            f'</div></div>'
            f'<ul class="lane-list">{"".join(items)}</ul>'
            f'</div>'
        )
    return "\n      ".join(cards)


def render_p0(p0_statuses) -> str:
    cards = []
    for code, status, desc in p0_statuses:
        cls = "p0 " + status
        badge = "✅ Done" if status == "done" else "⏳ Open"
        cards.append(
            f'<div class="{cls}">'
            f'<div class="p0-code">{code} · {badge}</div>'
            f'<div class="p0-title">{P0_INFO[code]}</div>'
            f'<div class="p0-desc">{desc}</div>'
            f'</div>'
        )
    return "\n      ".join(cards)


def render_ctas() -> str:
    cards = []
    for keyword, title, body in CTAS:
        cards.append(
            f'<div class="cta">'
            f'<div class="cta-label">إذا قلت "{keyword}"</div>'
            f'<div class="cta-title">{title}</div>'
            f'<div class="cta-body">{body}</div>'
            f'</div>'
        )
    return "\n      ".join(cards)


def main() -> int:
    print("Reading live data...")
    git = get_git_data()
    task_statuses = extract_task_statuses()
    state = extract_state()
    print(f"  Commits: {git['commits']}, Branch: {git['branch']}")
    print(f"  Tests: {state['tests_passing']}")
    print(f"  Tasks parsed: {len(task_statuses)}")

    # Compute live values
    p0_statuses = compute_p0_statuses(git["p0_commits"], task_statuses)
    p0_done = sum(1 for _, s, _ in p0_statuses if s == "done")
    p0_pct = int((p0_done / 6) * 100)
    milestone_statuses = compute_milestone_statuses(task_statuses)
    lanes = compute_lane_progress(task_statuses, p0_statuses)
    current_task_id, current_task_title = find_current_task(task_statuses)

    # Current marker (which milestone are we at)
    current_marker = "M0-M1 (Done) → M2-M5 (pending)"
    for (code, name, _, _), (status, _) in zip(MILESTONES_STATIC, milestone_statuses):
        if status == "current":
            current_marker = f"{code} ({name})"
            break

    # Current task detail
    if current_task_id.startswith("TASK-0041"):
        current_detail = "Track 2.1 (P0-2) ✅ Done. Track 2.2 (P0-1 SFDA) يحتاج owner decision."
        current_note = "5 query sites filter prohibited_in_marketplace + migration 0059 + 7 TDD tests."
    elif current_task_id.startswith("TASK-0040"):
        current_detail = "Phase 1 closed 2026-06-17 — P0-4/3/5 closed in Sessions H/I/J."
        current_note = "3 tracks closed: demo isolation + accessToken + audit log."
    else:
        current_detail = f"See TASK_TRACKER.md for {current_task_id} details."
        current_note = "—"

    # Latest commit short
    latest_hash = ""
    latest_msg = "—"
    if git["latest"]:
        parts = git["latest"].split(" ", 1)
        latest_hash = parts[0] if parts else ""
        latest_msg = parts[1][:40] if len(parts) > 1 else "—"

    html = HTML
    replacements = {
        "__CSS__": CSS,
        "__COMMITS__": str(git["commits"]),
        "__TESTS__": str(state["tests_passing"] or 0),
        "__P0_DONE__": str(p0_done),
        "__P0_PCT__": str(p0_pct),
        "__P0_OPEN__": str(6 - p0_done),
        "__LATEST_HASH__": latest_hash,
        "__LATEST_MSG__": latest_msg,
        "__MILESTONES__": render_milestones(milestone_statuses),
        "__LANES__": render_lanes(lanes),
        "__P0_LIST__": render_p0(p0_statuses),
        "__CURRENT_MARKER__": current_marker,
        "__CURRENT_DETAIL__": current_detail,
        "__CURRENT_TASK_ID__": current_task_id,
        "__CURRENT_TASK_TITLE__": current_task_title,
        "__CURRENT_TASK_NOTE__": current_note,
        "__CTAS__": render_ctas(),
        "__TODAY__": datetime.now().strftime("%Y-%m-%d"),
        "__BRANCH__": git["branch"],
    }
    for placeholder, value in replacements.items():
        html = html.replace(placeholder, value)

    OUTPUT.write_text(html, encoding="utf-8")
    print(f"\n✓ Wrote {OUTPUT}")
    print(f"  P0 status: {p0_done}/6 closed (auto-detected)")
    print(f"  Milestones: {sum(1 for s, _ in milestone_statuses if s == 'done')}/6 done")
    print(f"  Engineering: {lanes[0]['done']}/{lanes[0]['total']} tasks done")
    print(f"  Current task: {current_task_id}")
    print(f"  Size: {len(html):,} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
