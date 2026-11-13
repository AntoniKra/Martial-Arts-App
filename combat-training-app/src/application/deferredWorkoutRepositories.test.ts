import { describe, expect, it, vi } from 'vitest'
import { createDeferredWorkoutRepositories, type WorkoutRepositories } from './deferredWorkoutRepositories'

describe('deferred workout repositories', () => {
  it('reports bootstrap errors without creating an unobserved weight promise before consent', async () => {
    const error = new Error('Bootstrap failed')
    const ready = Promise.reject<WorkoutRepositories>(error)
    const repositories = createDeferredWorkoutRepositories(ready)
    const onError = vi.fn()
    const stops = [repositories.plans, repositories.sessions, repositories.focusSkills, repositories.profile]
      .map((repository) => repository.subscribe(vi.fn(), onError))
    stops.push(repositories.weekPlans.subscribe('2026-11-09', vi.fn(), onError))
    await expect(ready).rejects.toBe(error)
    await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(5))
    for (const stop of stops) stop()
  })
  it('can render and unsubscribe while the external repositories are still loading', async () => {
    let connect!: (value: WorkoutRepositories) => void
    const ready = new Promise<WorkoutRepositories>((resolve) => { connect = resolve })
    const repositories = createDeferredWorkoutRepositories(ready)
    let subscriptions = 0
    const subscribe = () => { subscriptions += 1; return () => { subscriptions -= 1 } }
    const unsubscribe = repositories.plans.subscribe(() => {}, () => {})
    unsubscribe()
    connect({ profile: { subscribe, save: async () => {}, withdrawConsent: async () => {} },
      bodyWeights: { subscribe, save: async () => {}, delete: async () => {} },
      weekPlans: { subscribe, save: async () => {} }, plans: { subscribe, save: async () => {}, delete: async () => {} },
      sessions: { subscribe, save: async () => {}, saveManual: async () => {}, delete: async () => true, updateNote: async () => true, saveFeedback: async () => true, saveQuickTimerFeedback: async () => true, saveRpe: async () => true },
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
    const stopProfile = repositories.profile.subscribe(() => {}, () => {})
    const stopWeights = repositories.bodyWeights.subscribe(() => {}, () => {})
    await vi.waitFor(() => expect(subscriptions).toBe(2))
    stopProfile()
    stopWeights()
    expect(subscriptions).toBe(0)
  })
})
