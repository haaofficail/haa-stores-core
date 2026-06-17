#!/usr/bin/env python3
"""
Haa Stores — Master Roadmap (rebuilt 2026-06-17, simpler + Arabic-first)

Replaces the original MASTER_ROADMAP.html. Same data, simpler design:
- 6 sections (Hero + Milestones + Lanes + P0 Progress + Active + CTA)
- Arabic RTL with proper layout (previous version had alignment issues)
- Founder-friendly: no marketing fluff, direct + readable
- Generated from TASK_TRACKER.md + CURRENT_STATE.md + git log

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

# P0 progress (4 of 6 closed as of 2026-06-17 Session K)
P0_LIST = [
    ("P0-4", "Demo isolation contract", "Done",
     "استبدال raw SQL بـ whitelist. seed 'general' → 'main'."),
    ("P0-3", "Order tracking via accessToken", "Done",
     "uuid token بدل ?phone=. يحل phone enumeration + PDPL leak."),
    ("P0-5", "Audit log on admin moderation", "Done",
     "audit.record على review + feature endpoints. PDPL Art. 17."),
    ("P0-2", "Category blocklist", "Done",
     "prohibited_in_marketplace column + 5 query filter sites."),
    ("P0-1", "SFDA field + workflow", "Open",
     "Migration + Zod regex + service validation. يحتاج owner decision."),
    ("P0-6", "Legal copy (PRIVACY + TERMS + SFDA_DISCLAIMER)", "Open",
     "ينعمل في TASK-0042 Phase 3 + owner legal review."),
]

# Milestones
MILESTONES = [
    ("M0", "Foundation", "Quality Pass 1-5", "done", "✅"),
    ("M1", "Compliance", "3DS + VAT (TASK-0035)", "done", "✅"),
    ("M2", "Marketplace P0", "Phase 1 + 2 (P0-2/3/4/5)", "current", "→"),
    ("M3", "Marketplace P1", "Phase 3 + 4 (Legal + P1 fixes)", "pending", ""),
    ("M4", "Owner Gates", "Phase 5 (TASK-0038 closure)", "pending", ""),
    ("M5", "Beta Live", "Phase 6 (pen-test + 20 merchants)", "pending", "مبروك 🎉"),
]

# 3 lanes with current state
LANES = [
    {
        "id": "eng",
        "title": "Engineering",
        "sub": "16-19 eng days · parallel tracks",
        "done": 2, "total": 6,
        "items": [
            ("done", "Quality Pass 1-5", "TASK-0025-0029"),
            ("done", "3DS + VAT", "TASK-0035"),
            ("done", "Marketplace Phase 1", "TASK-0040 (3 P0 closed)"),
            ("active", "Marketplace Phase 2", "TASK-0041 (1/2 done)"),
            ("pending", "Phase 3 — Legal copy", "TASK-0042"),
            ("pending", "Phase 4 — P1 + tests", "TASK-0043"),
            ("pending", "Phase 6 — Pen-test triage", "TASK-0045 §8.3"),
        ],
    },
    {
        "id": "owner",
        "title": "Owner / Legal",
        "sub": "10 action items · 1-3 weeks calendar",
        "done": 0, "total": 10,
        "items": [
            ("pending", "CR (MoCI)", "G1 — TASK-0038"),
            ("pending", "VAT cert (ZATCA)", "G2 — blocks TASK-0036"),
            ("pending", "E-commerce license", "G3"),
            ("pending", "DPO (PDPL Art. 22)", "G4 — blocks TASK-0042"),
            ("pending", "Trademark (SAIP)", "G5"),
            ("pending", "PCI-DSS ASV scan", "G6"),
            ("pending", "Pen-test firm", "G7"),
            ("pending", "KSA hosting decision", "G8"),
            ("pending", "Tabby DPA", "G9"),
            ("pending", "DR plan + tabletop", "G10"),
        ],
    },
    {
        "id": "external",
        "title": "External / Vendor",
        "sub": "Pen-test firm · 1-2 weeks calendar",
        "done": 0, "total": 3,
        "items": [
            ("pending", "PCI-DSS ASV", "G6"),
            ("pending", "Pen-test firm engage", "G7"),
            ("pending", "Pen-test report PASS", "Phase 6 §8.2"),
        ],
    },
]

# CTA options
CTAS = [
    ("MARKETPLACE", "نبدأ TASK-0040 أو 0041 (Phase 2)",
     "engineering — يحبسك GO واحد فقط."),
    ("ZATCA", "أعرض الـ 6 decisions بالتفصيل",
     "TASK-0036 gated على 6 owner questions."),
    ("G1 أو G2", "أجهّز checklist + خطوات عملية",
     "CR/VAT أبسط البداية للـ owner track."),
    ("قف", "أوقف، الـ branch جاهز 100%",
     "DASHBOARD + ROADMAP + preflight clean."),
]


def get_git_data() -> tuple[int, str, str]:
    """Returns (commits_on_branch, latest_commit, branch_name)."""
    for ref in ("main", "master", "origin/main", "origin/master"):
        try:
            count_out = subprocess.check_output(
                ["git", "log", "--oneline", f"{ref}..HEAD"],
                cwd=REPO_ROOT, stderr=subprocess.DEVNULL, text=True,
            ).strip()
            count = len(count_out.splitlines()) if count_out else 0
            if count:
                latest = subprocess.check_output(
                    ["git", "log", "-1", "--pretty=format:%h %s"],
                    cwd=REPO_ROOT, stderr=subprocess.DEVNULL, text=True,
                ).strip()
                branch = subprocess.check_output(
                    ["git", "branch", "--show-current"],
                    cwd=REPO_ROOT, stderr=subprocess.DEVNULL, text=True,
                ).strip()
                return count, latest, branch or "(detached)"
        except subprocess.CalledProcessError:
            continue
    return 0, "", "(unknown)"


def extract_state() -> dict:
    """Extract Last Updated + tests passing from CURRENT_STATE.md."""
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
.section-num {
  font-family: 'JetBrains Mono', monospace; font-size: 11px;
  color: var(--subtle); letter-spacing: 0.1em; margin-bottom: 8px;
}
h2 {
  font-family: 'DM Serif Display', serif; font-weight: 400;
  font-size: 28px; line-height: 1.2; margin: 0 0 8px;
}
h2 .accent { color: var(--primary); }
.section-sub {
  color: var(--muted); font-size: 14px; max-width: 640px;
  margin: 0 0 24px; line-height: 1.5;
}

/* HERO STATS */
.hero-stats {
  display: grid; grid-template-columns: repeat(4, 1fr);
  border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
}
.hero-stat { padding: 20px 0; text-align: start; border-inline-start: 1px solid var(--line); }
.hero-stat:first-child { border-inline-start: 0; }
.hero-stat-num {
  font-family: 'DM Serif Display', serif; font-size: 32px;
  line-height: 1; margin-bottom: 4px;
}
.hero-stat-num.primary { color: var(--primary); }
.hero-stat-label { font-size: 12px; color: var(--muted); }

/* MILESTONES */
.milestones {
  display: grid; grid-template-columns: repeat(6, 1fr);
  gap: 8px; margin-top: 24px;
}
.m {
  background: var(--card); border: 1px solid var(--line);
  border-radius: 10px; padding: 16px 12px;
  position: relative; min-height: 110px;
}
.m.done { background: var(--primary-soft); border-color: var(--primary); }
.m.current {
  background: var(--warn-soft); border-color: var(--warn);
  border-width: 2px;
}
.m-tag {
  font-size: 9px; font-weight: 600; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--subtle); margin-bottom: 6px;
}
.m.done .m-tag { color: var(--primary); }
.m.current .m-tag { color: var(--warn); }
.m-code { font-family: 'DM Serif Display', serif; font-size: 22px; line-height: 1.1; margin-bottom: 4px; }
.m-name { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
.m-desc { font-size: 11px; color: var(--muted); line-height: 1.3; }

/* LANES */
.lanes {
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;
  margin-top: 24px;
}
.lane {
  background: var(--card); border: 1px solid var(--line);
  border-radius: 12px; padding: 20px;
}
.lane-head {
  padding-bottom: 12px; margin-bottom: 12px;
  border-bottom: 1px solid var(--line-soft);
}
.lane-title { font-size: 16px; font-weight: 600; margin-bottom: 2px; }
.lane-sub { font-size: 11px; color: var(--muted); margin-bottom: 10px; }
.lane-progress { display: flex; align-items: center; gap: 8px; }
.lane-bar { flex: 1; height: 4px; background: var(--line-soft); border-radius: 2px; overflow: hidden; }
.lane-bar-fill { height: 100%; background: var(--primary); border-radius: 2px; }
.lane-pct { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--muted); }
.lane-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.lane-item {
  font-size: 12px; line-height: 1.4; display: flex; gap: 6px; align-items: flex-start;
}
.lane-item.done { color: var(--subtle); text-decoration: line-through; }
.lane-item .icon { flex-shrink: 0; margin-top: 1px; }
.lane-item .task-id {
  font-family: 'JetBrains Mono', monospace; font-size: 10px;
  color: var(--subtle); background: var(--bg);
  padding: 1px 5px; border-radius: 3px; margin-inline-start: 4px;
}

/* P0 PROGRESS */
.p0-grid {
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;
  margin-top: 24px;
}
.p0 {
  background: var(--card); border: 1px solid var(--line);
  border-radius: 10px; padding: 16px;
  border-inline-start: 4px solid var(--subtle);
}
.p0.done { border-inline-start-color: var(--primary); }
.p0.open { border-inline-start-color: var(--warn); }
.p0-code {
  font-family: 'JetBrains Mono', monospace; font-size: 11px;
  font-weight: 600; color: var(--subtle); margin-bottom: 4px;
}
.p0.done .p0-code { color: var(--primary); }
.p0.open .p0-code { color: var(--warn); }
.p0-title { font-size: 13px; font-weight: 600; margin-bottom: 4px; line-height: 1.3; }
.p0-desc { font-size: 11px; color: var(--muted); line-height: 1.4; }

/* ACTIVE */
.active-card {
  background: linear-gradient(135deg, var(--primary) 0%, #1f5547 100%);
  color: white; border-radius: 14px; padding: 28px;
  margin-top: 24px;
}
.active-label {
  font-size: 11px; font-weight: 600; letter-spacing: 0.1em;
  text-transform: uppercase; opacity: 0.7; margin-bottom: 8px;
}
.active-title {
  font-family: 'DM Serif Display', serif; font-size: 24px;
  line-height: 1.2; margin-bottom: 8px;
}
.active-sub { font-size: 14px; opacity: 0.85; line-height: 1.5; }

/* CTA */
.cta-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
  margin-top: 16px;
}
.cta {
  background: var(--card); border: 1px solid var(--line);
  border-radius: 10px; padding: 14px 16px;
}
.cta-label {
  font-size: 10px; font-weight: 600; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--muted); margin-bottom: 4px;
}
.cta-title { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
.cta-body { font-size: 12px; color: var(--muted); line-height: 1.4; }

footer {
  margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--line);
  display: flex; justify-content: space-between;
  font-size: 11px; color: var(--muted);
}
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

  <!-- HERO -->
  <header>
    <h1>من هنا إلى <span class="accent">"مبروك"</span></h1>
    <p class="subtitle">خريطة الإطلاق التجاري الكاملة. 6 معالم · 3 مسارات متوازية · 6 حاصرات P0 · 10 قرارات ملكية. <strong>أنت هنا:</strong> M2 (Marketplace P0).</p>
    <div class="hero-stats">
      <div class="hero-stat"><div class="hero-stat-num primary">__COMMITS__</div><div class="hero-stat-label">commits على الـ branch</div></div>
      <div class="hero-stat"><div class="hero-stat-num">__TESTS__</div><div class="hero-stat-label">test passing</div></div>
      <div class="hero-stat"><div class="hero-stat-num primary">4/6</div><div class="hero-stat-label">P0 closed (67%)</div></div>
      <div class="hero-stat"><div class="hero-stat-num">~4-5w</div><div class="hero-stat-label">للإطلاق (تقويمي)</div></div>
    </div>
  </header>

  <!-- MILESTONES -->
  <section>
    <div class="section-num">01 / المعالم</div>
    <h2>ست نقاط تحول من <span class="accent">الآن</span> إلى "مبروك"</h2>
    <p class="section-sub">كل milestone يفتح الـ lane اللي بعده. M5 = invite-only beta مع 10-20 تاجر يدوياً.</p>
    <div class="milestones">
      __MILESTONES__
    </div>
  </section>

  <!-- 3 LANES -->
  <section>
    <div class="section-num">02 / المسارات</div>
    <h2>ثلاث مسارات متوازية — <span class="accent">كلها</span> لازم تكمل قبل "مبروك"</h2>
    <p class="section-sub">كل lane عندها progress مستقل. الـ bottlenecks: Owner track (CR/VAT/DPO) + External (pen-test firm).</p>
    <div class="lanes">
      __LANES__
    </div>
  </section>

  <!-- P0 PROGRESS -->
  <section>
    <div class="section-num">03 / حاصرات P0</div>
    <h2>ست حاصرات P0 — <span class="accent">4 مغلقة</span>، 2 مفتوحة</h2>
    <p class="section-sub">من docs/ops/PUBLIC_MARKETPLACE_AUDIT.md. الـ P0 المنجزة = المنجز من Phase 1+2. الـ المتبقي = P0-1 (SFDA) + P0-6 (legal).</p>
    <div class="p0-grid">
      __P0_LIST__
    </div>
  </section>

  <!-- ACTIVE -->
  <section>
    <div class="section-num">04 / الآن</div>
    <h2>المهمة الحالية</h2>
    <p class="section-sub">Track 2.1 (P0-2) ✅ مغلق في Session K. الباقي: Track 2.2 (P0-1 SFDA) يحتاج owner decision.</p>
    <div class="active-card">
      <div class="active-label">TASK-0041 — Marketplace Phase 2</div>
      <div class="active-title">Category blocklist ✅ + SFDA workflow ⏳</div>
      <div class="active-sub">5 query sites filter prohibited_in_marketplace + migration 0059 + 7 TDD tests. الـ track 2.2 (P0-1 SFDA) يحتاج: (a) verification timing — review-time vs publish-time, (b) format validation only vs live API. بدون decisions = تخمين.</div>
    </div>
  </section>

  <!-- CTA -->
  <section>
    <div class="section-num">05 / الخطوة التالية</div>
    <h2>وش تسوي الحين</h2>
    <p class="section-sub">4 خيارات واضحة. اختر واحدة أو اكتب scope مختلف.</p>
    <div class="cta-grid">
      __CTAS__
    </div>
  </section>

  <footer>
    <div>__TODAY__ · regenerated by scripts/roadmap-regenerate.py</div>
    <div class="mono">branch: __BRANCH__ · pnpm roadmap:generate</div>
  </footer>
</div>
</body>
</html>
"""


