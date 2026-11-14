import { readFileSync } from 'node:fs'
import { assertFails, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, disableNetwork, doc, enableNetwork, getDocFromServer, getDocsFromServer, setDoc, setLogLevel, type Firestore } from 'firebase/firestore'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { createFirestoreHealthRepositories } from '../src/infrastructure/firebase/firestoreHealthRepository'
import type { RepositorySnapshot } from '../src/application/repositorySubscription'
import type { WellbeingEntry } from '../src/domain/wellbeing/wellbeing'
import { calculateWorkoutDate } from '../src/domain/workout-session/workoutSessionDefinitions'

const hooks = vi.hoisted(() => ({ afterRead: null as (() => Promise<void>) | null, beforeCommit: null as ((commit: () => Promise<void>) => Promise<void>) | null }))
vi.mock('firebase/firestore', async (original) => {
  const sdk = await original<typeof import('firebase/firestore')>()
  return { ...sdk,
    getDocsFromServer: async (...args: Parameters<typeof sdk.getDocsFromServer>) => {
      const result = await sdk.getDocsFromServer(...args)
      const hook = hooks.afterRead; hooks.afterRead = null
      await hook?.()
      return result
    },
    writeBatch: (...args: Parameters<typeof sdk.writeBatch>) => {
      const batch = sdk.writeBatch(...args), commit = batch.commit.bind(batch)
      batch.commit = () => {
        const hook = hooks.beforeCommit; hooks.beforeCommit = null
        return hook ? hook(commit) : commit()
      }
      return batch
    },
  }
})

