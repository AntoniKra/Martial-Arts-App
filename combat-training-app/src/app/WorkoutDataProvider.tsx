import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type PropsWithChildren } from 'react'
import { createDeferredWorkoutRepositories, type WorkoutRepositories } from '@/application/deferredWorkoutRepositories'
import { WorkoutDataContext } from '@/application/workoutDataContext'
import { useRepositoryCollection } from '@/application/useRepositoryCollection'
import { useAuth } from '@/features/auth/authContext'
import { removeLegacyWorkouts } from '@/infrastructure/storage/removeLegacyWorkouts'
import { WorkoutGongProvider } from './WorkoutGongProvider'
import { useCurrentWeek } from '@/application/week-plan/useCurrentWeek'
import { useWeekPlanCollection } from '@/application/week-plan/useWeekPlanCollection'
import { hasValidHealthConsent } from '@/domain/profile/bodyWeight'
import type { SubscribableRepository } from '@/application/repositorySubscription'
import type { BodyWeight } from '@/domain/profile/profile.types'
import type { WellbeingEntry } from '@/domain/wellbeing/wellbeing'
import { hasWellbeingConsent } from '@/domain/wellbeing/wellbeingConsent'
import { CompletedWorkoutRecovery } from '@/application/workout-session/completedWorkoutRecovery'
import type { RecordedWorkoutSession, WorkoutSessionRepository } from '@/application/workout-session/workoutSessionRepository'
import { createCompletedWorkoutStorage } from '@/infrastructure/storage/completedWorkoutStorage'

const inactiveWeights: SubscribableRepository<BodyWeight> = {
  subscribe: (onChange) => {
    onChange({ items: [], pendingIds: new Set(), hasPendingWrites: false, fromCache: false, invalidDocumentIds: [] })
    return () => {}
  },
}
const inactiveWellbeing: SubscribableRepository<WellbeingEntry> = { subscribe: (onChange) => {
  onChange({ items: [], pendingIds: new Set(), hasPendingWrites: false, fromCache: false, invalidDocumentIds: [] })
  return () => {}
} }

function SubscribedData({ repositories, recovery, retry, children }: PropsWithChildren<{
  repositories: WorkoutRepositories; recovery: CompletedWorkoutRecovery; retry: () => void
}>) {
  const [recurringAttempt, setRecurringAttempt] = useState(0)
  const recurringWeeks = useRepositoryCollection(repositories.recurringWeeks, recurringAttempt)
  const [sessionAttempt, setSessionAttempt] = useState(0)
  const [exerciseAttempt, setExerciseAttempt] = useState(0)
  const exercises = useRepositoryCollection(repositories.exercises, exerciseAttempt)
  const [focusAttempt, setFocusAttempt] = useState(0)
  const [profileAttempt, setProfileAttempt] = useState(0)
  const [weightAttempt, setWeightAttempt] = useState(0)
  const [wellbeingAttempt, setWellbeingAttempt] = useState(0)
  const profile = useRepositoryCollection(repositories.profile, profileAttempt)
  const consented = profile.status === 'ready' && hasValidHealthConsent(profile.items[0])
  const bodyWeights = useRepositoryCollection(consented ? repositories.bodyWeights : inactiveWeights, weightAttempt)
  const wellbeing = useRepositoryCollection(profile.status === 'ready' && hasWellbeingConsent(profile.items[0]) ? repositories.wellbeing : inactiveWellbeing, wellbeingAttempt)
  const plans = useRepositoryCollection(repositories.plans)
  const sessionRepository = useMemo<WorkoutSessionRepository>(() => ({
    ...repositories.sessions,
    subscribe: (onChange, onError) => repositories.sessions.subscribe((snapshot) => {
      recovery.observe(snapshot)
      onChange(snapshot)
    }, (error) => {
      recovery.observeReadFailure()
      onError(error)
    }),
    delete: async (id) => {
      const removed = await repositories.sessions.delete(id)
      if (removed) recovery.discard(id)
      return removed
    },
  }), [repositories, recovery])
  const sessions = useRepositoryCollection(sessionRepository, sessionAttempt)
  const completedWorkoutRetries = useSyncExternalStore(recovery.subscribe, recovery.getRetries)
  const saveRecordedSession = useCallback((session: RecordedWorkoutSession) =>
    recovery.save(session, sessionRepository), [recovery, sessionRepository])
  const focusSkills = useRepositoryCollection(repositories.focusSkills, focusAttempt)
  const currentWeek = useCurrentWeek()
  const { state: weekPlans, retry: retryWeekPlans } = useWeekPlanCollection(repositories.weekPlans, currentWeek, retry)
  const recurring = recurringWeeks.items[0]
  useEffect(() => {
    if (!recurring || recurringWeeks.status !== 'ready' || weekPlans.status !== 'ready' || recurringWeeks.hasPendingWrites || weekPlans.hasPendingWrites
      || recurringWeeks.invalidDocumentIds.length || weekPlans.invalidDocumentIds.length) return
    void repositories.weekPlans.reconcile(recurring, new Date()).catch(() => { /* Repository reports only a failed recovery. */ })
  }, [repositories, recurring, recurringWeeks.status, recurringWeeks.hasPendingWrites, recurringWeeks.invalidDocumentIds, weekPlans])
  return <WorkoutDataContext.Provider value={{ recurringWeeks, recurringWeekRepository: repositories.recurringWeeks, retryRecurringWeeks: () => setRecurringAttempt((value) => value + 1), exercises, exerciseRepository: repositories.exercises, retryExercises: () => setExerciseAttempt((value) => value + 1), profile, bodyWeights, profileRepository: repositories.profile, bodyWeightRepository: repositories.bodyWeights,
    wellbeing, wellbeingRepository: repositories.wellbeing, retryWellbeing: () => setWellbeingAttempt((value) => value + 1),
    retryProfile: () => setProfileAttempt((value) => value + 1), retryBodyWeights: () => setWeightAttempt((value) => value + 1),
    plans, sessions, focusSkills, weekPlans, currentWeek, retryWeekPlans, retrySessions: () => setSessionAttempt((value) => value + 1), retryFocusSkills: () => setFocusAttempt((value) => value + 1), weekPlanRepository: repositories.weekPlans, planRepository: repositories.plans, sessionRepository, completedWorkoutRetries, saveRecordedSession, focusSkillRepository: repositories.focusSkills, retry }}>
    {children}
  </WorkoutDataContext.Provider>
}

