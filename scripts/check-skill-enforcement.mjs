#!/usr/bin/env node
/**
 * check-skill-enforcement.mjs
 *
 * Verifies that the Mandatory Skill Gate enforcement layer exists and is
 * structurally complete. This is a *presence + structure* check; it does
 * NOT verify that any individual PR or commit applied skills — that
 * happens at PR-review time via the PR template + Final Skill Compliance
 * Report.
 *
 * Exits 1 on any failure so it can be wired as `pnpm check:skills` and
 * (optionally, later) into CI.
 *
 * Safe by design: read-only on the filesystem; no network; no secrets.
 *
 * Run from the repo root: `pnpm check:skills`.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'

const REPO_ROOT = resolve(process.cwd())
let failed = false
const failures = []
const successes = []

function fail(label, hint) {
  failed = true
  failures.push({ label, hint })
}

function ok(label) {
  successes.push(label)
}

function check(condition, label, hint) {
  if (condition) ok(label)
  else fail(label, hint)
}

function readSafe(path) {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return null
  }
}

function fileContains(path, needle) {
  const body = readSafe(path)
  if (body == null) return false
  return body.includes(needle)
}

function fileMatches(path, regex) {
  const body = readSafe(path)
  if (body == null) return false
  return regex.test(body)
}

// ---------------------------------------------------------------------------
// 1. Root instruction files
// ---------------------------------------------------------------------------

const agentsMd = join(REPO_ROOT, 'AGENTS.md')
const claudeMd = join(REPO_ROOT, 'CLAUDE.md')

check(
  existsSync(agentsMd),
  'AGENTS.md exists',
  'Create AGENTS.md at the repo root — the constitution file',
)
check(
  existsSync(claudeMd),
  'CLAUDE.md exists',
  'Create CLAUDE.md at the repo root — infrastructure rules',
)

if (existsSync(agentsMd)) {
  // AGENTS.md must contain the Mandatory Skill Gate header AND reference
  // the in-repo skill catalogue, NOT an external ~/.mavis/skills path.
  check(
    fileMatches(agentsMd, /Mandatory Skill Gate/),
    'AGENTS.md mentions "Mandatory Skill Gate"',
    'AGENTS.md §14 must declare the Mandatory Skill Gate by name',
  )
  check(
    fileContains(agentsMd, '.claude/skills/'),
    'AGENTS.md points to in-repo .claude/skills/',
    'AGENTS.md §14 must reference the in-repo skill catalogue (.claude/skills/<slug>/SKILL.md)',
  )
  check(
    fileMatches(agentsMd, /SKILLS_REGISTRY\.md/),
    'AGENTS.md links to SKILLS_REGISTRY.md',
    'AGENTS.md §14 must link the human-readable catalogue docs/agent-os/SKILLS_REGISTRY.md',
  )
  check(
    fileMatches(agentsMd, /SKILL_COMPLIANCE_REPORT\.md/),
    'AGENTS.md links to SKILL_COMPLIANCE_REPORT.md',
    'AGENTS.md §14.6 must link the Final Skill Compliance Report template',
  )
  // Allow markdown emphasis between words, e.g. "**NOT** mean CSS" or
  // "does NOT mean CSS". The clarifier may also use "design tokens".
  const hasCssClarifier =
    fileMatches(agentsMd, /not[^\n]{0,40}CSS/i) ||
    fileMatches(agentsMd, /not[^\n]{0,40}design tokens/i)
  check(
    hasCssClarifier,
    'AGENTS.md clarifies "skills" ≠ CSS/design tokens',
    'AGENTS.md must include the terminology clarifier so future agents do not conflate skills with CSS/UI changes',
  )
}

if (existsSync(claudeMd)) {
  check(
    fileMatches(claudeMd, /Mandatory Skill Gate/),
    'CLAUDE.md acknowledges the Mandatory Skill Gate',
    'CLAUDE.md must point readers at AGENTS.md §14',
  )
  check(
    fileMatches(claudeMd, /AGENTS\.md/),
    'CLAUDE.md links AGENTS.md as primary',
    'CLAUDE.md must defer the full gate spec to AGENTS.md to avoid duplication drift',
  )
}

// ---------------------------------------------------------------------------
// 2. docs/agent-os/ registry + cards + mapping + template
// ---------------------------------------------------------------------------

const registry = join(REPO_ROOT, 'docs/agent-os/SKILLS_REGISTRY.md')
const cards = join(REPO_ROOT, 'docs/agent-os/SKILL_CARDS.md')
const mapping = join(REPO_ROOT, 'docs/agent-os/SKILL_FILE_MAPPING.md')
const complianceTemplate = join(
  REPO_ROOT,
  'docs/agent-os/templates/SKILL_COMPLIANCE_REPORT.md',
)
const handoff = join(REPO_ROOT, 'docs/agent-os/AGENT_HANDOFF.md')
const execChecklist = join(REPO_ROOT, 'docs/agent-os/EXECUTION_CHECKLIST.md')

check(existsSync(registry), 'docs/agent-os/SKILLS_REGISTRY.md exists')
check(existsSync(cards), 'docs/agent-os/SKILL_CARDS.md exists')
check(existsSync(mapping), 'docs/agent-os/SKILL_FILE_MAPPING.md exists')
check(
  existsSync(complianceTemplate),
  'docs/agent-os/templates/SKILL_COMPLIANCE_REPORT.md exists',
)
check(existsSync(handoff), 'docs/agent-os/AGENT_HANDOFF.md exists')
check(
  existsSync(execChecklist),
  'docs/agent-os/EXECUTION_CHECKLIST.md exists',
)

if (existsSync(execChecklist)) {
  check(
    fileMatches(execChecklist, /Mandatory Skill Gate Checklist/),
    'EXECUTION_CHECKLIST.md contains "Mandatory Skill Gate Checklist" section',
    'Add a pre-execution gate checklist near the top of EXECUTION_CHECKLIST.md',
  )
}

if (existsSync(registry)) {
  // Sanity: registry must cover all 13 task types from AGENTS.md §14.4.
  const requiredTaskTypes = [
    'frontend/design',
    'backend/api',
    'database/migration',
    'payments/wallet',
    'shipping',
    'security',
    'ci/deploy',
    'docs/truth-sync',
    'launch-readiness',
    'observability',
    'performance',
    'accessibility',
    'testing/e2e',
  ]
  const body = readSafe(registry) ?? ''
  for (const t of requiredTaskTypes) {
    check(
      body.includes(t),
      `SKILLS_REGISTRY.md covers task type "${t}"`,
      `Add a section for "${t}" in docs/agent-os/SKILLS_REGISTRY.md`,
    )
  }
}

if (existsSync(complianceTemplate)) {
  const requiredHeaders = [
    'Mandatory Skill Gate',
    'Execution Evidence',
    'Verification',
    'Deviations',
    'Completion',
  ]
  for (const h of requiredHeaders) {
    check(
      fileContains(complianceTemplate, h),
      `SKILL_COMPLIANCE_REPORT.md contains "${h}" section`,
      `Add a "${h}" section in docs/agent-os/templates/SKILL_COMPLIANCE_REPORT.md`,
    )
  }
}

// ---------------------------------------------------------------------------
// 3. PR template
// ---------------------------------------------------------------------------

const prTemplate = join(REPO_ROOT, '.github/pull_request_template.md')
check(existsSync(prTemplate), '.github/pull_request_template.md exists')

if (existsSync(prTemplate)) {
  const must = ['Mandatory Skill Gate', 'Skills Selected', 'Evidence', 'Verification', 'Safety']
  for (const m of must) {
    check(
      fileContains(prTemplate, m),
      `PR template contains "${m}" section`,
      `Add a "${m}" section to .github/pull_request_template.md`,
    )
  }
}

// ---------------------------------------------------------------------------
// 4. In-repo skill catalogue (.claude/skills/*)
// ---------------------------------------------------------------------------

const skillsDir = join(REPO_ROOT, '.claude/skills')
check(
  existsSync(skillsDir),
  '.claude/skills/ directory exists',
  'The in-repo skill catalogue must live at .claude/skills/<slug>/SKILL.md',
)

if (existsSync(skillsDir)) {
  let skillCount = 0
  for (const entry of readdirSync(skillsDir)) {
    const entryPath = join(skillsDir, entry)
    if (!statSync(entryPath).isDirectory()) continue
    const skillFile = join(entryPath, 'SKILL.md')
    if (existsSync(skillFile)) skillCount += 1
  }
  check(
    skillCount >= 10,
    `.claude/skills/ holds at least 10 SKILL.md definitions (found ${skillCount})`,
    'If skills were removed below the floor, restore them or update this threshold deliberately',
  )
}

// ---------------------------------------------------------------------------
// 5. package.json wiring
// ---------------------------------------------------------------------------

const pkgPath = join(REPO_ROOT, 'package.json')
if (existsSync(pkgPath)) {
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    check(
      pkg?.scripts?.['check:skills'] != null,
      'package.json has "check:skills" script',
      'Add "check:skills": "node scripts/check-skill-enforcement.mjs" to package.json',
    )
  } catch (err) {
    fail('package.json is valid JSON', String(err))
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log('')
console.log('=== Skill Enforcement Layer Check ===')
console.log('')
for (const s of successes) console.log(`  ✓ ${s}`)
console.log('')
if (failures.length > 0) {
  console.log('Failures:')
  for (const f of failures) {
    console.log(`  ✗ ${f.label}`)
    if (f.hint) console.log(`     ${f.hint}`)
  }
  console.log('')
  console.log(`Failed: ${failures.length} of ${successes.length + failures.length}`)
  process.exit(1)
}

console.log(`All ${successes.length} checks passed.`)
console.log('')
process.exit(0)
