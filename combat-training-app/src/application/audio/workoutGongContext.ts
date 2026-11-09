import { createContext, useContext } from 'react'
import type { WorkoutGong } from './workoutGong'

export const WorkoutGongContext = createContext<WorkoutGong | null>(null)

export function useSharedWorkoutGong(): WorkoutGong {
  const gong = useContext(WorkoutGongContext)
  if (!gong) throw new Error('WorkoutGongProvider is missing')
  return gong
}
