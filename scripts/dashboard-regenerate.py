#!/usr/bin/env python3
"""
Haa Stores — Live Status Dashboard (single page, instant, Arabic)

Replaces MASTER_ROADMAP.html. One screen, 6 metrics, real-time from
the source of truth. Designed for the founder to glance at and
know "where am I now + what's next" without scrolling.

Reads:
  - docs/ops/TASK_TRACKER.md       (parse latest TASK status)
  - docs/ops/CURRENT_STATE.md      (Last Updated + stats)
  - git log --oneline -1           (latest commit)
  - P0 progress from audit + tracker (4 of 6 closed as of 2026-06-17)

Writes:
  - DASHBOARD.html                  (single page, regenerated)

Usage:
  pnpm dashboard:generate
  # or
  python3 scripts/dashboard-regenerate.py
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
OUTPUT = REPO_ROOT / "DASHBOARD.html"


def get_git_commits() -> tuple[int, str]:
    """Returns (commit_count_on_branch, latest_commit_message)."""
    # Count commits unique to this branch
    for ref in ("main", "master", "origin/main", "origin/master"):
        try:
            count_out = subprocess.check_output(
                ["git", "log", "--oneline", f"{ref}..HEAD"],
                cwd=REPO_ROOT, stderr=subprocess.DEVNULL, text=True,
            ).strip()
            count = len(count_out.splitlines()) if count_out else 0
            if count:
                # Get latest commit message + hash
                latest = subprocess.check_output(
                    ["git", "log", "-1", "--pretty=format:%h %s"],
                    cwd=REPO_ROOT, stderr=subprocess.DEVNULL, text=True,
                ).strip()
                return count, latest
        except subprocess.CalledProcessError:
            continue
    return 0, ""


def get_branch() -> str:
    try:
        return subprocess.check_output(
            ["git", "branch", "--show-current"],
            cwd=REPO_ROOT, stderr=subprocess.DEVNULL, text=True,
        ).strip() or "(detached)"
    except subprocess.CalledProcessError:
        return "(unknown)"


def extract_state() -> dict:
    """Extract key metrics from CURRENT_STATE.md."""
    result = {
        "last_updated": "",
        "tests_passing": 0,
    }
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


def find_active_task() -> tuple[str, str]:
    """Find the current phase task — the marketplace phase work in
    progress (TASK-0040 / 0041 / 0042 / 0043 / 0044 / 0045) or the
    standalone strategic initiative (TASK-0036 / 0037).

    Sort by task number ascending — earliest non-Done phase is the
    current focus (you finish one before starting the next).
    """
    if not TASK_TRACKER.exists():
        return ("—", "—")
    text = TASK_TRACKER.read_text(encoding="utf-8")
    pattern = re.compile(
        r"###\s+(TASK-\d{4}):\s*([^\n]+)\n[\s\S]*?\*\*Status:\*\*\s*([^\n]+)",
        re.MULTILINE,
    )
    # Phase tasks only — TASK-0040 through TASK-0045 are the marketplace
    # hardening phases; TASK-0036 is ZATCA; TASK-0037 is marketplace master.
    PHASE_IDS = {36, 37, 40, 41, 42, 43, 44, 45}
    candidates = []
    for m in pattern.finditer(text):
        tid, title, status = m.group(1), m.group(2).strip(), m.group(3).strip().lower()
        num = int(tid.split("-")[1])
        if num not in PHASE_IDS:
            continue
        if status.startswith("done"):
            continue
        candidates.append((tid, title, num))
    if not candidates:
        return ("—", "كل المهام المسجلة مكتملة أو مغلقة")
    # Earliest non-Done phase = current focus
    candidates.sort(key=lambda t: t[2])
    return (candidates[0][0], candidates[0][1])


# Hardcoded P0 progress (updated when sessions close new P0s).
# Source: docs/ops/PUBLIC_MARKETPLACE_AUDIT.md (6 P0 launch blockers).
P0_TOTAL = 6
P0_CLOSED = 4  # P0-4 (demo), P0-3 (accessToken), P0-5 (audit), P0-2 (category)
P0_NEXT = "P0-1 (SFDA workflow)"
P0_NEXT_TRACK = "TASK-0041 Track 2.2 — يحتاج owner decision على verification timing"
# Hardcoded current focus — TASK-0041 (Phase 2) is the active phase.
# Updated when a new phase becomes current (e.g., TASK-0042 for Phase 3).
CURRENT_TASK_ID = "TASK-0041"
CURRENT_TASK_TITLE = "Marketplace Phase 2 (category blocklist ✅ + SFDA workflow ⏳)"


HTML = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Haa Stores — لوحة الحالة</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root {
  --bg: #f7f5f0;
  --card: #ffffff;
  --line: #e9e3d6;
  --text: #14171e;
  --muted: #7c7a72;
  --subtle: #a8a59b;
  --primary: #2f6f5e;
  --primary-soft: rgba(47, 111, 94, 0.08);
  --warn: #c97b3f;
  --warn-soft: rgba(201, 123, 63, 0.1);
  --danger: #b06367;
  --danger-soft: rgba(176, 99, 103, 0.1);
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--text);
  font-family: 'Outfit', system-ui, sans-serif; font-size: 16px; line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
.container { max-width: 720px; margin: 0 auto; padding: 48px 24px 64px; }
h1 {
  font-family: 'DM Serif Display', serif; font-weight: 400;
  font-size: 36px; line-height: 1.15; margin: 0 0 8px; letter-spacing: -0.005em;
}
.subtitle { color: var(--muted); font-size: 14px; margin: 0 0 32px; }
.grid { display: grid; gap: 12px; }
.card {
  background: var(--card); border: 1px solid var(--line);
  border-radius: 12px; padding: 20px 24px;
}
.card-label {
  font-size: 11px; font-weight: 600; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--muted); margin-bottom: 8px;
}
.card-value {
  font-family: 'DM Serif Display', serif; font-size: 28px;
  line-height: 1.2; color: var(--text);
}
.card-value.primary { color: var(--primary); }
.card-value.warn { color: var(--warn); }
.card-sub { font-size: 13px; color: var(--muted); margin-top: 4px; }
.progress-bar {
  height: 8px; background: var(--line); border-radius: 4px;
  overflow: hidden; margin-top: 12px;
}
.progress-fill {
  height: 100%; background: var(--primary); border-radius: 4px;
  transition: width 0.3s;
}
.commit-msg {
  font-family: 'JetBrains Mono', monospace; font-size: 13px;
  color: var(--text); background: var(--bg); padding: 8px 12px;
  border-radius: 6px; margin-top: 6px; overflow-x: auto;
}
.next-action {
  background: linear-gradient(135deg, var(--primary) 0%, #1f5547 100%);
  color: white; border-radius: 12px; padding: 24px; margin-top: 12px;
}
.next-action .card-label { color: rgba(255,255,255,0.7); }
.next-action .card-value { color: white; font-size: 22px; }
.next-action .card-sub { color: rgba(255,255,255,0.85); }
footer {
  margin-top: 40px; padding-top: 16px; border-top: 1px solid var(--line);
  font-size: 12px; color: var(--muted);
  display: flex; justify-content: space-between;
}
.mono { font-family: 'JetBrains Mono', monospace; }
@media (max-width: 600px) {
  .container { padding: 24px 16px 48px; }
  h1 { font-size: 28px; }
  .card-value { font-size: 22px; }
}
</style>
</head>
<body>
<div class="container">
  <h1>وين أنت الحين؟</h1>
  <p class="subtitle">__SUBTITLE__</p>

  <div class="grid">
    <div class="card">
      <div class="card-label">المهمة الحالية</div>
      <div class="card-value primary">__CURRENT_TASK__</div>
      <div class="card-sub">__CURRENT_TITLE__</div>
    </div>

    <div class="card">
      <div class="card-label">تقدم P0 (حاصرات الإطلاق)</div>
      <div class="card-value">__P0_CLOSED__ / __P0_TOTAL__</div>
      <div class="card-sub">من 6 حاصرات إطلاق يحتاجها السوق</div>
      <div class="progress-bar"><div class="progress-fill" style="width: __P0_PCT__%"></div></div>
    </div>

    <div class="card">
      <div class="card-label">الـ branch والـ commits</div>
      <div class="card-value">__COMMITS__</div>
      <div class="card-sub mono">__BRANCH__</div>
    </div>

    <div class="card">
      <div class="card-label">الاختبارات</div>
      <div class="card-value primary">__TESTS__</div>
      <div class="card-sub">test passing (الـ 4 baseline failures ثابتة)</div>
    </div>

    <div class="card">
      <div class="card-label">آخر commit</div>
      <div class="commit-msg">__LAST_COMMIT__</div>
    </div>

    <div class="next-action">
      <div class="card-label">الخطوة القادمة</div>
      <div class="card-value">__NEXT_ACTION__</div>
      <div class="card-sub">__NEXT_TRACK__</div>
    </div>
  </div>

  <footer>
    <div>__TODAY__ · ولّد من scripts/dashboard-regenerate.py</div>
    <div class="mono">pnpm dashboard:generate</div>
  </footer>
</div>
</body>
</html>
"""


