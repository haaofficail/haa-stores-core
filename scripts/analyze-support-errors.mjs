import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  countBy,
  partitionOpsEvents,
  readNdjsonEvents,
  resolveOpsEventConfig,
  topCounts,
} from './ops-events.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const EVENTS_FILE = process.env.HAA_OPS_MONITORING_EVENTS_FILE || join(ROOT, 'storage', 'monitoring-events.ndjson')
const SUPPORT_EVENTS_FILE = process.env.HAA_OPS_SUPPORT_EVENTS_FILE || join(ROOT, 'storage', 'support-error-events.ndjson')
const config = resolveOpsEventConfig()

const events = [
  ...readNdjsonEvents(EVENTS_FILE, 'monitoring'),
  ...readNdjsonEvents(SUPPORT_EVENTS_FILE, 'support'),
]

const { actionableEvents, historicalEvents, passiveEvents } = partitionOpsEvents(events, config)

console.log(`\nAnalyzing ${events.length} total events...`)
console.log(`Active action window: last ${config.lookbackHours > 0 ? config.lookbackHours : 'all'} hour(s)`)
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
const errorCodes = countBy(actionableEvents, event => event.errorCode)
const topErrorCodes = topCounts(errorCodes, 5)
console.log('\n=== Top Actionable Error Codes ===')
for (const [code, count] of topErrorCodes) {
  console.log(`  ${code}: ${count}`)
}
if (topErrorCodes.length === 0) console.log('  None')

// Top fingerprints
const fingerprints = countBy(actionableEvents, event => event.fingerprint)
const topFingerprints = topCounts(fingerprints, 5)
console.log('\n=== Top Actionable Fingerprints ===')
for (const [fp, count] of topFingerprints) {
  console.log(`  ${fp}: ${count}`)
}
if (topFingerprints.length === 0) console.log('  None')

// Top affected apps
const apps = countBy(actionableEvents, event => event.app)
const topApps = topCounts(apps, 5)
console.log('\n=== Top Actionable Affected Apps ===')
for (const [app, count] of topApps) {
  console.log(`  ${app}: ${count}`)
}
if (topApps.length === 0) console.log('  None')

// Top affected routes
const routes = countBy(actionableEvents, event => event.route || event.target)
const topRoutes = topCounts(routes, 5)
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