def render_milestones() -> str:
    cards = []
    for code, name, desc, status, marker in MILESTONES:
        cls = "m " + status
        cards.append(
            f'<div class="{cls}">'
            f'<div class="m-tag">{marker or " "}</div>'
            f'<div class="m-code">{code}</div>'
            f'<div class="m-name">{name}</div>'
            f'<div class="m-desc">{desc}</div>'
            f'</div>'
        )
    return "\n      ".join(cards)


def render_lanes() -> str:
    cards = []
    for lane in LANES:
        items = []
        for status, name, task_id in lane["items"]:
            icon = {
                "done": "✓",
                "active": "→",
                "pending": "○",
            }.get(status, "○")
            cls = "lane-item " + status
            items.append(
                f'<li class="{cls}">'
                f'<span class="icon">{icon}</span>'
                f'<span>{name} <span class="task-id">{task_id}</span></span>'
                f'</li>'
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


def render_p0() -> str:
    cards = []
    for code, title, status, desc in P0_LIST:
        cls = "p0 " + status.lower()
        badge = "✅ Done" if status == "Done" else "⏳ Open"
        cards.append(
            f'<div class="{cls}">'
            f'<div class="p0-code">{code} · {badge}</div>'
            f'<div class="p0-title">{title}</div>'
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
    print("Reading source of truth...")
    commits, latest, branch = get_git_data()
    state = extract_state()
    print(f"  Branch: {branch} ({commits} commits)")
    print(f"  Tests passing: {state['tests_passing']}")

    html = HTML
    replacements = {
        "__CSS__": CSS,
        "__COMMITS__": str(commits),
        "__TESTS__": str(state["tests_passing"] or 0),
        "__MILESTONES__": render_milestones(),
        "__LANES__": render_lanes(),
        "__P0_LIST__": render_p0(),
        "__CTAS__": render_ctas(),
        "__TODAY__": datetime.now().strftime("%Y-%m-%d"),
        "__BRANCH__": branch,
    }
    for placeholder, value in replacements.items():
        html = html.replace(placeholder, value)

    OUTPUT.write_text(html, encoding="utf-8")
    print(f"\n✓ Wrote {OUTPUT}")
    print(f"  Size: {len(html):,} bytes ({html.count(chr(10))} lines)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
