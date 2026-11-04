import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test, expect, type BrowserContext, type Page, type TestInfo } from '@playwright/test'
import { SDK_VERSION } from 'firebase/app'
import type { CacheObservation, WorkoutDocument } from './api'

const origin = 'http://127.0.0.1:4175'
const emulatorOrigin = 'http://127.0.0.1:8080'
const documentRoot = `${emulatorOrigin}/v1/projects/demo-combat-training/databases/(default)/documents/workouts`
const dist = path.join(import.meta.dirname, 'dist')

interface Checkpoint {
  stage: string
  at: string
  observation: unknown
}

async function loadAssets(directory = dist, prefix = ''): Promise<Map<string, Buffer>> {
  const assets = new Map<string, Buffer>()
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = `${prefix}/${entry.name}`
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      for (const [key, bytes] of await loadAssets(filename, name)) assets.set(key, bytes)
    } else {
      assets.set(name, await readFile(filename))
    }
  }
  return assets
}

async function installNetworkHarness(context: BrowserContext, events: Checkpoint[]) {
  if (context.browser()?.browserType().name() === 'chromium') {
    // Route-fulfilled documents have no network IP address classification. Use the
    // normal per-origin permission for loopback access, without disabling browser security.
    await context.grantPermissions(['local-network-access'], { origin })
  }
  const assets = await loadAssets()
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.origin === origin) {
      // Supply only the static test shell, including after a full browser restart.
      // Firestore traffic is never fulfilled or mocked by this route.
      const filename = url.pathname === '/' ? '/index.html' : url.pathname
      const body = assets.get(filename)
      if (!body) return route.fulfill({ status: 404, body: 'Unknown spike asset' })
      const contentType = filename.endsWith('.js') ? 'application/javascript' : 'text/html'
      return route.fulfill({ status: 200, contentType, body })
    }
    if (url.origin === emulatorOrigin) return route.continue()
    await route.abort('blockedbyclient')
    if (url.origin === 'https://www.google.com' && url.pathname === '/images/cleardot.gif') {
      // WebChannel probes connectivity after transport errors (including deliberate
      // offline mode). Block the probe before it leaves the browser and record it.
      events.push({ stage: 'network:blocked-connectivity-probe', at: new Date().toISOString(), observation: url.origin + url.pathname })
      return
    }
    throw new Error(`Unexpected network destination: ${url.origin}`)
  })
}

async function openPage(context: BrowserContext, mode: 'persistent' | 'memory', events: Checkpoint[]) {
  const page = await context.newPage()
  page.on('console', (message) => {
    events.push({ stage: `console:${message.type()}`, at: new Date().toISOString(), observation: message.text() })
  })
  page.on('pageerror', (error) => {
    events.push({ stage: 'pageerror', at: new Date().toISOString(), observation: error.message })
  })
  await page.goto(`${origin}/?cache=${mode}`)
  await page.waitForFunction(() => Boolean(window.firestoreSpike))
  expect(await page.evaluate(() => window.firestoreSpike.mode)).toBe(mode)
  return page
}

async function readCache(page: Page, id: string): Promise<CacheObservation> {
  return page.evaluate((workoutId) => window.firestoreSpike.readCache(workoutId), id)
}

async function restRead(id: string) {
  // Node's HTTP client is outside the offline browser and independent of the SDK.
  const response = await fetch(`${documentRoot}/${encodeURIComponent(id)}`, {
    signal: AbortSignal.timeout(5_000),
  })
  const body: unknown = await response.json()
  return { status: response.status, body }
}

async function capture(page: Page, info: TestInfo, name: string) {
  await info.attach(name, { body: await page.screenshot(), contentType: 'image/png' })
}

