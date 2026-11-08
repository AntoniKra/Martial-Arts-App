import { useNavigate, useParams } from 'react-router-dom'
import { useWorkoutData, useWorkoutPlan } from '@/application/workoutDataContext'
import { routes } from '@/app/routes'
import { WorkoutPlanDetailsView } from '@/features/workout-details/components/WorkoutPlanDetailsView'
import { WorkoutDataWarning } from '@/features/workouts/components/WorkoutDataWarning'

export function WorkoutDetailsPage() {
  const navigate = useNavigate()
  const { workoutId = '' } = useParams()
  const { loadState, retry } = useWorkoutPlan(workoutId)
  const { planRepository } = useWorkoutData()
  return <><WorkoutDataWarning /><WorkoutPlanDetailsView loadState={loadState}
    workoutsListPath={routes.workouts} newWorkoutPath={routes.newWorkout}
    workoutActivePath={routes.workoutActive(workoutId)} workoutEditPath={routes.workoutEdit(workoutId)}
    onDelete={async () => {
      await planRepository.delete(workoutId)
      navigate(routes.workouts, { replace: true, state: { planDeleted: true } })
    }} onRetry={retry}
  /></>
}
