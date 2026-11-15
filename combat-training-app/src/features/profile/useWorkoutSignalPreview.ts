import { useEffect, useRef } from 'react'
import type { WorkoutGong } from '@/application/audio/workoutGong'
import { createWebAudioWorkoutGong } from '@/infrastructure/audio/webAudioWorkoutGong'

export function useWorkoutSignalPreview() {
  const gongRef = useRef<WorkoutGong | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => {
    clearTimeout(timerRef.current)
    gongRef.current?.dispose()
  }, [])

  return () => {
    clearTimeout(timerRef.current)
    gongRef.current?.dispose()
    const gong = createWebAudioWorkoutGong()
    gongRef.current = gong
    // Unlock in the original user gesture, including iOS Safari.
    gong.unlock()
    gong.play('endingSoon')
    timerRef.current = setTimeout(() => gong.play('workEnd'), 1200)
  }
}