function LoadingAccountData({ uid, recovery, retry, children }: PropsWithChildren<{
  uid: string; recovery: CompletedWorkoutRecovery; retry: () => void
}>) {
  const [boot] = useState(() => {
    let connect!: (repositories: WorkoutRepositories) => void
    let fail!: (error: unknown) => void
    const ready = new Promise<WorkoutRepositories>((resolve, reject) => { connect = resolve; fail = reject })
    return { repositories: createDeferredWorkoutRepositories(ready), connect, fail }
  })
  useEffect(() => {
    let cancelled = false
    // This effect runs after the first render. Firestore is a separate chunk.
    void import('@/infrastructure/firebase/createFirestoreRepositories').then(({ createFirestoreRepositories }) => {
      if (cancelled) return
      removeLegacyWorkouts()
      boot.connect(createFirestoreRepositories(uid))
    }).catch((error: unknown) => { if (!cancelled) boot.fail(error) })
    return () => { cancelled = true }
  }, [uid, boot])
  return <SubscribedData repositories={boot.repositories} recovery={recovery} retry={retry}>{children}</SubscribedData>
}

function AccountData({ uid, children }: PropsWithChildren<{ uid: string }>) {
  const [attempt, setAttempt] = useState(0)
  const [recovery] = useState(() => new CompletedWorkoutRecovery(createCompletedWorkoutStorage(uid)))
  return <WorkoutGongProvider><LoadingAccountData key={attempt} uid={uid} recovery={recovery}
    retry={() => setAttempt((value) => value + 1)}>{children}</LoadingAccountData></WorkoutGongProvider>
}

export function WorkoutDataProvider({ children }: PropsWithChildren) {
  const { state } = useAuth()
  const currentUid = state.status === 'ready' && state.session?.emailVerified ? state.session.uid : null
  const [uid, setUid] = useState(currentUid)
  // AuthGate can keep an admitted player mounted after session loss. Retain that account only
  // until the gate unmounts us; a different verified account always replaces its repositories.
  if (currentUid && currentUid !== uid) setUid(currentUid)
  return uid ? <AccountData key={uid} uid={uid}>{children}</AccountData> : children
}
