import { useNavigate, useParams } from 'react-router-dom'
import { useWorkoutData, useWorkoutPlan } from '@/application/workoutDataContext'
import { routes } from '@/app/routes'
import { WorkoutPlanDetailsView } from '@/features/workout-details/components/WorkoutPlanDetailsView'
import { WorkoutDataWarning } from '@/features/workouts/components/WorkoutDataWarning'
import { selectPlanCorrections } from '@/domain/focus-skill/focusSkillSelectors'
import { CorrectionNote } from '@/features/workout-feedback/CorrectionNote'

export function Component() {
  const navigate = useNavigate()
  const { workoutId = '' } = useParams()
  const { loadState, retry } = useWorkoutPlan(workoutId)
  const { planRepository, focusSkills } = useWorkoutData()
  const corrections = loadState.status === 'success' ? selectPlanCorrections(loadState.plan.blocks, focusSkills.items) : []
  return <><WorkoutDataWarning /><WorkoutPlanDetailsView loadState={loadState}
    correctionNotes={corrections.length > 0 ? <div className="w-full space-y-3">{corrections.map((value) =>
      <CorrectionNote key={value.focusSkillId} correction={value.correction} name={value.name} preview />)}</div> : undefined}
    workoutsListPath={routes.workouts} newWorkoutPath={routes.newWorkout}
    workoutActivePath={routes.workoutActive(workoutId)} workoutEditPath={routes.workoutEdit(workoutId)}
    onDelete={async () => {
      await planRepository.delete(workoutId)
      navigate(routes.workouts, { replace: true, state: { planDeleted: true } })
    }} onRetry={retry}
  /></>
}
