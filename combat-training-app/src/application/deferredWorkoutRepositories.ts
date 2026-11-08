import type { SubscribableRepository } from './repositorySubscription'
import type { WorkoutPlanRepository } from './workout/workoutPlanRepository'
import type { WorkoutSessionRepository } from './workout-session/workoutSessionRepository'

export interface WorkoutRepositories { plans: WorkoutPlanRepository; sessions: WorkoutSessionRepository }

function deferredSubscription<T>(ready: Promise<SubscribableRepository<T>>): SubscribableRepository<T>['subscribe'] {
  return (onChange, onError) => {
    let cancelled = false
    let unsubscribe: (() => void) | undefined
    void ready.then((repository) => {
      if (!cancelled) unsubscribe = repository.subscribe(onChange, onError)
    }).catch((error: unknown) => { if (!cancelled) onError(error) })
    return () => { cancelled = true; unsubscribe?.() }
  }
}

/** Local recovery can render immediately; Firestore is still loaded after the first render. */
export function createDeferredWorkoutRepositories(ready: Promise<WorkoutRepositories>): WorkoutRepositories {
  const plans = ready.then((repositories) => repositories.plans)
  const sessions = ready.then((repositories) => repositories.sessions)
  return {
    plans: {
      subscribe: deferredSubscription(plans),
      save: async (plan) => (await plans).save(plan),
      delete: async (id) => (await plans).delete(id),
    },
    sessions: {
      subscribe: deferredSubscription(sessions),
      save: async (session) => (await sessions).save(session),
      updateNote: async (id, note) => (await sessions).updateNote(id, note),
      delete: async (id) => (await sessions).delete(id),
    },
  }
}
