import { describe, expect, it } from 'vitest'
import { createDeferredWorkoutRepositories, type WorkoutRepositories } from './deferredWorkoutRepositories'

describe('deferred workout repositories', () => {
  it('can render and unsubscribe while the external repositories are still loading', async () => {
    let connect!: (value: WorkoutRepositories) => void
    const ready = new Promise<WorkoutRepositories>((resolve) => { connect = resolve })
    const repositories = createDeferredWorkoutRepositories(ready)
    let subscriptions = 0
    const subscribe = () => { subscriptions += 1; return () => { subscriptions -= 1 } }
    const unsubscribe = repositories.plans.subscribe(() => {}, () => {})
    unsubscribe()
    connect({ weekPlans: { subscribe, save: async () => {} }, plans: { subscribe, save: async () => {}, delete: async () => {} },
      sessions: { subscribe, save: async () => {}, delete: async () => true, updateNote: async () => true, saveFeedback: async () => true, saveRpe: async () => true },
      focusSkills: { subscribe, save: async () => {}, archive: async () => {}, deleteUnused: async () => {}, restore: async () => {} } })
    await ready
    expect(subscriptions).toBe(0)
    const stop = repositories.sessions.subscribe(() => {}, () => {})
    await ready
    expect(subscriptions).toBe(1)
    stop()
    expect(subscriptions).toBe(0)
    const stopSkills = repositories.focusSkills.subscribe(() => {}, () => {})
    await ready
    expect(subscriptions).toBe(1)
    stopSkills()
    expect(subscriptions).toBe(0)
    const stopWeeks = repositories.weekPlans.subscribe('2026-11-09', () => {}, () => {})
    await ready
    expect(subscriptions).toBe(1)
    stopWeeks()
    expect(subscriptions).toBe(0)
  })
})