let environment: RulesTestEnvironment
const events = new EventTarget(), uid = 'wellbeing-integration'
const consent = { grantedAt: '2026-11-14T09:00:00.000Z', noticeVersion: '2026-11', adultConfirmed: true }
const profile = { schemaVersion: 1, wellbeingConsent: consent, healthDataConsent: null, weightClassLabel: null, createdAt: consent.grantedAt, updatedAt: consent.grantedAt }
const today = () => calculateWorkoutDate(new Date().toISOString(), Intl.DateTimeFormat().resolvedOptions().timeZone)
const entry = (): WellbeingEntry => ({ date: today(), sleep: 3, energy: 3, soreness: 3, stress: 3, note: null, questionsVersion: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
const stops: (() => void)[] = []
const databases: Firestore[] = []
function database() {
  // RulesTestContext exposes the compat SDK; production repositories use its modular delegate.
  const db = (environment.authenticatedContext(uid, { email_verified: true }).firestore() as unknown as { _delegate: Firestore })._delegate
  databases.push(db)
  return db
}
async function subscribed(db: Firestore, fromCache = false) {
  const repositories = createFirestoreHealthRepositories(db, uid), error = vi.fn()
  let weights: RepositorySnapshot<WellbeingEntry> | undefined, profileReady = false
  stops.push(repositories.profile.subscribe((snapshot) => { profileReady = snapshot.items.length === 1 && snapshot.fromCache === fromCache }, error))
  stops.push(repositories.wellbeing.subscribe((snapshot) => { weights = snapshot }, error))
  await vi.waitFor(() => {
    expect(profileReady).toBe(true)
    expect(weights?.fromCache).toBe(fromCache)
  })
  return { repositories, error, snapshot: () => weights }
}
beforeAll(async () => {
  if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080') throw new Error('Local demo emulator required')
  setLogLevel('silent')
  environment = await initializeTestEnvironment({ projectId: 'demo-combat-training', firestore: { host: '127.0.0.1', port: 8080,
    rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') } })
})
beforeEach(async () => {
  hooks.afterRead = null; hooks.beforeCommit = null
  vi.stubGlobal('navigator', { onLine: true })
  vi.stubGlobal('addEventListener', events.addEventListener.bind(events))
  vi.stubGlobal('removeEventListener', events.removeEventListener.bind(events))
  await environment.clearFirestore()
})
afterEach(async () => {
  hooks.afterRead = null; hooks.beforeCommit = null
  for (const stop of stops.splice(0)) stop()
  await Promise.all(databases.splice(0).map((db) => enableNetwork(db)))
  vi.unstubAllGlobals()
})
afterAll(async () => { await environment?.cleanup() })

it('rejects the second session write between the server snapshot and the deletion commit', async () => {
  const db = database(), second = database()
  await setDoc(doc(db, 'users', uid), profile)
  await setDoc(doc(db, 'users', uid, 'readiness', '2026-11-01'), { ...entry(), date: '2026-11-01', schemaVersion: 1 })
  const { repositories } = await subscribed(db)
  hooks.afterRead = async () => {
    expect((await getDocFromServer(doc(second, 'users', uid))).data()?.wellbeingWithdrawal.pending).toBe(true)
    await assertFails(setDoc(doc(second, 'users', uid, 'readiness', today()), { ...entry(), schemaVersion: 1 }))
  }
  await repositories.wellbeing.withdrawConsent()
  expect((await getDocsFromServer(collection(second, 'users', uid, 'readiness'))).empty).toBe(true)
  expect((await getDocFromServer(doc(second, 'users', uid))).data()?.wellbeingConsent).toBeNull()
})

it('rejects a real queued deletion on offline and permits retry when the queued batch commits later', async () => {
  const db = database()
  await setDoc(doc(db, 'users', uid), profile)
  await setDoc(doc(db, 'users', uid, 'readiness', today()), { ...entry(), schemaVersion: 1 })
  const { repositories } = await subscribed(db)
  hooks.beforeCommit = async (commit) => {
    await disableNetwork(db)
    const queued = commit()
    vi.stubGlobal('navigator', { onLine: false }); events.dispatchEvent(new Event('offline'))
    return queued
  }
  await expect(repositories.wellbeing.withdrawConsent()).rejects.toThrow('Offline')
  vi.stubGlobal('navigator', { onLine: true }); await enableNetwork(db)
  await repositories.wellbeing.withdrawConsent()
  expect((await getDocsFromServer(collection(db, 'users', uid, 'readiness'))).empty).toBe(true)
  expect((await getDocFromServer(doc(db, 'users', uid))).data()?.wellbeingConsent).toBeNull()
})

it('creates today from cache after new repository subscriptions, preserving cached createdAt on edit', async () => {
  const db = database()
  await setDoc(doc(db, 'users', uid), profile)
  await subscribed(db)
  for (const stop of stops.splice(0)) stop()
  await disableNetwork(db); vi.stubGlobal('navigator', { onLine: false })
  const { repositories, snapshot } = await subscribed(db, true), value = entry()
  await repositories.wellbeing.save(value)
  expect(snapshot()?.hasPendingWrites).toBe(true)
  await expect(repositories.wellbeing.save({ ...value, createdAt: consent.grantedAt })).rejects.toThrow('Creation')
  await repositories.wellbeing.save({ ...value, sleep: 4 })
  vi.stubGlobal('navigator', { onLine: true }); await enableNetwork(db)
  await vi.waitFor(() => expect(snapshot()?.hasPendingWrites).toBe(false))
  expect((await getDocFromServer(doc(db, 'users', uid, 'readiness', today()))).data()).toMatchObject({ createdAt: value.createdAt, sleep: 4 })
})

it('reports a late server creation conflict without replacing the server createdAt', async () => {
  const db = database(), second = database()
  await setDoc(doc(db, 'users', uid), profile)
  await subscribed(db)
  for (const stop of stops.splice(0)) stop()
  await disableNetwork(db); vi.stubGlobal('navigator', { onLine: false })
  const existing = { ...entry(), createdAt: consent.grantedAt, schemaVersion: 1 }
  await setDoc(doc(second, 'users', uid, 'readiness', today()), existing)
  const { repositories, error } = await subscribed(db, true)
  await repositories.wellbeing.save(entry())
  vi.stubGlobal('navigator', { onLine: true }); await enableNetwork(db)
  await vi.waitFor(() => expect(error).toHaveBeenCalled())
  expect((await getDocFromServer(doc(second, 'users', uid, 'readiness', today()))).data()).toEqual(existing)
})
