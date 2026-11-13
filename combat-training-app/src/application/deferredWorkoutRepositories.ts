import type { SubscribableRepository } from './repositorySubscription'
import type { WorkoutPlanRepository } from './workout/workoutPlanRepository'
import type { WorkoutSessionRepository } from './workout-session/workoutSessionRepository'
import type { FocusSkillRepository } from './focus-skill/focusSkillRepository'
import type { WeekPlanRepository } from './week-plan/weekPlanRepository'
import type { BodyWeightRepository, ProfileRepository } from './profile/profileRepository'

export interface WorkoutRepositories {
  plans: WorkoutPlanRepository; sessions: WorkoutSessionRepository; focusSkills: FocusSkillRepository; weekPlans: WeekPlanRepository
  profile: ProfileRepository; bodyWeights: BodyWeightRepository
}

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
  const weekPlans = ready.then((repositories) => repositories.weekPlans)
  const profile = ready.then((repositories) => repositories.profile)
  return {
    profile: {
      subscribe: deferredSubscription(profile),
      save: async (value) => (await profile).save(value),
      withdrawConsent: async () => (await profile).withdrawConsent(),
    },
    bodyWeights: {
      // No weight subscription exists before consent, including a failed bootstrap.
      subscribe: (onChange, onError) => deferredSubscription(ready.then((repositories) => repositories.bodyWeights))(onChange, onError),
      save: async (value) => (await ready).bodyWeights.save(value),
      delete: async (date) => (await ready).bodyWeights.delete(date),
    },
    weekPlans: {
      subscribe: (currentWeek, onChange, onError) => {
        let cancelled = false
        let unsubscribe: (() => void) | undefined
        void weekPlans.then((repository) => {
          if (!cancelled) unsubscribe = repository.subscribe(currentWeek, onChange, onError)
        }).catch((error: unknown) => { if (!cancelled) onError(error) })
        return () => { cancelled = true; unsubscribe?.() }
      },
      save: async (plan) => (await weekPlans).save(plan),
    },
    plans: {
      subscribe: deferredSubscription(plans),
      save: async (plan) => (await plans).save(plan),
      delete: async (id) => (await plans).delete(id),
    },
    sessions: {
      subscribe: deferredSubscription(sessions),
      save: async (session) => (await sessions).save(session),
      saveManual: async (session, corrections) => (await sessions).saveManual(session, corrections),
      updateNote: async (id, note) => (await sessions).updateNote(id, note),
      saveFeedback: async (id, feedback) => (await sessions).saveFeedback(id, feedback),
      saveQuickTimerFeedback: async (id, feedback) => (await sessions).saveQuickTimerFeedback(id, feedback),
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
