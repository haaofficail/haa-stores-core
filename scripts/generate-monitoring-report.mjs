import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const EVENTS_FILE = join(ROOT, 'storage', 'monitoring-events.ndjson')
const SUPPORT_EVENTS_FILE = join(ROOT, 'storage', 'support-error-events.ndjson')
const REPORT_FILE = join(ROOT, 'docs', 'ops', 'LATEST_MONITORING_REPORT.md')

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

const now = new Date().toISOString()

// Determine overall status
const p0Count = events.filter(e => e.severity === 'P0').length
const p1Count = events.filter(e => e.severity === 'P1').length
const failCount = events.filter(e => e.status === 'fail').length
const warnCount = events.filter(e => e.status === 'warn').length
const passCount = events.filter(e => e.status === 'pass').length

let overallStatus
if (p0Count > 0) overallStatus = 'Critical'
else if (failCount > 0 || p1Count > 3) overallStatus = 'Degraded'
else if (warnCount > 0) overallStatus = 'Degraded'
else if (passCount > 0) overallStatus = 'Healthy'
else overallStatus = 'Unknown'

// Analysis: top error codes, apps, routes
const errorCodes = {}
const apps = {}
const routes = {}
const fingerprints = {}

for (const e of events) {
  if (e.errorCode) errorCodes[e.errorCode] = (errorCodes[e.errorCode] || 0) + 1
  if (e.app) apps[e.app] = (apps[e.app] || 0) + 1
  if (e.route || e.target) {
    const key = e.route || e.target
    routes[key] = (routes[key] || 0) + 1
  }
  if (e.fingerprint) fingerprints[e.fingerprint] = (fingerprints[e.fingerprint] || 0) + 1
}

const topErrorCodes = Object.entries(errorCodes).sort((a, b) => b[1] - a[1]).slice(0, 10)
const topApps = Object.entries(apps).sort((a, b) => b[1] - a[1]).slice(0, 5)
const topRoutes = Object.entries(routes).sort((a, b) => b[1] - a[1]).slice(0, 5)
const topFingerprints = Object.entries(fingerprints).sort((a, b) => b[1] - a[1]).slice(0, 5)

const content = `# Latest Monitoring Report

- **Generated At:** ${now}
- **Overall Status:** ${overallStatus}
- **Period Events Analyzed:** ${events.length}

---

## P0 Alerts

${p0Count > 0 ? events.filter(e => e.severity === 'P0').map(e =>
  `- [${e.eventId}] ${e.timestamp} — ${e.message || 'No message'} (${e.target || ''})`
).join('\n') : '*None*'}

## P1 Alerts

${p1Count > 0 ? events.filter(e => e.severity === 'P1').slice(0, 10).map(e =>
  `- [${e.eventId}] ${e.errorCode || 'N/A'} — ${e.message || 'No message'} (${e.app || ''})`
).join('\n') : '*None*'}

## Health Summary

| Metric | Count |
|--------|------:|
| Pass | ${passCount} |
| Warning | ${warnCount} |
| Fail | ${failCount} |
| Total | ${events.length} |

## Synthetic Checks Summary

| Target | Status |
|--------|--------|
${events.filter(e => e.checkType === 'synthetic').slice(-10).reverse().map(e =>
  `| ${e.target || 'N/A'} | ${e.status} |`
).join('\n')}

## Top Repeated Error Codes

| Code | Count |
|------|------:|
${topErrorCodes.map(([code, count]) => `| ${code} | ${count} |`).join('\n')}

## Top Affected Apps

| App | Events |
|-----|-------:|
${topApps.map(([app, count]) => `| ${app} | ${count} |`).join('\n')}

## Top Affected Routes / Targets

| Route | Events |
|-------|-------:|
${topRoutes.map(([route, count]) => `| ${route} | ${count} |`).join('\n')}

## Suspected Root Causes

${topFingerprints.length > 0 ? topFingerprints.map(([fp, count]) =>
  `- Fingerprint \`${fp}\` repeated ${count} times`
).join('\n') : '*None identified*'}

## Recommended Tasks

${events.filter(e => e.severity === 'P1').length >= 3
  ? events.filter(e => e.severity === 'P1').slice(0, 3).map(e =>
    `- Investigate repeated ${e.errorCode || 'P1 error'} in ${e.app || 'system'}`
  ).join('\n')
  : '*None*'}

## Recommended Incidents

${p0Count > 0 ? events.filter(e => e.severity === 'P0').map(e =>
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
