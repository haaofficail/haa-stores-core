import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildOpsAlerts,
  readNdjsonEvents,
  resolveOpsEventConfig,
} from './ops-events.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const EVENTS_FILE = process.env.HAA_OPS_MONITORING_EVENTS_FILE || join(ROOT, 'storage', 'monitoring-events.ndjson')
const SUPPORT_EVENTS_FILE = process.env.HAA_OPS_SUPPORT_EVENTS_FILE || join(ROOT, 'storage', 'support-error-events.ndjson')
const ALERTS_FILE = process.env.HAA_OPS_ALERTS_FILE || join(ROOT, 'storage', 'monitoring-alerts.ndjson')
const config = resolveOpsEventConfig()

const events = [
  ...readNdjsonEvents(EVENTS_FILE, 'monitoring'),
  ...readNdjsonEvents(SUPPORT_EVENTS_FILE, 'support'),
]

function readExistingDedupeKeys(filePath) {
  if (!existsSync(filePath)) return new Set()
  const content = readFileSync(filePath, 'utf-8').trim()
  if (!content) return new Set()

  return new Set(
    content
      .split('\n')
      .filter(Boolean)
      .map(line => {
        try {
          return JSON.parse(line).dedupeKey || null
        } catch {
          return null
        }
      })
      .filter(Boolean),
  )
}

const existingKeys = readExistingDedupeKeys(ALERTS_FILE)
const alerts = buildOpsAlerts(events, config)
const newAlerts = alerts.filter(alert => !existingKeys.has(alert.dedupeKey))

console.log(`\nMonitoring alert emission`)
console.log(`Active action window: last ${config.lookbackHours > 0 ? config.lookbackHours : 'all'} hour(s)`)
console.log(`Alert candidates: ${alerts.length}`)
console.log(`New alerts emitted: ${newAlerts.length}`)

if (newAlerts.length > 0) {
  const outputDir = dirname(ALERTS_FILE)
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true })
  const emittedAt = config.now.toISOString()
  appendFileSync(
    ALERTS_FILE,
    newAlerts.map(alert => JSON.stringify({ ...alert, emittedAt })).join('\n') + '\n',
    'utf-8',
  )
  for (const alert of newAlerts) {
    console.log(`  - ${alert.kind} ${alert.severity}: ${alert.title} (${alert.dedupeKey})`)
  }
} else {
  console.log('No new local monitoring alerts emitted.')
}
