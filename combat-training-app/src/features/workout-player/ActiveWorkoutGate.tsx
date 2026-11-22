import { useMemo, useState, type PropsWithChildren } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { routes } from '@/app/routes'
import type { ActiveWorkoutRepository } from '@/application/workout/activeWorkoutRepository'
import { useAuth } from '@/features/auth/authContext'
import { ActiveWorkoutContext } from './activeWorkoutContext'
import { resolveActiveWorkout } from './utils/resolveActiveWorkout'

interface ActiveWorkoutGateProps {
  createRepository: (uid: string) => ActiveWorkoutRepository
}

function AccountActiveWorkout({ uid, createRepository, children }: PropsWithChildren<ActiveWorkoutGateProps & { uid: string }>) {
  const location = useLocation()
  const [storage] = useState(() => createRepository(uid))
  const [recovery, setRecovery] = useState(() => {
    const saved = storage.read()
    const result = resolveActiveWorkout(saved, Date.now())
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

export function ActiveWorkoutGate({ createRepository }: ActiveWorkoutGateProps) {
  const { state } = useAuth()
  const currentUid = state.status === 'ready' && state.session?.emailVerified ? state.session.uid : null
  const [uid, setUid] = useState(currentUid)
  if (currentUid && currentUid !== uid) setUid(currentUid)
  return uid ? <AccountActiveWorkout key={uid} uid={uid} createRepository={createRepository}><Outlet /></AccountActiveWorkout> : <Outlet />
}
