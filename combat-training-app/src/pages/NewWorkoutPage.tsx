import { useReducer } from 'react'
import { useNavigate } from 'react-router-dom'

import { useWorkoutData } from '@/application/workoutDataContext'
import { routes } from '@/app/routes'
import type { WorkoutPlan } from '@/domain/workout/workout.types'
import { WorkoutBuilderView } from '@/features/workout-builder/components/WorkoutBuilderView'
import {
  createInitialWorkoutBuilderState,
  workoutBuilderReducer,
} from '@/features/workout-builder/state/workoutBuilder.reducer'

export function NewWorkoutPage() {
  const navigate = useNavigate()
  const [state, dispatch] = useReducer(
    workoutBuilderReducer,
    undefined,
    createInitialWorkoutBuilderState,
  )
  const { planRepository: workoutPlanRepository } = useWorkoutData()

  function handlePlanSaved(_plan: WorkoutPlan): void {
    navigate(routes.workouts, { replace: true })
  }

  return (
    <WorkoutBuilderView
      state={state}
      dispatch={dispatch}
      workoutPlanRepository={workoutPlanRepository}
      onPlanSaved={handlePlanSaved}
    />
  )
}
