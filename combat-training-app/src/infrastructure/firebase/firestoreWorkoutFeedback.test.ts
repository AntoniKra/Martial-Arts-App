import { afterEach, describe, expect, it, vi } from 'vitest'
import { sessionStep, workoutSession } from '@/test/workoutSessionBuilders'
import type { QuickTimerWorkoutSession } from '@/domain/workout-session/workoutSession.types'
import { prepareQuickTimerFeedback } from '@/domain/quick-timer/quickTimerFeedback'
import { manualWorkoutSession } from '@/test/manualWorkoutBuilder'

const sdk = vi.hoisted(() => ({
  listeners: new Map<string, (value: unknown) => void>(),
  set: vi.fn(), update: vi.fn(), updateDoc: vi.fn<() => Promise<void>>(() => new Promise(() => {})), commit: vi.fn<() => Promise<void>>(() => new Promise(() => {})),
}))
vi.mock('firebase/app', () => ({ getApp: () => 'app' }))
vi.mock('./firebaseConfig', () => ({ readFirebaseConfig: () => ({ projectId: 'demo-combat-training', firestoreEmulatorHost: '127.0.0.1:8080' }) }))
vi.mock('firebase/firestore', () => ({
  initializeFirestore: () => ({}), connectFirestoreEmulator: vi.fn(), persistentLocalCache: () => ({}),
  persistentMultipleTabManager: vi.fn(), terminate: vi.fn(), clearIndexedDbPersistence: vi.fn(),
  collection: (_db: unknown, ...path: string[]) => path.join('/'),
  doc: (path: string, id: string) => `${path}/${id}`,
  onSnapshot: (path: string, _options: unknown, change: (value: unknown) => void) => { sdk.listeners.set(path, change); return () => sdk.listeners.delete(path) },
  setDoc: vi.fn(), updateDoc: sdk.updateDoc, deleteDoc: vi.fn(),
  writeBatch: () => ({ set: sdk.set, update: sdk.update, commit: sdk.commit }),
}))
import { createFirestoreRepositories, clearFirestoreCache } from './createFirestoreRepositories'

const instant = '2026-11-02T11:00:00.000Z'
function emit<T extends { id: string }>(collection: string, items: T[], pending = false) {
  sdk.listeners.get(`users/athlete/${collection}`)?.({
    docs: items.map((item) => ({ id: item.id, data: () => ({ ...item, schemaVersion: 1 }), metadata: { hasPendingWrites: pending } })),
    metadata: { hasPendingWrites: pending },
  })
}
afterEach(async () => { await clearFirestoreCache(); vi.clearAllMocks() })

