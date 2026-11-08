import { useEffect, useState, type PropsWithChildren } from 'react'
import type { WorkoutPlanRepository } from '@/application/workout/workoutPlanRepository'
import type { WorkoutSessionRepository } from '@/application/workout-session/workoutSessionRepository'
import { WorkoutDataContext } from '@/application/workoutDataContext'
import { useRepositoryCollection } from '@/application/useRepositoryCollection'
import { useAuth } from '@/features/auth/authContext'
import { AuthFrame } from '@/features/auth/AuthFrame'
import { removeLegacyWorkouts } from '@/infrastructure/storage/removeLegacyWorkouts'

interface Repositories { plans: WorkoutPlanRepository; sessions: WorkoutSessionRepository }

function SubscribedData({ repositories, retry, children }: PropsWithChildren<{ repositories: Repositories; retry: () => void }>) {
  const plans = useRepositoryCollection(repositories.plans)
  const sessions = useRepositoryCollection(repositories.sessions)
  return <WorkoutDataContext.Provider value={{ plans, sessions, planRepository: repositories.plans, sessionRepository: repositories.sessions, retry }}>
    {children}
  </WorkoutDataContext.Provider>
}

function AccountData({ uid, children }: PropsWithChildren<{ uid: string }>) {
  const [attempt, setAttempt] = useState(0)
  const [boot, setBoot] = useState<{ repositories: Repositories | null; error: boolean }>({ repositories: null, error: false })
  function retry() { setBoot({ repositories: null, error: false }); setAttempt((value) => value + 1) }
  useEffect(() => {
    let cancelled = false
    // This effect runs after the first render. Firestore and its document schemas are a separate chunk.
    void import('@/infrastructure/firebase/createFirestoreRepositories').then(({ createFirestoreRepositories }) => {
      if (cancelled) return
      removeLegacyWorkouts()
      setBoot({ repositories: createFirestoreRepositories(uid), error: false })
    }).catch(() => { if (!cancelled) setBoot({ repositories: null, error: true }) })
    return () => { cancelled = true }
  }, [uid, attempt])
  if (!boot.repositories) return <AuthFrame title="Dane treningowe">
    <p role={boot.error ? 'alert' : 'status'}>{boot.error ? 'Nie udało się wczytać danych.' : 'Wczytywanie danych…'}</p>
    {boot.error ? <button className="min-h-touch underline" onClick={retry}>Spróbuj ponownie</button> : null}
  </AuthFrame>
  return <SubscribedData key={attempt} repositories={boot.repositories} retry={retry}>{children}</SubscribedData>
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
