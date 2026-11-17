import { createServer } from 'vite'
import { request } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
// Override local Firebase settings and disable .env loading for this isolated demo.
Object.assign(process.env, {
  VITE_FIREBASE_API_KEY: 'demo-config',
  VITE_FIREBASE_AUTH_DOMAIN: 'demo-combat-training.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'demo-combat-training',
  VITE_FIREBASE_APP_ID: 'demo-app',
  VITE_FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  VITE_FIREBASE_FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
})
const server = await createServer({ root, envDir: false,
  cacheDir: path.join(process.env.COMBAT_DEMO_SCRATCH, 'vite'),
  server: { host: '127.0.0.1', port: 5173, strictPort: true, open: false },
})
let closing = false
async function close() {
  if (closing) return
  closing = true
  await server.close()
}
process.on('SIGINT', () => { void close() })
process.on('SIGTERM', () => { void close() })
const api = await request.newContext()
try {
  const { createDemoData } = await server.ssrLoadModule('/e2e/demo/data.ts')
  const { createDemoAccount } = await server.ssrLoadModule('/e2e/demo/account.ts')
  const { seedDemo } = await server.ssrLoadModule('/e2e/demo/seed.ts')
  const data = createDemoData()
  const account = await createDemoAccount(api, 'demo')
  const empty = process.argv.includes('--empty')
  await seedDemo(api, account, data, empty)
  await server.listen()
  console.log('\nDemo: http://127.0.0.1:5173')
  console.log(`E-mail: ${account.email}\nHaslo: ${account.password}`)
  console.log(empty ? 'Puste konto.' : `${data.demoSessions.length} treningow / 14 tygodni (2 tygodnie przerwy), ${data.demoSessions.flatMap((session) => session.source === 'plan' ? session.focusRatings : []).length} ocen.`)
  console.log('Ctrl+C zamyka serwer i oba emulatory. Dane sa tymczasowe.\n')
} catch (error) {
  await close()
  throw error
} finally {
  await api.dispose()
}
