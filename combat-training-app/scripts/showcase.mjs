import { readFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { parseArgs, parseEnv } from 'node:util'
import { createServer } from 'vite'

const rootUrl = new URL('../', import.meta.url)
const usage = 'Użycie: npm run showcase -- --persona <kuba|ola|marek> --production [--replace]'

async function readEnv(name) {
  try {
    return parseEnv(await readFile(new URL(name, rootUrl), 'utf8'))
  } catch {
    throw new Error(`Nie można wczytać pliku ${name}. Sprawdź, czy istnieje i ma format KEY=VALUE.`)
  }
}

async function confirm(projectId, email, replace) {
  console.log(`Projekt Firebase: ${projectId}\nE-mail: ${email}`)
  if (replace) console.log('Opcja --replace usunie dotychczasowe dokumenty z kolekcji pokazowych tego konta.')
  console.log('Czy kontynuować? (tak/nie)')
  const prompt = createInterface({ input: process.stdin })
  try {
    const { value } = await prompt[Symbol.asyncIterator]().next()
    return value?.trim().toLowerCase() === 'tak'
  } finally {
    prompt.close()
  }
}

async function main() {
  let args
  try {
    args = parseArgs({ options: {
      persona: { type: 'string', multiple: true },
      production: { type: 'boolean' }, replace: { type: 'boolean' }, emulator: { type: 'boolean' },
    } }).values
  } catch {
    throw new Error(usage)
  }
  if (args.production && args.emulator) throw new Error('Wybierz tylko jeden tryb uruchomienia.')
  if (!args.production && !args.emulator) throw new Error(`Odmowa zapisu bez flagi --production.\n${usage}`)

  const server = await createServer({
    root: fileURLToPath(rootUrl), configFile: false, envDir: false,
    resolve: { alias: { '@': fileURLToPath(new URL('src', rootUrl)) } },
    server: { middlewareMode: true, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  try {
    const { demoPersonas } = await server.ssrLoadModule('/e2e/demo/data.ts')
    const persona = args.persona?.[0]
    if (args.persona?.length !== 1 || !demoPersonas.includes(persona)) throw new Error(usage)
    const prefix = `SHOWCASE_${persona.toUpperCase()}`
    const credentials = args.emulator ? process.env : await readEnv('.env.showcase')
    const email = credentials[`${prefix}_EMAIL`]
    const password = credentials[`${prefix}_PASSWORD`]
    if (!email || !/^[^\s@]+@[^\s@]+$/.test(email) || !password) {
      throw new Error(`Uzupełnij ${prefix}_EMAIL i ${prefix}_PASSWORD dla wybranej persony.`)
    }
    let target = { mode: 'emulator' }
    if (args.production) {
      const { VITE_FIREBASE_PROJECT_ID: projectId, VITE_FIREBASE_API_KEY: apiKey } = await readEnv('.env')
      if (!projectId || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId) || projectId.startsWith('demo-') || !apiKey) {
        throw new Error('Nieprawidłowy projekt Firebase lub brak konfiguracji logowania w .env.')
      }
      if (!await confirm(projectId, email, args.replace)) {
        console.log('Anulowano zapis.')
        return
      }
      target = { mode: 'production', projectId, apiKey }
    }
    const { seedShowcase } = await server.ssrLoadModule('/e2e/demo/showcase.ts')
    const { sessions, documents } = await seedShowcase({ target, persona, email, password, replace: args.replace === true })
    console.log(`Zapisano treningi (${sessions}) i dokumenty konta (${documents} łącznie) dla persony ${persona}.`)
  } finally {
    await server.close()
  }
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Nie udało się przygotować konta pokazowego.')
  process.exitCode = 1
}
