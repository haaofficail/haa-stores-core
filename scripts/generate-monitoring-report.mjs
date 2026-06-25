import { writeFileSync, existsSync, mkdirSync } from 'fs'
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
const REPORT_FILE = join(ROOT, 'docs', 'ops', 'LATEST_MONITORING_REPORT.md')
const config = resolveOpsEventConfig()

const events = [
  ...readNdjsonEvents(EVENTS_FILE, 'monitoring'),
  ...readNdjsonEvents(SUPPORT_EVENTS_FILE, 'support'),
]

const now = new Date().toISOString()
const { actionableEvents, historicalEvents, passiveEvents, windowEvents } = partitionOpsEvents(events, config)

function latestCheckEvents(eventsToReduce) {
  const latest = new Map()
  for (const event of eventsToReduce) {
    if (!event.checkType || !(event.target || event.route)) continue
    const key = `${event.source || 'unknown'}::${event.checkType}::${event.app || 'system'}::${event.target || event.route}`
    const previous = latest.get(key)
    if (!previous || String(event.timestamp || '') > String(previous.timestamp || '')) {
      latest.set(key, event)
    }
  }
  return [...latest.values()]
}

const currentCheckEvents = latestCheckEvents(windowEvents)

// Determine overall status
const p0Count = actionableEvents.filter(e => e.severity === 'P0').length
const p1Count = actionableEvents.filter(e => e.severity === 'P1').length
const failCount = actionableEvents.filter(e => e.status === 'fail').length
const warnCount = currentCheckEvents.filter(e => e.status === 'warn').length
const passCount = currentCheckEvents.filter(e => e.status === 'pass').length

let overallStatus
if (p0Count > 0) overallStatus = 'Critical'
else if (failCount > 0 || p1Count > 3) overallStatus = 'Degraded'
else if (warnCount > 0) overallStatus = 'Degraded'
else if (passCount > 0) overallStatus = 'Healthy'
else overallStatus = 'Unknown'

const errorCodes = countBy(actionableEvents, event => event.errorCode)
const apps = countBy(actionableEvents, event => event.app)
const routes = countBy(actionableEvents, event => event.route || event.target)
const fingerprints = countBy(actionableEvents, event => event.fingerprint)

const topErrorCodes = topCounts(errorCodes, 10)
const topApps = topCounts(apps, 5)
const topRoutes = topCounts(routes, 5)
const topFingerprints = topCounts(fingerprints, 5)

const content = `# Latest Monitoring Report

- **Generated At:** ${now}
- **Overall Status:** ${overallStatus}
- **Active Window:** last ${config.lookbackHours > 0 ? config.lookbackHours : 'all'} hour(s)
- **Total Events Available:** ${events.length}
- **Window Events Analyzed:** ${windowEvents.length}
- **Actionable Events:** ${actionableEvents.length}
- **Historical Events Ignored for Recommendations:** ${historicalEvents.length}
- **Passive Pass/Warn Events Ignored for Recommendations:** ${passiveEvents.length}

---

## Active P0 Alerts

${p0Count > 0 ? actionableEvents.filter(e => e.severity === 'P0').map(e =>
  `- [${e.eventId}] ${e.timestamp} — ${e.message || 'No message'} (${e.target || ''})`
).join('\n') : '*None*'}

## Active P1 Alerts

${p1Count > 0 ? actionableEvents.filter(e => e.severity === 'P1').slice(0, 10).map(e =>
  `- [${e.eventId}] ${e.errorCode || 'N/A'} — ${e.message || 'No message'} (${e.app || ''})`
).join('\n') : '*None*'}

## Active Window Health Summary

| Metric | Count |
|--------|------:|
| Pass | ${passCount} |
| Warning | ${warnCount} |
| Fail | ${failCount} |
| Current checks | ${currentCheckEvents.length} |
| Total in window | ${windowEvents.length} |

## Synthetic Checks Summary

| Target | Status |
|--------|--------|
${currentCheckEvents.filter(e => e.checkType === 'synthetic').slice(-10).reverse().map(e =>
  `| ${e.target || 'N/A'} | ${e.status} |`
).join('\n') || '| None | N/A |'}

## Top Active Error Codes

| Code | Count |
|------|------:|
${topErrorCodes.map(([code, count]) => `| ${code} | ${count} |`).join('\n') || '| None | 0 |'}

## Top Active Affected Apps

| App | Events |
|-----|-------:|
${topApps.map(([app, count]) => `| ${app} | ${count} |`).join('\n') || '| None | 0 |'}

## Top Active Routes / Targets

| Route | Events |
|-------|-------:|
${topRoutes.map(([route, count]) => `| ${route} | ${count} |`).join('\n') || '| None | 0 |'}

## Active Suspected Root Causes

${topFingerprints.length > 0 ? topFingerprints.map(([fp, count]) =>
  `- Fingerprint \`${fp}\` repeated ${count} times`
).join('\n') : '*None identified*'}

## Recommended Tasks

${actionableEvents.filter(e => e.severity === 'P1').length >= 3
  ? actionableEvents.filter(e => e.severity === 'P1').slice(0, 3).map(e =>
    `- Investigate repeated ${e.errorCode || 'P1 error'} in ${e.app || 'system'}`
  ).join('\n')
  : '*None*'}

## Recommended Incidents

${p0Count > 0 ? actionableEvents.filter(e => e.severity === 'P0').map(e =>
  `- INC-${e.eventId}: ${e.message || 'P0 event'}`
).join('\n') : '*None*'}

## Next Actions

1. ${overallStatus === 'Critical' ? '**Fix P0 incidents immediately**' : 'Review warnings and address P1 items'}
2. Run \`pnpm ops:monitor\` after any fix
3. Update ISSUE_KNOWLEDGE_BASE for repeated fingerprints
4. Update INCIDENTS.md for any new incidents

## Limitations

- This report reflects only events recorded via monitoring scripts
- Dev servers must be running for HTTP-level checks
- No real user traffic is being monitored (local-only)
- Error analysis depends on events being recorded to ndjson files
`

const reportDir = dirname(REPORT_FILE)
if (!existsSync(reportDir)) mkdirSync(reportDir, { recursive: true })
writeFileSync(REPORT_FILE, content, 'utf-8')
console.log(`\nMonitoring report generated: ${REPORT_FILE}`)
console.log(`Overall Status: ${overallStatus}`)
