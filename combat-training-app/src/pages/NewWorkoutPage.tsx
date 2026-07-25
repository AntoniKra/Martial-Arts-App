import { useReducer, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { WorkoutPlanRepository } from '@/application/workout/workoutPlanRepository'
import type { WorkoutPlan } from '@/domain/workout/workout.types'
import { WorkoutBuilderView } from '@/features/workout-builder/components/WorkoutBuilderView'
import {
  createInitialWorkoutBuilderState,
  workoutBuilderReducer,
} from '@/features/workout-builder/state/workoutBuilder.reducer'
import { LocalStorageWorkoutPlanRepository } from '@/infrastructure/storage/localStorageWorkoutPlanRepository'
import { WorkoutPlanStorageError } from '@/infrastructure/storage/workoutPlanStorageSchema'
import { routes } from '@/app/routes'

class UnavailableStorageWorkoutPlanRepository implements WorkoutPlanRepository {
  private readonly error = new WorkoutPlanStorageError(
    'read_failed',
    'Browser storage is unavailable.',
  )

  save(_plan: WorkoutPlan): Promise<void> {
    return Promise.reject(this.error)
  }

  list(): Promise<WorkoutPlan[]> {
    return Promise.reject(this.error)
  }

  getById(_id: string): Promise<WorkoutPlan | null> {
    return Promise.reject(this.error)
  }
}

function createWorkoutPlanRepository(): WorkoutPlanRepository {
  try {
    return new LocalStorageWorkoutPlanRepository(window.localStorage)
  } catch {
    return new UnavailableStorageWorkoutPlanRepository()
  }
}

export function NewWorkoutPage() {
  const navigate = useNavigate()
  const [state, dispatch] = useReducer(
    workoutBuilderReducer,
    undefined,
    createInitialWorkoutBuilderState,
  )
  const [workoutPlanRepository] = useState(createWorkoutPlanRepository)

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
