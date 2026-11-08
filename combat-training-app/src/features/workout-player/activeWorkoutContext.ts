import { createContext, useContext } from 'react'
import type { ActiveWorkoutRepository } from '@/application/workout/activeWorkoutRepository'
import type { ActiveWorkoutRecovery } from './utils/resolveActiveWorkout'

export const ActiveWorkoutContext = createContext<{
  recovery: ActiveWorkoutRecovery
  repository: ActiveWorkoutRepository
} | null>(null)

export function useActiveWorkout() {
  const value = useContext(ActiveWorkoutContext)
  if (!value) throw new Error('Missing active workout provider')
  return value
}
