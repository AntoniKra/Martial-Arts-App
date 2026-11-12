import { useEffect, useState, type PropsWithChildren } from 'react'
import { createDeferredWorkoutRepositories, type WorkoutRepositories } from '@/application/deferredWorkoutRepositories'
import { WorkoutDataContext } from '@/application/workoutDataContext'
import { useRepositoryCollection } from '@/application/useRepositoryCollection'
import { useAuth } from '@/features/auth/authContext'
import { removeLegacyWorkouts } from '@/infrastructure/storage/removeLegacyWorkouts'
import { WorkoutGongProvider } from './WorkoutGongProvider'
import { useCurrentWeek } from '@/application/week-plan/useCurrentWeek'
import { useWeekPlanCollection } from '@/application/week-plan/useWeekPlanCollection'

function SubscribedData({ repositories, retry, children }: PropsWithChildren<{ repositories: WorkoutRepositories; retry: () => void }>) {
  const [sessionAttempt, setSessionAttempt] = useState(0)
  const [focusAttempt, setFocusAttempt] = useState(0)
  const plans = useRepositoryCollection(repositories.plans)
  const sessions = useRepositoryCollection(repositories.sessions, sessionAttempt)
  const focusSkills = useRepositoryCollection(repositories.focusSkills, focusAttempt)
  const currentWeek = useCurrentWeek()
  const { state: weekPlans, retry: retryWeekPlans } = useWeekPlanCollection(repositories.weekPlans, currentWeek, retry)
  return <WorkoutDataContext.Provider value={{ plans, sessions, focusSkills, weekPlans, currentWeek, retryWeekPlans, retrySessions: () => setSessionAttempt((value) => value + 1), retryFocusSkills: () => setFocusAttempt((value) => value + 1), weekPlanRepository: repositories.weekPlans, planRepository: repositories.plans, sessionRepository: repositories.sessions, focusSkillRepository: repositories.focusSkills, retry }}>
    {children}
  </WorkoutDataContext.Provider>
}

function LoadingAccountData({ uid, retry, children }: PropsWithChildren<{ uid: string; retry: () => void }>) {
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
  return <SubscribedData repositories={boot.repositories} retry={retry}>{children}</SubscribedData>
}

function AccountData({ uid, children }: PropsWithChildren<{ uid: string }>) {
  const [attempt, setAttempt] = useState(0)
  return <WorkoutGongProvider><LoadingAccountData key={attempt} uid={uid} retry={() => setAttempt((value) => value + 1)}>{children}</LoadingAccountData></WorkoutGongProvider>
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
