#!/bin/bash
# Claude Code PreToolUse hook — fires before every Edit/Write
# Enforces frontend CSS vars + skill gates

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.file_path // ""' 2>/dev/null || echo "")

# Only act on files inside apps/*/src/
[[ -z "$FILE_PATH" ]] || [[ "$FILE_PATH" != apps/*/src/* ]] && exit 0

APP=$(echo "$FILE_PATH" | cut -d'/' -f2)
INDEX_CSS="apps/$APP/src/index.css"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     FRONTEND PRE-FLIGHT GATE — $APP"
echo "╚══════════════════════════════════════════════════════════╝"
echo "  File: $FILE_PATH"
echo ""

# ── Gate 1: CSS variables ─────────────────────────────────────────────────────
echo "▶ Gate 1 — CSS variables"
if [[ -f "$INDEX_CSS" ]]; then
  if grep -q ":root" "$INDEX_CSS" 2>/dev/null; then
    echo "  ✅ :root{} found in $INDEX_CSS"
  else
    echo ""
    echo "  ❌ BLOCKED — $INDEX_CSS has no :root{} block"
    echo ""
    echo "  All Tailwind custom classes (text-title2, bg-primary-600,"
    echo "  rounded-ios-icon, shadow-card…) resolve to CSS variables."
    echo "  Without :root{} they are undefined → page renders blank."
    echo ""
    echo "  FIX before proceeding:"
    echo "    cp apps/merchant-dashboard/src/index.css $INDEX_CSS  (then adapt)"
    echo ""
    echo "  Skills: single-source-of-truth-gate, build-on-existing-system-gate"
    exit 1
  fi
else
  echo "  ⚠️  $INDEX_CSS not found — create with :root{} before using custom classes"
fi

# ── Gate 2: Cross-app safety ──────────────────────────────────────────────────
echo ""
echo "▶ Gate 2 — Cross-app safety"
echo "  Copying class/token from another app?"
echo "  Verify: grep 'var(--TOKEN)' $INDEX_CSS"
echo "  Missing = blank. Skill: single-source-of-truth-gate"

# ── Gate 3: Required skills ───────────────────────────────────────────────────
echo ""
echo "▶ Gate 3 — Skills required (docs/agent-os/SKILL_FILE_MAPPING.md)"
if   [[ "$FILE_PATH" == */src/pages/* ]];       then echo "  → design-ux-excellence-gate, verification-before-completion"
elif [[ "$FILE_PATH" == */src/components/* ]];  then echo "  → design-ux-excellence-gate, regression-safety-gate, verification-before-completion"
elif [[ "$FILE_PATH" == */src/index.css ]] || \
     [[ "$FILE_PATH" == */tailwind.config* ]];  then echo "  → single-source-of-truth-gate, build-on-existing-system-gate, regression-safety-gate"
else                                                 echo "  → verification-before-completion, implementation-quality-gate"
fi
echo "  Read: .claude/skills/<name>/SKILL.md"

# ── Gate 4: Done checklist ────────────────────────────────────────────────────
echo ""
echo "▶ Gate 4 — Done checklist (before claiming complete)"
echo "  □ pnpm --filter $APP typecheck  → 0 errors"
echo "  □ Screenshot taken              → NOT blank, theme visible"
echo "  □ Skills: definition-of-done-gate, verification-before-completion"
echo ""
echo "══════════════════════════════════════════════════════════"
echo ""
exit 0
