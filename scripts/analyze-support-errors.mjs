import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const EVENTS_FILE = process.env.HAA_OPS_MONITORING_EVENTS_FILE || join(ROOT, 'storage', 'monitoring-events.ndjson')
const SUPPORT_EVENTS_FILE = process.env.HAA_OPS_SUPPORT_EVENTS_FILE || join(ROOT, 'storage', 'support-error-events.ndjson')
const LOOKBACK_HOURS = Number(process.env.HAA_OPS_ERRORS_LOOKBACK_HOURS || 24)
const NOW = process.env.HAA_OPS_NOW ? new Date(process.env.HAA_OPS_NOW) : new Date()

function readEvents(filePath, sourceKind) {
  if (!existsSync(filePath)) return []
  const content = readFileSync(filePath, 'utf-8').trim()
  if (!content) return []
  return content.split('\n').filter(Boolean).map(line => {
    try {
      return {
        ...JSON.parse(line),
        sourceKind,
      }
    } catch { return null }
  }).filter(Boolean)
}

const events = [
  ...readEvents(EVENTS_FILE, 'monitoring'),
  ...readEvents(SUPPORT_EVENTS_FILE, 'support'),
]

function isWithinLookback(event) {
  if (!Number.isFinite(LOOKBACK_HOURS) || LOOKBACK_HOURS <= 0) return true
  if (!event.timestamp) return false
  const eventDate = new Date(event.timestamp)
  if (Number.isNaN(eventDate.getTime())) return false
  const ageMs = NOW.getTime() - eventDate.getTime()
  return ageMs >= 0 && ageMs <= LOOKBACK_HOURS * 60 * 60 * 1000
}

function isActionableEvent(event) {
  if (!isWithinLookback(event)) return false
  if (event.status === 'pass') return false

  if (event.sourceKind === 'support') {
    return ['P0', 'P1', 'P2'].includes(event.severity)
  }

  if (event.status === 'fail') return true
  return ['P0', 'P1'].includes(event.severity)
}

const actionableEvents = events.filter(isActionableEvent)
const historicalEvents = events.filter(event => !isWithinLookback(event))
const passiveEvents = events.filter(event => isWithinLookback(event) && !isActionableEvent(event))

console.log(`\nAnalyzing ${events.length} total events...`)
console.log(`Active action window: last ${LOOKBACK_HOURS > 0 ? LOOKBACK_HOURS : 'all'} hour(s)`)
console.log(`Actionable events in window: ${actionableEvents.length}`)
console.log(`Historical events outside window: ${historicalEvents.length}`)
console.log(`Passive pass/warn events ignored for recommendations: ${passiveEvents.length}\n`)

// Counts by severity
const bySeverity = { P0: 0, P1: 0, P2: 0, P3: 0, P4: 0 }
for (const e of actionableEvents) {
  const s = e.severity || 'P3'
  bySeverity[s] = (bySeverity[s] || 0) + 1
}
console.log('=== Actionable Events by Severity ===')
for (const [sev, count] of Object.entries(bySeverity)) {
  if (count > 0) console.log(`  ${sev}: ${count}`)
}
if (Object.values(bySeverity).every(count => count === 0)) console.log('  None')

// Top error codes
const errorCodes = {}
for (const e of actionableEvents) {
  if (e.errorCode) {
    errorCodes[e.errorCode] = (errorCodes[e.errorCode] || 0) + 1
  }
}
const topErrorCodes = Object.entries(errorCodes).sort((a, b) => b[1] - a[1]).slice(0, 5)
console.log('\n=== Top Actionable Error Codes ===')
for (const [code, count] of topErrorCodes) {
  console.log(`  ${code}: ${count}`)
}
if (topErrorCodes.length === 0) console.log('  None')

// Top fingerprints
const fingerprints = {}
for (const e of actionableEvents) {
  if (e.fingerprint) {
    fingerprints[e.fingerprint] = (fingerprints[e.fingerprint] || 0) + 1
  }
}
const topFingerprints = Object.entries(fingerprints).sort((a, b) => b[1] - a[1]).slice(0, 5)
console.log('\n=== Top Actionable Fingerprints ===')
for (const [fp, count] of topFingerprints) {
  console.log(`  ${fp}: ${count}`)
}
if (topFingerprints.length === 0) console.log('  None')

// Top affected apps
const apps = {}
for (const e of actionableEvents) {
  if (e.app) {
    apps[e.app] = (apps[e.app] || 0) + 1
  }
}
const topApps = Object.entries(apps).sort((a, b) => b[1] - a[1]).slice(0, 5)
console.log('\n=== Top Actionable Affected Apps ===')
for (const [app, count] of topApps) {
  console.log(`  ${app}: ${count}`)
}
if (topApps.length === 0) console.log('  None')

// Top affected routes
const routes = {}
for (const e of actionableEvents) {
  if (e.route || e.target) {
    const key = e.route || e.target
    routes[key] = (routes[key] || 0) + 1
  }
}
const topRoutes = Object.entries(routes).sort((a, b) => b[1] - a[1]).slice(0, 5)
console.log('\n=== Top Actionable Routes/Targets ===')
for (const [route, count] of topRoutes) {
  console.log(`  ${route}: ${count}`)
}
if (topRoutes.length === 0) console.log('  None')

// P0 alerts
const p0s = actionableEvents.filter(e => e.severity === 'P0')
if (p0s.length > 0) {
  console.log(`\n🚨 Active P0 Alerts (${p0s.length}):`)
  for (const p0 of p0s) {
    console.log(`  [${p0.timestamp}] ${p0.message || 'No message'} — ${p0.target || ''}`)
  }
}

// P1 repeated
const p1s = actionableEvents.filter(e => e.severity === 'P1')
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
  console.log(`\n🔍 Active Repeated Fingerprints (>=3) — Suggest Root Cause Analysis:`)
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
