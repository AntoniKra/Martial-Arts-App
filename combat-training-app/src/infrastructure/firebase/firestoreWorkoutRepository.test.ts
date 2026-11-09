import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FirestoreWorkoutRepository } from './firestoreWorkoutRepository'
import type { Firestore } from 'firebase/firestore'
import { workoutPlanDocumentSchema } from './workoutDocumentSchemas'
import { workoutSessionDocumentSchema } from './workoutDocumentSchemas'
import { sessionStep, workoutSession } from '@/test/workoutSessionBuilders'
import { block, continuousExercise, workoutPlan } from '@/test/workoutBuilders'

const sdk = vi.hoisted(() => ({
  change: null as null | ((value: { docs: unknown[]; metadata: { hasPendingWrites: boolean; fromCache: boolean } }) => void), stop: vi.fn(),
  set: vi.fn<() => Promise<void>>(), remove: vi.fn<() => Promise<void>>(), update: vi.fn<(path: string, fields: Record<string, unknown>) => Promise<void>>(),
}))
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, ...path: string[]) => path.join('/'), doc: (path: string, id: string) => `${path}/${id}`,
  onSnapshot: (_path: unknown, _options: unknown, change: typeof sdk.change) => { sdk.change = change; return sdk.stop },
  setDoc: sdk.set, deleteDoc: sdk.remove, updateDoc: sdk.update,
}))
const plan = workoutPlan([block('block', [continuousExercise('exercise', 60)])])
const document = (value = { ...plan, schemaVersion: 1 }, pending = false, documentId = plan.id) => ({
  id: documentId, data: () => value, metadata: { hasPendingWrites: pending },
})
const emit = (docs: unknown[], hasPendingWrites = false, fromCache = false) => {
  if (!sdk.change) throw new Error('No listener')
  sdk.change({ docs, metadata: { hasPendingWrites, fromCache } })
}
const parse = (value: unknown) => {
  const { schemaVersion: _version, ...item } = workoutPlanDocumentSchema.parse(value)
  return item
}
beforeEach(() => { sdk.set.mockImplementation(() => new Promise(() => {})); sdk.remove.mockImplementation(() => new Promise(() => {})) })
afterEach(() => vi.clearAllMocks())

