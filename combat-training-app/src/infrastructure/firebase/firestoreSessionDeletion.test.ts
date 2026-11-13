import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'
import type { QuickTimerWorkoutSession, WorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { manualFocusRating, manualWorkoutSession } from '@/test/manualWorkoutBuilder'
import { sessionStep, workoutSession } from '@/test/workoutSessionBuilders'

const sdk = vi.hoisted(() => ({
  listeners: new Map<string, (value: unknown) => void>(),
  errors: new Map<string, (error: unknown) => void>(),
  batch: vi.fn(), delete: vi.fn(), update: vi.fn(),
  deleteDoc: vi.fn<() => Promise<void>>(() => new Promise(() => {})),
  commit: vi.fn<() => Promise<void>>(() => new Promise(() => {})),
}))
vi.mock('firebase/app', () => ({ getApp: () => 'app' }))
vi.mock('./firebaseConfig', () => ({ readFirebaseConfig: () => ({ projectId: 'demo-combat-training', firestoreEmulatorHost: '127.0.0.1:8080' }) }))
vi.mock('firebase/firestore', () => ({
  initializeFirestore: () => ({}), connectFirestoreEmulator: vi.fn(), persistentLocalCache: () => ({}),
  persistentMultipleTabManager: vi.fn(), terminate: vi.fn(), clearIndexedDbPersistence: vi.fn(),
  collection: (_db: unknown, ...path: string[]) => path.join('/'),
  doc: (path: string, id: string) => `${path}/${id}`,
  onSnapshot: (path: string, _options: unknown, change: (value: unknown) => void, error: (error: unknown) => void) => {
    sdk.listeners.set(path, change)
    sdk.errors.set(path, error)
    return () => { sdk.listeners.delete(path); sdk.errors.delete(path) }
  },
  setDoc: vi.fn(), updateDoc: vi.fn(), deleteDoc: sdk.deleteDoc,
  writeBatch: () => { sdk.batch(); return { delete: sdk.delete, update: sdk.update, commit: sdk.commit } },
}))
import { createFirestoreRepositories, clearFirestoreCache } from './createFirestoreRepositories'

const instant = '2026-11-02T11:00:00.000Z', changedAt = '2026-11-13T12:00:00.000Z'
const skill: FocusSkill = {
  id: 'guard', name: 'Guard', criterion: 'Chin', archivedAt: null, createdAt: instant, updatedAt: instant,
  openCorrection: { problem: 'Dropped hand', fix: 'Touch chin', sessionId: 'session-1', workoutDate: '2026-11-02' },
}
const plan = workoutSession({ stepResults: [sessionStep({ roundNumber: 1, roundCount: 1 })] })
const { workoutPlanId: _planId, workoutPlanNameSnapshot: _name, focusRatings: _focus, exerciseRatings: _ratings, ...timerFields } = plan
const timer: QuickTimerWorkoutSession = { ...timerFields, source: 'quickTimer', category: 'bag', completion: { completed: 1, planned: 1, unit: 'round' } }
const entries: WorkoutSession[] = [plan, manualWorkoutSession({ id: plan.id }), timer]

function emit<T extends { id: string }>(collection: string, items: T[], pending = false) {
  sdk.listeners.get(`users/athlete/${collection}`)?.({
    docs: items.map((item) => ({ id: item.id, data: () => ({ ...item, schemaVersion: 1 }), metadata: { hasPendingWrites: pending } })),
    metadata: { hasPendingWrites: pending },
  })
}
function subscribed(entry: WorkoutSession = plan, skills: FocusSkill[] = [skill]) {
  const repositories = createFirestoreRepositories('athlete')
  repositories.sessions.subscribe(vi.fn(), vi.fn())
  repositories.focusSkills.subscribe(vi.fn(), vi.fn())
  emit('workoutSessions', [entry])
  emit('focusSkills', skills)
  return repositories
}
const nextTurn = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(changedAt) })
afterEach(async () => { await clearFirestoreCache(); vi.useRealTimers(); vi.restoreAllMocks(); vi.clearAllMocks() })

