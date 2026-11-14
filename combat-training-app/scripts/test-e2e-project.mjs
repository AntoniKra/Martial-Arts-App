import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const [project, ...extraArgs] = process.argv.slice(2)

if (!['phone', 'tablet', 'desktop'].includes(project) || extraArgs.length > 0) {
  console.error('Usage: npm run test:e2e:project -- <phone|tablet|desktop>')
  process.exit(1)
}

const firebaseCli = fileURLToPath(import.meta.resolve('firebase-tools/lib/bin/firebase.js'))
const result = spawnSync(process.execPath, [
  firebaseCli,
  'emulators:exec',
  '--only', 'auth,firestore',
  '--project', 'demo-combat-training',
  '--config', 'firebase.json',
  '--non-interactive',
  `playwright test --project=${project}`,
], { stdio: 'inherit' })

if (result.error) {
  console.error(result.error.message)
}

process.exit(result.status ?? 1)