describe('workout feedback repository', () => {
  it('creates a manual entry and closes a correction in one batch, waiting only for both local snapshots', async () => {
    const repositories = createFirestoreRepositories('athlete')
    repositories.sessions.subscribe(vi.fn(), vi.fn())
    repositories.focusSkills.subscribe(vi.fn(), vi.fn())
    emit('workoutSessions', [])
    const skill = { id: 'guard', name: 'Guard', criterion: 'Chin', openCorrection: null, archivedAt: null, createdAt: instant, updatedAt: instant }
    emit('focusSkills', [skill])
    const entry = manualWorkoutSession()
    const saved = repositories.sessions.saveManual(entry, [{ focusSkillId: skill.id, openCorrection: null }])
    expect(sdk.set).toHaveBeenCalledWith('users/athlete/workoutSessions/manual', { ...entry, schemaVersion: 1 })
    expect(sdk.commit).toHaveBeenCalledOnce()
    emit('workoutSessions', [entry], true)
    emit('focusSkills', [{ ...skill, updatedAt: entry.updatedAt }], true)
    await expect(saved).resolves.toBeUndefined()
    await expect(repositories.sessions.saveManual(entry, [{ focusSkillId: skill.id,
      openCorrection: { problem: '', fix: 'Fix', sessionId: entry.id, workoutDate: entry.workoutDate } }])).rejects.toThrow()
    expect(sdk.commit).toHaveBeenCalledOnce()
  })
  it('saves RPE and the response time locally before server confirmation without overwriting feedback', async () => {
    const { sessions } = createFirestoreRepositories('athlete')
    const changed = vi.fn()
    sessions.subscribe(changed, vi.fn())
    const entry = workoutSession({ stepResults: [sessionStep()], note: 'Keep this note' })
    emit('workoutSessions', [entry])
    const saved = sessions.saveRpe(entry.id, 6, instant)
    expect(sdk.updateDoc).toHaveBeenCalledWith('users/athlete/workoutSessions/session-1', { rpe: 6, rpeRecordedAt: instant, updatedAt: instant })
    emit('workoutSessions', [{ ...entry, rpe: 6, rpeRecordedAt: instant, updatedAt: instant }], true)
    await expect(saved).resolves.toBe(true)
    expect(changed.mock.lastCall?.[0]).toMatchObject({ items: [{ note: 'Keep this note', rpe: 6, rpeRecordedAt: instant }], hasPendingWrites: true })
    await expect(sessions.saveRpe(entry.id, 11, instant)).rejects.toThrow()
    await expect(sessions.saveRpe(entry.id, 6, 'invalid')).rejects.toThrow()
    await expect(sessions.saveRpe('missing', 6, instant)).resolves.toBe(false)
    expect(sdk.updateDoc).toHaveBeenCalledOnce()
  })
  it('rejects an invalid correction before committing any part of the batch', async () => {
    const repositories = createFirestoreRepositories('athlete')
    repositories.sessions.subscribe(vi.fn(), vi.fn())
    repositories.focusSkills.subscribe(vi.fn(), vi.fn())
    const entry = workoutSession({ stepResults: [sessionStep()] })
    emit('workoutSessions', [entry])
    emit('focusSkills', [{ id: 'guard', name: 'Guard', criterion: 'Chin', openCorrection: null, archivedAt: null, createdAt: instant, updatedAt: instant }])
    await expect(repositories.sessions.saveFeedback(entry.id, { focusRatings: [], exerciseRatings: [], note: 'Notes', updatedAt: instant,
      correctionUpdates: [{ focusSkillId: 'guard', openCorrection: { problem: '', fix: 'Fix', sessionId: entry.id, workoutDate: entry.workoutDate } }] })).rejects.toThrow()
    expect(sdk.commit).not.toHaveBeenCalled()
  })
  it('saves the session and correction in one batch and resolves from local metadata before the server', async () => {
    const repositories = createFirestoreRepositories('athlete')
    const changed = vi.fn()
    repositories.sessions.subscribe(changed, vi.fn())
    repositories.focusSkills.subscribe(vi.fn(), vi.fn())
    const entry = workoutSession({ stepResults: [sessionStep()] })
    emit('workoutSessions', [entry])
    emit('focusSkills', [{ id: 'guard', name: 'Guard', criterion: 'Chin', openCorrection: null, archivedAt: null, createdAt: instant, updatedAt: instant }])
    const correction = { problem: 'Dropped hand', fix: 'Touch chin', sessionId: entry.id, workoutDate: entry.workoutDate }
    const saved = repositories.sessions.saveFeedback(entry.id, { focusRatings: [], exerciseRatings: [], note: 'Notes', updatedAt: instant,
      correctionUpdates: [{ focusSkillId: 'guard', openCorrection: correction }] })
    expect(sdk.commit).toHaveBeenCalledOnce()
    expect(sdk.update.mock.calls).toEqual([
      ['users/athlete/workoutSessions/session-1', { focusRatings: [], exerciseRatings: [], note: 'Notes', updatedAt: instant }],
      ['users/athlete/focusSkills/guard', { openCorrection: correction, updatedAt: instant }],
    ])
    let locallySaved = false
    void saved.then(() => { locallySaved = true })
    emit('workoutSessions', [{ ...entry, note: 'Notes', updatedAt: instant }], true)
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    expect(locallySaved).toBe(false)
    emit('focusSkills', [{ id: 'guard', name: 'Guard', criterion: 'Chin', openCorrection: correction, archivedAt: null, createdAt: instant, updatedAt: instant }], true)
    await expect(saved).resolves.toBe(true)
    expect(changed.mock.lastCall?.[0].pendingIds).toEqual(new Set(['session-1']))
  })
})

it('validates quick timer feedback and resolves from the local snapshot without overwriting RPE', async () => {
  const { sessions } = createFirestoreRepositories('athlete')
  const changed = vi.fn()
  sessions.subscribe(changed, vi.fn())
  const plan = workoutSession({ stepResults: [sessionStep({ roundNumber: 1, roundCount: 1 })], rpe: 6, rpeRecordedAt: instant })
  const { workoutPlanId: _planId, workoutPlanNameSnapshot: _name, focusRatings: _focus, exerciseRatings: _ratings, ...fields } = plan
  const entry: QuickTimerWorkoutSession = { ...fields, source: 'quickTimer', category: 'bag', completion: { completed: 1, planned: 1, unit: 'round' } }
  emit('workoutSessions', [entry])
  const update = prepareQuickTimerFeedback(entry, { category: 'sparring', intensity: 'hard', note: 'Notes' }, instant)
  const saved = sessions.saveQuickTimerFeedback(entry.id, update)
  expect(sdk.updateDoc).toHaveBeenCalledWith('users/athlete/workoutSessions/session-1', update)
  emit('workoutSessions', [{ ...entry, ...update }], true)
  await expect(saved).resolves.toBe(true)
  expect(changed.mock.lastCall?.[0]).toMatchObject({ items: [{ source: 'quickTimer', rpe: 6, sparringSeconds: 60 }], hasPendingWrites: true })
  await expect(sessions.saveQuickTimerFeedback(entry.id, { ...update, note: 'n'.repeat(1001) })).rejects.toThrow()
  expect(sdk.updateDoc).toHaveBeenCalledOnce()
  emit('workoutSessions', [plan])
  await expect(sessions.saveQuickTimerFeedback(plan.id, update)).rejects.toThrow('Expected a quick timer entry')
  await expect(sessions.saveQuickTimerFeedback('missing', update)).resolves.toBe(false)
})
