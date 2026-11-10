import type { SubscribableRepository } from './repositorySubscription'
import type { WorkoutPlanRepository } from './workout/workoutPlanRepository'
import type { WorkoutSessionRepository } from './workout-session/workoutSessionRepository'
import type { FocusSkillRepository } from './focus-skill/focusSkillRepository'

export interface WorkoutRepositories { plans: WorkoutPlanRepository; sessions: WorkoutSessionRepository; focusSkills: FocusSkillRepository }

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
  const focusSkills = ready.then((repositories) => repositories.focusSkills)
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
      saveFeedback: async (id, feedback) => (await sessions).saveFeedback(id, feedback),
      saveRpe: async (id, rpe, recordedAt) => (await sessions).saveRpe(id, rpe, recordedAt),
      delete: async (id) => (await sessions).delete(id),
    },
    focusSkills: {
      subscribe: deferredSubscription(focusSkills),
      save: async (skill) => (await focusSkills).save(skill),
      archive: async (id, updatedAt) => (await focusSkills).archive(id, updatedAt),
      deleteUnused: async (id, updatedAt) => (await focusSkills).deleteUnused(id, updatedAt),
      restore: async (id, updatedAt) => (await focusSkills).restore(id, updatedAt),
    },
  }
}
