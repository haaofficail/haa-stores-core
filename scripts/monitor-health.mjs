import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const EVENTS_FILE = join(ROOT, 'storage', 'monitoring-events.ndjson')
const SUPPORT_EVENTS_FILE = join(ROOT, 'storage', 'support-error-events.ndjson')

function ensureStorage() {
  const dir = dirname(EVENTS_FILE)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function generateId() {
  return 'evt-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6)
}

function emit(event) {
  const entry = {
    eventId: generateId(),
    timestamp: new Date().toISOString(),
    status: 'pass',
    severity: 'P3',
    errorCode: null,
    message: null,
    recommendation: null,
    source: 'monitor-health.mjs',
    route: null,
    method: null,
    durationMs: null,
    correlationId: null,
    fingerprint: null,
    environment: 'local',
    tags: [],
    ...event,
  }
  ensureStorage()
  writeFileSync(EVENTS_FILE, JSON.stringify(entry) + '\n', { flag: 'as' })
  return entry
}

function check(condition, label, opts = {}) {
  if (condition) {
    const { severity: _s, errorCode: _e, message: _m, recommendation: _r, ...rest } = opts
    const e = emit({
      checkType: 'health',
      target: label,
      status: 'pass',
      severity: 'P3',
      message: `${label} — passed`,
      ...rest,
    })
    console.log(`  ✅ ${label}`)
    return { ok: true, event: e }
  }
  const severity = opts.severity || 'P2'
  const e = emit({
    checkType: 'health',
    target: label,
    status: 'fail',
    severity,
    errorCode: opts.errorCode || 'SYS-001',
    message: opts.message || `${label} check failed`,
    recommendation: opts.recommendation || 'Investigate why this component is missing',
    app: opts.app || 'system',
    ...opts,
  })
  console.log(`  ❌ ${label} — ${e.message}`)
  return { ok: false, event: e }
}

function checkWarn(condition, label, opts = {}) {
  if (condition) {
    const e = emit({
      checkType: 'health',
      target: label,
      status: 'pass',
      severity: 'P3',
      app: opts.app || 'system',
      ...opts,
    })
    console.log(`  ✅ ${label}`)
    return { ok: true, event: e }
  }
  const e = emit({
    checkType: 'health',
    target: label,
    status: 'warn',
    severity: 'P3',
    errorCode: opts.errorCode || 'SYS-002',
    message: opts.message || `${label} check returned warning`,
    recommendation: opts.recommendation || 'Review the condition manually',
    app: opts.app || 'system',
    ...opts,
  })
  console.log(`  ⚠️  ${label} — ${e.message}`)
  return { ok: true, event: e }
}

const allChecks = []
let allOk = true

console.log('\n=== Project Health ===')
allChecks.push(check(existsSync(join(ROOT, 'package.json')), 'package.json exists'))
allChecks.push(check(existsSync(join(ROOT, 'pnpm-workspace.yaml')), 'pnpm-workspace.yaml exists'))
allChecks.push(check(existsSync(join(ROOT, 'apps')), 'apps directory exists'))
allChecks.push(check(existsSync(join(ROOT, 'packages')), 'packages directory exists'))
allChecks.push(check(existsSync(join(ROOT, 'AGENTS.md')), 'AGENTS.md exists'))
allChecks.push(check(existsSync(join(ROOT, 'docs', 'ops')), 'docs/ops directory exists'))

console.log('\n=== App Structure Health ===')
const apps = ['api', 'merchant-dashboard', 'storefront', 'admin-dashboard']
for (const app of apps) {
  const appPath = join(ROOT, 'apps', app)
  const pkgPath = join(appPath, 'package.json')
  const exists = existsSync(pkgPath)
  const checkResult = exists
    ? check(true, `apps/${app}/package.json exists`, { app })
    : checkWarn(false, `apps/${app}/package.json exists`, { app, message: `${app} not found — may not exist in this project` })
  allChecks.push(checkResult)
  if (!exists) continue

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  allChecks.push(check(!!pkg.scripts?.dev, `apps/${app} has dev script`, { app }))
  allChecks.push(check(!!pkg.scripts?.typecheck, `apps/${app} has typecheck script`, { app }))
  allChecks.push(check(!!pkg.scripts?.build, `apps/${app} has build script`, { app }))
}

console.log('\n=== Runtime Health ===')
try {
  const apiResult = execSync('curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://localhost:3000/health 2>/dev/null || curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://localhost:3000/api/health 2>/dev/null || echo "unavailable"', { encoding: 'utf-8', timeout: 5000 }).trim()
  if (apiResult && apiResult !== 'unavailable' && apiResult !== '000') {
    allChecks.push(check(true, 'API health endpoint responds', { app: 'api' }))
  } else {
    allChecks.push(checkWarn(false, 'API health endpoint responds', { app: 'api', message: 'API dev server not running', recommendation: 'Run pnpm dev:api in another terminal' }))
  }
} catch {
  allChecks.push(checkWarn(false, 'API health endpoint responds', { app: 'api', message: 'API dev server not running', recommendation: 'Run pnpm dev:api in another terminal' }))
}

try {
  const storefrontResult = execSync('curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://localhost:5173 2>/dev/null || echo "unavailable"', { encoding: 'utf-8', timeout: 5000 }).trim()
  if (storefrontResult && storefrontResult !== 'unavailable' && storefrontResult !== '000') {
    allChecks.push(check(true, 'Storefront responds', { app: 'storefront' }))
  } else {
    allChecks.push(checkWarn(false, 'Storefront responds', { app: 'storefront', message: 'Storefront dev server not running', recommendation: 'Run pnpm dev:storefront in another terminal' }))
  }
} catch {
  allChecks.push(checkWarn(false, 'Storefront responds', { app: 'storefront', message: 'Storefront dev server not running', recommendation: 'Run pnpm dev:storefront in another terminal' }))
}

try {
  const dashResult = execSync('curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://localhost:5174 2>/dev/null || echo "unavailable"', { encoding: 'utf-8', timeout: 5000 }).trim()
  if (dashResult && dashResult !== 'unavailable' && dashResult !== '000') {
    allChecks.push(check(true, 'Merchant Dashboard responds', { app: 'merchant-dashboard' }))
  } else {
    allChecks.push(checkWarn(false, 'Merchant Dashboard responds', { app: 'merchant-dashboard', message: 'Merchant Dashboard dev server not running', recommendation: 'Run pnpm dev:dashboard in another terminal' }))
  }
} catch {
  allChecks.push(checkWarn(false, 'Merchant Dashboard responds', { app: 'merchant-dashboard', message: 'Merchant Dashboard dev server not running', recommendation: 'Run pnpm dev:dashboard in another terminal' }))
}

const failures = allChecks.filter(c => !c.ok)
console.log(`\n=== Result: ${failures.length} failure(s) out of ${allChecks.length} checks ===`)
