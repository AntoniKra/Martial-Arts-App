import { afterEach, describe, expect, it, vi } from 'vitest'
import { block, continuousExercise, workoutPlan } from '@/test/workoutBuilders'
import { sessionStep, workoutSession } from '@/test/workoutSessionBuilders'
import type { FocusSkill } from '@/domain/focus-skill/focusSkill.types'

const sdk = vi.hoisted(() => ({
  listeners: new Map<string, (value: unknown) => void>(),
  update: vi.fn(), delete: vi.fn(), commit: vi.fn<() => Promise<void>>(() => new Promise(() => {})),
}))
vi.mock('firebase/app', () => ({ getApp: () => 'app' }))
vi.mock('./firebaseConfig', () => ({ readFirebaseConfig: () => ({ projectId: 'demo-combat-training', firestoreEmulatorHost: '127.0.0.1:8080' }) }))
vi.mock('firebase/firestore', () => ({
  initializeFirestore: () => ({}), connectFirestoreEmulator: vi.fn(), persistentLocalCache: () => ({}),
  persistentMultipleTabManager: vi.fn(), terminate: vi.fn(), clearIndexedDbPersistence: vi.fn(),
  collection: (_db: unknown, ...path: string[]) => path.join('/'), doc: (path: string, id: string) => `${path}/${id}`,
  onSnapshot: (path: string, _options: unknown, change: (value: unknown) => void) => { sdk.listeners.set(path, change); return () => sdk.listeners.delete(path) },
  setDoc: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(),
  writeBatch: () => ({ update: sdk.update, delete: sdk.delete, commit: sdk.commit }),
}))
import { createFirestoreRepositories, clearFirestoreCache } from './createFirestoreRepositories'

const instant = '2026-11-01T10:00:00.000Z', changedAt = '2026-11-10T10:00:00.000Z'
const skill: FocusSkill = { id: 'guard', name: 'Guard', criterion: 'Chin', openCorrection: null, archivedAt: null, createdAt: instant, updatedAt: instant }
const plan = workoutPlan([block('bag', [
  { ...continuousExercise('one', 60), focusSkillId: skill.id }, { ...continuousExercise('two', 60), focusSkillId: skill.id },
])])
function emit<T extends { id: string }>(collection: string, items: T[], pending = false) {
  sdk.listeners.get(`users/athlete/${collection}`)?.({
    docs: items.map((item) => ({ id: item.id, data: () => ({ ...item, schemaVersion: 1 }), metadata: { hasPendingWrites: pending } })),
    metadata: { hasPendingWrites: pending, fromCache: pending },
  })
}
function subscribed() {
  const repositories = createFirestoreRepositories('athlete')
  repositories.focusSkills.subscribe(vi.fn(), vi.fn())
  repositories.plans.subscribe(vi.fn(), vi.fn())
  repositories.sessions.subscribe(vi.fn(), vi.fn())
  emit('focusSkills', [skill])
  emit('workoutPlans', [plan, { ...plan, id: 'plan-2' }])
  emit('workoutSessions', [])
  return repositories
}
afterEach(async () => { await clearFirestoreCache(); vi.clearAllMocks() })

describe('focus skill lifecycle batch', () => {
  it('archives and detaches two plans in one batch, resolving after every local snapshot before the server', async () => {
    const repositories = subscribed()
    const saved = repositories.focusSkills.archive(skill.id, changedAt)
    expect(sdk.commit).toHaveBeenCalledOnce()
    expect(sdk.update).toHaveBeenCalledTimes(3)
    expect(sdk.update.mock.calls[0]).toEqual(['users/athlete/focusSkills/guard', { archivedAt: changedAt, updatedAt: changedAt }])
    expect(sdk.update.mock.calls.slice(1).map(([id]) => id)).toEqual(['users/athlete/workoutPlans/plan-1', 'users/athlete/workoutPlans/plan-2'])
    const changedPlans = sdk.update.mock.calls.slice(1).map(([, fields], index) => ({ ...plan, ...fields, id: index ? 'plan-2' : plan.id }))
    expect(changedPlans[0].blocks[0].items.map((item: { focusSkillId: string | null }) => item.focusSkillId)).toEqual([null, null])
    let completed = false
    void saved.then(() => { completed = true })
    emit('focusSkills', [{ ...skill, archivedAt: changedAt, updatedAt: changedAt }], true)
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    expect(completed).toBe(false)
    emit('workoutPlans', changedPlans, true)
    await expect(saved).resolves.toBeUndefined()
  })

  it('refuses deletion when even an assessment-null entry exists, and refuses invalid timestamps before commit', async () => {
    const repositories = subscribed()
    emit('workoutSessions', [workoutSession({ stepResults: [sessionStep()], focusRatings: [{
      workoutItemId: 'one', focusSkillId: skill.id, skillNameSnapshot: skill.name, criterionSnapshot: skill.criterion,
      blockType: 'bag', assessment: null, correction: null, previousCorrectionCheck: null,
    }] })])
    await expect(repositories.focusSkills.deleteUnused(skill.id, changedAt)).rejects.toThrow('session entries')
    await expect(repositories.focusSkills.archive(skill.id, 'invalid')).rejects.toThrow()
    expect(sdk.commit).not.toHaveBeenCalled()
  })

  it('deletes an unused skill and detaches references in the same batch', async () => {
    const repositories = subscribed()
    const saved = repositories.focusSkills.deleteUnused(skill.id, changedAt)
    expect(sdk.delete).toHaveBeenCalledExactlyOnceWith('users/athlete/focusSkills/guard')
    expect(sdk.commit).toHaveBeenCalledOnce()
    const changedPlans = sdk.update.mock.calls.map(([, fields], index) => ({ ...plan, ...fields, id: index ? 'plan-2' : plan.id }))
    emit('workoutPlans', changedPlans, true)
    emit('focusSkills', [], true)
    await expect(saved).resolves.toBeUndefined()
  })

  it('restores without reattaching any plan and rejects when snapshots are unavailable', async () => {
    const repositories = subscribed()
    emit('focusSkills', [{ ...skill, archivedAt: instant }])
    const saved = repositories.focusSkills.restore(skill.id, changedAt)
    expect(sdk.update).toHaveBeenCalledExactlyOnceWith('users/athlete/focusSkills/guard', { archivedAt: null, updatedAt: changedAt })
    emit('focusSkills', [{ ...skill, updatedAt: changedAt }], true)
    await saved
    emit('workoutPlans', [{ ...plan, updatedAt: 'invalid' }])
    await expect(repositories.focusSkills.archive(skill.id, changedAt)).rejects.toThrow('completely available')
    expect(sdk.commit).toHaveBeenCalledOnce()
  })
})