def main() -> int:
    print("Reading source of truth...")
    commits, latest = get_git_commits()
    branch = get_branch()
    state = extract_state()
    # Current task is hardcoded — see CURRENT_TASK_ID above.
    current_id = CURRENT_TASK_ID
    current_title = CURRENT_TASK_TITLE

    p0_pct = int((P0_CLOSED / P0_TOTAL) * 100) if P0_TOTAL else 0

    subtitle_parts = []
    if state["last_updated"]:
        lu = state["last_updated"][:80]
        if len(state["last_updated"]) > 80:
            lu += "..."
        subtitle_parts.append(lu)
    subtitle_parts.append(f"branch {branch}")
    subtitle = " · ".join(subtitle_parts)

    html = HTML
    replacements = {
        "__SUBTITLE__": subtitle,
        "__CURRENT_TASK__": current_id,
        "__CURRENT_TITLE__": current_title,
        "__P0_CLOSED__": str(P0_CLOSED),
        "__P0_TOTAL__": str(P0_TOTAL),
        "__P0_PCT__": str(p0_pct),
        "__COMMITS__": str(commits),
        "__BRANCH__": branch,
        "__TESTS__": str(state["tests_passing"] or 0),
        "__LAST_COMMIT__": latest or "—",
        "__NEXT_ACTION__": P0_NEXT,
        "__NEXT_TRACK__": P0_NEXT_TRACK,
        "__TODAY__": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }
    for placeholder, value in replacements.items():
        html = html.replace(placeholder, value)

    OUTPUT.write_text(html, encoding="utf-8")
    print(f"\n✓ Wrote {OUTPUT}")
    print(f"  Commits on branch: {commits}")
    print(f"  Tests: {state['tests_passing']}")
    print(f"  Current task: {current_id}")
    print(f"  P0: {P0_CLOSED}/{P0_TOTAL} ({p0_pct}%)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
