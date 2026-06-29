import { existsSync, readFileSync } from 'fs'

export const DEFAULT_LOOKBACK_HOURS = 24

export function resolveOpsEventConfig(env = process.env, now = new Date()) {
  const lookbackHours = Number(env.HAA_OPS_ERRORS_LOOKBACK_HOURS || DEFAULT_LOOKBACK_HOURS)

  return {
    lookbackHours,
    now: env.HAA_OPS_NOW ? new Date(env.HAA_OPS_NOW) : now,
  }
}

export function readNdjsonEvents(filePath, sourceKind) {
  if (!existsSync(filePath)) return []
  const content = readFileSync(filePath, 'utf-8').trim()
  if (!content) return []

  return content
    .split('\n')
    .filter(Boolean)
    .map(line => {
      try {
        return {
          ...JSON.parse(line),
          sourceKind,
        }
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

export function isWithinLookback(event, config) {
  if (!Number.isFinite(config.lookbackHours) || config.lookbackHours <= 0) return true
  if (!event.timestamp) return false

  const eventDate = new Date(event.timestamp)
  if (Number.isNaN(eventDate.getTime())) return false

  const ageMs = config.now.getTime() - eventDate.getTime()
  return ageMs >= 0 && ageMs <= config.lookbackHours * 60 * 60 * 1000
}

export function isActionableEvent(event, config) {
  if (!isWithinLookback(event, config)) return false
  if (event.status === 'pass') return false

  if (event.sourceKind === 'support') {
    return ['P0', 'P1', 'P2', 'P3'].includes(event.severity)
  }

  if (event.status === 'fail') return true
  return ['P0', 'P1'].includes(event.severity)
}

export function partitionOpsEvents(events, config) {
  const windowEvents = events.filter(event => isWithinLookback(event, config))
  const actionableEvents = windowEvents.filter(event => isActionableEvent(event, config))
  const historicalEvents = events.filter(event => !isWithinLookback(event, config))
  const passiveEvents = windowEvents.filter(event => !isActionableEvent(event, config))

  return {
    windowEvents,
    actionableEvents,
    historicalEvents,
    passiveEvents,
  }
}

export function countBy(events, resolver) {
  const counts = {}
  for (const event of events) {
    const key = resolver(event)
    if (key) counts[key] = (counts[key] || 0) + 1
  }
  return counts
}

export function topCounts(counts, limit = 5) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit)
}

function maxSeverity(events) {
  const priority = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 }
  return events
    .map(event => event.severity || 'P3')
    .sort((a, b) => (priority[a] ?? 99) - (priority[b] ?? 99))[0] || 'P3'
}

function summarizeEvidence(events) {
  return events.map(event => ({
    eventId: event.eventId || null,
    timestamp: event.timestamp || null,
    severity: event.severity || null,
    errorCode: event.errorCode || null,
    app: event.app || null,
    route: event.route || null,
    target: event.target || null,
    fingerprint: event.fingerprint || null,
    sourceKind: event.sourceKind || null,
  }))
}

export function buildOpsAlerts(events, config) {
  const { actionableEvents } = partitionOpsEvents(events, config)
  const alerts = []
  const now = config.now.toISOString()

  for (const event of actionableEvents.filter(item => item.severity === 'P0')) {
    const fingerprint = event.fingerprint || event.errorCode || event.target || event.route || event.eventId || 'unknown'
    alerts.push({
      alertId: `ops-alert:${now}:incident:${event.eventId || fingerprint}`,
      dedupeKey: `incident:p0:${fingerprint}`,
      kind: 'incident',
      severity: 'P0',
      title: 'P0 incident candidate detected',
      reason: 'Active P0 event in the monitoring action window',
      count: 1,
      lookbackHours: config.lookbackHours,
      evidence: summarizeEvidence([event]),
    })
  }

  const p1ByCode = {}
  for (const event of actionableEvents.filter(item => item.severity === 'P1')) {
    const code = event.errorCode || 'UNKNOWN'
    if (!p1ByCode[code]) p1ByCode[code] = []
    p1ByCode[code].push(event)
  }
  for (const [code, groupedEvents] of Object.entries(p1ByCode)) {
    if (groupedEvents.length < 3) continue
    alerts.push({
      alertId: `ops-alert:${now}:task:p1:${code}`,
      dedupeKey: `task:p1:${code}`,
      kind: 'task',
      severity: 'P1',
      title: `Repeated P1 error code ${code}`,
      reason: 'P1 error code repeated at least 3 times in the monitoring action window',
      count: groupedEvents.length,
      lookbackHours: config.lookbackHours,
      evidence: summarizeEvidence(groupedEvents),
    })
  }

  const fingerprints = {}
  for (const event of actionableEvents) {
    if (!event.fingerprint) continue
    if (!fingerprints[event.fingerprint]) fingerprints[event.fingerprint] = []
    fingerprints[event.fingerprint].push(event)
  }
  for (const [fingerprint, groupedEvents] of Object.entries(fingerprints)) {
    if (groupedEvents.length < 3) continue
    alerts.push({
      alertId: `ops-alert:${now}:rca:${fingerprint}`,
      dedupeKey: `rca:fingerprint:${fingerprint}`,
      kind: 'root-cause-analysis',
      severity: maxSeverity(groupedEvents),
      title: 'Repeated fingerprint requires RCA',
      reason: 'Fingerprint repeated at least 3 times in the monitoring action window',
      count: groupedEvents.length,
      lookbackHours: config.lookbackHours,
      evidence: summarizeEvidence(groupedEvents),
    })
  }

  return alerts
}
