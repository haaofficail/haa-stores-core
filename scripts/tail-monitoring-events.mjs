import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const EVENTS_FILE = join(ROOT, 'storage', 'monitoring-events.ndjson')
const LIMIT = parseInt(process.argv[2] || '20')

function readEvents(filePath) {
  if (!existsSync(filePath)) return []
  const content = readFileSync(filePath, 'utf-8').trim()
  if (!content) return []
  return content.split('\n').filter(Boolean).map(line => {
    try { return JSON.parse(line) } catch { return null }
  }).filter(Boolean)
}

const events = readEvents(EVENTS_FILE)
const tail = events.slice(-LIMIT).reverse()

console.log(`\nLast ${tail.length} monitoring events:\n`)
console.log('Timestamp'.padEnd(28) + 'Severity'.padEnd(10) + 'Status'.padEnd(10) + 'App'.padEnd(22) + 'Target'.padEnd(30) + 'ErrorCode'.padEnd(14) + 'Message')
console.log('-'.repeat(140))

for (const e of tail) {
  const ts = (e.timestamp || '').slice(0, 19).padEnd(28)
  const sev = (e.severity || '').padEnd(10)
  const st = (e.status || '').padEnd(10)
  const app = (e.app || '').padEnd(22)
  const target = (e.target || '').slice(0, 28).padEnd(30)
  const code = (e.errorCode || '').padEnd(14)
  const msg = (e.message || '').slice(0, 40)
  console.log(`${ts}${sev}${st}${app}${target}${code}${msg}`)
}
