import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const EVENTS_FILE = join(ROOT, 'storage', 'monitoring-events.ndjson')
const SUPPORT_EVENTS_FILE = join(ROOT, 'storage', 'support-error-events.ndjson')

function readEvents(filePath) {
  if (!existsSync(filePath)) return []
  const content = readFileSync(filePath, 'utf-8').trim()
  if (!content) return []
  return content.split('\n').filter(Boolean).map(line => {
    try { return JSON.parse(line) } catch { return null }
  }).filter(Boolean)
}

const events = [
  ...readEvents(EVENTS_FILE),
  ...readEvents(SUPPORT_EVENTS_FILE),
]

console.log(`\nAnalyzing ${events.length} total events...\n`)

// Counts by severity
const bySeverity = { P0: 0, P1: 0, P2: 0, P3: 0, P4: 0 }
for (const e of events) {
  const s = e.severity || 'P3'
  bySeverity[s] = (bySeverity[s] || 0) + 1
}
console.log('=== Events by Severity ===')
for (const [sev, count] of Object.entries(bySeverity)) {
  if (count > 0) console.log(`  ${sev}: ${count}`)
}

// Top error codes
const errorCodes = {}
for (const e of events) {
  if (e.errorCode) {
    errorCodes[e.errorCode] = (errorCodes[e.errorCode] || 0) + 1
  }
}
const topErrorCodes = Object.entries(errorCodes).sort((a, b) => b[1] - a[1]).slice(0, 5)
console.log('\n=== Top Error Codes ===')
for (const [code, count] of topErrorCodes) {
  console.log(`  ${code}: ${count}`)
}

// Top fingerprints
const fingerprints = {}
for (const e of events) {
  if (e.fingerprint) {
    fingerprints[e.fingerprint] = (fingerprints[e.fingerprint] || 0) + 1
  }
}
const topFingerprints = Object.entries(fingerprints).sort((a, b) => b[1] - a[1]).slice(0, 5)
console.log('\n=== Top Fingerprints ===')
for (const [fp, count] of topFingerprints) {
  console.log(`  ${fp}: ${count}`)
}

// Top affected apps
const apps = {}
for (const e of events) {
  if (e.app) {
    apps[e.app] = (apps[e.app] || 0) + 1
  }
}
const topApps = Object.entries(apps).sort((a, b) => b[1] - a[1]).slice(0, 5)
console.log('\n=== Top Affected Apps ===')
for (const [app, count] of topApps) {
  console.log(`  ${app}: ${count}`)
}

// Top affected routes
const routes = {}
for (const e of events) {
  if (e.route || e.target) {
    const key = e.route || e.target
    routes[key] = (routes[key] || 0) + 1
  }
}
const topRoutes = Object.entries(routes).sort((a, b) => b[1] - a[1]).slice(0, 5)
console.log('\n=== Top Affected Routes/Targets ===')
for (const [route, count] of topRoutes) {
  console.log(`  ${route}: ${count}`)
}

// P0 alerts
const p0s = events.filter(e => e.severity === 'P0')
if (p0s.length > 0) {
  console.log(`\n🚨 P0 Alerts (${p0s.length}):`)
  for (const p0 of p0s) {
    console.log(`  [${p0.timestamp}] ${p0.message || 'No message'} — ${p0.target || ''}`)
  }
}

// P1 repeated
const p1s = events.filter(e => e.severity === 'P1')
const p1ByCode = {}
for (const p1 of p1s) {
  const code = p1.errorCode || 'UNKNOWN'
  p1ByCode[code] = (p1ByCode[code] || 0) + 1
}
const repeatedP1 = Object.entries(p1ByCode).filter(([_, count]) => count >= 3)
if (repeatedP1.length > 0) {
  console.log(`\n📋 Repeated P1 (>=3 times) — Suggest Task:`)
  for (const [code, count] of repeatedP1) {
    console.log(`  ${code}: ${count} times`)
  }
}

// Repeated fingerprints (>=3)
const repeatedFps = Object.entries(fingerprints).filter(([_, count]) => count >= 3)
if (repeatedFps.length > 0) {
  console.log(`\n🔍 Repeated Fingerprints (>=3) — Suggest Root Cause Analysis:`)
  for (const [fp, count] of repeatedFps) {
    console.log(`  ${fp}: ${count} times`)
  }
}

console.log('\n=== Recommended Tasks ===')
if (repeatedP1.length === 0 && repeatedFps.length === 0 && p0s.length === 0) {
  console.log('  No tasks recommended at this time.')
} else {
  if (p0s.length > 0) console.log(`  - Record ${p0s.length} P0 incident(s) in INCIDENTS.md`)
  for (const [code] of repeatedP1) {
    console.log(`  - Create task for repeated error ${code}`)
  }
  for (const [fp] of repeatedFps) {
    console.log(`  - Open Root Cause Analysis for fingerprint: ${fp}`)
  }
}

console.log('\n=== Recommended Incidents ===')
if (p0s.length > 0) {
  for (const p0 of p0s) {
    console.log(`  INC-${p0.eventId}: ${p0.message || 'P0 detected'} (${p0.timestamp})`)
  }
} else {
  console.log('  No incidents recommended.')
}
