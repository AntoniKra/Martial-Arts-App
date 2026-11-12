import { useCallback, useEffect, useRef } from 'react'
import type { ActiveWorkout, ActiveWorkoutRepository, WorkoutSessionRecording } from '@/application/workout/activeWorkoutRepository'
import type { WorkoutPlan } from '@/domain/workout/workout.types'
import type { WorkoutPlaybackState } from '@/domain/workout-playback/workoutPlayback.types'

export function useActiveWorkoutPersistence(
  plan: WorkoutPlan,
  playback: WorkoutPlaybackState,
  getPlaybackSnapshot: () => Pick<ActiveWorkout, 'playback' | 'deadlineMs' | 'pausedRemainingMs'>,
  getRecording: () => WorkoutSessionRecording,
  repository?: ActiveWorkoutRepository,
  locallySaved = false,
) {
  const discardedRef = useRef(false)
  const persist = useCallback(() => {
    const runtime = getPlaybackSnapshot()
    if (!repository || discardedRef.current || runtime.playback.status === 'idle') return
    if (runtime.playback.status === 'completed' && locallySaved) return
    repository.save({ schemaVersion: 1, plan, ...runtime, recorder: getRecording(), lastSeenAt: Date.now() })
  }, [plan, getPlaybackSnapshot, getRecording, repository, locallySaved])

  useEffect(() => {
    if (document.visibilityState === 'visible') persist()
  }, [playback, persist])

  useEffect(() => {
    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') persist() }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', persist)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', persist)
      // React unmounts on in-app exits, unlike a reload or a browser pagehide.
      if (getPlaybackSnapshot().playback.status === 'preparing') repository?.clear()
    }
  }, [persist, getPlaybackSnapshot, repository])

  return useCallback(() => { discardedRef.current = true; repository?.clear() }, [repository])
}
