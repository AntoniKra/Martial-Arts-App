import { spawn } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
if (args.some((arg) => arg !== '--empty') || args.length > 1) {
  console.error('Usage: npm run demo [-- --empty]')
  process.exit(1)
}
const root = fileURLToPath(new URL('..', import.meta.url))
const scratch = await mkdtemp(path.join(tmpdir(), 'combat-training-demo-'))
const firebaseCli = fileURLToPath(import.meta.resolve('firebase-tools/lib/bin/firebase.js'))
const server = path.join(root, 'scripts', 'demo-server.mjs')
const child = spawn(process.execPath, [firebaseCli, 'emulators:exec', '--only', 'auth,firestore',
  '--project', 'demo-combat-training', '--config', path.join(root, 'firebase.json'), '--non-interactive',
  `"${process.execPath}" "${server}"${args.length ? ' --empty' : ''}`], {
  cwd: scratch, stdio: 'inherit', detached: process.platform !== 'win32',
  env: { ...process.env, COMBAT_DEMO_SCRATCH: scratch },
})
let stopping = false
function stop() {
  if (stopping) return
  stopping = true
  if (process.platform === 'win32') {
    // Windows has no POSIX process groups. End the entire owned tree, including Java.
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
  } else {
    process.kill(-child.pid, 'SIGINT')
  }
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
child.on('error', (error) => { console.error(error.message); process.exitCode = 1 })
child.on('exit', (code) => { process.exitCode = stopping ? 0 : code ?? 1 })
