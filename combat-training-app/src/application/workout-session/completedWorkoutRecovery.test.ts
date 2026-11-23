import { afterEach, expect, it, vi } from 'vitest'
import type { RepositorySnapshot } from '@/application/repositorySubscription'
import type { WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { sessionStep, workoutSession } from '@/test/workoutSessionBuilders'
import { CompletedWorkoutRecovery } from './completedWorkoutRecovery'
import type { RecordedWorkoutSession, WorkoutSessionRepository } from './workoutSessionRepository'

function fixture() {
  const copies = new Map<string, RecordedWorkoutSession>()
  const storage = {
    readAll: () => [...copies.values()],
    save: (session: RecordedWorkoutSession) => { copies.set(session.id, structuredClone(session)) },
    remove: (id: string) => { copies.delete(id) },
  }
  const snapshot = (items: WorkoutSession[], pending: string[] = [], fromCache = false): RepositorySnapshot<WorkoutSession> =>
    ({ items, pendingIds: new Set(pending), hasPendingWrites: pending.length > 0, invalidDocumentIds: [], fromCache })
  return { storage, snapshot, recovery: new CompletedWorkoutRecovery(storage) }
}

afterEach(() => vi.useRealTimers())

it('keeps a locally accepted session after a late rejection and retries the same entry', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-02T10:00:00.000Z'))
  const session = workoutSession({ completedAt: new Date().toISOString(), stepResults: [sessionStep()] })
  const { storage, snapshot, recovery } = fixture()
  const saveRecorded = vi.fn<WorkoutSessionRepository['saveRecorded']>()
  saveRecorded.mockImplementationOnce(async (entry, reject) => {
    expect(storage.readAll()).toEqual([session])
    recovery.observe(snapshot([entry], [entry.id]))
    setTimeout(() => {
      recovery.observe(snapshot([]))
      reject(new Error('permission-denied'))
    }, 3000)
  }).mockImplementationOnce(async (entry) => {
    recovery.observe(snapshot([entry], [entry.id]))
  })
  await recovery.save(session, { saveRecorded })
  expect(recovery.getRetries()).toEqual([])
  expect(storage.readAll()).toEqual([session])
  await vi.advanceTimersByTimeAsync(3000)
  expect(storage.readAll()).toEqual([session])
  expect(recovery.getRetries()).toEqual([session])

  await recovery.save(recovery.getRetries()[0], { saveRecorded })
  expect(saveRecorded.mock.calls.map(([entry]) => entry)).toEqual([session, session])
  expect(storage.readAll()).toEqual([session])
  recovery.observe(snapshot([{ ...session, note: 'Feedback saved subsequently' }], ['another-session']))
  expect(storage.readAll()).toEqual([])
  expect(recovery.getRetries()).toEqual([])
})

it('offers a missing entry at launch and keeps other copies until their own server confirmation', () => {
  const session = workoutSession({ stepResults: [sessionStep()] })
  const queued = { ...session, id: 'queued-session' }
  const cached = { ...session, id: 'cached-session' }
  const { storage, snapshot } = fixture()
  for (const entry of [session, queued, cached]) storage.save(entry)
  const recovery = new CompletedWorkoutRecovery(storage)

  recovery.observe(snapshot([queued, cached], [queued.id], true))
  expect(recovery.getRetries()).toEqual([session])
  expect(storage.readAll()).toEqual([session, queued, cached])
  recovery.observe(snapshot([queued, cached], [queued.id]))
  expect(recovery.getRetries()).toEqual([session])
  expect(storage.readAll()).toEqual([session, queued])
  recovery.observe(snapshot([queued, cached]))
  expect(storage.readAll()).toEqual([session])
})
