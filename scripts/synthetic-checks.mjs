import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const EVENTS_FILE = join(ROOT, 'storage', 'monitoring-events.ndjson')

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
    checkType: 'synthetic',
    status: 'pass',
    severity: 'P3',
    errorCode: null,
    message: null,
    recommendation: null,
    source: 'synthetic-checks.mjs',
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

function httpCheck(url, label, opts = {}) {
  const app = opts.app || 'storefront'
  try {
    const start = Date.now()
    const result = execSync(`curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 ${url} 2>/dev/null || echo "unavailable"`, { encoding: 'utf-8', timeout: 8000 }).trim()
    const durationMs = Date.now() - start

    if (result === 'unavailable' || result === '000') {
      emit({
        target: label,
        status: 'warn',
        severity: 'P3',
        app,
        message: `Server not running at ${url}`,
        recommendation: 'Start the dev server and re-run',
        durationMs,
        ...opts,
      })
      console.log(`  ⚠️  ${label} — server not running (${url})`)
      return { ok: false }
    }

    const statusCode = parseInt(result)
    if (statusCode >= 200 && statusCode < 400) {
      const { severity: _s, errorCode: _e, message: _m, recommendation: _r, ...rest } = opts
      emit({
        target: label,
        status: 'pass',
        severity: 'P3',
        app,
        message: `HTTP ${statusCode}`,
        durationMs,
        ...rest,
      })
      console.log(`  ✅ ${label} — HTTP ${statusCode} (${durationMs}ms)`)
      return { ok: true, statusCode }
    }

    if (statusCode >= 500) {
      emit({
        target: label,
        status: 'fail',
        severity: 'P1',
        app,
        errorCode: 'SYS-003',
        message: `HTTP ${statusCode} at ${url}`,
        recommendation: 'Check server logs for errors',
        durationMs,
        ...opts,
      })
      console.log(`  ❌ ${label} — HTTP ${statusCode} (${durationMs}ms)`)
      return { ok: false, statusCode }
    }

    emit({
      target: label,
      status: 'warn',
      severity: 'P2',
      app,
      message: `Unexpected HTTP ${statusCode} at ${url}`,
      recommendation: 'Review the endpoint behavior',
      durationMs,
      ...opts,
    })
    console.log(`  ⚠️  ${label} — HTTP ${statusCode} (${durationMs}ms)`)
    return { ok: false, statusCode }
  } catch (err) {
    emit({
      target: label,
      status: 'warn',
      severity: 'P3',
      app,
      message: `Curl failed for ${url}: ${err.message}`,
      recommendation: 'Check if curl is available and server is running',
      ...opts,
    })
    console.log(`  ⚠️  ${label} — curl failed`)
    return { ok: false }
  }
}

console.log('\n=== Storefront Synthetic Checks ===')
httpCheck('http://localhost:5173', 'Storefront home page', { app: 'storefront', target: 'storefront-home' })

console.log('\n=== Merchant Dashboard Synthetic Checks ===')
httpCheck('http://localhost:5174', 'Merchant Dashboard root', { app: 'merchant-dashboard', target: 'dashboard-root' })

console.log('\n=== API Synthetic Checks ===')
httpCheck('http://localhost:3000/health', 'API health endpoint', { app: 'api', target: 'api-health' })
httpCheck('http://localhost:3000/api/health', 'API /api/health endpoint', { app: 'api', target: 'api-api-health' })

console.log('\n---')
console.log('Synthetic checks complete. Results recorded in storage/monitoring-events.ndjson')
