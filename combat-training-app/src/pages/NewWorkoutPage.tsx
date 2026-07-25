import { useReducer } from 'react'

import { WorkoutBuilderView } from '@/features/workout-builder/components/WorkoutBuilderView'
import {
  createInitialWorkoutBuilderState,
  workoutBuilderReducer,
} from '@/features/workout-builder/state/workoutBuilder.reducer'

export function NewWorkoutPage() {
  const [state, dispatch] = useReducer(
    workoutBuilderReducer,
    undefined,
    createInitialWorkoutBuilderState,
  )

  return <WorkoutBuilderView state={state} dispatch={dispatch} />
}