describe('Firestore collection repository', () => {
  it('distinguishes the cached collection from server-confirmed metadata-only snapshots', () => {
    const repository = new FirestoreWorkoutRepository({} as Firestore, 'athlete', 'focusSkills', parse)
    const onChange = vi.fn()
    repository.subscribe(onChange, vi.fn())
    emit([], false, true)
    expect(onChange.mock.lastCall?.[0]).toMatchObject({ items: [], fromCache: true })
    emit([])
    expect(onChange.mock.lastCall?.[0]).toMatchObject({ items: [], fromCache: false })
  })
  it('isolates the UID path, validates each document and forwards metadata-only changes', () => {
    const repository = new FirestoreWorkoutRepository({} as Firestore, 'athlete', 'workoutPlans', parse)
    const onChange = vi.fn()
    const stop = repository.subscribe(onChange, vi.fn())
    emit([document(), document({ ...plan, schemaVersion: 2 }), document(undefined, false, 'different-id')])
    expect(onChange.mock.lastCall?.[0]).toMatchObject({ items: [plan], invalidDocumentIds: [plan.id, 'different-id'] })
    emit([document(undefined, true)], true)
    expect(onChange.mock.lastCall?.[0].pendingIds).toEqual(new Set([plan.id]))
    expect(onChange.mock.lastCall?.[0].hasPendingWrites).toBe(true)
    emit([document()])
    expect(onChange.mock.lastCall?.[0].pendingIds).toEqual(new Set())
    expect(onChange.mock.lastCall?.[0].hasPendingWrites).toBe(false)
    expect(() => repository.subscribe(vi.fn(), vi.fn())).toThrow('already subscribed')
    stop()
    expect(sdk.stop).toHaveBeenCalledOnce()
  })
  it('preserves pending-write metadata even when document validation filters out the document', () => {
    const repository = new FirestoreWorkoutRepository({} as Firestore, 'athlete', 'workoutPlans', parse)
    const onChange = vi.fn()
    repository.subscribe(onChange, vi.fn())
    emit([document({ ...plan, schemaVersion: 2 }, true)], true)
    expect(onChange.mock.lastCall?.[0]).toMatchObject({ items: [], pendingIds: new Set(), hasPendingWrites: true })
  })
  it('resolves writes and deletions from local snapshots while the server promise is pending', async () => {
    const repository = new FirestoreWorkoutRepository({} as Firestore, 'athlete', 'workoutPlans', parse)
    repository.subscribe(vi.fn(), vi.fn())
    const saved = repository.save(plan)
    emit([document(undefined, true)])
    await expect(saved).resolves.toBeUndefined()
    expect(sdk.set).toHaveBeenCalledWith('users/athlete/workoutPlans/plan-1', { ...plan, schemaVersion: 1 })
    const removed = repository.delete(plan.id)
    emit([])
    await expect(removed).resolves.toBe(true)
  })
  it('rejects invalid writes before calling the SDK and reports a late server rejection', async () => {
    let rejectServer: (cause: Error) => void = () => {}
    sdk.set.mockImplementation(() => new Promise((_resolve, reject) => { rejectServer = reject }))
    const repository = new FirestoreWorkoutRepository({} as Firestore, 'athlete', 'workoutPlans', parse)
    const onError = vi.fn()
    repository.subscribe(vi.fn(), onError)
    await expect(repository.save({ ...plan, updatedAt: 'invalid' })).rejects.toThrow()
    expect(sdk.set).not.toHaveBeenCalled()
    const saved = repository.save(plan)
    emit([document(undefined, true)])
    await saved
    rejectServer(new Error('permission-denied'))
    await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce())
  })
  it('rejects an interrupted local save and closes the listener', async () => {
    const repository = new FirestoreWorkoutRepository({} as Firestore, 'athlete', 'workoutPlans', parse)
    const stop = repository.subscribe(vi.fn(), vi.fn())
    const saved = repository.save(plan)
    stop()
    await expect(saved).rejects.toThrow('closed')
    expect(() => new FirestoreWorkoutRepository({} as Firestore, 'bad/path', 'workoutPlans', parse)).toThrow()
  })
  it('does not wait for the server when an identical document is already cached locally', async () => {
    const repository = new FirestoreWorkoutRepository({} as Firestore, 'athlete', 'workoutPlans', parse)
    repository.subscribe(vi.fn(), vi.fn())
    emit([document(undefined, true)])
    await expect(repository.save(plan)).resolves.toBeUndefined()
  })
  it('validates note updates, changes only the note and timestamp, and preserves the session snapshot', async () => {
    const repository = new FirestoreWorkoutRepository({} as Firestore, 'athlete', 'workoutSessions', (value) => {
      const { schemaVersion: _version, ...item } = workoutSessionDocumentSchema.parse(value)
      return item
    })
    const session = workoutSession({ stepResults: [sessionStep()] })
    repository.subscribe(vi.fn(), vi.fn())
    emit([{ id: session.id, data: () => ({ ...session, schemaVersion: 1 }), metadata: { hasPendingWrites: false } }])
    await expect(repository.updateNote(session.id, 'x'.repeat(1001))).rejects.toThrow()
    expect(sdk.update).not.toHaveBeenCalled()
    sdk.update.mockImplementation(() => new Promise(() => {}))
    const updated = repository.updateNote(session.id, 'Keep guard up')
    const fields = sdk.update.mock.calls[0]?.[1]
    expect(fields).toEqual({ note: 'Keep guard up', updatedAt: expect.stringMatching(/\.\d{3}Z$/) })
    emit([{ id: session.id, data: () => ({ ...session, ...fields, schemaVersion: 1 }), metadata: { hasPendingWrites: true } }])
    await expect(updated).resolves.toBe(true)
    expect(sdk.update).toHaveBeenCalledWith('users/athlete/workoutSessions/session-1', fields)
  })
})
