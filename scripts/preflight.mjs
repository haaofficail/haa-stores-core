import { existsSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

const EXPECTED_ROOT = '/Users/thwany/Desktop/haa-stores-core'
const CWD = process.cwd()

let failed = false

function check(condition, label, help) {
  if (condition) {
    console.log(`  ✅ ${label}`)
    return true
  }
  console.log(`  ❌ ${label}`)
  if (help) console.log(`     ${help}`)
  failed = true
  return false
}

function failHard(condition, label, help) {
  if (!condition) {
    console.log(`\n❌ ${label}`)
    if (help) console.log(`   ${help}`)
    process.exit(1)
  }
  console.log(`  ✅ ${label}`)
}

console.log('')
console.log('=== Preflight Root Guard ===')

if (process.env.CI) {
  console.log('  ✅ Root guard skipped (CI environment)')
} else {
  failHard(
    CWD === EXPECTED_ROOT,
    `Wrong project root. Expected: ${EXPECTED_ROOT}`,
    `Actual: ${CWD}\n   Run: cd ${EXPECTED_ROOT} && pnpm preflight`
  )
}

console.log('')
console.log('=== Project Structure Checks ===')

check(existsSync(join(CWD, '.haa-project-root')), '.haa-project-root exists', 'Create this file in the project root')
check(existsSync(join(CWD, 'package.json')), 'package.json exists')
check(existsSync(join(CWD, 'pnpm-workspace.yaml')), 'pnpm-workspace.yaml exists')
check(existsSync(join(CWD, 'apps')), 'apps/ directory exists')
check(existsSync(join(CWD, 'packages')), 'packages/ directory exists')
check(existsSync(join(CWD, 'AGENTS.md')), 'AGENTS.md exists')
check(existsSync(join(CWD, 'docs', 'ops')), 'docs/ops/ directory exists')

console.log('')
console.log('=== Environment Checks ===')

const nodeVersion = process.version
const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0])
check(nodeMajor >= 20, `Node.js ${nodeVersion} (>=20 required)`)

try {
  const pnpmVersion = execSync('pnpm --version', { encoding: 'utf-8' }).trim()
  const pnpmMajor = parseInt(pnpmVersion.split('.')[0])
  check(pnpmMajor >= 9, `pnpm ${pnpmVersion} (>=9 required)`)
} catch {
  check(false, 'pnpm available', 'Install pnpm >= 9')
}

if (!process.env.CI) {
  console.log('')
  console.log('=== TypeScript TypeCheck ===')

  try {
    execSync('pnpm run -r typecheck 2>&1', { encoding: 'utf-8', stdio: 'pipe', timeout: 120000 })
    console.log('  ✅ TypeCheck passed')
  } catch (e) {
    console.log('  ❌ TypeCheck failed')
    const lines = e.stdout?.split('\n').filter(l => l.includes('error')).slice(0, 5) || []
    for (const line of lines) {
      console.log(`     ${line.trim()}`)
    }
    failed = true
  }
}

console.log('')
if (failed) {
  console.log('❌ Preflight FAILED — resolve issues before continuing')
  process.exit(1)
} else {
  console.log('✅ Preflight PASSED — project is healthy')
}
