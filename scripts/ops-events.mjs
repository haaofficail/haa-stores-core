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
