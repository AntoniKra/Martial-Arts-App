import type { WorkoutPlan } from '@/domain/workout/workout.types'

export type WorkoutPlanDetailsLoadState =
  | { status: 'loading' }
  | { status: 'success'; plan: WorkoutPlan }
  | { status: 'notFound' }
  | { status: 'error'; message: string }