describe('session deletion and open corrections', () => {
  it.each(entries)('deletes a $source entry and all its corrections in one batch, waiting for both local collections', async (entry) => {
    const secondSkill = { ...skill, id: 'footwork' }
    const repositories = subscribed(entry, [skill, secondSkill])
    let completed = false
    const deleted = repositories.sessions.delete(entry.id)
    void deleted.then(() => { completed = true })
    expect(sdk.batch).toHaveBeenCalledOnce()
    expect(sdk.delete).toHaveBeenCalledExactlyOnceWith('users/athlete/workoutSessions/session-1')
    expect(sdk.update.mock.calls).toEqual([
      ['users/athlete/focusSkills/guard', { openCorrection: null, updatedAt: changedAt }],
      ['users/athlete/focusSkills/footwork', { openCorrection: null, updatedAt: changedAt }],
    ])
    expect(sdk.commit).toHaveBeenCalledOnce()
    expect(sdk.deleteDoc).not.toHaveBeenCalled()
    emit('workoutSessions', [], true)
    await nextTurn()
    expect(completed).toBe(false)
    emit('focusSkills', [{ ...skill, openCorrection: null, updatedAt: changedAt }, secondSkill], true)
    await nextTurn()
    expect(completed).toBe(false)
    emit('focusSkills', [skill, secondSkill].map((item) => ({ ...item, openCorrection: null, updatedAt: changedAt })), true)
    await expect(deleted).resolves.toBe(true)
  })

  it('registers both local observers before commit, even when snapshots arrive during commit', async () => {
    const repositories = subscribed()
    sdk.commit.mockImplementationOnce(() => {
      emit('focusSkills', [{ ...skill, openCorrection: null, updatedAt: changedAt }], true)
      emit('workoutSessions', [], true)
      return new Promise(() => {})
    })
    await expect(repositories.sessions.delete(plan.id)).resolves.toBe(true)
  })

  it('waits for session deletion when the correction snapshot arrives first and includes archived skills', async () => {
    const archived = { ...skill, archivedAt: instant }
    const repositories = subscribed(plan, [archived])
    let completed = false
    const deleted = repositories.sessions.delete(plan.id)
    void deleted.then(() => { completed = true })
    expect(sdk.update).toHaveBeenCalledExactlyOnceWith('users/athlete/focusSkills/guard', { openCorrection: null, updatedAt: changedAt })
    emit('focusSkills', [{ ...archived, openCorrection: null, updatedAt: changedAt }], true)
    await nextTurn()
    expect(completed).toBe(false)
    emit('workoutSessions', [], true)
    await expect(deleted).resolves.toBe(true)
  })

  it.each(['same', 'notChecked'] as const)('keeps another entry correction when the deleted entry only answered %s', async (previousCorrectionCheck) => {
    const entry = manualWorkoutSession({ focusRatings: [manualFocusRating({ previousCorrectionCheck })] })
    const repositories = subscribed(entry)
    const deleted = repositories.sessions.delete(entry.id)
    expect(sdk.batch).toHaveBeenCalledOnce()
    expect(sdk.delete).toHaveBeenCalledExactlyOnceWith('users/athlete/workoutSessions/manual')
    expect(sdk.update).not.toHaveBeenCalled()
    expect(sdk.commit).toHaveBeenCalledOnce()
    emit('workoutSessions', [], true)
    await expect(deleted).resolves.toBe(true)
  })

  it('does not restore a correction that was already closed', async () => {
    const repositories = subscribed(plan, [{ ...skill, openCorrection: null }])
    const deleted = repositories.sessions.delete(plan.id)
    expect(sdk.update).not.toHaveBeenCalled()
    emit('workoutSessions', [], true)
    await expect(deleted).resolves.toBe(true)
  })

  it('validates every skill update before constructing or writing any part of the batch', async () => {
    const repositories = subscribed(plan, [skill, { ...skill, id: 'footwork' }])
    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue('invalid')
    await expect(repositories.sessions.delete(plan.id)).rejects.toThrow()
    expect(sdk.batch).not.toHaveBeenCalled()
    expect(sdk.delete).not.toHaveBeenCalled()
    expect(sdk.update).not.toHaveBeenCalled()
    expect(sdk.deleteDoc).not.toHaveBeenCalled()
    expect(sdk.commit).not.toHaveBeenCalled()
  })

  it('returns false without writes when the session is missing', async () => {
    const repositories = subscribed()
    await expect(repositories.sessions.delete('missing')).resolves.toBe(false)
    expect(sdk.batch).not.toHaveBeenCalled()
    expect(sdk.deleteDoc).not.toHaveBeenCalled()
  })

  it.each(['loading', 'error'] as const)('preserves local deletion when focus skills are unavailable: %s', async (state) => {
    const repositories = createFirestoreRepositories('athlete')
    repositories.sessions.subscribe(vi.fn(), vi.fn())
    repositories.focusSkills.subscribe(vi.fn(), vi.fn())
    emit('workoutSessions', [plan])
    if (state === 'error') {
      emit('focusSkills', [skill])
      sdk.errors.get('users/athlete/focusSkills')?.(new Error('Focus skills unavailable'))
    }
    const deleted = repositories.sessions.delete(plan.id)
    expect(sdk.deleteDoc).toHaveBeenCalledExactlyOnceWith('users/athlete/workoutSessions/session-1')
    expect(sdk.batch).not.toHaveBeenCalled()
    emit('workoutSessions', [], true)
    await expect(deleted).resolves.toBe(true)
  })
})
