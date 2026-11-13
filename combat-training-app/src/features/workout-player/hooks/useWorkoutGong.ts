import { useCallback, useEffect, useRef } from 'react'

import type { WorkoutPlaybackTimeline } from '@/domain/workout-playback/workoutPlayback.types'
import type { WorkoutPlaybackEvent } from '@/features/workout-player/types/workoutPlaybackEvents.types'
import { createWorkoutGongController } from '@/features/workout-player/utils/createWorkoutGongController'
import { useSharedWorkoutGong } from '@/application/audio/workoutGongContext'

export function useWorkoutGong(timeline: WorkoutPlaybackTimeline) {
  const gong = useSharedWorkoutGong()
  const controllerRef = useRef<ReturnType<typeof createWorkoutGongController> | null>(null)

  useEffect(() => {
    // Account provider owns audio disposal; controller cleanup only cancels playback events.
    const controller = createWorkoutGongController(timeline.steps, { ...gong, dispose: () => {} })
    controllerRef.current = controller

    return () => {
      controllerRef.current = null
      controller.dispose()
    }
  }, [timeline.steps, gong])

  const unlockGong = useCallback(() => controllerRef.current?.unlock(), [])
  const playEndWarning = useCallback(() => controllerRef.current?.playEndWarning(), [])
  const onGongPlaybackEvent = useCallback((event: WorkoutPlaybackEvent) => {
    controllerRef.current?.onPlaybackEvent(event)
  }, [])

  return { unlockGong, onGongPlaybackEvent, playEndWarning }
}
