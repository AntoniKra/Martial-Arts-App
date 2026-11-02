import { useCallback, useEffect, useRef } from 'react'

import type { WorkoutPlaybackTimeline } from '@/features/workout-player/types/workoutPlayback.types'
import type { WorkoutPlaybackEvent } from '@/features/workout-player/types/workoutPlaybackEvents.types'
import { createWorkoutGongController } from '@/features/workout-player/utils/createWorkoutGongController'
import { createWebAudioWorkoutGong } from '@/infrastructure/audio/webAudioWorkoutGong'

export function useWorkoutGong(timeline: WorkoutPlaybackTimeline) {
  const controllerRef = useRef<ReturnType<typeof createWorkoutGongController> | null>(null)

  useEffect(() => {
    const controller = createWorkoutGongController(timeline.steps, createWebAudioWorkoutGong())
    controllerRef.current = controller

    return () => {
      controllerRef.current = null
      controller.dispose()
    }
  }, [timeline.steps])

  const unlockGong = useCallback(() => controllerRef.current?.unlock(), [])
  const onGongPlaybackEvent = useCallback((event: WorkoutPlaybackEvent) => {
    controllerRef.current?.onPlaybackEvent(event)
  }, [])

  return { unlockGong, onGongPlaybackEvent }
}