for (const scenario of ['A', 'B', 'C'] as const) {
  test(`${scenario}: ${scenario === 'A' ? 'pending write survives tab close' : scenario === 'B' ? 'pending write survives browser close' : 'memory control loses the pending write'}`, async ({ browser, browserName, playwright }, info) => {
    const mode = scenario === 'C' ? 'memory' : 'persistent'
    const events: Checkpoint[] = []
    let stage = 'launch'
    let context: BrowserContext | undefined
    let profile: string | undefined
    const checkpoint = (name: string, observation: unknown) => {
      events.push({ stage: name, at: new Date().toISOString(), observation })
      console.log(JSON.stringify({ scenario, browserName, stage: name, observation }))
    }
    const workout: WorkoutDocument = {
      workoutId: `${browserName}-${scenario}-${randomUUID()}`,
      discipline: 'boxing',
      completedRounds: 3,
      completedAtIso: '2026-11-03T12:00:00.000Z',
    }
    const pending: CacheObservation = {
      exists: true, hasPendingWrites: true, fromCache: true, data: { ...workout },
    }
    info.annotations.push({ type: 'scenario', description: scenario })

    try {
      if (scenario === 'B') {
        profile = await mkdtemp(path.join(tmpdir(), 'firestore-offline-profile-'))
        context = await playwright[browserName].launchPersistentContext(profile, {
          headless: true, serviceWorkers: 'block',
        })
      } else {
        context = await browser.newContext({ serviceWorkers: 'block' })
      }
      checkpoint('versions', {
        firebase: SDK_VERSION,
        browser: context.browser()?.version() ?? browser.version(),
        engine: browserName,
        node: process.version,
      })
      await installNetworkHarness(context, events)
      let page = await openPage(context, mode, events)

      stage = 'online-before-write'
      const initial = await page.evaluate((id) => window.firestoreSpike.readServer(id), workout.workoutId)
      expect(initial.exists).toBe(false)
      expect(initial.fromCache).toBe(false)
      expect((await restRead(workout.workoutId)).status).toBe(404)
      checkpoint(stage, initial)

      stage = 'offline-pending-write'
      await context.setOffline(true)
      expect(await page.evaluate(() => navigator.onLine)).toBe(false)
      await page.evaluate((value) => window.firestoreSpike.writeWorkout(value), workout)
      await expect.poll(() => readCache(page, workout.workoutId)).toEqual(pending)
      const state = await page.evaluate(() => window.firestoreSpike.writeState())
      expect(state).toEqual({ state: 'pending', error: null })
      const beforeClose = await restRead(workout.workoutId)
      expect(beforeClose.status).toBe(404)
      checkpoint(stage, { cache: await readCache(page, workout.workoutId), write: state, rest: beforeClose })
      await capture(page, info, 'offline-before-close')

      stage = scenario === 'B' ? 'browser-restart-offline' : 'tab-reopen-offline'
      if (scenario === 'B') {
        // Closing the sole persistent context also closes the entire browser.
        await context.close()
        if (!profile) throw new Error('Persistent profile is missing.')
        context = await playwright[browserName].launchPersistentContext(profile, {
          headless: true, offline: true, serviceWorkers: 'block',
        })
        await installNetworkHarness(context, events)
      } else {
        await page.close()
      }
      page = await openPage(context, mode, events)
      expect(await page.evaluate(() => navigator.onLine)).toBe(false)
      const restored = await readCache(page, workout.workoutId)
      const stillAbsent = await restRead(workout.workoutId)
      checkpoint(stage, { cache: restored, rest: stillAbsent })
      expect(stillAbsent.status).toBe(404)
      await capture(page, info, 'offline-after-reopen')
      if (scenario === 'C') {
        expect(restored.exists).toBe(false)
        expect(restored.hasPendingWrites).toBe(false)
        expect(restored.data).toBeNull()
      } else {
        expect(restored).toEqual(pending)
      }

      stage = 'online-rest-verification'
      await context.setOffline(false)
      expect(await page.evaluate(() => navigator.onLine)).toBe(true)
      if (scenario === 'C') {
        const server = await page.evaluate((id) => window.firestoreSpike.readServer(id), workout.workoutId)
        expect(server.exists).toBe(false)
        expect(server.fromCache).toBe(false)
        const absent = await restRead(workout.workoutId)
        checkpoint(stage, { server, rest: absent, conclusion: 'Expected loss in RAM-only control.' })
        expect(absent.status).toBe(404)
      } else {
        await expect.poll(async () => {
          const observed = await restRead(workout.workoutId)
          if (observed.status === 200) checkpoint(stage, observed)
          return observed
        }, { timeout: 30_000 }).toMatchObject({
          status: 200,
          body: { fields: {
            workoutId: { stringValue: workout.workoutId },
            discipline: { stringValue: workout.discipline },
            completedRounds: { integerValue: String(workout.completedRounds) },
            completedAtIso: { stringValue: workout.completedAtIso },
          } },
        })
        await expect.poll(async () => (await readCache(page, workout.workoutId)).hasPendingWrites).toBe(false)
      }
      await capture(page, info, 'online-final')
      checkpoint('complete', { scenario, expectedPersistence: scenario !== 'C' })
    } catch (error: unknown) {
      checkpoint('failure', { stage, message: error instanceof Error ? error.message : String(error) })
      throw error
    } finally {
      try {
        await context?.close()
      } finally {
        await info.attach('observations.json', {
          body: JSON.stringify({ scenario, browserName, mode, stage, events }, null, 2),
          contentType: 'application/json',
        })
      }
    }
  })
}
