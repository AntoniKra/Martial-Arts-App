import { useReducer } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useWorkoutData, useWorkoutPlan } from '@/application/workoutDataContext'
import { routes } from '@/app/routes'
import type { WorkoutPlanRepository } from '@/application/workout/workoutPlanRepository'
import type { WorkoutPlan } from '@/domain/workout/workout.types'
import { WorkoutBuilderView } from '@/features/workout-builder/components/WorkoutBuilderView'
import { workoutBuilderReducer } from '@/features/workout-builder/state/workoutBuilder.reducer'
import { workoutPlanToBuilderState } from '@/features/workout-builder/state/workoutPlanToBuilderState'
import { WorkoutPlanDetailsNotFoundState } from '@/features/workout-details/components/WorkoutPlanDetailsView'
import { workoutPlanLabels } from '@/features/workouts/workoutPlanLabels'

function PlanEditor({ plan, repository }: { plan: WorkoutPlan; repository: WorkoutPlanRepository }) {
  const navigate = useNavigate()
  const [state, dispatch] = useReducer(workoutBuilderReducer, plan, workoutPlanToBuilderState)

  return (
    <WorkoutBuilderView
      state={state}
      dispatch={dispatch}
      workoutPlanRepository={repository}
      editingPlanId={plan.id}
      onPlanSaved={(savedPlan) => navigate(routes.workoutDetails(savedPlan.id), { replace: true })}
    />
  )
}

function EditWorkoutLoader({ workoutId }: { workoutId: string }) {
  const { planRepository: repository } = useWorkoutData()
  const { loadState } = useWorkoutPlan(workoutId)

  if (loadState.status === 'success') {
    return <PlanEditor key={workoutId} plan={loadState.plan} repository={repository} />
  }

  return (
    <div className="mx-auto w-full max-w-lg overflow-y-auto px-4 py-6 md:max-w-2xl md:py-8">
      {loadState.status === 'loading' ? (
        <p role="status" className="text-[13px] text-muted">{workoutPlanLabels.loading}</p>
      ) : (
        <WorkoutPlanDetailsNotFoundState workoutsListPath={routes.workouts} newWorkoutPath={routes.newWorkout} />
      )}
    </div>
  )
}

export function Component() {
  const { workoutId = '' } = useParams()
  return <EditWorkoutLoader key={workoutId} workoutId={workoutId} />
}
