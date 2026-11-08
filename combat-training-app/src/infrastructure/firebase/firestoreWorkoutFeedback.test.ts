import { afterEach, describe, expect, it, vi } from 'vitest'
import { sessionStep, workoutSession } from '@/test/workoutSessionBuilders'

const sdk = vi.hoisted(() => ({
  listeners: new Map<string, (value: unknown) => void>(),
  update: vi.fn(), commit: vi.fn<() => Promise<void>>(() => new Promise(() => {})),
}))
vi.mock('firebase/app', () => ({ getApp: () => 'app' }))
vi.mock('./firebaseConfig', () => ({ readFirebaseConfig: () => ({ projectId: 'demo-combat-training', firestoreEmulatorHost: '127.0.0.1:8080' }) }))
vi.mock('firebase/firestore', () => ({
  initializeFirestore: () => ({}), connectFirestoreEmulator: vi.fn(), persistentLocalCache: () => ({}),
  persistentMultipleTabManager: vi.fn(), terminate: vi.fn(), clearIndexedDbPersistence: vi.fn(),
  collection: (_db: unknown, ...path: string[]) => path.join('/'),
  doc: (path: string, id: string) => `${path}/${id}`,
  onSnapshot: (path: string, _options: unknown, change: (value: unknown) => void) => { sdk.listeners.set(path, change); return () => sdk.listeners.delete(path) },
  setDoc: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(),
  writeBatch: () => ({ update: sdk.update, commit: sdk.commit }),
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
