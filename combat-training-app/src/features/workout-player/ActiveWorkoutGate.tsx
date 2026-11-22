import { useMemo, useState, type PropsWithChildren } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { routes } from '@/app/routes'
import type { CompletedWorkoutStorage } from '@/application/workout-session/completedWorkoutRecovery'
import type { ActiveWorkoutRepository } from '@/application/workout/activeWorkoutRepository'
import { useAuth } from '@/features/auth/authContext'
import { ActiveWorkoutContext } from './activeWorkoutContext'
import { resolveActiveWorkout } from './utils/resolveActiveWorkout'

interface ActiveWorkoutGateProps {
  createRepository: (uid: string) => ActiveWorkoutRepository
  createCompletedStorage: (uid: string) => CompletedWorkoutStorage
}

function AccountActiveWorkout({ uid, createRepository, createCompletedStorage, children }: PropsWithChildren<ActiveWorkoutGateProps & { uid: string }>) {
  const location = useLocation()
  const [storage] = useState(() => createRepository(uid))
  const [recovery, setRecovery] = useState(() => {
    const saved = storage.read()
    const completed = createCompletedStorage(uid)
    if (saved && completed.readAll().some((session) => session.id === saved.recorder.sessionId)) {
      // The app can close after staging the entry and before clearing the player snapshot.
      storage.clear()
      return { kind: 'none' } as const
    }
    const result = resolveActiveWorkout(saved, Date.now())
    if (result.kind === 'completed') {
      try {
        completed.save(result.session)
        storage.clear()
        return { kind: 'none' } as const
      } catch {
        return { kind: 'resume', workout: result.workout } as const
      }
    }
    if (saved && result.kind === 'none') storage.clear()
    return result
  })
  const repository = useMemo(() => ({ ...storage, clear: () => {
    storage.clear()
    setRecovery({ kind: 'none' })
  } }), [storage])
  const [opened, setOpened] = useState(false)
  const target = recovery.kind === 'none' ? null : recovery.workout.source === 'quickTimer'
    ? routes.quickTimerActive : routes.workoutActive(recovery.workout.plan.id)
  if (!opened && location.pathname === target) setOpened(true)
  if (!opened && target && location.pathname !== target) return <Navigate to={target} replace />
  return <ActiveWorkoutContext.Provider value={{ recovery, repository }}>{children}</ActiveWorkoutContext.Provider>
}

export function ActiveWorkoutGate(props: ActiveWorkoutGateProps) {
  const { state } = useAuth()
  const currentUid = state.status === 'ready' && state.session?.emailVerified ? state.session.uid : null
  const [uid, setUid] = useState(currentUid)
  if (currentUid && currentUid !== uid) setUid(currentUid)
  return uid ? <AccountActiveWorkout key={uid} uid={uid} {...props}><Outlet /></AccountActiveWorkout> : <Outlet />
}
